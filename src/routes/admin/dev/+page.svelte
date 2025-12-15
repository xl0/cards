<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ChevronsUpDown } from '@lucide/svelte';
	import { JsonView } from '@zerodevx/svelte-json-view';

	import { LangPairs } from '$lib/enums';
	import {
		deleteMeaning,
		// getMeaning,
		getMeanings,
		// getMeaningWithTranslations,
		searchMeanings,
		upsertMeaning
	} from '$lib/remote/meaning.remote';
	import { deleteTranslation,  upsertTranslation } from '$lib/remote/translation.remote';
	import { deleteWord, getWords, getWordTranslation, upsertWord } from '$lib/remote/word.remote';

	type ToolState = {
		inputs: Record<string, any>;
		result: any;
		error: any;
		loading: boolean;
		open: boolean;
	};

	function createState(inputs: Record<string, any>): ToolState {
		return { inputs, result: null, error: null, loading: false, open: true };
	}

	// Word States
	let getWordsState = $state(createState({ page: '1', limit: '50', langPair: LangPairs.EnEs }));
	let getWordState = $state(createState({ id: '' }));
	let getWordWithMeaningsState = $state(createState({ id: '' }));
	let getWordTranslationsState = $state(createState({ id: '' }));
	let upsertWordState = $state(createState({ id: '', text: '', lang: '', pos: '', langPair: LangPairs.EnEs }));
	let deleteWordState = $state(createState({ id: '' }));

	// Meaning States
	let getMeaningsState = $state(createState({ page: '1', limit: '50', langPair: LangPairs.EnEs }));
	let getMeaningState = $state(createState({ id: '' }));
	let getMeaningWithTranslationsState = $state(createState({ id: '' }));
	let searchMeaningsState = $state(createState({ word: '', excludeId: '', langPair: LangPairs.EnEs }));
	let upsertMeaningState = $state(createState({ id: '', wordId: '', definition: '', examples: [], langPair: LangPairs.EnEs }));
	let deleteMeaningState = $state(createState({ id: '' }));

	// Translation States
	let getTranslationState = $state(createState({ id: '' }));
	let getTranslationsState = $state(createState({ page: '1', limit: '50', langPair: LangPairs.EnEs }));
	let upsertTranslationState = $state(createState({ srcId: '', dstId: '', langPair: LangPairs.EnEs }));
	let deleteTranslationState = $state(createState({ id: '' }));

	// Runners
	async function run(state: ToolState, fn: (args: any) => Promise<any>, argsBuilder: (inputs: any) => any) {
		state.loading = true;
		state.error = null;
		try {
			const args = argsBuilder(state.inputs);
			console.log('Running', args);
			state.result = await fn(args);
			console.log('Result', state.result);
			if (state.result === undefined) state.result = { success: true };
		} catch (e: any) {
			state.error = e;
		} finally {
			state.loading = false;
		}
	}

	// Helper to parse number
	const n = (v: any) => (v ? Number(v) : undefined);
</script>

<div class="container mx-auto max-w-7xl space-y-4 py-10">
	<h1 class="mb-8 text-3xl font-bold">Dev Tools</h1>

	<!-- Helper Component for Rows -->
	{#snippet toolRow(title: string, state: ToolState, runFn: () => void, inputs: any)}
		<Card.Root class="w-full">
			<Card.Content class="flex items-start gap-4 p-4">
				<div class="flex w-48 shrink-0 flex-col gap-2">
					<h3 class="pt-2 font-mono text-sm font-bold">{title}</h3>
					<Button size="sm" onclick={runFn} disabled={state.loading}>
						{state.loading ? 'Running...' : 'Run'}
					</Button>
				</div>

				<div class="grid flex-1 gap-4">
					<!-- Inputs -->
					<div class="flex flex-wrap items-end gap-4">
						{@render inputs()}
					</div>

					<!-- Result -->
					{#if state.result || state.error}
						<Collapsible.Root bind:open={state.open} class="bg-muted/30 w-full rounded-md border">
							<div class="flex items-center justify-between px-4 py-2">
								<h4 class="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
									{#if state.error}Error{:else}Result{/if}
								</h4>
								<Collapsible.Trigger class={buttonVariants({ variant: 'ghost', size: 'sm', class: 'h-6 w-6 p-0' })}>
									<ChevronsUpDown class="h-3 w-3" />
								</Collapsible.Trigger>
							</div>
							<Collapsible.Content>
								<div class="max-h-[300px] overflow-auto p-4 pt-0">
									{#if state.error}
										<div class="text-destructive font-mono text-sm">{state.error.message || String(state.error)}</div>
									{:else}
										<JsonView json={state.result} depth={1} />
									{/if}
								</div>
							</Collapsible.Content>
						</Collapsible.Root>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
	{/snippet}

	<!-- Words Section -->
	<h2 class="mt-8 mb-4 text-xl font-semibold">Words</h2>

	{@render toolRow(
		'getWords',
		getWordsState,
		() => run(getWordsState, getWords, (i) => ({ page: n(i.page), limit: n(i.limit), langPair: i.langPair })),
		inputGetWords
	)}
	{#snippet inputGetWords()}
		<div class="grid w-32 gap-1.5">
			<Label>
				page <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={getWordsState.inputs.page} />
		</div>
		<div class="grid w-32 gap-1.5">
			<Label>
				limit <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={getWordsState.inputs.limit} />
		</div>
		<div class="grid w-32 gap-1.5">
			<Label>langPair</Label>
			<select
				bind:value={getWordsState.inputs.langPair}
				class="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm">
				{#each Object.values(LangPairs) as p}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</div>
	{/snippet}

	<!-- {@render toolRow('getWord', getWordState, () => run(getWordState, getWord, (i) => ({ id: n(i.id) })), inputGetWord)}
	{#snippet inputGetWord()}
		<div class="grid w-32 gap-1.5">
			<Label>
				id <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={getWordState.inputs.id} />
		</div>
	{/snippet}

	{@render toolRow(
		'getWordWithMeanings',
		getWordWithMeaningsState,
		() => run(getWordWithMeaningsState, getWordWithMeanings, (i) => ({ id: n(i.id) })),
		inputGetWordWithMeanings
	)}
	{#snippet inputGetWordWithMeanings()}
		<div class="grid w-32 gap-1.5">
			<Label>
				id <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={getWordWithMeaningsState.inputs.id} />
		</div>
	{/snippet} -->

	{@render toolRow(
		'getWordWithTranslations',
		getWordTranslationsState,
		() => run(getWordTranslationsState, getWordTranslation, (i) => ({ id: n(i.id) })),
		inputGetWordWithTranslations
	)}
	{#snippet inputGetWordWithTranslations()}
		<div class="grid w-32 gap-1.5">
			<Label>
				id <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={getWordTranslationsState.inputs.id} />
		</div>
	{/snippet}

	{@render toolRow(
		'upsertWord',
		upsertWordState,
		() => run(upsertWordState, upsertWord, (i) => ({ id: n(i.id), text: i.text, lang: i.lang, pos: i.pos, langPair: i.langPair })),
		inputUpsertWord
	)}
	{#snippet inputUpsertWord()}
		<div class="grid w-32 gap-1.5">
			<Label>
				id <span class="text-muted-foreground text-[10px]">number?</span>
			</Label>
			<Input type="number" bind:value={upsertWordState.inputs.id} placeholder="New" />
		</div>
		<div class="grid w-48 gap-1.5">
			<Label>
				text <span class="text-muted-foreground text-[10px]">string</span>
			</Label>
			<Input bind:value={upsertWordState.inputs.text} />
		</div>
		<div class="grid w-24 gap-1.5">
			<Label>
				lang <span class="text-muted-foreground text-[10px]">string</span>
			</Label>
			<Input bind:value={upsertWordState.inputs.lang} />
		</div>
		<div class="grid w-32 gap-1.5">
			<Label>
				pos <span class="text-muted-foreground text-[10px]">string</span>
			</Label>
			<Input bind:value={upsertWordState.inputs.pos} />
		</div>
		<div class="grid w-32 gap-1.5">
			<Label>langPair</Label>
			<select
				bind:value={upsertWordState.inputs.langPair}
				class="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm">
				{#each Object.values(LangPairs) as p}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</div>
	{/snippet}

	{@render toolRow('deleteWord', deleteWordState, () => run(deleteWordState, deleteWord, (i) => ({ id: n(i.id) })), inputDeleteWord)}
	{#snippet inputDeleteWord()}
		<div class="grid w-32 gap-1.5">
			<Label>
				id <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={deleteWordState.inputs.id} />
		</div>
	{/snippet}

	<!-- Meanings Section -->
	<h2 class="mt-8 mb-4 text-xl font-semibold">Meanings</h2>

	{@render toolRow(
		'getMeanings',
		getMeaningsState,
		() => run(getMeaningsState, getMeanings, (i) => ({ page: n(i.page), limit: n(i.limit), langPair: i.langPair })),
		inputGetMeanings
	)}
	{#snippet inputGetMeanings()}
		<div class="grid w-32 gap-1.5">
			<Label>
				page <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={getMeaningsState.inputs.page} />
		</div>
		<div class="grid w-32 gap-1.5">
			<Label>
				limit <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={getMeaningsState.inputs.limit} />
		</div>
		<div class="grid w-32 gap-1.5">
			<Label>langPair</Label>
			<select
				bind:value={getMeaningsState.inputs.langPair}
				class="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm">
				{#each Object.values(LangPairs) as p}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</div>
	{/snippet}

	<!-- {@render toolRow('getMeaning', getMeaningState, () => run(getMeaningState, getMeaning, (i) => ({ id: n(i.id) })), inputGetMeaning)}
	{#snippet inputGetMeaning()}
		<div class="grid w-32 gap-1.5">
			<Label>
				id <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={getMeaningState.inputs.id} />
		</div>
	{/snippet} -->

	<!-- {@render toolRow(
		'getMeaningWithTranslations',
		getMeaningWithTranslationsState,
		() => run(getMeaningWithTranslationsState, getMeaningWithTranslations, (i) => ({ id: n(i.id) })),
		inputGetMeaningWithTranslations
	)}
	{#snippet inputGetMeaningWithTranslations()}
		<div class="grid w-32 gap-1.5">
			<Label>
				id <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={getMeaningWithTranslationsState.inputs.id} />
		</div>
	{/snippet} -->

	{@render toolRow(
		'searchMeanings',
		searchMeaningsState,
		() => run(searchMeaningsState, searchMeanings, (i) => ({ word: i.word, excludeId: n(i.excludeId), langPair: i.langPair })),
		inputSearchMeanings
	)}
	{#snippet inputSearchMeanings()}
		<div class="grid w-64 gap-1.5">
			<Label>
				word <span class="text-muted-foreground text-[10px]">string</span>
			</Label>
			<Input bind:value={searchMeaningsState.inputs.word} />
		</div>
		<div class="grid w-32 gap-1.5">
			<Label>
				excludeId <span class="text-muted-foreground text-[10px]">number?</span>
			</Label>
			<Input type="number" bind:value={searchMeaningsState.inputs.excludeId} />
		</div>
		<div class="grid w-32 gap-1.5">
			<Label>langPair</Label>
			<select
				bind:value={searchMeaningsState.inputs.langPair}
				class="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm">
				{#each Object.values(LangPairs) as p}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</div>
	{/snippet}

	{@render toolRow(
		'upsertMeaning',
		upsertMeaningState,
		() =>
			run(upsertMeaningState, upsertMeaning, (i) => ({
				id: n(i.id),
				wordId: n(i.wordId),
				definition: i.definition,
				examples: i.examples.filter((e: string) => e.trim()),
				langPair: i.langPair
			})),
		inputUpsertMeaning
	)}
	{#snippet inputUpsertMeaning()}
		<div class="grid w-32 gap-1.5">
			<Label>
				id <span class="text-muted-foreground text-[10px]">number?</span>
			</Label>
			<Input type="number" bind:value={upsertMeaningState.inputs.id} placeholder="New" />
		</div>
		<div class="grid w-32 gap-1.5">
			<Label>
				wordId <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={upsertMeaningState.inputs.wordId} />
		</div>
		<div class="grid w-64 gap-1.5">
			<Label>
				definition <span class="text-muted-foreground text-[10px]">string</span>
			</Label>
			<Input bind:value={upsertMeaningState.inputs.definition} />
		</div>
		<div class="grid w-full max-w-md gap-1.5">
			<Label>
				examples <span class="text-muted-foreground text-[10px]">string[]</span>
			</Label>
			<div class="space-y-2">
				{#each upsertMeaningState.inputs.examples as _, i}
					<div class="flex gap-2">
						<Input bind:value={upsertMeaningState.inputs.examples[i]} placeholder="Example..." />
						<Button
							variant="ghost"
							size="icon"
							class="shrink-0"
							onclick={() => (upsertMeaningState.inputs.examples = upsertMeaningState.inputs.examples.filter((_: string, idx: number) => idx !== i))}>
							X
						</Button>
					</div>
				{/each}
				<Button
					variant="outline"
					size="sm"
					class="w-full"
					onclick={() => (upsertMeaningState.inputs.examples = [...upsertMeaningState.inputs.examples, ''])}>
					+ Add Example
				</Button>
			</div>
		</div>
		<div class="grid w-32 gap-1.5">
			<Label>langPair</Label>
			<select
				bind:value={upsertMeaningState.inputs.langPair}
				class="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm">
				{#each Object.values(LangPairs) as p}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</div>
	{/snippet}

	{@render toolRow(
		'deleteMeaning',
		deleteMeaningState,
		() => run(deleteMeaningState, deleteMeaning, (i) => ({ id: n(i.id) })),
		inputDeleteMeaning
	)}
	{#snippet inputDeleteMeaning()}
		<div class="grid w-32 gap-1.5">
			<Label>
				id <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={deleteMeaningState.inputs.id} />
		</div>
	{/snippet}

	<!-- Translations Section -->
	<h2 class="mt-8 mb-4 text-xl font-semibold">Translations</h2>

	<!-- {@render toolRow(
		'getTranslations',
		getTranslationsState,
		() => run(getTranslationsState, getTranslations, (i) => ({ page: n(i.page), limit: n(i.limit), langPair: i.langPair })),
		inputGetTranslations
	)}
	{#snippet inputGetTranslations()}
		<div class="grid w-32 gap-1.5">
			<Label>
				page <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={getTranslationsState.inputs.page} />
		</div>
		<div class="grid w-32 gap-1.5">
			<Label>
				limit <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={getTranslationsState.inputs.limit} />
		</div>
		<div class="grid w-32 gap-1.5">
			<Label>langPair</Label>
			<select
				bind:value={getTranslationsState.inputs.langPair}
				class="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm">
				{#each Object.values(LangPairs) as p}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</div>
	{/snippet}

	{@render toolRow(
		'getTranslation',
		getTranslationState,
		() => run(getTranslationState, getTranslation, (i) => ({ id: n(i.id) })),
		inputGetTranslation
	)}
	{#snippet inputGetTranslation()}
		<div class="grid w-32 gap-1.5">
			<Label>
				id <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={getTranslationState.inputs.id} />
		</div>
	{/snippet} -->

	{@render toolRow(
		'upsertTranslation',
		upsertTranslationState,
		() => run(upsertTranslationState, upsertTranslation, (i) => ({ srcId: n(i.srcId), dstId: n(i.dstId), langPair: i.langPair })),
		inputUpsertTranslation
	)}
	{#snippet inputUpsertTranslation()}
		<div class="grid w-32 gap-1.5">
			<Label>
				srcId <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={upsertTranslationState.inputs.srcId} />
		</div>
		<div class="grid w-32 gap-1.5">
			<Label>
				dstId <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={upsertTranslationState.inputs.dstId} />
		</div>
		<div class="grid w-32 gap-1.5">
			<Label>langPair</Label>
			<select
				bind:value={upsertTranslationState.inputs.langPair}
				class="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm">
				{#each Object.values(LangPairs) as p}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</div>
	{/snippet}

	{@render toolRow(
		'deleteTranslation',
		deleteTranslationState,
		() => run(deleteTranslationState, deleteTranslation, (i) => ({ id: n(i.id) })),
		inputDeleteTranslation
	)}
	{#snippet inputDeleteTranslation()}
		<div class="grid w-32 gap-1.5">
			<Label>
				id <span class="text-muted-foreground text-[10px]">number</span>
			</Label>
			<Input type="number" bind:value={deleteTranslationState.inputs.id} />
		</div>
	{/snippet}
</div>
