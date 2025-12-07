import { getWords, createWord, deleteWord } from '$lib/server/db/words';
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const words = await getWords();
	return { words };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const word = formData.get('text') as string;
		const lang = formData.get('lang') as string;
		const pos = formData.get('pos') as string;

		if (!word || !lang || !pos) {
			return fail(400, { missing: true });
		}

		await createWord({
			langPair: 'en_es', // Default for now
			word,
			lang,
			pos
		});

		return { success: true };
	},
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = parseInt(formData.get('id') as string);

		if (isNaN(id)) {
			return fail(400, { invalidId: true });
		}

		await deleteWord(id);
		return { success: true };
	}
};
