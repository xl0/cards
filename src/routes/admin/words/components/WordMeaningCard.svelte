<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { deleteMeaning, uploadMeaningImageCmd, generateMeaningImageCmd, unlinkMeaningImageCmd } from '$lib/remote/meaning.remote';
	import { ImagePlus, Sparkles, Trash2, Loader2 } from '@lucide/svelte';
	import { PUBLIC_CLOUDFRONT_DOMAIN } from '$env/static/public';
	import dbg from 'debug';
	const debug = dbg('app:components:WordMeaningCard');

	type MeaningWithTranslations = {
		id: number;
		definition: string | null;
		examples: string[] | null;
		meaningImages?: { imageId: string }[];
		translationsAsSrc?: {
			id: number;
			dstMeaning: { id: number; definition: string | null; word: { word: string; lang: string; pos: string } };
		}[];
	};

	let {
		meaning,
		word,
		onEdit,
		onDeleted,
		wordDetails,
		wordsQuery
	}: {
		meaning: MeaningWithTranslations;
		word: string;
		onEdit: () => void;
		onDeleted: () => void;
		wordDetails: any;
		wordsQuery: any;
	} = $props();

	let confirmDelete = $state(false);
	let imageLoading = $state(false);
	let fileInput: HTMLInputElement;

	// Get first image ID if exists
	const firstImageId = $derived(meaning.meaningImages?.[0]?.imageId);
	const getImageUrl = (imageId: string, size: 'thumb' | 'medium' | 'original' = 'thumb') =>
		`https://${PUBLIC_CLOUDFRONT_DOMAIN}/images/${imageId}/${size}.webp`;

	async function handleFileUpload(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		debug('uploadImage m%d %s (%d bytes)', meaning.id, file.name, file.size);
		imageLoading = true;
		try {
			const buffer = await file.arrayBuffer();
			const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
			await uploadMeaningImageCmd({ meaningId: meaning.id, imageBase64: base64 }).updates(wordDetails);
		} finally {
			imageLoading = false;
		}
	}

	async function handleGenerate() {
		debug('generateImage m%d %s', meaning.id, word);
		imageLoading = true;
		try {
			await generateMeaningImageCmd({
				meaningId: meaning.id,
				word,
				definition: meaning.definition || ''
			}).updates(wordDetails);
		} finally {
			imageLoading = false;
		}
	}

	async function handleUnlinkImage() {
		if (!firstImageId) return;
		debug('unlinkImage m%d %s', meaning.id, firstImageId.slice(0, 8));
		imageLoading = true;
		try {
			await unlinkMeaningImageCmd({ meaningId: meaning.id, imageId: firstImageId }).updates(wordDetails);
		} finally {
			imageLoading = false;
		}
	}
</script>

<input type="file" accept="image/*" class="hidden" bind:this={fileInput} onchange={handleFileUpload} />

<div class="bg-background rounded-md border p-3">
	<div class="flex items-start gap-3">
		<!-- Image section -->
		<div class="shrink-0">
			{#if firstImageId}
				<div class="group relative">
					<img
						src={getImageUrl(firstImageId, 'thumb')}
						alt={meaning.definition || 'Meaning image'}
						class="h-20 w-20 rounded-md object-cover" />
					<div
						class="absolute inset-0 flex items-center justify-center gap-1 rounded-md bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
						{#if imageLoading}
							<Loader2 class="h-5 w-5 animate-spin text-white" />
						{:else}
							<Button variant="ghost" size="icon" class="h-7 w-7 text-white hover:bg-white/20" onclick={() => fileInput.click()}>
								<ImagePlus class="h-4 w-4" />
							</Button>
							<Button variant="ghost" size="icon" class="h-7 w-7 text-white hover:bg-white/20" onclick={handleUnlinkImage}>
								<Trash2 class="h-4 w-4" />
							</Button>
						{/if}
					</div>
				</div>
			{:else}
				<div class="bg-muted flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed">
					{#if imageLoading}
						<Loader2 class="text-muted-foreground h-5 w-5 animate-spin" />
					{:else}
						<Button variant="ghost" size="icon" class="h-7 w-7" onclick={() => fileInput.click()} title="Upload image">
							<ImagePlus class="text-muted-foreground h-4 w-4" />
						</Button>
						<Button variant="ghost" size="icon" class="h-7 w-7" onclick={handleGenerate} title="Generate with AI">
							<Sparkles class="text-muted-foreground h-4 w-4" />
						</Button>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Content section -->
		<div class="min-w-0 flex-1 space-y-1">
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

		<!-- Actions -->
		<div class="flex shrink-0 gap-2">
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
