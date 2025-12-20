import { relations } from 'drizzle-orm';
import { serial, text, integer, timestamp, jsonb, uniqueIndex, uuid, index, pgSchema } from 'drizzle-orm/pg-core';
import {
	LangPairs,
	Langs,
	PartsOfSpeech,
	ImageSources,
	GenerationStatuses,
	type LangPair,
	type Lang,
	type PartOfSpeech,
	type ImageSource,
	type GenerationStatus
} from '$lib/enums';

export const cards = pgSchema('cards');

const enumValues = <T extends Record<string, string>>(obj: T) => Object.values(obj) as [T[keyof T], ...T[keyof T][]];

export const langPairEnum = cards.enum('lang_pair', enumValues(LangPairs) as [LangPair, ...LangPair[]]);
export const langEnum = cards.enum('lang', enumValues(Langs) as [Lang, ...Lang[]]);
export const partOfSpeechEnum = cards.enum('part_of_speech', enumValues(PartsOfSpeech) as [PartOfSpeech, ...PartOfSpeech[]]);

export const imageSourceEnum = cards.enum('image_source', enumValues(ImageSources) as [ImageSource, ...ImageSource[]]);
export const generationStatusEnum = cards.enum(
	'generation_status',
	enumValues(GenerationStatuses) as [GenerationStatus, ...GenerationStatus[]]
);

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
		imageGenStatus: generationStatusEnum('image_gen_status'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(t) => [uniqueIndex('meaning_definition_idx').on(t.langPair, t.wordId, t.definition)]
);

// Image generation tracking table
export type ImageGenAttempt = {
	prompt: string;
	imageKey: string;
	evaluation: { success: boolean; feedback: string };
};

export const imageGeneration = cards.table(
	'image_generation',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		meaningId: integer('meaning_id')
			.notNull()
			.references(() => wordMeaning.id, { onDelete: 'cascade' }),
		status: generationStatusEnum('status').notNull().default('pending'),
		word: text('word').notNull(),
		meaning: text('meaning').notNull(),
		language: text('language').notNull(),
		attempts: jsonb('attempts').$type<ImageGenAttempt[]>(),
		finalImageId: uuid('final_image_id'),
		error: text('error'),
		langfuseTraceId: text('langfuse_trace_id'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date())
	},
	(t) => [index('image_generation_meaning_idx').on(t.meaningId)]
);

// Images table - UUID key for unpredictable URLs
export const image = cards.table('image', {
	id: uuid('id').primaryKey().defaultRandom(),
	prompt: text('prompt'),
	source: imageSourceEnum('source').notNull().default('uploaded'),
	generationId: uuid('generation_id').references(() => imageGeneration.id),
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

export const imageGenerationRelations = relations(imageGeneration, ({ one, many }) => ({
	meaning: one(wordMeaning, { fields: [imageGeneration.meaningId], references: [wordMeaning.id] }),
	finalImage: one(image, { fields: [imageGeneration.finalImageId], references: [image.id] }),
	images: many(image)
}));

export const imageRelations = relations(image, ({ one, many }) => ({
	meaningImages: many(meaningImage),
	generation: one(imageGeneration, { fields: [image.generationId], references: [imageGeneration.id] })
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
export type TranslationUpdate = typeof translation.$inferInsert;
export type MeaningRelation = typeof meaningRelation.$inferSelect;
export type Image = typeof image.$inferSelect;
export type MeaningImage = typeof meaningImage.$inferSelect;
export type ImageGeneration = typeof imageGeneration.$inferSelect;
export type ImageGenerationInsert = typeof imageGeneration.$inferInsert;
