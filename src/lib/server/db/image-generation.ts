import { db } from './index';
import * as schema from './schema';
import { eq } from 'drizzle-orm';
import type { GenerationStatus } from '$lib/enums';
import type { ImageGenAttempt } from './schema';
import dbg from 'debug';

const debug = dbg('app:db:image-generation');

export type CreateImageGenerationParams = {
	meaningId: number;
	word: string;
	meaning: string;
	language: string;
};

export async function DBcreateImageGeneration(params: CreateImageGenerationParams) {
	const [gen] = await db
		.insert(schema.imageGeneration)
		.values({
			meaningId: params.meaningId,
			word: params.word,
			meaning: params.meaning,
			language: params.language,
			status: 'in_progress'
		})
		.returning();
	debug('createImageGeneration m%d -> %s', params.meaningId, gen.id.slice(0, 8));
	return gen;
}

export async function DBupdateImageGenerationStatus(
	id: string,
	status: GenerationStatus,
	updates?: { attempts?: ImageGenAttempt[]; finalImageId?: string; error?: string; langfuseTraceId?: string }
) {
	debug('updateImageGenerationStatus %s -> %s', id.slice(0, 8), status);
	await db
		.update(schema.imageGeneration)
		.set({ status, ...updates })
		.where(eq(schema.imageGeneration.id, id));
}

export async function DBaddImageGenerationAttempt(id: string, attempt: ImageGenAttempt) {
	const [gen] = await db.select().from(schema.imageGeneration).where(eq(schema.imageGeneration.id, id));
	const attempts = gen.attempts ?? [];
	attempts.push(attempt);
	await db.update(schema.imageGeneration).set({ attempts }).where(eq(schema.imageGeneration.id, id));
	debug('addImageGenerationAttempt %s attempt #%d', id.slice(0, 8), attempts.length);
}

export async function DBgetImageGeneration(id: string) {
	const [gen] = await db.select().from(schema.imageGeneration).where(eq(schema.imageGeneration.id, id));
	return gen;
}

export async function DBupdateMeaningImageGenStatus(meaningId: number, status: GenerationStatus) {
	debug('updateMeaningImageGenStatus m%d -> %s', meaningId, status);
	await db.update(schema.wordMeaning).set({ imageGenStatus: status }).where(eq(schema.wordMeaning.id, meaningId));
}

export async function DBcreateGeneratedImage(prompt: string, generationId: string) {
	const [img] = await db.insert(schema.image).values({ prompt, source: 'generated', generationId }).returning();
	debug('createGeneratedImage gen%s -> %s', generationId.slice(0, 8), img.id.slice(0, 8));
	return img;
}
