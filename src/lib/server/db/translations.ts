import type { LangPair } from '$lib/enums';
import { eq } from 'drizzle-orm';
import { db } from './index';
import * as schema from './schema';
import dbg from 'debug';
const debug = dbg('app:db:translations');

export const DBgetTranslation = async (id: number) => {
	const translation = await db.query.translation.findFirst({
		where: eq(schema.translation.id, id),
		with: {
			srcMeaning: { with: { word: true } },
			dstMeaning: { with: { word: true } }
		}
	});
	debug('getTranslation %d -> %s↔%s', id, translation?.srcMeaning.word.word, translation?.dstMeaning.word.word);
	return translation;
};

export const DBgetTranslations = async ({ page = 1, limit = 50, langPair }: { page?: number; limit?: number; langPair: LangPair }) => {
	const offset = (page - 1) * limit;
	const translations = await db.query.translation.findMany({
		where: eq(schema.translation.langPair, langPair),
		limit,
		offset,
		with: {
			srcMeaning: { with: { word: true } },
			dstMeaning: { with: { word: true } }
		}
	});
	debug('getTranslations p%d/%d -> %d', page, limit, translations.length);
	return translations;
};

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
