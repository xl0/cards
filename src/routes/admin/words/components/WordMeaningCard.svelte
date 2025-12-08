<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { deleteMeaning } from '$lib/remote/meaning.remote';

	type MeaningWithTranslations = {
		id: number;
		definition: string | null;
		examples: string[] | null;
		translationsAsSrc?: {
			id: number;
			dstMeaning: { id: number; definition: string | null; word: { word: string; lang: string; pos: string } };
		}[];
	};

	let {
		meaning,
		onEdit,
		onDeleted,
		wordDetails,
		wordsQuery
	}: {
		meaning: MeaningWithTranslations;
		onEdit: () => void;
		onDeleted: () => void;
		wordDetails: any;
		wordsQuery: any;
	} = $props();

	let confirmDelete = $state(false);
</script>

<div class="bg-background rounded-md border p-3">
	<div class="flex items-start justify-between gap-3">
		<div class="space-y-1">
			<div class="font-medium">{meaning.definition}</div>
			{#if meaning.examples?.length}
				<div class="text-muted-foreground space-y-1 text-xs">
					{#each meaning.examples as ex}
						<div class="italic">"{ex}"</div>
					{/each}
				</div>
			{/if}
			{#if meaning.translationsAsSrc?.length}
				<div class="text-muted-foreground flex flex-wrap gap-2 text-xs">
					<span class="text-foreground font-semibold">Translations:</span>
					{#each meaning.translationsAsSrc as t}
						<Badge variant="outline" class="text-xs">
							{t.dstMeaning.word.word} · {t.dstMeaning.word.lang}
						</Badge>
					{/each}
				</div>
			{/if}
		</div>
		<div class="flex gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={(e) => {
					e.stopPropagation();
					onEdit();
				}}>
				Edit
			</Button>
			<Button
				variant="ghost"
				size="sm"
				class="text-destructive hover:text-destructive"
				onclick={(e) => {
					e.stopPropagation();
					confirmDelete = !confirmDelete;
				}}>
				Delete
			</Button>
		</div>
	</div>
	{#if confirmDelete}
		<div class="mt-3 flex items-center gap-3 text-sm">
			<span>Delete this meaning?</span>
			<div class="flex gap-2">
				<Button
					variant="destructive"
					size="sm"
					onclick={async (e) => {
						e.stopPropagation();
						await deleteMeaning({ id: meaning.id }).updates(wordDetails, wordsQuery);
						onDeleted();
						confirmDelete = false;
					}}>
					Confirm
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onclick={(e) => {
						e.stopPropagation();
						confirmDelete = false;
					}}>
					Cancel
				</Button>
			</div>
		</div>
	{/if}
</div>
