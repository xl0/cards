import { getWord } from '$lib/server/db/words';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) throw error(404, 'Invalid ID');

	const word = await getWord(id, { withMeanings: true, withTranslations: true });
	if (!word) throw error(404, 'Word not found');

	// Cast to assert existence of translationsAsSrc since we requested it
	return {
		word: word as NonNullable<typeof word> & {
			meanings: {
				translationsAsSrc: {
					id: number;
					dstMeaning: {
						word: {
							word: string;
							lang: string;
							pos: string;
						};
						definition: string;
					};
				}[];
			}[];
		}
	};
};
