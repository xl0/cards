
<script lang="ts">
	import { Badge } from "$lib/components/ui/badge";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Separator } from "$lib/components/ui/separator";
	import { Textarea } from "$lib/components/ui/textarea";
	import { page } from '$app/stores';
	import { getWordWithTranslations } from '$lib/remote/word.remote';
	import { upsertMeaning, deleteMeaning, searchMeanings } from '$lib/remote/meaning.remote';
	import { upsertTranslation, deleteTranslation } from '$lib/remote/translation.remote';

	let wordId = $derived(Number($page.params.id));
	let wordQuery = $derived(getWordWithTranslations({ id: wordId }));

	let openMeaning = $state(false);
	let selectedMeaning: any = $state(null); // Typings are inferred from query result

	let searchQuery = $state('');
	let searchResults: any[] = $state([]);
	let searching = $state(false);

	let newDefinition = $state('');
	let newExamples = $state<string[]>([]);

	function addExample() {
		newExamples = [...newExamples, ''];
	}

	function removeExample(index: number) {
		newExamples = newExamples.filter((_, i) => i !== index);
	}

	async function handleSearch() {
		if (!searchQuery.trim()) {
			searchResults = [];
			return;
		}
		searching = true;
		try {
			// We can assume data.word is available if this is called, or pass langPair manually?
			// We need langPair. It's in wordQuery.current.langPair
			if (!wordQuery.current) return;

			const results = await searchMeanings({
				word: searchQuery,
				langPair: wordQuery.current.langPair
			});
			searchResults = results.filter((r: any) => r.id !== selectedMeaning?.id);
		} finally {
			searching = false;
		}
	}

	$effect(() => {
		if (searchQuery) {
			// Debounce could be added here
			handleSearch();
		}
	});
</script>

<div class="container mx-auto py-10 space-y-8">
	<div class="flex items-center gap-4">
		<Button variant="outline" size="icon" href="/admin/words">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
		</Button>
		<div>
			{#if wordQuery.loading && !wordQuery.current}
				<h1 class="text-3xl font-bold flex items-center gap-3 text-muted-foreground">
					Loading...
				</h1>
			{:else if wordQuery.current}
				<h1 class="text-3xl font-bold flex items-center gap-3">
					{wordQuery.current.word}
					<Badge variant="secondary">{wordQuery.current.lang}</Badge>
					<Badge variant="outline">{wordQuery.current.pos}</Badge>
				</h1>
			{:else if wordQuery.error}
				<h1 class="text-3xl font-bold text-destructive">Error loading word</h1>
			{/if}
		</div>
	</div>

	{#if wordQuery.current}
		<div class="grid gap-6 md:grid-cols-2">
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold">Meanings</h2>
					<Dialog.Root bind:open={openMeaning}>
						<Dialog.Trigger class={buttonVariants({variant: "default"})}>
							Add Meaning
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Add New Meaning</Dialog.Title>
							</Dialog.Header>
							<div class="grid gap-4 py-4">
								<div class="grid gap-2">
									<Label for="definition">Definition</Label>
									<Input id="definition" bind:value={newDefinition} required />
								</div>
								<div class="grid gap-2">
									<Label>Examples</Label>
									{#each newExamples as example, i}
										<div class="flex gap-2">
											<Input bind:value={newExamples[i]} placeholder="Example sentence..." />
											<Button variant="ghost" size="icon" onclick={() => removeExample(i)} class="shrink-0">
												<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
											</Button>
										</div>
									{/each}
									<Button variant="outline" size="sm" onclick={addExample} class="w-full">
										<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
										Add Example
									</Button>
								</div>
							</div>
							<Dialog.Footer>
								<Button onclick={async () => {
									if (!wordQuery.current) return;
									await upsertMeaning({
										wordId: wordQuery.current.id,
										definition: newDefinition,
										examples: newExamples.filter(e => e.trim().length > 0),
										langPair: wordQuery.current.langPair
									}).updates(wordQuery);
									newDefinition = '';
									newExamples = [];
									openMeaning = false;
								}}>Save changes</Button>
							</Dialog.Footer>
						</Dialog.Content>
					</Dialog.Root>
				</div>

				{#if wordQuery.current.meanings.length === 0}
					<div class="text-muted-foreground italic">No meanings added yet.</div>
				{:else}
					{#each wordQuery.current.meanings as meaning}
						<div class="cursor-pointer" onclick={() => selectedMeaning = meaning} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && (selectedMeaning = meaning)}>
							<Card.Root class="{selectedMeaning?.id === meaning.id ? 'border-primary' : ''} transition-colors">
								<Card.Header>
									<Card.Title class="text-base font-normal">{meaning.definition}</Card.Title>
								</Card.Header>
								{#if meaning.examples && meaning.examples.length > 0}
									<Card.Content>
										<div class="text-sm text-muted-foreground space-y-1">
											{#each meaning.examples as example}
												<div class="italic">"{example}"</div>
											{/each}
										</div>
									</Card.Content>
								{/if}
								<Card.Footer class="justify-end gap-2">
									<Button
										variant="ghost"
										size="sm"
										class="text-destructive hover:text-destructive"
										onclick={async () => {
											await deleteMeaning({ id: meaning.id }).updates(wordQuery);
										}}
									>
										Delete
									</Button>
								</Card.Footer>
							</Card.Root>
						</div>
					{/each}
				{/if}
			</div>

			<div class="space-y-6">
				<h2 class="text-xl font-semibold">Translations & Relations</h2>
				{#if !selectedMeaning}
					<div class="rounded-lg border bg-muted/50 p-8 text-center text-muted-foreground">
						Select a meaning to view its connections.
					</div>
				{:else}
					<Card.Root>
						<Card.Header>
							<Card.Title>Connections for: {selectedMeaning.definition}</Card.Title>
							<Card.Description>Manage translations for this meaning.</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-6">
							<div class="space-y-4">
								<h3 class="font-medium text-sm">Existing Connections</h3>
								{#if !selectedMeaning.translationsAsSrc || selectedMeaning.translationsAsSrc.length === 0}
									<div class="text-sm text-muted-foreground italic">No connections yet.</div>
								{:else}
									<div class="grid gap-2">
										{#each selectedMeaning.translationsAsSrc as translation}
											<div class="flex items-center justify-between rounded-md border p-3">
												<div>
													<div class="font-medium flex items-center gap-2">
														{translation.dstMeaning.word.word}
														<Badge variant="secondary" class="text-xs">{translation.dstMeaning.word.lang}</Badge>
														<Badge variant="outline" class="text-xs">{translation.dstMeaning.word.pos}</Badge>
													</div>
													<div class="text-sm text-muted-foreground">{translation.dstMeaning.definition}</div>
												</div>
												<Button
													variant="ghost"
													size="icon"
													class="text-destructive"
													onclick={async () => {
														await deleteTranslation({ id: translation.id }).updates(wordQuery);
													}}
												>
													<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
												</Button>
											</div>
										{/each}
									</div>
								{/if}
							</div>

							<Separator />

							<div class="space-y-4">
								<h3 class="font-medium text-sm">Add Connection</h3>
								<div class="space-y-2">
									<Label>Search Meaning</Label>
									<Input placeholder="Search by word..." bind:value={searchQuery} />
									{#if searchResults.length > 0}
										<div class="rounded-md border max-h-[200px] overflow-y-auto mt-2">
											{#each searchResults as result}
												<div class="p-2 hover:bg-muted flex items-center justify-between">
													<div>
														<div class="font-medium flex items-center gap-2">
															{result.word.text}
															<Badge variant="secondary" class="text-xs">{result.word.lang}</Badge>
														</div>
														<div class="text-xs text-muted-foreground">{result.definition}</div>
													</div>
													<Button
														size="sm"
														variant="secondary"
														onclick={async () => {
															if (!selectedMeaning || !wordQuery.current) return;
															await upsertTranslation({
																srcId: selectedMeaning.id,
																dstId: result.id,
																langPair: wordQuery.current.langPair
															}).updates(wordQuery);
															searchQuery = '';
															searchResults = [];
														}}
													>
														Connect
													</Button>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</div>
	{/if}
</div>
