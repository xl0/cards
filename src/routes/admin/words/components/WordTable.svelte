<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Pagination from '$lib/components/ui/pagination';
	import * as Table from '$lib/components/ui/table';
	import type { Lang, LangPair, PartOfSpeech } from '$lib/enums';
	import { getWords, deleteWord } from '$lib/remote/word.remote';
	import { getWordDetails, ensureWordDetails, refreshWordDetails } from '$lib/appstate.svelte';
	import { ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight, Plus, Pencil } from '@lucide/svelte';
	import { PersistedState, Debounced } from 'runed';
	import WordMeaningCard from './WordMeaningCard.svelte';
	import MeaningDialog from './MeaningDialog.svelte';
	import WordDialog from './WordDialog.svelte';

	type Word = { id: number; word: string; lang: Lang; pos: PartOfSpeech; langPair: LangPair; meaningsCount: number };

	let { langPair }: { langPair: LangPair } = $props();

	// Persisted state for table settings
	const filterText = new PersistedState<string>('admin-filter', '', { storage: 'local', syncTabs: false });
	const debouncedFilter = new Debounced(() => filterText.current, 300);
	const page = new PersistedState<number>('admin-words-page', 1, { storage: 'local', syncTabs: false });
	const limit = new PersistedState<number>('admin-words-limit', 50, { storage: 'local', syncTabs: false });
	const sort = new PersistedState<string>('admin-words-sort', 'id', { storage: 'local', syncTabs: false });
	const order = new PersistedState<'asc' | 'desc'>('admin-words-order', 'desc', { storage: 'local', syncTabs: false });

	// Words query - reactive to all filter/sort/page changes
	let wordsQuery = $derived(
		getWords({
			page: page.current,
			limit: limit.current,
			langPair,
			filter: debouncedFilter.current,
			sort: sort.current,
			order: order.current
		})
	);

	// Reset page when filter changes
	let lastFilter = $state(debouncedFilter.current);
	$effect(() => {
		if (debouncedFilter.current !== lastFilter) {
			page.current = 1;
			lastFilter = debouncedFilter.current;
		}
	});

	// Word dialog state
	let wordDialogOpen = $state(false);
	let editWordTarget: Word | null = $state(null);

	export function openAddWord() {
		editWordTarget = null;
		wordDialogOpen = true;
	}
	function openEditWord(word: Word) {
		editWordTarget = word;
		wordDialogOpen = true;
	}

	// Meaning dialog state
	let meaningDialogOpen = $state(false);
	let meaningTarget: { wordId: number; langPair: LangPair; meaning: any | null } | null = $state(null);

	function openAddMeaning(wordId: number, langPair: LangPair) {
		meaningTarget = { wordId, langPair, meaning: null };
		meaningDialogOpen = true;
	}
	function openEditMeaning(wordId: number, langPair: LangPair, meaning: any) {
		meaningTarget = { wordId, langPair, meaning };
		meaningDialogOpen = true;
	}

	// Expanded rows
	let expanded = $state<Set<number>>(new Set());

	function toggleWord(wordId: number) {
		const next = new Set(expanded);
		if (next.has(wordId)) next.delete(wordId);
		else {
			next.add(wordId);
			ensureWordDetails(wordId);
		}
		expanded = next;
	}

	function toggleSort(column: string) {
		if (sort.current === column) order.current = order.current === 'asc' ? 'desc' : 'asc';
		else {
			sort.current = column;
			order.current = 'asc';
		}
	}
</script>

<div class="rounded-md border">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head class="flex items-center gap-2">
					<Button variant="ghost" onclick={() => toggleSort('word')}>
						Word
						{#if sort.current === 'word'}
							{#if order.current === 'asc'}<ArrowUp class="ml-2 h-4 w-4" />{:else}<ArrowDown class="ml-2 h-4 w-4" />{/if}
						{:else}<ArrowUpDown class="ml-2 h-4 w-4" />{/if}
					</Button>
					<Input placeholder="Filter words..." bind:value={filterText.current} />
				</Table.Head>
				<Table.Head>
					<Button variant="ghost" onclick={() => toggleSort('lang')}>
						Lang
						{#if sort.current === 'lang'}
							{#if order.current === 'asc'}<ArrowUp class="ml-2 h-4 w-4" />{:else}<ArrowDown class="ml-2 h-4 w-4" />{/if}
						{:else}<ArrowUpDown class="ml-2 h-4 w-4" />{/if}
					</Button>
				</Table.Head>
				<Table.Head>
					<Button variant="ghost" onclick={() => toggleSort('pos')}>
						POS
						{#if sort.current === 'pos'}
							{#if order.current === 'asc'}<ArrowUp class="ml-2 h-4 w-4" />{:else}<ArrowDown class="ml-2 h-4 w-4" />{/if}
						{:else}<ArrowUpDown class="ml-2 h-4 w-4" />{/if}
					</Button>
				</Table.Head>
				<Table.Head class="text-right">
					<Button variant="ghost" onclick={() => toggleSort('meaningsCount')}>
						Meanings
						{#if sort.current === 'meaningsCount'}
							{#if order.current === 'asc'}<ArrowUp class="ml-2 h-4 w-4" />{:else}<ArrowDown class="ml-2 h-4 w-4" />{/if}
						{:else}<ArrowUpDown class="ml-2 h-4 w-4" />{/if}
					</Button>
				</Table.Head>
				<Table.Head class="text-right">Actions</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#if wordsQuery.loading && !wordsQuery.current}
				<Table.Row>
					<Table.Cell colspan={5} class="text-muted-foreground py-10 text-center">Loading...</Table.Cell>
				</Table.Row>
			{:else if wordsQuery.current}
				{#each wordsQuery.current.words as word (word.id)}
					<Table.Row
						class="cursor-pointer"
						role="button"
						tabindex={0}
						onclick={() => toggleWord(word.id)}
						onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleWord(word.id)}>
						<Table.Cell class="font-medium">
							<div class="inline-flex items-center gap-2">
								{#if expanded.has(word.id)}<ChevronDown class="h-4 w-4" />{:else}<ChevronRight class="h-4 w-4" />{/if}
								<span>{word.word}</span>
							</div>
						</Table.Cell>
						<Table.Cell>{word.lang}</Table.Cell>
						<Table.Cell>{word.pos}</Table.Cell>
						<Table.Cell class="text-right">{word.meaningsCount}</Table.Cell>
						<Table.Cell class="text-right">
							<div class="flex justify-end gap-2">
								<Button
									variant="outline"
									size="sm"
									onclick={(e) => {
										e.stopPropagation();
										openEditWord(word);
									}}>
									<Pencil class="h-4 w-4" />
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onclick={async (e) => {
										e.stopPropagation();
										await deleteWord({ id: word.id }).updates(wordsQuery);
									}}>
									Delete
								</Button>
							</div>
						</Table.Cell>
					</Table.Row>

					{#if expanded.has(word.id)}
						{@const details = getWordDetails(word.id)!}
						<Table.Row>
							<Table.Cell colspan={5} class="bg-muted/40">
								{#if details?.current}
									<div class="mb-2 flex items-center justify-between">
										<span class="text-sm font-medium">Meanings</span>
										<Button
											variant="outline"
											size="sm"
											onclick={(e) => {
												e.stopPropagation();
												openAddMeaning(word.id, word.langPair);
											}}>
											<Plus class="mr-1 h-4 w-4" /> Add Meaning
										</Button>
									</div>
									{#if details.current.meanings.length === 0}
										<div class="text-muted-foreground text-sm italic">No meanings yet.</div>
									{:else}
										<div class="space-y-2">
											{#each details.current.meanings as meaning}
												<WordMeaningCard
													{meaning}
													onEdit={() => openEditMeaning(word.id, word.langPair, meaning)}
													onDeleted={() => refreshWordDetails(word.id)}
													wordDetails={details}
													{wordsQuery} />
											{/each}
										</div>
									{/if}
								{:else}
									<div class="text-muted-foreground text-sm">Fetching meanings…</div>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/if}
				{/each}
			{/if}
		</Table.Body>
	</Table.Root>
</div>

{#if wordsQuery.current}
	<div class="mt-4 flex justify-end">
		<Pagination.Root count={wordsQuery.current.total} perPage={limit.current} bind:page={page.current}>
			{#snippet children({ pages, currentPage })}
				<Pagination.Content>
					<Pagination.Item><Pagination.PrevButton /></Pagination.Item>
					{#each pages as pg (pg.key)}
						{#if pg.type === 'ellipsis'}
							<Pagination.Item><Pagination.Ellipsis /></Pagination.Item>
						{:else}
							<Pagination.Item>
								<Pagination.Link page={pg} isActive={currentPage === pg.value}>{pg.value}</Pagination.Link>
							</Pagination.Item>
						{/if}
					{/each}
					<Pagination.Item><Pagination.NextButton /></Pagination.Item>
				</Pagination.Content>
			{/snippet}
		</Pagination.Root>
	</div>
{/if}

<WordDialog bind:open={wordDialogOpen} word={editWordTarget} {langPair} {wordsQuery} />

{#if meaningTarget}
	<MeaningDialog
		bind:open={meaningDialogOpen}
		meaning={meaningTarget.meaning}
		wordId={meaningTarget.wordId}
		langPair={meaningTarget.langPair}
		wordDetails={getWordDetails(meaningTarget.wordId)}
		{wordsQuery}
		onSaved={() => refreshWordDetails(meaningTarget!.wordId)} />
{/if}
