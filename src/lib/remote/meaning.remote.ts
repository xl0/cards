import { command, query } from '$app/server';
import * as v from 'valibot';
import { getMeanings, getMeaning, upsertMeaning, deleteMeaning, searchMeanings } from '$lib/server/db/meanings';
import { LangPairs } from '$lib/enums';

export const getMeaningsQuery = query(
	v.object({
		page: v.optional(v.number()),
		limit: v.optional(v.number()),
		langPair: v.enum(LangPairs)
	}),
	async ({ page, limit, langPair }) => {
		return await getMeanings({ page, limit, langPair });
	}
);

export const getMeaningQuery = query(
	v.object({
		id: v.number(),
		withTranslations: v.optional(v.boolean())
	}),
	async ({ id, withTranslations }) => {
		return await getMeaning(id, { withTranslations });
	}
);

export const searchMeaningsQuery = query(
	v.object({
		q: v.string(),
		langPair: v.enum(LangPairs)
	}),
	async ({ q, langPair }) => {
		return await searchMeanings({ query: q, langPair });
	}
);

export const upsertMeaningAction = command(
	v.object({
		id: v.optional(v.number()),
		wordId: v.number(),
		definition: v.string(),
		examples: v.array(v.string()),
		langPair: v.enum(LangPairs)
	}),
	async ({ id, wordId, definition, examples, langPair }) => {
		return await upsertMeaning({
			id,
			wordId,
			definition,
			examples,
			langPair
		});
	}
);

export const deleteMeaningAction = command(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		await deleteMeaning(id);
	}
);
