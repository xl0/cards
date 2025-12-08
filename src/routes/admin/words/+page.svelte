<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { LangPairs } from '$lib/enums';
	import type { LangPair } from '$lib/enums';
	import { PersistedState } from 'runed';
	import WordTable from './components/WordTable.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Plus } from '@lucide/svelte';

	const langPair = new PersistedState<LangPair>('admin-lang-pair', LangPairs.EnEs, { storage: 'local', syncTabs: false });
	let wordTable: WordTable;
</script>

<div class="container mx-auto py-10">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Words</h1>
		<div class="flex items-center gap-4">
			<div class="flex items-center gap-2">
				<Label>Language Pair</Label>
				<Select.Root type="single" bind:value={langPair.current}>
					<Select.Trigger class="w-[180px]">{langPair.current}</Select.Trigger>
					<Select.Content>
						{#each Object.values(LangPairs) as pair}
							<Select.Item value={pair}>{pair}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<Button onclick={() => wordTable.openAddWord()}><Plus class="mr-1 h-4 w-4" /> Add Word</Button>
		</div>
	</div>

	<WordTable bind:this={wordTable} langPair={langPair.current} />
</div>
