import { command, query } from '$app/server';
import * as v from 'valibot';
import { DBgetWords, DBgetWordTranslation, DBupsertWord, DBdeleteWord } from '$lib/server/db/words';
import { Langs, PartsOfSpeech, LangPairs } from '$lib/enums';
import dbg from 'debug';
const debug = dbg('app:remote:word');

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
		debug('getWords', { page, limit, langPair, filter, sort, order });
		const result = await DBgetWords({ page, limit, langPair, filter, sort, order });
		debug('getWords %d %s -> %d/%d', page, filter || '*', result.words.length, result.total);
		return result;
	}
);

// export const getWord = query(
// 	v.object({
// 		id: v.number()
// 	}),
// 	async ({ id }) => {
// 		const word = await DBgetWord(id);
// 		debug('getWord %d -> %s', id, word?.word);
// 		return word;
// 	}
// );

// export const getWordWithMeanings = query(
// 	v.object({
// 		id: v.number()
// 	}),
// 	async ({ id }) => {
// 		const word = await DBgetWordWithMeanings(id);
// 		debug('getWordWithMeanings %d -> %s (%d meanings)', id, word?.word, word?.meanings.length);
// 		return word;
// 	}
// );

export const getWordTranslation = query(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		const word = await DBgetWordTranslation(id);
		debug('getWordWithTranslations %d -> %s (%d meanings)', id, word?.word, word?.meanings.length);
		return word;
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
		const result = await DBupsertWord({ id, word, lang, pos, langPair });
		debug('upsertWord %s %s/%s -> %d', word, lang, pos, result.id);
		return result;
	}
);

export const deleteWord = command(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		debug('deleteWord %d', id);
		await DBdeleteWord(id);
	}
);
