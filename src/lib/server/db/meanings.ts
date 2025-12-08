import { db } from './index';
import * as schema from './schema';
import { eq, desc, and, like, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import type { LangPair } from '$lib/enums';

export const getMeanings = async ({ page = 1, limit = 50, langPair }: { page?: number; limit?: number; langPair: LangPair }) => {
	const offset = (page - 1) * limit;
	const meanings = await db.query.wordMeaning.findMany({
		where: eq(schema.wordMeaning.langPair, langPair),
		limit,
		offset,
		orderBy: [desc(schema.wordMeaning.id)],
		with: {
			word: true
		}
	});
	return meanings;
};

export const getMeaning = async (id: number, { withTranslations = true } = {}) => {
	const meaning = await db.query.wordMeaning.findFirst({
		where: eq(schema.wordMeaning.id, id),
		with: {
			word: true,
			translationsAsSrc: withTranslations
				? {
						with: {
							dstMeaning: {
								with: {
									word: true
								}
							}
						}
					}
				: undefined
		}
	});

	if (!meaning) return null;

	return meaning;
};

export const upsertMeaning = async (data: Partial<typeof schema.wordMeaning.$inferInsert>) => {
	if (data.id) {
		const [updatedMeaning] = await db.update(schema.wordMeaning).set(data).where(eq(schema.wordMeaning.id, data.id)).returning();
		return updatedMeaning;
	} else {
		const [newMeaning] = await db
			.insert(schema.wordMeaning)
			.values(data as typeof schema.wordMeaning.$inferInsert)
			.returning();
		return newMeaning;
	}
};

export const deleteMeaning = async (id: number) => {
	// Then delete the meaning (cascading deletes will handle relations)
	await db.delete(schema.wordMeaning).where(eq(schema.wordMeaning.id, id));
};

export const searchMeanings = async ({ query, langPair }: { query: string; langPair: LangPair }) => {
	const wordAlias = alias(schema.word, 'w');
	// Simple search by word text
	const results = await db
		.select({
			id: schema.wordMeaning.id,
			definition: schema.wordMeaning.definition,
			word: {
				text: wordAlias.word,
				lang: wordAlias.lang,
				pos: wordAlias.pos
			}
		})
		.from(schema.wordMeaning)
		.innerJoin(wordAlias, eq(schema.wordMeaning.wordId, wordAlias.id))
		.where(and(eq(schema.wordMeaning.langPair, langPair), like(wordAlias.word, `%${query}%`)))
		.limit(10);

	return results;
};
