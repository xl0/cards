import { command, form, query } from '$app/server';
import { LangPairs } from '$lib/enums';
import {
	DBcreateImage,
	DBdeleteMeaning,
	DBgetMeanings,
	DBlinkImageToMeaning,
	DBsearchMeanings,
	DBunlinkImageFromMeaning,
	DBupsertMeaning
} from '$lib/server/db/meanings';
import { generateMeaningImageWithLLM } from '$lib/server/image-gen-llm';
import { getImageUrl, uploadImage } from '$lib/server/s3';
import { error } from '@sveltejs/kit';
import dbg from 'debug';
import * as v from 'valibot';
const debug = dbg('app:remote:meaning');

export const getMeanings = query(
	v.object({
		page: v.optional(v.number()),
		limit: v.optional(v.number()),
		langPair: v.enum(LangPairs)
	}),
	async ({ page, limit, langPair }) => {
		const meanings = await DBgetMeanings({ page, limit, langPair });
		debug('getMeanings p%d -> %d', page, meanings.length);
		return meanings;
	}
);

export const searchMeanings = query(
	v.object({
		word: v.string(),
		langPair: v.enum(LangPairs)
	}),
	async ({ word, langPair }) => {
		const results = await DBsearchMeanings({ word, langPair });
		debug('searchMeanings %s -> %d', word, results.length);
		return results;
	}
);

export const upsertMeaning = command(
	v.object({
		id: v.optional(v.number()),
		wordId: v.number(),
		definition: v.string(),
		examples: v.array(v.string()),
		langPair: v.enum(LangPairs)
	}),
	async ({ id, wordId, definition, examples, langPair }) => {
		const result = await DBupsertMeaning({ id, wordId, definition, examples, langPair });
		debug('upsertMeaning w%d %s -> %d', wordId, definition.slice(0, 20), result.id);
		return result;
	}
);

export const deleteMeaning = command(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		debug('deleteMeaning %d', id);
		await DBdeleteMeaning(id);
	}
);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

export const uploadMeaningImageForm = form(
	v.object({
		meaningId: v.pipe(v.string(), v.transform(Number)),
		image: v.file()
	}),
	async ({ meaningId, image }) => {
		debug('uploadMeaningImageForm', { meaningId, image });

		if (image.size > MAX_IMAGE_BYTES) {
			throw error(400, 'Image too large');
		}

		const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
		if (image.type && !allowedTypes.includes(image.type)) {
			throw error(400, 'Unsupported image type');
		}

		const arrayBuffer = await image.arrayBuffer();
		const imageBuffer = Buffer.from(arrayBuffer);
		const img = await DBcreateImage();
		await uploadImage(img.id, imageBuffer);
		await DBlinkImageToMeaning(meaningId, img.id);
		debug('uploadImage m%d -> %s', meaningId, img.id.slice(0, 8));
		return { imageId: img.id, imageUrl: getImageUrl(`images/${img.id}`, 'thumb') };
	}
);

export const generateMeaningImageCmd = command(
	v.object({
		word: v.string(),
		meaning: v.string(),
		meaningId: v.number(),
		language: v.string()
	}),
	async ({ word, meaning, meaningId, language }) => {
		debug(`generateImage ${word}: ${meaning} (${language})`);
		const result = await generateMeaningImageWithLLM({ meaningId, word, meaning, language });
		debug('generateImage m%d -> %s (attempts: %d, success: %s)', meaningId, result.imageId, result.attempts, result.success);
		return { imageId: result.imageId, generationId: result.generationId, attempts: result.attempts, success: result.success };
	}
);

export const unlinkMeaningImageCmd = command(
	v.object({
		meaningId: v.number(),
		imageId: v.string()
	}),
	async ({ meaningId, imageId }) => {
		debug('unlinkImage m%d <-> %s', meaningId, imageId.slice(0, 8));
		await DBunlinkImageFromMeaning(meaningId, imageId);
	}
);
