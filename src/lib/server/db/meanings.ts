import type { LangPair } from '$lib/enums';
import { and, desc, eq, like } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db } from './index';
import * as schema from './schema';

export const DBgetMeanings = async ({ page = 1, limit = 50, langPair }: { page?: number; limit?: number; langPair: LangPair }) => {
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

export const DBgetMeaning = async (id: number) => {
	const meaning = await db.query.wordMeaning.findFirst({
		where: eq(schema.wordMeaning.id, id),
		with: {
			word: true
		}
	});

	return meaning;
};

export const DBgetMeaningWithTranslations = async (id: number) => {
	const meaning = await db.query.wordMeaning.findFirst({
		where: eq(schema.wordMeaning.id, id),
		with: {
			word: true,
			translationsAsSrc: {
				with: {
					dstMeaning: {
						with: {
							word: true
						}
					}
				}
			},
			translationsAsDst: {
				with: {
					srcMeaning: {
						with: {
							word: true
						}
					}
				}
			}
		}
	});

	return meaning;
};

export const DBupsertMeaning = async (data: typeof schema.wordMeaning.$inferInsert) => {
	if (data.id) {
		const [updatedMeaning] = await db.update(schema.wordMeaning).set(data).where(eq(schema.wordMeaning.id, data.id)).returning();
		return updatedMeaning;
	} else {
		const [newMeaning] = await db.insert(schema.wordMeaning).values(data).returning();
		return newMeaning;
	}
};

export const DBdeleteMeaning = async (id: number) => {
	// Then delete the meaning (cascading deletes will handle relations)
	await db.delete(schema.wordMeaning).where(eq(schema.wordMeaning.id, id));
};

export const DBsearchMeanings = async ({ word, langPair }: { word: string; langPair: LangPair }) => {
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
		.where(and(eq(schema.wordMeaning.langPair, langPair), like(wordAlias.word, `%${word}%`)))
		.limit(10);

	return results;
};
