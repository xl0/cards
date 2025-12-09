import Replicate from 'replicate';

import { REPLICATE_API_TOKEN } from '$env/static/private';

const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

type ReplicateFileOutput = { url: () => string };

function isReplicateFileOutputArray(value: unknown): value is ReplicateFileOutput[] {
	return Array.isArray(value) && value.length > 0 && typeof value[0].url === 'function';
}

/**
 * Generate an image from a prompt using AI.
 */
export async function generateMeaningImage(prompt: string): Promise<Buffer> {
	const output = await replicate.run('bytedance/seedream-4', {
		input: { prompt, aspect_ratio: '1:1' }
	});

	if (!isReplicateFileOutputArray(output)) {
		throw new Error('Unexpected image generation output format from Replicate');
	}

	const fileOutput = output[0];
	const url = fileOutput.url();

	// Fetch the image
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to fetch generated image: ${response.status}`);

	const arrayBuffer = await response.arrayBuffer();
	return Buffer.from(arrayBuffer);
}
