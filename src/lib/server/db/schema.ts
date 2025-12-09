import { relations } from 'drizzle-orm';
import { serial, text, integer, timestamp, jsonb, uniqueIndex, pgSchema, uuid } from 'drizzle-orm/pg-core';
export { langPairEnum, langEnum, partOfSpeechEnum } from './enums';
import { langPairEnum, langEnum, partOfSpeechEnum } from './enums';

export const cards = pgSchema('cards');

// Auth tables (skip for now per user request)
export const user = cards.table('user', {
	id: text('id').primaryKey(),
	age: integer('age'),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});

export const session = cards.table('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date())
});

export const word = cards.table(
	'word',
	{
		id: serial('id').primaryKey(),
		langPair: langPairEnum('lang_pair').notNull(),
		word: text('text').notNull(),
		lang: langEnum('lang').notNull(),
		pos: partOfSpeechEnum('pos').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(t) => [uniqueIndex('word_text_lang_pos').on(t.langPair, t.word, t.lang, t.pos)]
);

export const wordMeaning = cards.table(
	'word_meaning',
	{
		id: serial('id').primaryKey(),
		langPair: langPairEnum('lang_pair').notNull(),
		wordId: integer('word_id')
			.notNull()
			.references(() => word.id, { onDelete: 'cascade' }),
		definition: text('definition').notNull(),
		examples: jsonb('examples').$type<string[] | null>(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(t) => [uniqueIndex('meaning_definition_idx').on(t.langPair, t.wordId, t.definition)]
);

// Images table - UUID key for unpredictable URLs
export const image = cards.table('image', {
	id: uuid('id').primaryKey().defaultRandom(),
	prompt: text('prompt'), // AI generation prompt if applicable
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

// Junction table for many-to-many meaning <-> image
export const meaningImage = cards.table(
	'meaning_image',
	{
		meaningId: integer('meaning_id')
			.notNull()
			.references(() => wordMeaning.id, { onDelete: 'cascade' }),
		imageId: uuid('image_id')
			.notNull()
			.references(() => image.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [uniqueIndex('meaning_image_unique').on(t.meaningId, t.imageId)]
);

export const translation = cards.table(
	'translation',
	{
		id: serial('id').primaryKey(),
		langPair: langPairEnum('lang_pair').notNull(),
		srcMeaningId: integer('src_meaning_id')
			.notNull()
			.references(() => wordMeaning.id, { onDelete: 'cascade' }),
		dstMeaningId: integer('dst_meaning_id')
			.notNull()
			.references(() => wordMeaning.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(t) => [uniqueIndex('translation_pair_unique').on(t.langPair, t.srcMeaningId, t.dstMeaningId)]
);

export const meaningRelation = cards.table(
	'meaning_relation',
	{
		id: serial('id').primaryKey(),
		langPair: langPairEnum('lang_pair').notNull(),
		meaningId1: integer('meaning_id_1')
			.notNull()
			.references(() => wordMeaning.id, { onDelete: 'cascade' }),
		meaningId2: integer('meaning_id_2')
			.notNull()
			.references(() => wordMeaning.id, { onDelete: 'cascade' }),
		relationType: text('relation_type').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(t) => [uniqueIndex('meaning_relation_unique').on(t.langPair, t.meaningId1, t.meaningId2, t.relationType)]
);

export const wordRelations = relations(word, ({ many }) => ({
	meanings: many(wordMeaning)
}));

export const wordMeaningRelations = relations(wordMeaning, ({ one, many }) => ({
	word: one(word, { fields: [wordMeaning.wordId], references: [word.id] }),
	translationsAsSrc: many(translation, { relationName: 'srcTranslations' }),
	translationsAsDst: many(translation, { relationName: 'dstTranslations' }),
	meaningImages: many(meaningImage)
}));

export const translationRelations = relations(translation, ({ one }) => ({
	srcMeaning: one(wordMeaning, { fields: [translation.srcMeaningId], references: [wordMeaning.id], relationName: 'srcTranslations' }),
	dstMeaning: one(wordMeaning, { fields: [translation.dstMeaningId], references: [wordMeaning.id], relationName: 'dstTranslations' })
}));

export const imageRelations = relations(image, ({ many }) => ({
	meaningImages: many(meaningImage)
}));

export const meaningImageRelations = relations(meaningImage, ({ one }) => ({
	meaning: one(wordMeaning, { fields: [meaningImage.meaningId], references: [wordMeaning.id] }),
	image: one(image, { fields: [meaningImage.imageId], references: [image.id] })
}));

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Word = typeof word.$inferSelect;
export type WordMeaning = typeof wordMeaning.$inferSelect;
export type Translation = typeof translation.$inferSelect;
export type MeaningRelation = typeof meaningRelation.$inferSelect;
export type Image = typeof image.$inferSelect;
export type MeaningImage = typeof meaningImage.$inferSelect;
