import { relations } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import type { LangPair, Lang, PartOfSpeech } from '$lib/enums';

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	age: integer('age'),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull()
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull()
});

export const word = sqliteTable(
	'word',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		langPair: text('lang_pair').notNull().$type<LangPair>(),
		word: text('text').notNull(),
		lang: text('lang', { length: 2 }).notNull().$type<Lang>(),
		pos: text('pos').notNull().$type<PartOfSpeech>()
	},
	(t) => [uniqueIndex('word_text_lang_pos').on(t.langPair, t.word, t.lang, t.pos)]
);

export const wordMeaning = sqliteTable(
	'word_meaning',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		langPair: text('lang_pair').notNull().$type<LangPair>(),
		wordId: integer('word_id')
			.notNull()
			.references(() => word.id, { onDelete: 'cascade' }),
		definition: text('definition').notNull(),
		examples: text('examples', { mode: 'json' }).$type<string[] | null>()
	},
	(t) => [uniqueIndex('meaning_definition_idx').on(t.langPair, t.wordId, t.definition)]
);

export const translation = sqliteTable(
	'translation',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		langPair: text('lang_pair').notNull().$type<LangPair>(),
		srcMeaningId: integer('src_meaning_id')
			.notNull()
			.references(() => wordMeaning.id, { onDelete: 'cascade' }),
		dstMeaningId: integer('dst_meaning_id')
			.notNull()
			.references(() => wordMeaning.id, { onDelete: 'cascade' })
	},
	(t) => [uniqueIndex('translation_pair_unique').on(t.langPair, t.srcMeaningId, t.dstMeaningId)]
);

export const meaningRelation = sqliteTable(
	'meaning_relation',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		langPair: text('lang_pair').notNull().$type<LangPair>(),
		meaningId1: integer('meaning_id_1')
			.notNull()
			.references(() => wordMeaning.id, { onDelete: 'cascade' }),
		meaningId2: integer('meaning_id_2')
			.notNull()
			.references(() => wordMeaning.id, { onDelete: 'cascade' }),
		relationType: text('relation_type').notNull()
	},
	(t) => [uniqueIndex('meaning_relation_unique').on(t.langPair, t.meaningId1, t.meaningId2, t.relationType)]
);

export const wordRelations = relations(word, ({ many }) => ({
	meanings: many(wordMeaning)
}));

export const wordMeaningRelations = relations(wordMeaning, ({ one, many }) => ({
	word: one(word, {
		fields: [wordMeaning.wordId],
		references: [word.id]
	}),
	translationsAsSrc: many(translation, { relationName: 'srcTranslations' }),
	translationsAsDst: many(translation, { relationName: 'dstTranslations' })
}));

export const translationRelations = relations(translation, ({ one }) => ({
	srcMeaning: one(wordMeaning, {
		fields: [translation.srcMeaningId],
		references: [wordMeaning.id],
		relationName: 'srcTranslations'
	}),
	dstMeaning: one(wordMeaning, {
		fields: [translation.dstMeaningId],
		references: [wordMeaning.id],
		relationName: 'dstTranslations'
	})
}));

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Word = typeof word.$inferSelect;
export type WordMeaning = typeof wordMeaning.$inferSelect;
export type Translation = typeof translation.$inferSelect;
export type MeaningRelation = typeof meaningRelation.$inferSelect;
