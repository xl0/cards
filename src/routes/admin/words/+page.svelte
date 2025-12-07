
<script lang="ts">
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as Table from "$lib/components/ui/table";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	export let data: PageData;

	let open = false;
</script>

<div class="container mx-auto py-10">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-3xl font-bold">Words</h1>
		<Dialog.Root bind:open>
			<Dialog.Trigger class={buttonVariants({ variant: "default" })}>
				Add Word
			</Dialog.Trigger>
			<Dialog.Content class="sm:max-w-[425px]">
				<Dialog.Header>
					<Dialog.Title>Add New Word</Dialog.Title>
					<Dialog.Description>
						Add a new word to the database.
					</Dialog.Description>
				</Dialog.Header>
				<form method="POST" action="?/create" use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success') {
							open = false;
						}
					};
				}}>
					<div class="grid gap-4 py-4">
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="text" class="text-right">Text</Label>
							<Input id="text" name="text" class="col-span-3" required />
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="lang" class="text-right">Language</Label>
							<div class="col-span-3">
								<select name="lang" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
									<option value="en">English (en)</option>
									<option value="es">Spanish (es)</option>
								</select>
							</div>
						</div>
						<div class="grid grid-cols-4 items-center gap-4">
							<Label for="pos" class="text-right">POS</Label>
							<div class="col-span-3">
								<select name="pos" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
									<option value="verb">Verb</option>
									<option value="noun">Noun</option>
									<option value="adjective">Adjective</option>
									<option value="adverb">Adverb</option>
									<option value="pronoun">Pronoun</option>
									<option value="preposition">Preposition</option>
									<option value="conjunction">Conjunction</option>
									<option value="interjection">Interjection</option>
								</select>
							</div>
						</div>
					</div>
					<Dialog.Footer>
						<Button type="submit">Save changes</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>
	</div>

	<div class="rounded-md border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Text</Table.Head>
					<Table.Head>Language</Table.Head>
					<Table.Head>POS</Table.Head>
					<Table.Head class="text-right">Meanings</Table.Head>
					<Table.Head class="text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.words as word}
					<Table.Row>
						<Table.Cell class="font-medium">{word.text}</Table.Cell>
						<Table.Cell>{word.lang}</Table.Cell>
						<Table.Cell>{word.pos}</Table.Cell>
						<Table.Cell class="text-right">{word.meaningsCount}</Table.Cell>
						<Table.Cell class="text-right">
							<div class="flex justify-end gap-2">
								<Button variant="outline" size="sm" href={`/admin/words/${word.id}`}>Edit</Button>
								<form method="POST" action="?/delete" use:enhance>
									<input type="hidden" name="id" value={word.id} />
									<Button variant="destructive" size="sm" type="submit">Delete</Button>
								</form>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>
