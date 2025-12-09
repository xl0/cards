// enums.ts is the source of truth
export const LangPairs = { EnEs: 'en_es' } as const;
export type LangPair = (typeof LangPairs)[keyof typeof LangPairs];

export const Langs = { En: 'en', Es: 'es' } as const;
export type Lang = (typeof Langs)[keyof typeof Langs];

export const PartsOfSpeech = {
	Noun: 'noun',
	Verb: 'verb',
	Adjective: 'adjective',
	Adverb: 'adverb',
	Pronoun: 'pronoun',
	Preposition: 'preposition',
	Conjunction: 'conjunction',
	Interjection: 'interjection',
	Determiner: 'determiner'
} as const;
export type PartOfSpeech = (typeof PartsOfSpeech)[keyof typeof PartsOfSpeech];
