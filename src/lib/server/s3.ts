import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET } from '$env/static/private';
import { PUBLIC_CLOUDFRONT_DOMAIN } from '$env/static/public';

const s3 = new S3Client({
	region: AWS_REGION,
	credentials: {
		accessKeyId: AWS_ACCESS_KEY_ID,
		secretAccessKey: AWS_SECRET_ACCESS_KEY
	}
});

const BUCKET = S3_BUCKET;

export const IMAGE_SIZES = {
	thumb: 200,
	medium: 800
} as const;

export type ImageSize = keyof typeof IMAGE_SIZES | 'original';

/**
 * Upload an image with UUID-based key, generating thumb, medium, and original.
 * Returns the image UUID (used as base key).
 */
export async function uploadImage(imageId: string, imageBuffer: Buffer): Promise<void> {
	const baseKey = `images/${imageId}`;

	// Upload original
	const originalWebp = await sharp(imageBuffer).webp({ quality: 90 }).toBuffer();
	await s3.send(
		new PutObjectCommand({
			Bucket: BUCKET,
			Key: `${baseKey}/original.webp`,
			Body: originalWebp,
			ContentType: 'image/webp',
			CacheControl: 'public, max-age=31536000, immutable'
		})
	);

	// Upload resized versions
	await Promise.all(
		Object.entries(IMAGE_SIZES).map(async ([size, width]) => {
			const resized = await sharp(imageBuffer)
				.resize(width, width, { fit: 'inside', withoutEnlargement: true })
				.webp({ quality: 80 })
				.toBuffer();

			await s3.send(
				new PutObjectCommand({
					Bucket: BUCKET,
					Key: `${baseKey}/${size}.webp`,
					Body: resized,
					ContentType: 'image/webp',
					CacheControl: 'public, max-age=31536000, immutable'
				})
			);
		})
	);
}

/**
 * Get the CloudFront URL for an image.
 */
export function getImageUrl(baseKey: string, size: ImageSize = 'thumb'): string {
	return `https://${PUBLIC_CLOUDFRONT_DOMAIN}/${baseKey}/${size}.webp`;
}
