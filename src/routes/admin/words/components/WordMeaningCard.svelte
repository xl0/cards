<script lang="ts">
	import { PUBLIC_CLOUDFRONT_DOMAIN } from '$env/static/public';
	import { getWordTranslation } from '$lib/remote/word.remote';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import { toast } from '$lib/components/ui/sonner';
	import { deleteMeaning, generateMeaningImageCmd, unlinkMeaningImageCmd, uploadMeaningImageForm } from '$lib/remote/meaning.remote';
	import { ImagePlus, Loader2, Sparkles, Trash2 } from '@lucide/svelte';
	import dbg from 'debug';
	import MeaningDialog from './MeaningDialog.svelte';
	const debug = dbg('app:components:WordMeaningCard');

	type WordDetails = ReturnType<typeof getWordTranslation>;
	type Word = NonNullable<WordDetails['current']>;
	type Meaning = Word['meanings'][number];

	let {
		word,
		meaningId,
		meaningDialog
	}: {
		word: Word;
		meaningId: number;
		meaningDialog?: MeaningDialog;
	} = $props();

	let meaning: Meaning | undefined = $derived(word.meanings.find((m) => m.id == meaningId));
	let imageLoading = $state(false);
	let fileInput: HTMLInputElement | undefined = $state(undefined);
	let uploadForm: HTMLFormElement | undefined = $state(undefined);
	let formInstance = $derived(uploadMeaningImageForm.for(meaningId.toString()));
	// Get first image ID if exists

	const firstImageId = $derived(meaning?.meaningImages?.[0]?.imageId);
	const getImageUrl = (imageId: string, size: 'thumb' | 'medium' | 'original' = 'thumb') =>
		`https://${PUBLIC_CLOUDFRONT_DOMAIN}/images/${imageId}/${size}.webp`;

	async function handleGenerate() {
		if (!word || !meaning) return;
		debug(`generateImage ${word.word} (${word.id}): ${meaning.definition}(${meaning.id})`);
		imageLoading = true;
		try {
			await generateMeaningImageCmd({
				word: word.word,
				meaning: meaning.definition,
				meaningId: meaning.id
			}).updates(getWordTranslation({ id: word.id }));
		} finally {
			imageLoading = false;
		}
	}

	async function handleUnlinkImage({ meaningId, imageId }: { meaningId: number; imageId: string }) {
		if (!firstImageId) return;
		debug(`unlinkImage ${meaningId} <> ${imageId}`);
		imageLoading = true;
		try {
			await unlinkMeaningImageCmd({ meaningId, imageId }).updates(getWordTranslation({ id: word.id }));
		} finally {
			imageLoading = false;
		}
	}
</script>

{#if word && meaning}
	<form
		{...formInstance.enhance(async ({ form, data, submit }) => {
			imageLoading = true;
			debug('enhance submit', { form, data });
			try {
				const result = await submit().updates(getWordTranslation({ id: word.id }));
				debug('submit result', result);
				const issues = formInstance.fields.allIssues?.() ?? [];
				if (issues.length > 0) {
					console.error('app:components:WordMeaningCard validation issues', issues);
				} else {
					form.reset();
				}
			} catch (e) {
				debug('submit error', { wordId: word.id, meaningId, error: e });
				const message = e instanceof Error ? e.message : String(e);
				toast.error('Upload failed', { description: message });
			}
			imageLoading = false;
		})}
		enctype="multipart/form-data"
		bind:this={uploadForm}>
		<input type="number" class="hidden" name="meaningId" value={meaningId} />
		<input type="file" name="image" class="hidden" accept="image/*" bind:this={fileInput} onchange={() => uploadForm?.requestSubmit()} />
	</form>

	<div class="bg-background rounded-md border p-3">
		<div class="flex items-start gap-3">
			<!-- Image section -->
			<div class="shrink-0">
				{#if firstImageId}
					<div class="group relative">
						<img
							src={getImageUrl(firstImageId, 'thumb')}
							alt={meaning?.definition || 'Meaning image'}
							class="h-20 w-20 rounded-md object-cover" />
						<div
							class="absolute inset-0 flex items-center justify-center gap-1 rounded-md bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
							{#if imageLoading}
								<Loader2 class="h-5 w-5 animate-spin text-white" />
							{:else if meaning}
								<Button variant="ghost" size="icon" class="h-7 w-7 text-white hover:bg-white/20" onclick={() => fileInput?.click()}>
									<ImagePlus class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									class="h-7 w-7 text-white hover:bg-white/20"
									onclick={() => handleUnlinkImage({ meaningId: meaning.id, imageId: firstImageId })}>
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
							<Button variant="ghost" size="icon" class="h-7 w-7" onclick={() => fileInput?.click()} title="Upload image">
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
						meaningDialog?.open(word, meaning);
					}}>
					Edit
				</Button>
				<DeleteButton
					title="Delete meaning"
					onConfirm={async () => {
						await deleteMeaning({ id: meaning.id }).updates(getWordTranslation({ id: word.id }));
					}} />
			</div>
		</div>
	</div>
{/if}
