import type { LangPair } from '$lib/enums';
import { eq } from 'drizzle-orm';
import { db } from './index';
import * as schema from './schema';
import dbg from 'debug';
const debug = dbg('app:db:translations');


export const DBupsertTranslation = async (data: typeof schema.translation.$inferInsert) => {
	if (data.id) {
		const [updatedTranslation] = await db.update(schema.translation).set(data).where(eq(schema.translation.id, data.id)).returning();
		debug('updateTranslation %d', data.id);
		return updatedTranslation;
	} else {
		const [newTranslation] = await db
			.insert(schema.translation)
			.values(data)
			.onConflictDoUpdate({
				target: [schema.translation.langPair, schema.translation.srcMeaningId, schema.translation.dstMeaningId],
				set: { langPair: data.langPair } // Dummy update to ensure return
			})
			.returning();
		debug('insertTranslation %d↔%d -> %d', data.srcMeaningId, data.dstMeaningId, newTranslation.id);
		return newTranslation;
	}
};

export const DBdeleteTranslation = async (id: number) => {
	debug('deleteTranslation %d', id);
	await db.delete(schema.translation).where(eq(schema.translation.id, id));
};
