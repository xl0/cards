<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Pagination from '$lib/components/ui/pagination';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { getWords, upsertWord, deleteWord } from '$lib/remote/word.remote';
	import { Langs, PartsOfSpeech, LangPairs } from '$lib/enums';
	import type { Lang, PartOfSpeech, LangPair } from '$lib/enums';
	import { PersistedState, Debounced } from 'runed';
	import { ArrowUp, ArrowDown, ArrowUpDown } from '@lucide/svelte';

	let open = $state(false);
	let newWordText = $state('');
	let newWordLang = $state<Lang>(Langs.En);
	let newWordPos = $state<PartOfSpeech>(PartsOfSpeech.Noun);

	let filterText = $state('');
	const debouncedFilter = new Debounced(() => filterText, 300);

	const persistedLangPair = new PersistedState<LangPair>('admin-lang-pair', LangPairs.EnEs, {
		storage: 'local',
		syncTabs: false
	});

	const persistedPage = new PersistedState<number>('admin-words-page', 1, {
		storage: 'local',
		syncTabs: false
	});

	const persistedLimit = new PersistedState<number>('admin-words-limit', 50, {
		storage: 'local',
		syncTabs: false
	});

	const persistedSort = new PersistedState<string>('admin-words-sort', 'id', {
		storage: 'local',
		syncTabs: false
	});

	const persistedOrder = new PersistedState<'asc' | 'desc'>('admin-words-order', 'desc', {
		storage: 'local',
		syncTabs: false
	});

	let wordsQuery = $derived(
		getWords({
			page: persistedPage.current,
			limit: persistedLimit.current,
			langPair: persistedLangPair.current,
			filter: debouncedFilter.current,
			sort: persistedSort.current,
			order: persistedOrder.current
		})
	);

	let lastFilter = $state(debouncedFilter.current);
	$effect(() => {
		if (debouncedFilter.current !== lastFilter) {
			persistedPage.current = 1;
			lastFilter = debouncedFilter.current;
		}
	});

	function toggleSort(column: string) {
		if (persistedSort.current === column) {
			persistedOrder.current = persistedOrder.current === 'asc' ? 'desc' : 'asc';
		} else {
			persistedSort.current = column;
			persistedOrder.current = 'asc';
		}
	}
</script>

<div class="container mx-auto py-10">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Words</h1>

		<div class="flex items-center gap-4">
			<div class="flex items-center gap-2">
				<Label>Language Pair</Label>
				<Select.Root type="single" bind:value={persistedLangPair.current}>
					<Select.Trigger class="w-[180px]">
						{persistedLangPair.current}
					</Select.Trigger>
					<Select.Content>
						{#each Object.values(LangPairs) as pair}
							<Select.Item value={pair}>{pair}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<Dialog.Root bind:open>
				<Dialog.Trigger class={buttonVariants({ variant: 'default' })}>Add Word</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Add New Word</Dialog.Title>
						<Dialog.Description>Create a new word in the dictionary.</Dialog.Description>
					</Dialog.Header>
					<div class="grid gap-4 py-4">
						<div class="grid gap-2">
							<Label for="word">Word</Label>
							<Input id="word" bind:value={newWordText} />
						</div>
						<div class="grid grid-cols-2 gap-4">
							<div class="grid gap-2">
								<Label>Language</Label>
								<Select.Root type="single" bind:value={newWordLang}>
									<Select.Trigger>
										{newWordLang}
									</Select.Trigger>
									<Select.Content>
										{#each Object.values(Langs) as lang}
											<Select.Item value={lang}>{lang}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
							<div class="grid gap-2">
								<Label>Part of Speech</Label>
								<Select.Root type="single" bind:value={newWordPos}>
									<Select.Trigger>
										{newWordPos}
									</Select.Trigger>
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
								await upsertWord({ word: newWordText, lang: newWordLang, pos: newWordPos, langPair: persistedLangPair.current }).updates(
									wordsQuery
								);
								open = false;
								newWordText = '';
							}}>
							Save changes
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	</div>

	<div class="rounded-md border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="flex gap-2 items-center">
						<Button variant="ghost" onclick={() => toggleSort('word')}>
							Word
							{#if persistedSort.current === 'word'}
								{#if persistedOrder.current === 'asc'}
									<ArrowUp class="ml-2 h-4 w-4" />
								{:else}
									<ArrowDown class="ml-2 h-4 w-4" />
								{/if}
							{:else}
								<ArrowUpDown class="ml-2 h-4 w-4" />
							{/if}
						</Button>
						<Input placeholder="Filter words..." class="" bind:value={filterText} />
					</Table.Head>
					<Table.Head>
						<Button variant="ghost" onclick={() => toggleSort('lang')}>
							Lang
							{#if persistedSort.current === 'lang'}
								{#if persistedOrder.current === 'asc'}
									<ArrowUp class="ml-2 h-4 w-4" />
								{:else}
									<ArrowDown class="ml-2 h-4 w-4" />
								{/if}
							{:else}
								<ArrowUpDown class="ml-2 h-4 w-4" />
							{/if}
						</Button>
					</Table.Head>
					<Table.Head>
						<Button variant="ghost" onclick={() => toggleSort('pos')}>
							POS
							{#if persistedSort.current === 'pos'}
								{#if persistedOrder.current === 'asc'}
									<ArrowUp class="ml-2 h-4 w-4" />
								{:else}
									<ArrowDown class="ml-2 h-4 w-4" />
								{/if}
							{:else}
								<ArrowUpDown class="ml-2 h-4 w-4" />
							{/if}
						</Button>
					</Table.Head>
					<Table.Head class="text-right">
						<Button variant="ghost" onclick={() => toggleSort('meaningsCount')}>
							Meanings
							{#if persistedSort.current === 'meaningsCount'}
								{#if persistedOrder.current === 'asc'}
									<ArrowUp class="ml-2 h-4 w-4" />
								{:else}
									<ArrowDown class="ml-2 h-4 w-4" />
								{/if}
							{:else}
								<ArrowUpDown class="ml-2 h-4 w-4" />
							{/if}
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
						<Table.Row>
							<Table.Cell class="font-medium">{word.word}</Table.Cell>
							<Table.Cell>{word.lang}</Table.Cell>
							<Table.Cell>{word.pos}</Table.Cell>
							<Table.Cell class="text-right">{word.meaningsCount}</Table.Cell>
							<Table.Cell class="text-right">
								<div class="flex justify-end gap-2">
									<Button variant="outline" size="sm" href={`/admin/words/${word.id}`}>Edit</Button>
									<Button
										variant="destructive"
										size="sm"
										onclick={async () => {
											await deleteWord({ id: word.id }).updates(wordsQuery);
										}}>
										Delete
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				{/if}
			</Table.Body>
		</Table.Root>
	</div>

	{#if wordsQuery.current}
		<div class="mt-4 flex justify-end">
			<Pagination.Root count={wordsQuery.current.total} perPage={persistedLimit.current} bind:page={persistedPage.current}>
				{#snippet children({ pages, currentPage })}
					<Pagination.Content>
						<Pagination.Item>
							<Pagination.PrevButton />
						</Pagination.Item>
						{#each pages as page (page.key)}
							{#if page.type === 'ellipsis'}
								<Pagination.Item>
									<Pagination.Ellipsis />
								</Pagination.Item>
							{:else}
								<Pagination.Item>
									<Pagination.Link {page} isActive={currentPage === page.value}>
										{page.value}
									</Pagination.Link>
								</Pagination.Item>
							{/if}
						{/each}
						<Pagination.Item>
							<Pagination.NextButton />
						</Pagination.Item>
					</Pagination.Content>
				{/snippet}
			</Pagination.Root>
		</div>
	{/if}
</div>
