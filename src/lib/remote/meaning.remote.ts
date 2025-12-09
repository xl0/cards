import { command, query } from '$app/server';
import * as v from 'valibot';
import {
	DBgetMeanings,
	DBgetMeaning,
	DBgetMeaningWithTranslations,
	DBsearchMeanings,
	DBupsertMeaning,
	DBdeleteMeaning,
	DBcreateImage,
	DBlinkImageToMeaning,
	DBunlinkImageFromMeaning
} from '$lib/server/db/meanings';
import { LangPairs } from '$lib/enums';
import { uploadImage, getImageUrl } from '$lib/server/s3';
import { generateMeaningImage } from '$lib/server/image-gen';
import dbg from 'debug';
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

export const getMeaning = query(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		const m = await DBgetMeaning(id);
		debug('getMeaning %d -> %s:%s', id, m?.word.word, m?.definition?.slice(0, 20));
		return m;
	}
);

export const getMeaningWithTranslations = query(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		const m = await DBgetMeaningWithTranslations(id);
		debug('getMeaningWithTranslations %d -> %s:%s', id, m?.word.word, m?.definition?.slice(0, 20));
		return m;
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

export const uploadMeaningImageCmd = command(
	v.object({
		meaningId: v.number(),
		imageBase64: v.string()
	}),
	async ({ meaningId, imageBase64 }) => {
		debug('uploadImage m%d (%d bytes)', meaningId, imageBase64.length);
		const imageBuffer = Buffer.from(imageBase64, 'base64');
		const img = await DBcreateImage();
		await uploadImage(img.id, imageBuffer);
		await DBlinkImageToMeaning(meaningId, img.id);
		debug('uploadImage m%d -> %s', meaningId, img.id.slice(0, 8));
		return { imageId: img.id, imageUrl: getImageUrl(`images/${img.id}`, 'thumb') };
	}
);

export const generateMeaningImageCmd = command(
	v.object({
		meaningId: v.number(),
		word: v.string(),
		definition: v.string()
	}),
	async ({ meaningId, word, definition }) => {
		debug('generateImage m%d %s', meaningId, word);
		const prompt = `spaced repetition card for word: ${word} (${definition})`;
		const imageBuffer = await generateMeaningImage(word, definition);
		const img = await DBcreateImage(prompt);
		await uploadImage(img.id, imageBuffer);
		await DBlinkImageToMeaning(meaningId, img.id);
		debug('generateImage m%d -> %s', meaningId, img.id.slice(0, 8));
		return { imageId: img.id, imageUrl: getImageUrl(`images/${img.id}`, 'thumb') };
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
