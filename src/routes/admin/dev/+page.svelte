<script lang="ts">
	import { JsonView } from '@zerodevx/svelte-json-view';
	import * as Card from "$lib/components/ui/card";
	import * as Collapsible from "$lib/components/ui/collapsible";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { ChevronsUpDown } from "@lucide/svelte";

	import { getWordsQuery, getWordQuery, upsertWordAction, deleteWordAction } from '$lib/remote/word.remote';
	import { getMeaningsQuery, getMeaningQuery, searchMeaningsQuery, upsertMeaningAction, deleteMeaningAction } from '$lib/remote/meaning.remote';
	import { getTranslationQuery, getTranslationsQuery, upsertTranslationAction, deleteTranslationAction } from '$lib/remote/translation.remote';
	import { LangPairs } from '$lib/enums';

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
	let getWordState = $state(createState({ id: '', withMeanings: true }));
	let upsertWordState = $state(createState({ id: '', text: '', lang: '', pos: '', langPair: LangPairs.EnEs }));
	let deleteWordState = $state(createState({ id: '' }));

	// Meaning States
	let getMeaningsState = $state(createState({ page: '1', limit: '50', langPair: LangPairs.EnEs }));
	let getMeaningState = $state(createState({ id: '', withTranslations: true }));
	let searchMeaningsState = $state(createState({ q: '', excludeId: '', langPair: LangPairs.EnEs }));
	let upsertMeaningState = $state(createState({ id: '', wordId: '', definition: '', examples: '', langPair: LangPairs.EnEs }));
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
            console.log("Result", state.result)
			if (state.result === undefined) state.result = { success: true };
		} catch (e: any) { state.error = e; }
		finally { state.loading = false; }
	}

	// Helper to parse number
	const n = (v: any) => v ? Number(v) : undefined;

</script>

<div class="container mx-auto py-10 space-y-4 max-w-7xl">
	<h1 class="text-3xl font-bold mb-8">Dev Tools</h1>

	<!-- Helper Component for Rows -->
	{#snippet toolRow(title: string, state: ToolState, runFn: () => void, inputs: any)}
		<Card.Root class="w-full">
			<Card.Content class="p-4 flex items-start gap-4">
				<div class="w-48 shrink-0 flex flex-col gap-2">
					<h3 class="font-mono text-sm font-bold pt-2">{title}</h3>
					<Button size="sm" onclick={runFn} disabled={state.loading}>
						{state.loading ? 'Running...' : 'Run'}
					</Button>
				</div>

				<div class="flex-1 grid gap-4">
					<!-- Inputs -->
					<div class="flex flex-wrap gap-4 items-end">
						{@render inputs()}
					</div>

					<!-- Result -->
					{#if state.result || state.error}
						<Collapsible.Root bind:open={state.open} class="w-full border rounded-md bg-muted/30">
							<div class="flex items-center justify-between px-4 py-2">
								<h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									{#if state.error}Error{:else}Result{/if}
								</h4>
								<Collapsible.Trigger class={buttonVariants({ variant: "ghost", size: "sm", class: "w-6 h-6 p-0" })}>
									<ChevronsUpDown class="h-3 w-3" />
								</Collapsible.Trigger>
							</div>
							<Collapsible.Content>
								<div class="p-4 pt-0 overflow-auto max-h-[300px]">
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
	<h2 class="text-xl font-semibold mt-8 mb-4">Words</h2>

	{@render toolRow('getWordsQuery', getWordsState, () => run(getWordsState, getWordsQuery, i => ({ page: n(i.page), limit: n(i.limit), langPair: i.langPair })), inputGetWords)}
	{#snippet inputGetWords()}
		<div class="grid gap-1.5 w-32">
			<Label>page <span class="text-muted-foreground text-[10px]">number</span></Label>
			<Input type="number" bind:value={getWordsState.inputs.page} />
		</div>
		<div class="grid gap-1.5 w-32">
			<Label>limit <span class="text-muted-foreground text-[10px]">number</span></Label>
			<Input type="number" bind:value={getWordsState.inputs.limit} />
		</div>
		<div class="grid gap-1.5 w-32">
			<Label>langPair</Label>
			<select bind:value={getWordsState.inputs.langPair} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
				{#each Object.values(LangPairs) as p}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</div>
	{/snippet}

	{@render toolRow('getWordQuery', getWordState, () => run(getWordState, getWordQuery, i => ({ id: n(i.id), withMeanings: i.withMeanings })), inputGetWord)}
	{#snippet inputGetWord()}
		<div class="grid gap-1.5 w-32">
			<Label>id <span class="text-muted-foreground text-[10px]">number</span></Label>
			<Input type="number" bind:value={getWordState.inputs.id} />
		</div>
		<div class="flex items-center gap-2 h-10 pb-1">
			<Label>withMeanings</Label>
			<input type="checkbox" class="w-4 h-4" bind:checked={getWordState.inputs.withMeanings} />
		</div>
	{/snippet}

	{@render toolRow('upsertWordAction', upsertWordState, () => run(upsertWordState, upsertWordAction, i => ({ id: n(i.id), text: i.text, lang: i.lang, pos: i.pos, langPair: i.langPair })), inputUpsertWord)}
	{#snippet inputUpsertWord()}
		<div class="grid gap-1.5 w-32">
			<Label>id <span class="text-muted-foreground text-[10px]">number?</span></Label>
			<Input type="number" bind:value={upsertWordState.inputs.id} placeholder="New" />
		</div>
		<div class="grid gap-1.5 w-48">
			<Label>text <span class="text-muted-foreground text-[10px]">string</span></Label>
			<Input bind:value={upsertWordState.inputs.text} />
		</div>
		<div class="grid gap-1.5 w-24">
			<Label>lang <span class="text-muted-foreground text-[10px]">string</span></Label>
			<Input bind:value={upsertWordState.inputs.lang} />
		</div>
		<div class="grid gap-1.5 w-32">
			<Label>pos <span class="text-muted-foreground text-[10px]">string</span></Label>
			<Input bind:value={upsertWordState.inputs.pos} />
		</div>
		<div class="grid gap-1.5 w-32">
			<Label>langPair</Label>
			<select bind:value={upsertWordState.inputs.langPair} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
				{#each Object.values(LangPairs) as p}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</div>
	{/snippet}

	{@render toolRow('deleteWordAction', deleteWordState, () => run(deleteWordState, deleteWordAction, i => ({ id: n(i.id) })), inputDeleteWord)}
	{#snippet inputDeleteWord()}
		<div class="grid gap-1.5 w-32">
			<Label>id <span class="text-muted-foreground text-[10px]">number</span></Label>
			<Input type="number" bind:value={deleteWordState.inputs.id} />
		</div>
	{/snippet}


	<!-- Meanings Section -->
	<h2 class="text-xl font-semibold mt-8 mb-4">Meanings</h2>

	{@render toolRow('getMeaningsQuery', getMeaningsState, () => run(getMeaningsState, getMeaningsQuery, i => ({ page: n(i.page), limit: n(i.limit), langPair: i.langPair })), inputGetMeanings)}
	{#snippet inputGetMeanings()}
		<div class="grid gap-1.5 w-32">
			<Label>page <span class="text-muted-foreground text-[10px]">number</span></Label>
			<Input type="number" bind:value={getMeaningsState.inputs.page} />
		</div>
		<div class="grid gap-1.5 w-32">
			<Label>limit <span class="text-muted-foreground text-[10px]">number</span></Label>
			<Input type="number" bind:value={getMeaningsState.inputs.limit} />
		</div>
		<div class="grid gap-1.5 w-32">
			<Label>langPair</Label>
			<select bind:value={getMeaningsState.inputs.langPair} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
				{#each Object.values(LangPairs) as p}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</div>
	{/snippet}

	{@render toolRow('getMeaningQuery', getMeaningState, () => run(getMeaningState, getMeaningQuery, i => ({ id: n(i.id), withTranslations: i.withTranslations })), inputGetMeaning)}
	{#snippet inputGetMeaning()}
		<div class="grid gap-1.5 w-32">
			<Label>id <span class="text-muted-foreground text-[10px]">number</span></Label>
			<Input type="number" bind:value={getMeaningState.inputs.id} />
		</div>
		<div class="flex items-center gap-2 h-10 pb-1">
			<Label>withTranslations</Label>
			<input type="checkbox" class="w-4 h-4" bind:checked={getMeaningState.inputs.withTranslations} />
		</div>
	{/snippet}

	{@render toolRow('searchMeaningsQuery', searchMeaningsState, () => run(searchMeaningsState, searchMeaningsQuery, i => ({ q: i.q, excludeId: n(i.excludeId), langPair: i.langPair })), inputSearchMeanings)}
	{#snippet inputSearchMeanings()}
		<div class="grid gap-1.5 w-64">
			<Label>q <span class="text-muted-foreground text-[10px]">string</span></Label>
			<Input bind:value={searchMeaningsState.inputs.q} />
		</div>
		<div class="grid gap-1.5 w-32">
			<Label>excludeId <span class="text-muted-foreground text-[10px]">number?</span></Label>
			<Input type="number" bind:value={searchMeaningsState.inputs.excludeId} />
		</div>
		<div class="grid gap-1.5 w-32">
			<Label>langPair</Label>
			<select bind:value={searchMeaningsState.inputs.langPair} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
				{#each Object.values(LangPairs) as p}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</div>
	{/snippet}

	{@render toolRow('upsertMeaningAction', upsertMeaningState, () => run(upsertMeaningState, upsertMeaningAction, i => ({ id: n(i.id), wordId: n(i.wordId), definition: i.definition, examples: i.examples.split('\n').filter((e: string) => e.trim()), langPair: i.langPair })), inputUpsertMeaning)}
	{#snippet inputUpsertMeaning()}
		<div class="grid gap-1.5 w-32">
			<Label>id <span class="text-muted-foreground text-[10px]">number?</span></Label>
			<Input type="number" bind:value={upsertMeaningState.inputs.id} placeholder="New" />
		</div>
		<div class="grid gap-1.5 w-32">
			<Label>wordId <span class="text-muted-foreground text-[10px]">number</span></Label>
			<Input type="number" bind:value={upsertMeaningState.inputs.wordId} />
		</div>
		<div class="grid gap-1.5 w-64">
			<Label>definition <span class="text-muted-foreground text-[10px]">string</span></Label>
			<Input bind:value={upsertMeaningState.inputs.definition} />
		</div>
		<div class="grid gap-1.5 w-full max-w-md">
			<Label>examples <span class="text-muted-foreground text-[10px]">string[] (newline)</span></Label>
			<Input bind:value={upsertMeaningState.inputs.examples} placeholder="One per line..." />
		</div>
		<div class="grid gap-1.5 w-32">
			<Label>langPair</Label>
			<select bind:value={upsertMeaningState.inputs.langPair} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
				{#each Object.values(LangPairs) as p}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</div>
	{/snippet}

	{@render toolRow('deleteMeaningAction', deleteMeaningState, () => run(deleteMeaningState, deleteMeaningAction, i => ({ id: n(i.id) })), inputDeleteMeaning)}
	{#snippet inputDeleteMeaning()}
		<div class="grid gap-1.5 w-32">
			<Label>id <span class="text-muted-foreground text-[10px]">number</span></Label>
			<Input type="number" bind:value={deleteMeaningState.inputs.id} />
		</div>
	{/snippet}


	<!-- Translations Section -->
	<h2 class="text-xl font-semibold mt-8 mb-4">Translations</h2>

	{@render toolRow('getTranslationsQuery', getTranslationsState, () => run(getTranslationsState, getTranslationsQuery, i => ({ page: n(i.page), limit: n(i.limit), langPair: i.langPair })), inputGetTranslations)}
	{#snippet inputGetTranslations()}
		<div class="grid gap-1.5 w-32">
			<Label>page <span class="text-muted-foreground text-[10px]">number</span></Label>
			<Input type="number" bind:value={getTranslationsState.inputs.page} />
		</div>
		<div class="grid gap-1.5 w-32">
			<Label>limit <span class="text-muted-foreground text-[10px]">number</span></Label>
			<Input type="number" bind:value={getTranslationsState.inputs.limit} />
		</div>
		<div class="grid gap-1.5 w-32">
			<Label>langPair</Label>
			<select bind:value={getTranslationsState.inputs.langPair} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
				{#each Object.values(LangPairs) as p}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</div>
	{/snippet}

	{@render toolRow('getTranslationQuery', getTranslationState, () => run(getTranslationState, getTranslationQuery, i => ({ id: n(i.id) })), inputGetTranslation)}
	{#snippet inputGetTranslation()}
		<div class="grid gap-1.5 w-32">
			<Label>id <span class="text-muted-foreground text-[10px]">number</span></Label>
			<Input type="number" bind:value={getTranslationState.inputs.id} />
		</div>
	{/snippet}

	{@render toolRow('upsertTranslationAction', upsertTranslationState, () => run(upsertTranslationState, upsertTranslationAction, i => ({ srcId: n(i.srcId), dstId: n(i.dstId), langPair: i.langPair })), inputUpsertTranslation)}
	{#snippet inputUpsertTranslation()}
		<div class="grid gap-1.5 w-32">
			<Label>srcId <span class="text-muted-foreground text-[10px]">number</span></Label>
			<Input type="number" bind:value={upsertTranslationState.inputs.srcId} />
		</div>
		<div class="grid gap-1.5 w-32">
			<Label>dstId <span class="text-muted-foreground text-[10px]">number</span></Label>
			<Input type="number" bind:value={upsertTranslationState.inputs.dstId} />
		</div>
		<div class="grid gap-1.5 w-32">
			<Label>langPair</Label>
			<select bind:value={upsertTranslationState.inputs.langPair} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
				{#each Object.values(LangPairs) as p}
					<option value={p}>{p}</option>
				{/each}
			</select>
		</div>
	{/snippet}

	{@render toolRow('deleteTranslationAction', deleteTranslationState, () => run(deleteTranslationState, deleteTranslationAction, i => ({ id: n(i.id) })), inputDeleteTranslation)}
	{#snippet inputDeleteTranslation()}
		<div class="grid gap-1.5 w-32">
			<Label>id <span class="text-muted-foreground text-[10px]">number</span></Label>
			<Input type="number" bind:value={deleteTranslationState.inputs.id} />
		</div>
	{/snippet}

</div>
