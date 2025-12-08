import { db } from './index';
import * as schema from './schema';
import { eq, count, desc, getTableColumns } from 'drizzle-orm';
import type { LangPair } from '$lib/enums';

export const DBgetWords = async ({ page = 1, limit = 50, langPair }: { page?: number; limit?: number; langPair: LangPair }) => {
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

export const DBgetWord = async (id: number) => {
	const word = await db.query.word.findFirst({
		where: eq(schema.word.id, id)
	});

	return word;
};

export const DBgetWordWithMeanings = async (id: number) => {
	const word = await db.query.word.findFirst({
		where: eq(schema.word.id, id),
		with: {
			meanings: true
		}
	});

	return word;
};

export const DBgetWordWithTranslations = async (id: number) => {
	const word = await db.query.word.findFirst({
		where: eq(schema.word.id, id),
		with: {
			meanings: {
				with: {
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
			}
		}
	});

	return word;
};

export const DBupsertWord = async (data: Partial<typeof schema.word.$inferInsert>) => {
	if (data.id) {
		const [updatedWord] = await db.update(schema.word).set(data).where(eq(schema.word.id, data.id)).returning();
		return updatedWord;
	} else {
		const [newWord] = await db
			.insert(schema.word)
			.values(data as typeof schema.word.$inferInsert)
			.onConflictDoUpdate({
				target: [schema.word.langPair, schema.word.word, schema.word.lang, schema.word.pos],
				set: { langPair: data.langPair } // Dummy update
			})
			.returning();
		return newWord;
	}
};

export const DBdeleteWord = async (id: number) => {
	await db.delete(schema.word).where(eq(schema.word.id, id));
};
