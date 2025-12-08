
<script lang="ts">
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as Table from "$lib/components/ui/table";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { invalidateAll, goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { upsertWordAction, deleteWordAction } from '$lib/remote/word.remote';
	import { Langs, PartsOfSpeech, LangPairs } from '$lib/enums';
	import type { Lang, PartOfSpeech, LangPair } from '$lib/enums';

	let { data }: { data: PageData } = $props();

	let open = $state(false);
	let newWordText = $state('');
	let newWordLang = $state<Lang>(Langs.En);
	let newWordPos = $state<PartOfSpeech>(PartsOfSpeech.Noun);
	let currentLangPair = $state<LangPair>(data.langPair ?? LangPairs.EnEs);

	$effect(() => {
		if (data.langPair) currentLangPair = data.langPair;
	});

	function handleLangPairChange(value: string) {
		currentLangPair = value as LangPair;
		goto(`?langPair=${value}`);
	}
</script>

<div class="container mx-auto py-10">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-3xl font-bold">Words</h1>
		<div class="flex items-center gap-4">
			<Select.Root type="single" value={currentLangPair} onValueChange={handleLangPairChange}>
				<Select.Trigger class="w-[180px]">
					{currentLangPair}
				</Select.Trigger>
				<Select.Content>
					{#each Object.values(LangPairs) as pair}
						<Select.Item value={pair}>{pair}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			<Dialog.Root bind:open>
				<Dialog.Trigger class={buttonVariants({ variant: "default" })}>
					Add Word
				</Dialog.Trigger>
				<Dialog.Content class="sm:max-w-[425px]">
					<Dialog.Header>
						<Dialog.Title>Add New Word</Dialog.Title>
						<Dialog.Description>
							Add a new word to the database for {currentLangPair}.
						</Dialog.Description>
					</Dialog.Header>
					<div class="grid gap-4 py-4">
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="text" class="text-right">Text</Label>
							<Input id="text" bind:value={newWordText} class="col-span-3" required />
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="lang" class="text-right">Language</Label>
							<div class="col-span-3">
								<Select.Root type="single" bind:value={newWordLang}>
									<Select.Trigger class="w-full">
										{newWordLang}
									</Select.Trigger>
									<Select.Content>
										{#each Object.values(Langs) as lang}
											<Select.Item value={lang}>{lang}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="pos" class="text-right">POS</Label>
							<div class="col-span-3">
								<Select.Root type="single" bind:value={newWordPos}>
									<Select.Trigger class="w-full">
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
							await upsertWordAction({ word: newWordText, lang: newWordLang, pos: newWordPos, langPair: currentLangPair });
							open = false;
							newWordText = '';
							await invalidateAll();
						}}>Save changes</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	</div>

	<div class="rounded-md border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Text</Table.Head>
					<Table.Head>Language</Table.Head>
					<Table.Head><abbr title="Part of Speech" class="no-underline cursor-help">POS</abbr></Table.Head>
					<Table.Head class="text-right">Meanings</Table.Head>
					<Table.Head class="text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.words as word}
					<Table.Row>
						<Table.Cell class="font-medium">{word.word}</Table.Cell>
						<Table.Cell>{word.lang}</Table.Cell>
						<Table.Cell>{word.pos}</Table.Cell>
						<Table.Cell class="text-right">{word.meaningsCount}</Table.Cell>
						<Table.Cell class="text-right">
							<div class="flex justify-end gap-2">
								<Button variant="outline" size="sm" href={`/admin/words/${word.id}`}>Edit</Button>
								<Button variant="destructive" size="sm" onclick={async () => {
									await deleteWordAction({ id: word.id });
									await invalidateAll();
								}}>Delete</Button>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>
