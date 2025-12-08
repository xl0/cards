import { command, query } from '$app/server';
import * as v from 'valibot';
import { getWords, getWord, upsertWord, deleteWord } from '$lib/server/db/words';
import { Langs, PartsOfSpeech, LangPairs } from '$lib/enums';

export const getWordsQuery = query(
	v.object({
		page: v.optional(v.number()),
		limit: v.optional(v.number()),
		langPair: v.enum(LangPairs)
	}),
	async ({ page, limit, langPair }) => {
		return await getWords({ page, limit, langPair });
	}
);

export const getWordQuery = query(
	v.object({
		id: v.number(),
		withMeanings: v.optional(v.boolean())
	}),
	async ({ id, withMeanings }) => {
		return await getWord(id, { withMeanings });
	}
);

export const upsertWordAction = command(
	v.object({
		id: v.optional(v.number()),
		word: v.string(),
		lang: v.enum(Langs),
		pos: v.enum(PartsOfSpeech),
		langPair: v.enum(LangPairs)
	}),
	async ({ id, word, lang, pos, langPair }) => {
		return await upsertWord({
			id,
			word,
			lang,
			pos,
			langPair
		});
	}
);

export const deleteWordAction = command(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		await deleteWord(id);
	}
);
