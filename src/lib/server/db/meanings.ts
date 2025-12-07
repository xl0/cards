import { db } from './index';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

export const createMeaning = async (data: typeof schema.wordMeaning.$inferInsert) => {
	const [newMeaning] = await db.insert(schema.wordMeaning).values(data).returning();
	return newMeaning;
};

export const deleteMeaning = async (id: number) => {
	// First delete related translations and relations
	await db.delete(schema.translation).where(eq(schema.translation.srcMeaningId, id));
	await db.delete(schema.translation).where(eq(schema.translation.dstMeaningId, id));
	await db.delete(schema.meaningRelation).where(eq(schema.meaningRelation.meaningId1, id));
	await db.delete(schema.meaningRelation).where(eq(schema.meaningRelation.meaningId2, id));

	// Then delete the meaning
	await db.delete(schema.wordMeaning).where(eq(schema.wordMeaning.id, id));
};
