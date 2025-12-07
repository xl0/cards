
<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Textarea } from "$lib/components/ui/textarea";
	import { Badge } from "$lib/components/ui/badge";
	import { Separator } from "$lib/components/ui/separator";
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import { createMeaningAction, deleteMeaningAction, addTranslationAction, deleteTranslationAction, searchMeaningsQuery } from './page.remote';

	export let data: PageData & {
		word: {
			meanings: MeaningWithTranslations[];
		}
	};

	// Manually define the type since inferred PageData is missing translations
	interface MeaningWithTranslations {
		id: number;
		langPair: string;
		wordId: number;
		definition: string;
		examples: string[] | null;
		translations: Array<{
			id: number;
			srcMeaningId: number;
			dstMeaningId: number;
			otherMeaning: {
				id: number;
				definition: string;
				word: {
					id: number;
					text: string;
					lang: string;
					pos: string;
				};
			};
		}>;
	}

	let openMeaning = false;
	let selectedMeaning: MeaningWithTranslations | null = null;

	let searchQuery = '';
	let searchResults: any[] = [];
	let searching = false;

	let newDefinition = '';
	let newExamples = '';

	async function handleSearch() {
		if (!searchQuery.trim()) {
			searchResults = [];
			return;
		}
		searching = true;
		try {
			searchResults = await searchMeaningsQuery({
				q: searchQuery,
				excludeId: selectedMeaning?.id
			});
		} finally {
			searching = false;
		}
	}

	$: if (searchQuery) {
		// Debounce could be added here
		handleSearch();
	}
</script>

<div class="container mx-auto py-10 space-y-8">
	<div class="flex items-center gap-4">
		<Button variant="outline" size="icon" href="/admin/words">
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
		</Button>
		<div>
			<h1 class="text-3xl font-bold flex items-center gap-3">
				{data.word.word}
				<Badge variant="secondary">{data.word.lang}</Badge>
				<Badge variant="outline">{data.word.pos}</Badge>
			</h1>
		</div>
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<div class="space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-semibold">Meanings</h2>
				<Dialog.Root bind:open={openMeaning}>
					<Dialog.Trigger>
						<Button size="sm">Add Meaning</Button>
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
								<Label for="examples">Examples (one per line)</Label>
								<Textarea id="examples" bind:value={newExamples} />
							</div>
						</div>
						<Dialog.Footer>
							<Button onclick={async () => {
								await createMeaningAction({
									wordId: data.word.id,
									definition: newDefinition,
									examples: newExamples
								});
								newDefinition = '';
								newExamples = '';
								openMeaning = false;
								await invalidateAll();
							}}>Save changes</Button>
						</Dialog.Footer>
					</Dialog.Content>
				</Dialog.Root>
			</div>

			{#if data.word.meanings.length === 0}
				<div class="text-muted-foreground italic">No meanings added yet.</div>
			{:else}
				{#each data.word.meanings as meaning}
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
										await deleteMeaningAction({ id: meaning.id });
										await invalidateAll();
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
							{#if selectedMeaning.translations.length === 0}
								<div class="text-sm text-muted-foreground italic">No connections yet.</div>
							{:else}
								<div class="grid gap-2">
									{#each selectedMeaning.translations as translation}
										<div class="flex items-center justify-between rounded-md border p-3">
											<div>
												<div class="font-medium flex items-center gap-2">
													{translation.otherMeaning.word.text}
													<Badge variant="secondary" class="text-xs">{translation.otherMeaning.word.lang}</Badge>
													<Badge variant="outline" class="text-xs">{translation.otherMeaning.word.pos}</Badge>
												</div>
												<div class="text-sm text-muted-foreground">{translation.otherMeaning.definition}</div>
											</div>
											<Button
												variant="ghost"
												size="icon"
												class="text-destructive"
												onclick={async () => {
													await deleteTranslationAction({ id: translation.id });
													await invalidateAll();
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
														if (!selectedMeaning) return;
														await addTranslationAction({ srcId: selectedMeaning.id, dstId: result.id });
														searchQuery = '';
														searchResults = [];
														await invalidateAll();
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
</div>
