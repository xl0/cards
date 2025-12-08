import { command, query } from '$app/server';
import * as v from 'valibot';
import { DBgetWords, DBgetWord, DBgetWordWithMeanings, DBgetWordWithTranslations, DBupsertWord, DBdeleteWord } from '$lib/server/db/words';
import { Langs, PartsOfSpeech, LangPairs } from '$lib/enums';

export const getWords = query(
	v.object({
		page: v.optional(v.number()),
		limit: v.optional(v.number()),
		langPair: v.enum(LangPairs),
		filter: v.optional(v.string()),
		sort: v.optional(v.string()),
		order: v.optional(v.picklist(['asc', 'desc']))
	}),
	async ({ page, limit, langPair, filter, sort, order }) => {
		return await DBgetWords({ page, limit, langPair, filter, sort, order });
	}
);

export const getWord = query(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		return await DBgetWord(id);
	}
);

export const getWordWithMeanings = query(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		return await DBgetWordWithMeanings(id);
	}
);

export const getWordWithTranslations = query(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		return await DBgetWordWithTranslations(id);
	}
);

export const upsertWord = command(
	v.object({
		id: v.optional(v.number()),
		word: v.string(),
		lang: v.enum(Langs),
		pos: v.enum(PartsOfSpeech),
		langPair: v.enum(LangPairs)
	}),
	async ({ id, word, lang, pos, langPair }) => {
		return await DBupsertWord({
			id,
			word,
			lang,
			pos,
			langPair
		});
	}
);

export const deleteWord = command(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		await DBdeleteWord(id);
	}
);
