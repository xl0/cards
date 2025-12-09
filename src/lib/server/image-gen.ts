import Replicate from 'replicate';

import { REPLICATE_API_TOKEN } from '$env/static/private';

const replicate = new Replicate({auth: REPLICATE_API_TOKEN});

/**
 * Generate an image for a word meaning using AI.
 */
export async function generateMeaningImage(word: string, definition: string): Promise<Buffer> {
	const prompt = `spaced repetition card for word: ${word} (${definition})`;

	const output = await replicate.run('bytedance/seedream-4', {
		input: { prompt, aspect_ratio: '1:1' }
	});

	// output is an array of FileOutput objects
	const fileOutput = (output as any)[0];
	const url = fileOutput.url();

	// Fetch the image
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to fetch generated image: ${response.status}`);

	const arrayBuffer = await response.arrayBuffer();
	return Buffer.from(arrayBuffer);
}
