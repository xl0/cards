
<script lang="ts">
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as Table from "$lib/components/ui/table";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { getWords, upsertWord, deleteWord } from '$lib/remote/word.remote';
	import { Langs, PartsOfSpeech, LangPairs } from '$lib/enums';
	import type { Lang, PartOfSpeech, LangPair } from '$lib/enums';
	import { PersistedState } from 'runed';

	let open = $state(false);
	let newWordText = $state('');
	let newWordLang = $state<Lang>(Langs.En);
	let newWordPos = $state<PartOfSpeech>(PartsOfSpeech.Noun);

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

	let wordsQuery = $derived(getWords({
		page: persistedPage.current,
		limit: persistedLimit.current,
		langPair: persistedLangPair.current
	}));
</script>

<div class="container mx-auto py-10">
	<div class="flex justify-between items-center mb-6">
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
				<Dialog.Trigger class={buttonVariants({ variant: "default" })}>
					Add Word
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Add New Word</Dialog.Title>
						<Dialog.Description>
							Create a new word in the dictionary.
						</Dialog.Description>
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
						<Button onclick={async () => {
							await upsertWord({ word: newWordText, lang: newWordLang, pos: newWordPos, langPair: persistedLangPair.current })
								.updates(wordsQuery);
							open = false;
							newWordText = '';
						}}>Save changes</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	</div>

	<div class="border rounded-md">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Word</Table.Head>
					<Table.Head>Lang</Table.Head>
					<Table.Head>POS</Table.Head>
					<Table.Head class="text-right">Meanings</Table.Head>
					<Table.Head class="text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if wordsQuery.loading && !wordsQuery.current}
					<Table.Row>
						<Table.Cell colspan={5} class="text-center py-10 text-muted-foreground">Loading...</Table.Cell>
					</Table.Row>
				{:else if wordsQuery.current}
					{#each wordsQuery.current as word (word.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{word.word}</Table.Cell>
							<Table.Cell>{word.lang}</Table.Cell>
							<Table.Cell>{word.pos}</Table.Cell>
							<Table.Cell class="text-right">{word.meaningsCount}</Table.Cell>
							<Table.Cell class="text-right">
								<div class="flex justify-end gap-2">
									<Button variant="outline" size="sm" href={`/admin/words/${word.id}`}>Edit</Button>
									<Button variant="destructive" size="sm" onclick={async () => {
										await deleteWord({ id: word.id }).updates(wordsQuery);
									}}>Delete</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				{/if}
			</Table.Body>
		</Table.Root>
	</div>
</div>
