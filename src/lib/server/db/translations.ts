import type { LangPair } from '$lib/enums';
import { eq } from 'drizzle-orm';
import { db } from './index';
import * as schema from './schema';

export const DBgetTranslation = async (id: number) => {
	const translation = await db.query.translation.findFirst({
		where: eq(schema.translation.id, id),
		with: {
			srcMeaning: { with: { word: true } },
			dstMeaning: { with: { word: true } }
		}
	});
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
	return translations;
};

export const DBupsertTranslation = async (data: typeof schema.translation.$inferInsert) => {
	if (data.id) {
		const [updatedTranslation] = await db.update(schema.translation).set(data).where(eq(schema.translation.id, data.id)).returning();
		return updatedTranslation;
	} else {
		// Try to insert, if conflict (already exists), return existing

		const [newTranslation] = await db
			.insert(schema.translation)
			.values(data)
			.onConflictDoUpdate({
				target: [schema.translation.langPair, schema.translation.srcMeaningId, schema.translation.dstMeaningId],
				set: { langPair: data.langPair } // Dummy update to ensure return
			})
			.returning();
		return newTranslation;
	}
};

export const DBdeleteTranslation = async (id: number) => {
	await db.delete(schema.translation).where(eq(schema.translation.id, id));
};
