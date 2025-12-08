import { db } from './index';
import * as schema from './schema';
import { eq, count, desc, getTableColumns } from 'drizzle-orm';
import type { LangPair } from '$lib/enums';

export const getWords = async ({ page = 1, limit = 50, langPair }: { page?: number; limit?: number; langPair: LangPair }) => {
	const offset = (page - 1) * limit;
	const words = await db
		.select({
			...getTableColumns(schema.word),
			meaningsCount: count(schema.wordMeaning.id)
		})
		.from(schema.word)
		.leftJoin(schema.wordMeaning, eq(schema.word.id, schema.wordMeaning.wordId))
		.where(eq(schema.word.langPair, langPair))
		.groupBy(schema.word.id)
		.orderBy(desc(schema.word.id))
		.limit(limit)
		.offset(offset);

	return words;
};

export const getWord = async (id: number, { withMeanings = true, withTranslations = false } = {}) => {
	const word = await db.query.word.findFirst({
		where: eq(schema.word.id, id),
		with: {
			meanings: withMeanings
				? {
						with: {
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
					}
				: undefined
		}
	});

	if (!word) return null;

	return word;
};

export const upsertWord = async (data: Partial<typeof schema.word.$inferInsert>) => {
	if (data.id) {
		const [updatedWord] = await db.update(schema.word).set(data).where(eq(schema.word.id, data.id)).returning();
		return updatedWord;
	} else {
		const [newWord] = await db
			.insert(schema.word)
			.values(data as typeof schema.word.$inferInsert)
			.returning();
		return newWord;
	}
};

export const deleteWord = async (id: number) => {
	await db.delete(schema.word).where(eq(schema.word.id, id));
};
