import { db } from './index';
import * as schema from './schema';
import { eq, count, desc } from 'drizzle-orm';

export const getWords = async () => {
	const words = await db
		.select({
			id: schema.word.id,
			text: schema.word.word,
			lang: schema.word.lang,
			pos: schema.word.pos,
			meaningsCount: count(schema.wordMeaning.id)
		})
		.from(schema.word)
		.leftJoin(schema.wordMeaning, eq(schema.word.id, schema.wordMeaning.wordId))
		.groupBy(schema.word.id)
		.orderBy(desc(schema.word.id));

	return words;
};

export const getWord = async (id: number) => {
	const word = await db.query.word.findFirst({
		where: eq(schema.word.id, id)
	});

	if (!word) return null;

	const meanings = await db.query.wordMeaning.findMany({
		where: eq(schema.wordMeaning.wordId, id)
	});

	return { ...word, meanings };
};

export const createWord = async (data: typeof schema.word.$inferInsert) => {
	const [newWord] = await db.insert(schema.word).values(data).returning();
	return newWord;
};

export const updateWord = async (id: number, data: Partial<typeof schema.word.$inferInsert>) => {
	const [updatedWord] = await db
		.update(schema.word)
		.set(data)
		.where(eq(schema.word.id, id))
		.returning();
	return updatedWord;
};

export const deleteWord = async (id: number) => {
	await db.delete(schema.word).where(eq(schema.word.id, id));
};
