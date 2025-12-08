import { getWords } from '$lib/server/db/words';
import type { PageServerLoad } from './$types';
import type { LangPair } from '$lib/enums';

export const load: PageServerLoad = async ({ url }) => {
	const page = parseInt(url.searchParams.get('page') ?? '1');
	const limit = parseInt(url.searchParams.get('limit') ?? '50');
	const langPair = (url.searchParams.get('langPair') as LangPair) ?? 'en_es';

	const words = await getWords({ page, limit, langPair });

	return {
		words,
		langPair
	};
};
