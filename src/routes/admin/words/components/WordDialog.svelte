<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import type { Lang, LangPair, PartOfSpeech } from '$lib/enums';
	import { Langs, PartsOfSpeech } from '$lib/enums';
	import type { getWords } from '$lib/remote/word.remote';
	import { upsertWord } from '$lib/remote/word.remote';
	import dbg from 'debug';
	const debug = dbg('app:components:WordDialog');

	type WordsQuery = ReturnType<typeof getWords>;
	type Word = NonNullable<WordsQuery['current']>['words'][number];

	let wordsQuery: WordsQuery | undefined = $state();
	let word: Word | undefined = $state();
	let langPair: LangPair | undefined = $state();
	let fresh = $state(false);
	let isOpen = $state(false);

	export function open(opts: { wordsQuery: WordsQuery; langPair: LangPair; wordId?: Word['id'] }) {
		debug(open, opts);
		if (opts.wordsQuery.current) {
			wordsQuery = opts.wordsQuery;
			word = opts.wordId ? wordsQuery.current.words.find((w) => w.id === opts.wordId) : undefined;
			langPair = opts.langPair;
			fresh = true;
			isOpen = true;
			if (word) {
				wordText = word.word;
				wordLang = word.lang;
				wordPos = word.pos;
			} else {
				wordText = '';
				wordLang = Langs.En;
				wordPos = PartsOfSpeech.Noun;
			}
		} else {
			debug('Got a wordsQuery in flight');
		}
	}

	let wordText = $state('');
	let wordLang = $state<Lang>(Langs.En);
	let wordPos = $state<PartOfSpeech>(PartsOfSpeech.Noun);

	$effect(() => {
		if (!fresh) return;
		fresh = false;
	});

	const title = $derived(word ? 'Edit Word' : 'Add New Word');
	const description = $derived(word ? 'Update the word details.' : 'Create a new word in the dictionary.');
</script>

<Dialog.Root bind:open={isOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>{description}</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="word">Word</Label>
				<Input id="word" bind:value={wordText} />
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label>Language</Label>
					<Select.Root type="single" bind:value={wordLang}>
						<Select.Trigger>{wordLang}</Select.Trigger>
						<Select.Content>
							{#each Object.values(Langs) as lang}
								<Select.Item value={lang}>{lang}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<Label>Part of Speech</Label>
					<Select.Root type="single" bind:value={wordPos}>
						<Select.Trigger>{wordPos}</Select.Trigger>
						<Select.Content>
							{#each Object.values(PartsOfSpeech) as pos}
								<Select.Item value={pos}>{pos}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</div>
		<Dialog.Footer>
			<Button
				onclick={async () => {
					if (!langPair || !wordsQuery) return;
					debug('save %s %s/%s', wordText, wordLang, wordPos);
					await upsertWord({
						id: word?.id,
						word: wordText,
						lang: wordLang,
						pos: wordPos,
						langPair
					}).updates(wordsQuery);
					isOpen = false;
				}}>
				{word ? 'Save changes' : 'Create'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
