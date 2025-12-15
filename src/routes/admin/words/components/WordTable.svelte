<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Pagination from '$lib/components/ui/pagination';
	import * as Table from '$lib/components/ui/table';
	import type { Lang, LangPair, PartOfSpeech } from '$lib/enums';
	import { deleteWord, getWords } from '$lib/remote/word.remote';
	import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, Pencil } from '@lucide/svelte';
	import dbg from 'debug';
	import { Debounced, PersistedState } from 'runed';
	import MeaningDialog from './MeaningDialog.svelte';
	import WordDialog from './WordDialog.svelte';
	import WordMeaningsSection from './WordMeaningsSection.svelte';
	const debug = dbg('app:components:WordTable');

	type Word = { id: number; word: string; lang: Lang; pos: PartOfSpeech; langPair: LangPair; meaningsCount: number };

	let { langPair }: { langPair: LangPair } = $props();

	// Persisted state for table settings
	const filterText = new PersistedState<string>('admin-filter', '', { storage: 'local', syncTabs: false });
	const debouncedFilter = new Debounced(() => filterText.current, 300);
	const page = new PersistedState<number>('admin-words-page', 1, { storage: 'local', syncTabs: false });
	const limit = new PersistedState<number>('admin-words-limit', 50, { storage: 'local', syncTabs: false });
	const sort = new PersistedState<string>('admin-words-sort', 'word', { storage: 'local', syncTabs: false });
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

	let wordDialog: WordDialog | undefined = $state();
	let meaningDialog: MeaningDialog | undefined = $state();

	export function openAddWord() {
		debug('openAddWord');
		wordDialog?.open({ wordsQuery, langPair });
	}
	function openEditWord(word: Word) {
		debug('openEditWord %d %s', word.id, word.word);
		wordDialog?.open({ wordsQuery, langPair, wordId: word.id });
	}

	// Expanded rows
	let expanded = $state<number[]>([]);

	function toggleWord(wordId: number) {
		if (expanded.includes(wordId)) {
			expanded = expanded.filter((id) => id !== wordId);
		} else {
			expanded = [...expanded, wordId];
		}
	}

	function toggleSort(column: string) {
		if (sort.current === column) order.current = order.current === 'asc' ? 'desc' : 'asc';
		else {
			sort.current = column;
			order.current = 'asc';
		}
		debug('sort %s %s', sort.current, order.current);
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
			{#await wordsQuery}
				<Table.Row>
					<Table.Cell colspan={5} class="text-muted-foreground py-10 text-center">Loading...</Table.Cell>
				</Table.Row>
			{:then words}
				{#each words.words as word (word.id)}
					<Table.Row
						class="cursor-pointer"
						role="button"
						tabindex={0}
						onclick={() => toggleWord(word.id)}
						onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleWord(word.id)}>
						<Table.Cell class="font-medium">
							<div class="inline-flex items-center gap-2">
								{#if expanded.includes(word.id)}<ChevronDown class="h-4 w-4" />{:else}<ChevronRight class="h-4 w-4" />{/if}
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

					<Table.Row hidden={!expanded.includes(word.id)}>
						<Table.Cell colspan={5} class="bg-muted/40">
							<WordMeaningsSection wordId={word.id} {meaningDialog} />
						</Table.Cell>
					</Table.Row>
				{/each}
			{:catch}
				<Table.Row>
					<Table.Cell colspan={5} class="text-accent py-10 text-center">Faioled to load</Table.Cell>
				</Table.Row>
			{/await}
		</Table.Body>
	</Table.Root>
</div>

<div class="mt-4 flex justify-end">
	<Pagination.Root count={wordsQuery.current?.total ?? 0} perPage={limit.current} bind:page={page.current}>
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

<WordDialog bind:this={wordDialog} />
<MeaningDialog bind:this={meaningDialog} />
