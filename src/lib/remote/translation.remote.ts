import { command, query } from '$app/server';
import * as v from 'valibot';
import { DBgetTranslation, DBgetTranslations, DBupsertTranslation, DBdeleteTranslation } from '$lib/server/db/translations';
import { LangPairs } from '$lib/enums';

export const getTranslation = query(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		return await DBgetTranslation(id);
	}
);

export const getTranslations = query(
	v.object({
		page: v.optional(v.number()),
		limit: v.optional(v.number()),
		langPair: v.enum(LangPairs)
	}),
	async ({ page, limit, langPair }) => {
		return await DBgetTranslations({ page, limit, langPair });
	}
);

export const upsertTranslation = command(
	v.object({
		srcId: v.number(),
		dstId: v.number(),
		langPair: v.enum(LangPairs)
	}),
	async ({ srcId, dstId, langPair }) => {
		// Create handles checking if it already exists
		return await DBupsertTranslation({
			srcMeaningId: srcId,
			dstMeaningId: dstId,
			langPair
		});
	}
);

export const deleteTranslation = command(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		await DBdeleteTranslation(id);
	}
);
