import { pgSchema } from 'drizzle-orm/pg-core';
import { LangPairs, Langs, PartsOfSpeech, type LangPair, type Lang, type PartOfSpeech } from '$lib/enums';

const cards = pgSchema('cards');

// Helper to extract values as tuple for drizzle enum
const enumValues = <T extends Record<string, string>>(obj: T) => Object.values(obj) as [T[keyof T], ...T[keyof T][]];

// pgEnums derived from $lib/enums (source of truth)
export const langPairEnum = cards.enum('lang_pair', enumValues(LangPairs) as [LangPair, ...LangPair[]]);
export const langEnum = cards.enum('lang', enumValues(Langs) as [Lang, ...Lang[]]);
export const partOfSpeechEnum = cards.enum('part_of_speech', enumValues(PartsOfSpeech) as [PartOfSpeech, ...PartOfSpeech[]]);
