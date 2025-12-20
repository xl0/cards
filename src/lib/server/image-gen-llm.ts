import { generateText, generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { valibotSchema } from '@ai-sdk/valibot';
import * as v from 'valibot';
import { startActiveObservation, startObservation } from '@langfuse/tracing';
import { ReplicateGenImage } from './replicate';
import { uploadIntermediateImage, uploadImage } from './s3';
import {
	DBcreateImageGeneration,
	DBupdateImageGenerationStatus,
	DBaddImageGenerationAttempt,
	DBupdateMeaningImageGenStatus,
	DBcreateGeneratedImage
} from './db/image-generation';
import { DBlinkImageToMeaning } from './db/meanings';
import type { ImageGenAttempt } from './db/schema';
import dbg from 'debug';
import pRetry, { type RetryContext } from 'p-retry';

const debug = dbg('app:image-gen-llm');

const MAX_ATTEMPTS = 3;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

const PROMPT_SYSTEM = `You create image prompts for language learning flashcards.
You are clever, creative, and slightly cheeky. Your goal is to create MEMORABLE images.

Given a word, its meaning, and the language, create a visual prompt that:
- Keep it simple, depict realistic objects and scenarios.
- Is clever and slightly unexpected — memorable images help learners remember words
- Depicts the concept concretely with a twist or visual pun when appropriate
- Works well for image generation models (be specific about style, composition, lighting)
- Does NOT include any text, words, letters, or numbers in the image
- Considers cultural context of the language (e.g., Spanish words might have Latin American or Spanish cultural elements)

Be creative! A boring literal image is forgettable. A clever visual metaphor or unexpected scene sticks in memory.

Output ONLY the image prompt, nothing else.`;

const EVALUATION_SYSTEM = `You evaluate if a generated image matches a language learning concept.
You will be shown an image and told what word/meaning it should represent.
Analyze if the image clearly represents the concept in a memorable way.

Consider:
- Does the image convey the concept (even if cleverly/indirectly)?
- Would a learner remember this word after seeing this image?
- Is there anything confusing or misleading that would hurt learning?

Be lenient with clever interpretations — memorable is better than literal.
If the image fails, provide specific feedback on what's wrong and how to improve the prompt.`;

const EvaluationSchema = v.object({
	success: v.pipe(v.boolean(), v.description('Whether the image successfully represents the concept')),
	feedback: v.pipe(v.string(), v.description('Explanation of why it succeeded or failed, with improvement suggestions if failed'))
});

type EvaluationResult = v.InferOutput<typeof EvaluationSchema>;

export type ImageGenResult = {
	generationId: string;
	imageId: string;
	success: boolean;
	attempts: number;
};

async function withRetry<T>(
	fn: () => Promise<T>,
	onRetry: (ctx: RetryContext) => void,
	onCatch?: (err: unknown) => void,
	onFinally?: () => void
): Promise<T> {
	try {
		return await pRetry(fn, {
			retries: MAX_RETRIES - 1,
			minTimeout: RETRY_BASE_DELAY_MS,
			factor: 2,
			onFailedAttempt: (ctx: RetryContext) => onRetry(ctx)
		});
	} catch (err) {
		if (onCatch) onCatch(err);
		throw err;
	} finally {
		if (onFinally) onFinally();
	}
}

async function createImagePrompt(word: string, meaning: string, language: string, previousFeedback: string | undefined): Promise<string> {
	const userPrompt = previousFeedback
		? `Language: ${language}\nWord: "${word}"\nMeaning: "${meaning}"\n\nPrevious attempt failed. Feedback: ${previousFeedback}\n\nCreate an improved image prompt that addresses this feedback.`
		: `Language: ${language}\nWord: "${word}"\nMeaning: "${meaning}"\n\nCreate a clever, memorable image prompt for this concept.`;

	const baseName = 'Create Image Prompt';
	const baseAttrs = { input: { word, meaning, language, previousFeedback }, model: 'claude-haiku-4-5' };
	let observation = startObservation(baseName, baseAttrs, { asType: 'generation' });
	function run() {
		return generateText({
			model: anthropic('claude-haiku-4-5'),
			system: PROMPT_SYSTEM,
			prompt: userPrompt,
			maxOutputTokens: 300
		});
	}
	function onRetry(ctx: RetryContext) {
		debug('%s failed attempt %d/%d: %s', baseName, ctx.attemptNumber, MAX_RETRIES, ctx.error.message);
		observation.update({ level: 'ERROR', statusMessage: ctx.error.message });
		observation.otelSpan.updateName(`${baseName} (failed ${ctx.attemptNumber}/${MAX_RETRIES})`);
		observation.end();
		observation = startObservation(baseName, baseAttrs, { asType: 'generation' });
	}
	function onCatch(err: unknown) {
		observation.update({ level: 'ERROR', statusMessage: (err as Error).message }).end();
	}
	const { text } = await withRetry(run, onRetry, onCatch);

	const prompt = text.trim();
	observation.update({ output: { prompt } }).end();
	debug('createImagePrompt: %s (%s) -> %s', word, meaning, prompt.slice(0, 100));
	return prompt;
}

async function generateImage(prompt: string): Promise<Buffer> {
	const baseName = 'Generate Image (Replicate)';
	const baseAttrs = { input: { prompt } };
	let observation = startObservation(baseName, baseAttrs, { asType: 'tool' });
	function run() {
		return ReplicateGenImage(prompt);
	}
	function onRetry(ctx: RetryContext) {
		debug('%s failed attempt %d/%d: %s', baseName, ctx.attemptNumber, MAX_RETRIES, ctx.error.message);
		observation.update({ level: 'ERROR', statusMessage: ctx.error.message });
		observation.otelSpan.updateName(`${baseName} (failed ${ctx.attemptNumber}/${MAX_RETRIES})`);
		observation.end();
		observation = startObservation(baseName, baseAttrs, { asType: 'tool' });
	}
	function onCatch(err: unknown) {
		observation.update({ level: 'ERROR', statusMessage: (err as Error).message }).end();
	}
	const buffer = await withRetry(run, onRetry, onCatch);
	observation.update({ output: { size: buffer.length } }).end();
	return buffer;
}

async function evaluateImage(
	imageBuffer: Buffer,
	word: string,
	meaning: string,
	language: string,
	prompt: string
): Promise<EvaluationResult> {
	const baseName = 'Evaluate Image';
	const baseAttrs = { input: { word, meaning, language, prompt }, model: 'claude-haiku-4-5' };
	let observation = startObservation(baseName, baseAttrs, { asType: 'generation' });
	function run() {
		return generateObject({
			model: anthropic('claude-haiku-4-5'),
			system: EVALUATION_SYSTEM,
			messages: [
				{
					role: 'user',
					content: [
						{
							type: 'text',
							text: `Language: ${language}\nWord: "${word}"\nMeaning: "${meaning}"\nImage prompt used: "${prompt}"\n\nDoes this image clearly represent the concept?`
						},
						{ type: 'image', image: imageBuffer }
					]
				}
			],
			schema: valibotSchema(EvaluationSchema),
			maxOutputTokens: 500
		});
	}
	function onRetry(ctx: RetryContext) {
		debug('%s failed attempt %d/%d: %s', baseName, ctx.attemptNumber, MAX_RETRIES, ctx.error.message);
		observation.update({ level: 'ERROR', statusMessage: ctx.error.message });
		observation.otelSpan.updateName(`${baseName} (failed ${ctx.attemptNumber}/${MAX_RETRIES})`);
		observation.end();
		observation = startObservation(baseName, baseAttrs, { asType: 'generation' });
	}
	function onCatch(err: unknown) {
		observation.update({ level: 'ERROR', statusMessage: (err as Error).message }).end();
	}
	const { object } = await withRetry(run, onRetry, onCatch);

	observation.update({ output: object }).end();
	debug('evaluateImage: %s -> success=%s', word, object.success);
	return object;
}

export type GenerateMeaningImageParams = {
	meaningId: number;
	word: string;
	meaning: string;
	language: string;
};

export async function generateMeaningImageWithLLM(params: GenerateMeaningImageParams): Promise<ImageGenResult> {
	const { meaningId, word, meaning, language } = params;

	return startActiveObservation(
		'Generate Meaning Image',
		async (trace) => {
			trace.update({ input: { meaningId, word, meaning, language } });
			const traceId = trace.otelSpan.spanContext().traceId;

			const gen = await DBcreateImageGeneration({ meaningId, word, meaning, language });
			await DBupdateMeaningImageGenStatus(meaningId, 'in_progress');

			const attempts: ImageGenAttempt[] = [];
			let lastBuffer: Buffer | null = null;
			let lastPrompt = '';
			let success = false;

			try {
				for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
					debug('attempt %d/%d for %s (%s)', attempt, MAX_ATTEMPTS, word, meaning);

					const attemptResult = await startActiveObservation(
						`Attempt ${attempt}`,
						async (attemptSpan) => {
							attemptSpan.update({ input: { attempt } });

							const previousFeedback = attempts.length > 0 ? attempts[attempts.length - 1].evaluation.feedback : undefined;
							const prompt = await createImagePrompt(word, meaning, language, previousFeedback);
							lastPrompt = prompt;

							const buffer = await generateImage(prompt);
							lastBuffer = buffer;

							const imageKey = await uploadIntermediateImage(gen.id, attempt, buffer);

							const evaluation = await evaluateImage(buffer, word, meaning, language, prompt);

							const attemptData: ImageGenAttempt = { prompt, imageKey, evaluation };
							attempts.push(attemptData);
							await DBaddImageGenerationAttempt(gen.id, attemptData);

							attemptSpan.update({ output: { success: evaluation.success, imageKey } });

							return evaluation;
						},
						{ asType: 'chain' }
					);

					if (attemptResult.success) {
						success = true;
						debug('success on attempt %d for %s', attempt, word);
						break;
					}

					debug('attempt %d failed: %s', attempt, attemptResult.feedback.slice(0, 100));
				}

				const finalStatus = success ? 'success' : 'failed_no_good_image';
				const img = await DBcreateGeneratedImage(lastPrompt, gen.id);
				await uploadImage(img.id, lastBuffer!);
				await DBlinkImageToMeaning(meaningId, img.id);

				await DBupdateImageGenerationStatus(gen.id, finalStatus, {
					attempts,
					finalImageId: img.id,
					langfuseTraceId: traceId
				});
				await DBupdateMeaningImageGenStatus(meaningId, finalStatus);

				trace.update({ output: { success, attempts: attempts.length, imageId: img.id } });

				return { generationId: gen.id, imageId: img.id, success, attempts: attempts.length };
			} catch (err) {
				const errorMsg = (err as Error).message;
				await DBupdateImageGenerationStatus(gen.id, 'failed_error', { attempts, error: errorMsg, langfuseTraceId: traceId });
				await DBupdateMeaningImageGenStatus(meaningId, 'failed_error');
				throw err;
			}
		},
		{ asType: 'chain' }
	);
}
