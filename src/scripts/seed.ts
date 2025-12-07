
import { db } from '../lib/server/db/index';
import * as schema from '../lib/server/db/schema';

const seed = async () => {
	console.log('🌱 Starting seed...');

	// 1. Clear existing data
	console.log('Cleaning up old data...');
	await db.delete(schema.meaningRelation);
	await db.delete(schema.translation);
	await db.delete(schema.wordMeaning);
	await db.delete(schema.word);

	// 2. Insert Words
	console.log('Inserting words...');
	const wordsData = [
		// English Verbs
		{ langPair: 'en_es', text: 'run', lang: 'en', pos: 'verb' },
		{ langPair: 'en_es', text: 'manage', lang: 'en', pos: 'verb' },
		{ langPair: 'en_es', text: 'direct', lang: 'en', pos: 'verb' },
		{ langPair: 'en_es', text: 'execute', lang: 'en', pos: 'verb' },
		{ langPair: 'en_es', text: 'flow', lang: 'en', pos: 'verb' },
		// English Nouns
		{ langPair: 'en_es', text: 'run', lang: 'en', pos: 'noun' },

		// Spanish Verbs
		{ langPair: 'en_es', text: 'correr', lang: 'es', pos: 'verb' },
		{ langPair: 'en_es', text: 'dirigir', lang: 'es', pos: 'verb' },
		{ langPair: 'en_es', text: 'ejecutar', lang: 'es', pos: 'verb' },
		{ langPair: 'en_es', text: 'fluir', lang: 'es', pos: 'verb' },
		// Spanish Nouns
		{ langPair: 'en_es', text: 'carrera', lang: 'es', pos: 'noun' }
	] as const;

	const wordMap = new Map<string, number>();

	for (const w of wordsData) {
		const [res] = await db.insert(schema.word).values(w).returning();
		wordMap.set(`${w.text}:${w.pos}`, res.id);
	}

	// 3. Insert Meanings
	console.log('Inserting meanings...');
	const meaningsData = [
		// --- English Meanings ---

		// run (verb)
		{
			key: 'run:move', wordKey: 'run:verb',
			def: 'to move at a speed faster than a walk',
			examples: ['I run every morning.']
		},
		{
			key: 'run:manage', wordKey: 'run:verb',
			def: 'to be in charge of; manage',
			examples: ['She runs a big company.']
		},
		{
			key: 'run:execute', wordKey: 'run:verb',
			def: 'to cause a computer program to be used',
			examples: ['Run the build script.']
		},
		{
			key: 'run:flow', wordKey: 'run:verb',
			def: '(of a liquid) to move in a steady stream',
			examples: ['Tears ran down her face.']
		},

		// manage (verb)
		{
			key: 'manage:manage', wordKey: 'manage:verb',
			def: 'to be in charge of (business/people)',
			examples: ['He manages the sales team.']
		},

		// direct (verb)
		{
			key: 'direct:art', wordKey: 'direct:verb',
			def: 'to supervise the making of a film, play, etc.',
			examples: ['Spielberg directed this movie.']
		},

		// execute (verb)
		{
			key: 'execute:sw', wordKey: 'execute:verb',
			def: 'to start or run a computer program',
			examples: ['Execute the command.']
		},

		// flow (verb)
		{
			key: 'flow:liquid', wordKey: 'flow:verb',
			def: 'to move steadily and continuously in a current or stream',
			examples: ['The river flows to the sea.']
		},

		// run (noun)
		{
			key: 'run:noun_act', wordKey: 'run:noun',
			def: 'an act or spell of running',
			examples: ['I went for a run.']
		},

		// --- Spanish Meanings ---

		// correr (verb)
		{
			key: 'correr:move', wordKey: 'correr:verb',
			def: 'desplazarse rápidamente con pasos largos',
			examples: ['Me gusta correr por el parque.']
		},
		{
			key: 'correr:flow', wordKey: 'correr:verb',
			def: 'circular un líquido',
			examples: ['El agua corre por el río.']
		},

		// dirigir (verb)
		{
			key: 'dirigir:manage', wordKey: 'dirigir:verb',
			def: 'gobernar, regir o dar reglas',
			examples: ['Ella dirige una gran empresa.']
		},
		{
			key: 'dirigir:art', wordKey: 'dirigir:verb',
			def: 'guiar la realización de una obra de arte',
			examples: ['Dirigió la película con maestría.']
		},

		// ejecutar (verb)
		{
			key: 'ejecutar:sw', wordKey: 'ejecutar:verb',
			def: 'realizar operaciones definidas en un programa',
			examples: ['Ejecuta el script de instalación.']
		},

		// fluir (verb)
		{
			key: 'fluir:liquid', wordKey: 'fluir:verb',
			def: 'dicho de un líquido o gas: correr',
			examples: ['El agua fluye libremente.']
		},

		// carrera (noun)
		{
			key: 'carrera:noun_act', wordKey: 'carrera:noun',
			def: 'acción de correr',
			examples: ['Ganó la carrera.']
		}
	];

	const meaningMap = new Map<string, number>();

	for (const m of meaningsData) {
		const wordId = wordMap.get(m.wordKey);
		if (!wordId) throw new Error(`Word not found for ${m.wordKey}`);

		const [res] = await db
			.insert(schema.wordMeaning)
			.values({
				langPair: 'en_es',
				wordId,
				definition: m.def,
				examples: m.examples
			})
			.returning();
		meaningMap.set(m.key, res.id);
	}

	// 4. Insert Translations
	console.log('Inserting translations...');
	const translationsData = [
		// run (move) <-> correr (move)
		{ src: 'run:move', dst: 'correr:move' },

		// run (flow) <-> correr (flow)
		{ src: 'run:flow', dst: 'correr:flow' },

		// run (manage) <-> dirigir (manage)
		{ src: 'run:manage', dst: 'dirigir:manage' },

		// run (execute) <-> ejecutar (sw)
		{ src: 'run:execute', dst: 'ejecutar:sw' },

		// manage (manage) <-> dirigir (manage)
		{ src: 'manage:manage', dst: 'dirigir:manage' },

		// direct (art) <-> dirigir (art)
		{ src: 'direct:art', dst: 'dirigir:art' },

		// execute (sw) <-> ejecutar (sw)
		{ src: 'execute:sw', dst: 'ejecutar:sw' },

		// flow (liquid) <-> fluir (liquid)
		{ src: 'flow:liquid', dst: 'fluir:liquid' },

		// flow (liquid) <-> correr (flow)
		{ src: 'flow:liquid', dst: 'correr:flow' },

		// run (noun) <-> carrera (noun)
		{ src: 'run:noun_act', dst: 'carrera:noun_act' }
	];

	for (const t of translationsData) {
		const srcId = meaningMap.get(t.src);
		const dstId = meaningMap.get(t.dst);

		if (!srcId || !dstId) throw new Error(`Meaning not found for ${t.src} or ${t.dst}`);

		await db.insert(schema.translation).values({
			langPair: 'en_es',
			srcMeaningId: srcId,
			dstMeaningId: dstId
		});
	}

	console.log('✅ Seed complete!');
};

seed().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
