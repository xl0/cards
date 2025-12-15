<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { getWordTranslation } from '$lib/remote/word.remote';
	import type MeaningDialog from './MeaningDialog.svelte';
	import WordMeaningCard from './WordMeaningCard.svelte';
	import { Plus } from '@lucide/svelte';
	import dbg from 'debug';
	const debug = dbg('app:components:WordMeaningsSection');

	let {
		wordId,
		meaningDialog
	}: {
		wordId: number;
		meaningDialog?: MeaningDialog;
	} = $props();

	let wordDetails = $derived(getWordTranslation({ id: wordId }));
</script>

{#if wordDetails.current}
	{@const word = wordDetails.current}
	<div class="mb-2 flex items-center justify-between">
		<span class="text-sm font-medium">Meanings</span>
		<Button
			variant="outline"
			size="sm"
			onclick={(e) => {
				e.stopPropagation();
				debug('openAddMeaning w%d', word.id);
				meaningDialog?.open(word);
			}}>
			<Plus class="mr-1 h-4 w-4" /> Add Meaning
		</Button>
	</div>

	{#if word.meanings.length === 0}
		<div class="text-muted-foreground text-sm italic">No meanings yet.</div>
	{:else}
		<div class="space-y-2">
			{#each word.meanings as meaning}
				<WordMeaningCard {word} meaningId={meaning.id} {meaningDialog} />
			{/each}
		</div>
	{/if}
{:else}
	<div class="text-muted-foreground text-sm">Fetching meanings…</div>
{/if}
