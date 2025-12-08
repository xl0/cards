import { getWordWithTranslations } from '$lib/remote/word.remote';

// Global cache for word details (meanings + translations)
let wordDetails = $state<Record<number, ReturnType<typeof getWordWithTranslations>>>({});

export function getWordDetails(wordId: number) {
	return wordDetails[wordId];
}

export function ensureWordDetails(wordId: number) {
	if (!wordDetails[wordId]) wordDetails = { ...wordDetails, [wordId]: getWordWithTranslations({ id: wordId }) };
}

export function refreshWordDetails(wordId: number) {
	wordDetails = { ...wordDetails, [wordId]: getWordWithTranslations({ id: wordId }) };
}
