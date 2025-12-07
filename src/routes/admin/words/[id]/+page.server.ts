import { getWord } from '$lib/server/db/words';
import { createMeaning, deleteMeaning } from '$lib/server/db/meanings';
import { getTranslations, createTranslation, deleteTranslation } from '$lib/server/db/translations';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) throw error(404, 'Invalid ID');

	const word = await getWord(id);
	if (!word) throw error(404, 'Word not found');

	// Fetch translations for each meaning
	const meaningsWithTranslations = await Promise.all(
		word.meanings.map(async (m) => {
			const translations = await getTranslations(m.id);
			return {
				...m,
				translations
			};
		})
	);

	return {
		word: {
			...word,
			meanings: meaningsWithTranslations
		}
	};
};
