import type { LangPair } from '$lib/enums';
import { and, desc, eq, like } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from './index';
import * as schema from './schema';
import dbg from 'debug';
const debug = dbg('app:db:meanings');

export const DBgetMeanings = async ({ page = 1, limit = 50, langPair }: { page?: number; limit?: number; langPair: LangPair }) => {
	const offset = (page - 1) * limit;
	const meanings = await db.query.wordMeaning.findMany({
		where: eq(schema.wordMeaning.langPair, langPair),
		limit,
		offset,
		orderBy: [desc(schema.wordMeaning.id)],
		with: {
			word: true,
			meaningImages: {
				columns: { imageId: true }
			}
		}
	});
	debug('getMeanings p%d/%d -> %d', page, limit, meanings.length);
	return meanings;
};

export const DBgetMeaning = async (id: number) => {
	const meaning = await db.query.wordMeaning.findFirst({
		where: eq(schema.wordMeaning.id, id),
		with: {
			word: true,
			meaningImages: {
				columns: { imageId: true }
			}
		}
	});
	debug('getMeaning %d -> %s:%s', id, meaning?.word.word, meaning?.definition?.slice(0, 20));
	return meaning;
};

export const DBgetMeaningWithTranslations = async (id: number) => {
	const meaning = await db.query.wordMeaning.findFirst({
		where: eq(schema.wordMeaning.id, id),
		with: {
			word: true,
			meaningImages: {
				columns: { imageId: true }
			},
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
	debug(
		'getMeaningWithTranslations %d -> %s:%s →%s',
		id,
		meaning?.word.word,
		meaning?.definition?.slice(0, 20),
		meaning?.translationsAsSrc.map((t) => t.dstMeaning.word.word).join(',')
	);
	return meaning;
};

export const DBupsertMeaning = async (data: typeof schema.wordMeaning.$inferInsert) => {
	if (data.id) {
		const [updatedMeaning] = await db.update(schema.wordMeaning).set(data).where(eq(schema.wordMeaning.id, data.id)).returning();
		debug('updateMeaning %d -> %s', data.id, updatedMeaning.definition?.slice(0, 30));
		return updatedMeaning;
	} else {
		const [newMeaning] = await db
			.insert(schema.wordMeaning)
			.values(data)
			.onConflictDoUpdate({
				target: [schema.wordMeaning.langPair, schema.wordMeaning.wordId, schema.wordMeaning.definition],
				set: { examples: data.examples }
			})
			.returning();
		debug('insertMeaning %s -> %d', data.definition?.slice(0, 30), newMeaning.id);
		return newMeaning;
	}
};

export const DBdeleteMeaning = async (id: number) => {
	debug('deleteMeaning %d', id);
	await db.delete(schema.wordMeaning).where(eq(schema.wordMeaning.id, id));
};

// Image functions
export const DBcreateImage = async (prompt?: string) => {
	const [img] = await db.insert(schema.image).values({ prompt }).returning();
	debug('createImage %s -> %s', prompt?.slice(0, 30), img.id.slice(0, 8));
	return img;
};

export const DBlinkImageToMeaning = async (meaningId: number, imageId: string) => {
	debug('linkImage %d <-> %s', meaningId, imageId.slice(0, 8));
	await db.insert(schema.meaningImage).values({ meaningId, imageId }).onConflictDoNothing();
};

export const DBunlinkImageFromMeaning = async (meaningId: number, imageId: string) => {
	debug('unlinkImage %d <-> %s', meaningId, imageId.slice(0, 8));
	await db.delete(schema.meaningImage).where(and(eq(schema.meaningImage.meaningId, meaningId), eq(schema.meaningImage.imageId, imageId)));
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

	debug('searchMeanings %s -> %d results', word, results.length);
	return results;
};
