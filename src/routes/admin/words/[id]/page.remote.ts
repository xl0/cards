import { form, command, query } from '$app/server';
import * as v from 'valibot';
import { createMeaning, deleteMeaning } from '$lib/server/db/meanings';
import { createTranslation, deleteTranslation, searchMeanings } from '$lib/server/db/translations';

export const searchMeaningsQuery = query(
	v.object({
		q: v.string(),
		excludeId: v.optional(v.number())
	}),
	async ({ q, excludeId }) => {
		return await searchMeanings(q, excludeId);
	}
);

export const createMeaningAction = command(
	v.object({
		wordId: v.number(),
		definition: v.string(),
		examples: v.optional(v.string())
	}),
	async ({ wordId, definition, examples }) => {
		const exampleList = examples ? examples.split('\n').filter((e) => e.trim().length > 0) : [];
		await createMeaning({
			langPair: 'en_es',
			wordId,
			definition,
			examples: exampleList
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

export const addTranslationAction = command(
	v.object({
		srcId: v.number(),
		dstId: v.number()
	}),
	async ({ srcId, dstId }) => {
		await createTranslation(srcId, dstId);
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
