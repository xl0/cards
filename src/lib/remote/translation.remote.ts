import { command } from '$app/server';
import { LangPairs } from '$lib/enums';
import { DBdeleteTranslation, DBupsertTranslation } from '$lib/server/db/translations';
import dbg from 'debug';
import * as v from 'valibot';
const debug = dbg('app:remote:translation');

// export const getTranslation = query(
// 	v.object({
// 		id: v.number()
// 	}),
// 	async ({ id }) => {
// 		const t = await DBgetTranslation(id);
// 		debug('getTranslation %d -> %s↔%s', id, t?.srcMeaning.word.word, t?.dstMeaning.word.word);
// 		return t;
// 	}
// );

// export const getTranslations = query(
// 	v.object({
// 		page: v.optional(v.number()),
// 		limit: v.optional(v.number()),
// 		langPair: v.enum(LangPairs)
// 	}),
// 	async ({ page, limit, langPair }) => {
// 		const translations = await DBgetTranslations({ page, limit, langPair });
// 		debug('getTranslations p%d -> %d', page, translations.length);
// 		return translations;
// 	}
// );

export const upsertTranslation = command(
	v.object({
		srcId: v.number(),
		dstId: v.number(),
		langPair: v.enum(LangPairs)
	}),
	async ({ srcId, dstId, langPair }) => {
		const result = await DBupsertTranslation({ srcMeaningId: srcId, dstMeaningId: dstId, langPair });
		debug('upsertTranslation %d↔%d -> %d', srcId, dstId, result.id);
		return result;
	}
);

export const deleteTranslation = command(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		debug('deleteTranslation %d', id);
		await DBdeleteTranslation(id);
	}
);
