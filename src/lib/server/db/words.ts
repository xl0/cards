import type { LangPair } from '$lib/enums';
import dbg from 'debug';
import { and, asc, count, desc, eq, getTableColumns, ilike, sql } from 'drizzle-orm';
import { db } from './index';
import * as schema from './schema';
const debug = dbg('app:db:words');

export const DBgetWords = async ({
	page = 1,
	limit = 50,
	langPair,
	filter,
	sort = 'id',
	order = 'desc'
}: {
	page?: number;
	limit?: number;
	langPair: LangPair;
	filter?: string;
	sort?: string;
	order?: 'asc' | 'desc';
}) => {
	const offset = (page - 1) * limit;

	filter = filter?.replace(/[%_]/g, '');
	const where = and(eq(schema.word.langPair, langPair), filter ? ilike(schema.word.word, `%${filter}%`) : undefined);

	const [totalResult] = await db.select({ count: count() }).from(schema.word).where(where);

	const direction = order === 'asc' ? asc : desc;
	let orderByClause;

	switch (sort) {
		case 'word':
			orderByClause = direction(schema.word.word);
			break;
		case 'lang':
			orderByClause = direction(schema.word.lang);
			break;
		case 'pos':
			orderByClause = direction(schema.word.pos);
			break;
		case 'meaningsCount':
			orderByClause = direction(sql`meaningsCount`);
			break;
		default:
			orderByClause = direction(schema.word.id);
	}

	const words = await db
		.select({
			...getTableColumns(schema.word),
			meaningsCount: count(schema.wordMeaning.id).as('meaningsCount')
		})
		.from(schema.word)
		.leftJoin(schema.wordMeaning, eq(schema.word.id, schema.wordMeaning.wordId))
		.where(where)
		.groupBy(schema.word.id)
		.orderBy(orderByClause)
		.limit(limit)
		.offset(offset);

	debug('getWords %d/%d %s -> %d words', page, limit, filter || '*', words.length);
	return { words, total: totalResult.count };
};

export const DBgetWordTranslation = async (id: number) => {
	const word = await db.query.word.findFirst({
		where: eq(schema.word.id, id),
		with: {
			meanings: {
				orderBy: asc(schema.wordMeaning.id),
				with: {
					meaningImages: { columns: { imageId: true } },

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
	debug(
		'DBgetWordTranslations %d -> %s, {%s}',
		id,
		word?.word,
		word?.meanings
			.map((m) => {
				const def = (m.definition ?? '').slice(0, 40);
				const images = m.meaningImages?.map((im) => im.imageId).join(',') ?? '';
				const asSrc = m.translationsAsSrc.map((t) => `${t.dstMeaning.word.word}(${t.dstMeaningId})`).join(',');
				const asDst = m.translationsAsDst.map((t) => `${t.srcMeaning.word.word}(${t.srcMeaningId})`).join(',');
				return `${m.id}:${def} imgs=[${images}] src=[${asSrc}] dst=[${asDst}]`;
			})
			.join('; ')
	);
	return word;
};

export const DBupsertWord = async (data: Partial<typeof schema.word.$inferInsert>) => {
	if (data.id) {
		const [updatedWord] = await db.update(schema.word).set(data).where(eq(schema.word.id, data.id)).returning();
		debug('updateWord %d -> %s', data.id, updatedWord.word);
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
		debug('insertWord %s -> %d', data.word, newWord.id);
		return newWord;
	}
};

export const DBdeleteWord = async (id: number) => {
	debug('deleteWord %d', id);
	await db.delete(schema.word).where(eq(schema.word.id, id));
};
