import { command, query } from '$app/server';
import * as v from 'valibot';
import { getTranslation, upsertTranslation, deleteTranslation, getTranslations } from '$lib/server/db/translations';
import { LangPairs } from '$lib/enums';

export const getTranslationQuery = query(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		return await getTranslation(id);
	}
);

export const getTranslationsQuery = query(
	v.object({
		page: v.optional(v.number()),
		limit: v.optional(v.number()),
		langPair: v.enum(LangPairs)
	}),
	async ({ page, limit, langPair }) => {
		return await getTranslations({ page, limit, langPair });
	}
);

export const upsertTranslationAction = command(
	v.object({
		srcId: v.number(),
		dstId: v.number(),
		langPair: v.enum(LangPairs)
	}),
	async ({ srcId, dstId, langPair }) => {
		// Create handles checking if it already exists
		return await upsertTranslation({
			srcMeaningId: srcId,
			dstMeaningId: dstId,
			langPair
		});
	}
);

export const deleteTranslationAction = command(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		await deleteTranslation(id);
	}
);
