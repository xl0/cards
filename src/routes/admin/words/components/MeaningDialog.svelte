<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { LangPair } from '$lib/enums';
	import { upsertMeaning, searchMeanings } from '$lib/remote/meaning.remote';
	import { upsertTranslation, deleteTranslation } from '$lib/remote/translation.remote';
	import { X, Trash2 } from '@lucide/svelte';

	type Meaning = {
		id: number;
		definition: string | null;
		examples: string[] | null;
		translationsAsSrc?: {
			id: number;
			dstMeaning: { id: number; definition: string | null; word: { word: string; lang: string; pos: string } };
			dstMeaningId: number;
		}[];
	};

	let {
		open = $bindable(false),
		meaning = null,
		wordId,
		langPair,
		wordDetails,
		wordsQuery,
		onSaved
	}: {
		open: boolean;
		meaning?: Meaning | null;
		wordId: number;
		langPair: LangPair;
		wordDetails: any;
		wordsQuery: any;
		onSaved?: () => void;
	} = $props();

	let definition = $state('');
	let examples = $state<string[]>([]);
	let workingMeaning = $state<Meaning | null>(null);
	let tempTranslationId = $state(-1);
	let stagedAddTranslations = $state<any[]>([]);
	let stagedRemoveTranslations = $state<Set<number>>(new Set());
	let searchQuery = $state('');
	let searchResults: any[] = $state([]);
	let searching = $state(false);

	$effect(() => {
		if (open) {
			if (meaning) {
				definition = meaning.definition ?? '';
				examples = meaning.examples ? [...meaning.examples] : [];
				workingMeaning = { ...meaning, translationsAsSrc: meaning.translationsAsSrc ? [...meaning.translationsAsSrc] : [] };
			} else {
				definition = '';
				examples = [''];
				workingMeaning = null;
			}
			tempTranslationId = -1;
			stagedAddTranslations = [];
			stagedRemoveTranslations = new Set();
			searchQuery = '';
			searchResults = [];
		}
	});

	$effect(() => {
		if (!open) return;
		if (!searchQuery.trim()) {
			searchResults = [];
			return;
		}
		runSearch();
	});

	async function runSearch() {
		if (!searchQuery.trim()) {
			searchResults = [];
			return;
		}
		searching = true;
		try {
			const results = await searchMeanings({ word: searchQuery, langPair });
			const existingIds = new Set((workingMeaning?.translationsAsSrc ?? []).map((t: any) => t.dstMeaning.id));
			const stagedIds = new Set(stagedAddTranslations.map((t: any) => t.dstMeaning.id));
			searchResults = results.filter((r: any) => r.id !== meaning?.id && !existingIds.has(r.id) && !stagedIds.has(r.id));
		} finally {
			searching = false;
		}
	}

	function stageAddTranslation(result: any) {
		if (!workingMeaning) return;
		const newTranslation = { id: tempTranslationId--, dstMeaning: result, dstMeaningId: result.id };
		workingMeaning = { ...workingMeaning, translationsAsSrc: [...(workingMeaning.translationsAsSrc ?? []), newTranslation] };
		stagedAddTranslations = [...stagedAddTranslations, newTranslation];
		searchQuery = '';
		searchResults = [];
	}

	function stageRemoveTranslation(translation: any) {
		if (!workingMeaning) return;
		workingMeaning = {
			...workingMeaning,
			translationsAsSrc: (workingMeaning.translationsAsSrc ?? []).filter((t: any) => t.id !== translation.id)
		};
		if (translation.id < 0) {
			stagedAddTranslations = stagedAddTranslations.filter((t: any) => t.id !== translation.id);
		} else {
			const next = new Set(stagedRemoveTranslations);
			next.add(translation.id);
			stagedRemoveTranslations = next;
		}
	}

	function addExample() {
		examples = [...examples, ''];
	}
	function removeExample(index: number) {
		examples = examples.filter((_, i) => i !== index);
	}

	const isEdit = $derived(!!meaning);
	const title = $derived(isEdit ? 'Edit Meaning' : 'Add Meaning');
	const description = $derived(isEdit ? 'Update definition, examples, and translations.' : 'Create a new meaning with examples.');
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>{description}</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label>Definition</Label>
				<Input bind:value={definition} />
			</div>
			<div class="grid gap-2">
				<Label>Examples</Label>
				{#each examples as _, i}
					<div class="flex gap-2">
						<Input bind:value={examples[i]} placeholder="Example..." />
						<Button variant="ghost" size="icon" class="shrink-0" onclick={() => removeExample(i)}>
							<X class="h-4 w-4" />
						</Button>
					</div>
				{/each}
				<Button variant="outline" size="sm" onclick={addExample} class="w-full">Add example</Button>
			</div>

			{#if isEdit}
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<Label>Translations</Label>
						{#if searching}
							<span class="text-muted-foreground text-xs">Searching...</span>
						{/if}
					</div>
					<div class="space-y-2">
						<Input placeholder="Search meanings to link..." bind:value={searchQuery} />
						{#if searchResults.length > 0}
							<div class="max-h-[200px] overflow-y-auto rounded-md border">
								{#each searchResults as result}
									<div class="hover:bg-muted flex items-center justify-between px-3 py-2">
										<div>
											<div class="flex items-center gap-2 font-medium">
												{result.word.text}
												<Badge variant="secondary" class="text-xs">{result.word.lang}</Badge>
												<Badge variant="outline" class="text-xs">{result.word.pos}</Badge>
											</div>
											<div class="text-muted-foreground text-xs">{result.definition}</div>
										</div>
										<Button size="sm" onclick={() => stageAddTranslation(result)}>Connect</Button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
					{#if (workingMeaning?.translationsAsSrc ?? meaning?.translationsAsSrc)?.length}
						<div class="space-y-2">
							<div class="text-sm font-medium">Existing links</div>
							{#each workingMeaning?.translationsAsSrc ?? meaning?.translationsAsSrc ?? [] as translation}
								<div class="flex items-center justify-between rounded-md border px-3 py-2">
									<div>
										<div class="flex items-center gap-2 font-medium">
											{translation.dstMeaning.word.word}
											<Badge variant="secondary" class="text-xs">{translation.dstMeaning.word.lang}</Badge>
											<Badge variant="outline" class="text-xs">{translation.dstMeaning.word.pos}</Badge>
										</div>
										<div class="text-muted-foreground text-xs">{translation.dstMeaning.definition}</div>
									</div>
									<Button variant="ghost" size="icon" class="text-destructive" onclick={() => stageRemoveTranslation(translation)}>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</div>
		<Dialog.Footer>
			<Button
				onclick={async () => {
					await upsertMeaning({
						id: meaning?.id,
						wordId,
						definition,
						examples: examples.filter((e) => e.trim()),
						langPair
					}).updates(wordDetails, wordsQuery);

					if (isEdit && stagedRemoveTranslations.size) {
						await Promise.all(Array.from(stagedRemoveTranslations).map((id) => deleteTranslation({ id })));
					}
					if (isEdit && stagedAddTranslations.length) {
						await Promise.all(stagedAddTranslations.map((t) => upsertTranslation({ srcId: meaning!.id, dstId: t.dstMeaningId, langPair })));
					}

					open = false;
					onSaved?.();
				}}>
				Save
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
