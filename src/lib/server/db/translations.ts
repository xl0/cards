import { db } from './index';
import * as schema from './schema';
import { eq, or, and, sql, like } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';

export const getMeaningDetails = async (meaningId: number) => {
	const meaning = await db.query.wordMeaning.findFirst({
		where: eq(schema.wordMeaning.id, meaningId),
		with: {
			word: true
		}
	});
	return meaning;
};

export const getTranslations = async (meaningId: number) => {
	// Find translations where meaningId is either src or dst
	const translations = await db
		.select({
			id: schema.translation.id,
			srcMeaningId: schema.translation.srcMeaningId,
			dstMeaningId: schema.translation.dstMeaningId
			// We'll fetch the "other" meaning details
		})
		.from(schema.translation)
		.where(
			or(
				eq(schema.translation.srcMeaningId, meaningId),
				eq(schema.translation.dstMeaningId, meaningId)
			)
		);

	// Enrich with details
	const enriched = await Promise.all(
		translations.map(async (t) => {
			const otherId = t.srcMeaningId === meaningId ? t.dstMeaningId : t.srcMeaningId;
			const otherMeaning = await getMeaningDetails(otherId);
			return {
				...t,
				otherMeaning
			};
		})
	);

	return enriched;
};

export const createTranslation = async (meaningId1: number, meaningId2: number) => {
	// Check if exists
	const existing = await db.query.translation.findFirst({
		where: or(
			and(
				eq(schema.translation.srcMeaningId, meaningId1),
				eq(schema.translation.dstMeaningId, meaningId2)
			),
			and(
				eq(schema.translation.srcMeaningId, meaningId2),
				eq(schema.translation.dstMeaningId, meaningId1)
			)
		)
	});

	if (existing) return existing;

	const [newTranslation] = await db
		.insert(schema.translation)
		.values({
			langPair: 'en_es', // Default
			srcMeaningId: meaningId1,
			dstMeaningId: meaningId2
		})
		.returning();

	return newTranslation;
};

export const deleteTranslation = async (id: number) => {
	await db.delete(schema.translation).where(eq(schema.translation.id, id));
};

export const searchMeanings = async (query: string, excludeId?: number) => {
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
		.where(
			and(
				like(wordAlias.word, `%${query}%`),
				excludeId ? sql`${schema.wordMeaning.id} != ${excludeId}` : undefined
			)
		)
		.limit(10);

	return results;
};
