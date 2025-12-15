<script lang="ts">
	import { getWordTranslation } from '$lib/remote/word.remote';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { searchMeanings, upsertMeaning } from '$lib/remote/meaning.remote';
	import { deleteTranslation, upsertTranslation } from '$lib/remote/translation.remote';
	import { LoaderCircle, X } from '@lucide/svelte';
	import dbg from 'debug';
	const debug = dbg('app:components:MeaningDialog');

	type WordDetails = ReturnType<typeof getWordTranslation>;
	type Word = NonNullable<WordDetails['current']>;
	type Meaning = Word['meanings'][number];

	let word: Word | undefined = $state();
	let meaning = $state<Meaning | undefined>();
	let isOpen = $state(false);
	let saving = $state(false);

	export function open(w: Word, m?: Meaning) {
		word = w;
		meaning = m;
		if (meaning) {
			editedDefinition = meaning.definition ?? '';
			editedExamples = meaning.examples ? [...meaning.examples] : [];
		} else {
			editedDefinition = '';
			editedExamples = [''];
		}
		addedTranslations = [];
		removedDstMeaningIds = new Set();

		searchQuery = '';
		searchResults = [];
		saving = false;

		isOpen = true;
	}

	type SearchMeaningsResult = Awaited<ReturnType<typeof searchMeanings>>[number];

	let editedDefinition = $state('');
	let editedExamples = $state<string[]>([]);
	let addedTranslations = $state<SearchMeaningsResult[]>([]);
	let removedDstMeaningIds = $state<Set<number>>(new Set());

	let searchQuery = $state('');
	let searching = $state(false);

	let searchResults: SearchMeaningsResult[] = $state([]);

	$effect(() => {
		// Note: We need to read the stuff we depend on for the effect to fire.
		if (!searchQuery.trim() || !word) {
			searchResults = [];
			return;
		}

		// Kick off the search, but don't wait for it
		(async () => {
			if (!searchQuery.trim() || !word) {
				searchResults = [];
				return;
			}
			searching = true;
			try {
				const results = await searchMeanings({ word: searchQuery, langPair: word.langPair });
				const existingIds = new Set(meaning?.translationsAsSrc.map((t) => t.dstMeaning.id));
				const stagedIds = new Set(addedTranslations.map((tr) => tr.id));
				searchResults = results.filter(
					(r) => r.word.lang != word?.lang && r.id !== meaning?.id && !existingIds.has(r.id) && !stagedIds.has(r.id)
				);
			} catch (e) {
				debug('search error', e);
			} finally {
				searching = false;
			}
		})();
	});

	let connectedTranslations = $derived.by(() => {
		const existing: SearchMeaningsResult[] = (meaning?.translationsAsSrc ?? [])
			.map((tr) => {
				return {
					id: tr.dstMeaning.id,
					definition: tr.dstMeaning.definition,
					word: {
						word: tr.dstMeaning.word.word,
						lang: tr.dstMeaning.word.lang,
						pos: tr.dstMeaning.word.pos
					}
				};
			})
			.filter((tr) => !removedDstMeaningIds.has(tr.id));

		const res = existing.concat(addedTranslations);

		return res;
	});

	function addTranslation(me: SearchMeaningsResult) {
		if (!meaning?.translationsAsSrc.filter((tr) => tr.dstMeaningId === me.id).length) addedTranslations.push(me);
		removedDstMeaningIds.delete(me.id);
		searchQuery = '';
	}

	function removeTranslation(id: number) {
		addedTranslations = addedTranslations.filter((tr) => tr.id !== id);
		if (meaning && meaning.translationsAsSrc.filter((tr) => tr.dstMeaningId === id).length) removedDstMeaningIds.add(id);
	}

	function addExample() {
		editedExamples = [...editedExamples, ''];
	}
	function removeExample(index: number) {
		editedExamples = editedExamples.filter((_, i) => i !== index);
	}

	const title = $derived(meaning ? 'Edit Meaning' : 'Add Meaning');
	const description = $derived(meaning ? 'Update definition, examples, and translations.' : 'Create a new meaning with examples.');
</script>

<Dialog.Root bind:open={isOpen}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>{description}</Dialog.Description>
		</Dialog.Header>
		{#if word}
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<Label>Definition</Label>
					<Input bind:value={editedDefinition} />
				</div>
				<div class="grid gap-2">
					<Label>Examples</Label>
					{#each editedExamples as _, i}
						<div class="flex gap-2">
							<Input bind:value={editedExamples[i]} placeholder="Example..." />
							<Button variant="ghost" size="icon" class="shrink-0" onclick={() => removeExample(i)}>
								<X class="h-4 w-4" />
							</Button>
						</div>
					{/each}
					<Button variant="outline" size="sm" onclick={addExample} class="w-full">Add example</Button>
				</div>

				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<Label>Translations</Label>
						{#if searching}
							<span class="text-muted-foreground text-xs">Searching...</span>
						{/if}
					</div>

					{#if connectedTranslations.length}
						<div class="space-y-2">
							<div class="text-sm font-medium">Existing links</div>
							{#each connectedTranslations as translation}
								<div class="flex items-center justify-between rounded-md border px-3 py-2">
									<div>
										<div class="flex items-center gap-2 font-medium">
											{translation.word.word}
											<Badge variant="secondary" class="text-xs">{translation.word.lang}</Badge>
											<Badge variant="outline" class="text-xs">{translation.word.pos}</Badge>
										</div>
										<div class="text-muted-foreground text-xs">{translation.definition}</div>
									</div>
									<DeleteButton title="Remove translation" onConfirm={() => removeTranslation(translation.id)} />
								</div>
							{/each}
						</div>
					{/if}
					<div class="space-y-2">
						<Input placeholder="Search meanings to link..." bind:value={searchQuery} />
						{#if searchResults.length > 0}
							<div class="max-h-[200px] overflow-y-auto rounded-md border">
								{#each searchResults as tr}
									<div class="hover:bg-muted flex items-center justify-between px-3 py-2">
										<div>
											<div class="flex items-center gap-2 font-medium">
												{tr.word.word}
												<Badge variant="secondary" class="text-xs">{tr.word.lang}</Badge>
												<Badge variant="outline" class="text-xs">{tr.word.pos}</Badge>
											</div>
											<div class="text-muted-foreground text-xs">{tr.definition}</div>
										</div>
										<Button size="sm" onclick={() => addTranslation(tr)}>Connect</Button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
			<Dialog.Footer>
				<Button
					disabled={saving}
					onclick={async () => {
						if (!word || saving) return;
						saving = true;
						try {
							const langPair = word.langPair;
							const saved = await upsertMeaning({
								id: meaning?.id,
								wordId: word.id,
								definition: editedDefinition,
								examples: editedExamples.filter((e) => e.trim()),
								langPair
							});

							const srcMeaningId = meaning?.id ?? saved.id;
							if (meaning && removedDstMeaningIds.size) {
								const translationIds = meaning.translationsAsSrc
									.filter((tr) => removedDstMeaningIds.has(tr.dstMeaningId))
									.map((tr) => tr.id);
								await Promise.all(translationIds.map((id) => deleteTranslation({ id })));
							}
							if (addedTranslations.length) {
								await Promise.all(addedTranslations.map((t) => upsertTranslation({ srcId: srcMeaningId, dstId: t.id, langPair })));
							}

							await getWordTranslation({ id: word.id }).refresh();
							isOpen = false;
						} finally {
							saving = false;
						}
					}}>
					{#if saving}
						<LoaderCircle class="h-4 w-4 animate-spin" />
					{/if}
					Save
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
