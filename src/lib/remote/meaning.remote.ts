import { command, query } from '$app/server';
import * as v from 'valibot';
import {
	DBgetMeanings,
	DBgetMeaning,
	DBgetMeaningWithTranslations,
	DBsearchMeanings,
	DBupsertMeaning,
	DBdeleteMeaning
} from '$lib/server/db/meanings';
import { LangPairs } from '$lib/enums';

export const getMeanings = query(
	v.object({
		page: v.optional(v.number()),
		limit: v.optional(v.number()),
		langPair: v.enum(LangPairs)
	}),
	async ({ page, limit, langPair }) => {
		return await DBgetMeanings({ page, limit, langPair });
	}
);

export const getMeaning = query(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		return await DBgetMeaning(id);
	}
);

export const getMeaningWithTranslations = query(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		return await DBgetMeaningWithTranslations(id);
	}
);

export const searchMeanings = query(
	v.object({
		word: v.string(),
		langPair: v.enum(LangPairs)
	}),
	async ({ word, langPair }) => {
		return await DBsearchMeanings({ word, langPair });
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
		return await DBupsertMeaning({
			id,
			wordId,
			definition,
			examples,
			langPair
		});
	}
);

export const deleteMeaning = command(
	v.object({
		id: v.number()
	}),
	async ({ id }) => {
		await DBdeleteMeaning(id);
	}
);
