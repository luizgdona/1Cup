import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { env } from '../../config/env';

const s3 = new S3Client({
  region: 'auto',
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
});

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateImageUpload(mimetype: string, size: number) {
  if (!ALLOWED_MIME.has(mimetype)) {
    throw { statusCode: 400, message: 'Formato inválido. Use JPEG, PNG ou WebP.' };
  }
  if (size > MAX_BYTES) {
    throw { statusCode: 400, message: 'Arquivo muito grande. Limite: 5 MB.' };
  }
}

export async function uploadImage(
  buffer: Buffer,
  mimetype: string,
  folder: string,
): Promise<string> {
  const ext = mimetype.split('/')[1].replace('jpeg', 'jpg');
  const key = `${folder}/${Date.now()}-${randomUUID()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    }),
  );

  return `${env.S3_PUBLIC_URL}/${key}`;
}

export async function deleteImage(url: string) {
  const key = url.replace(`${env.S3_PUBLIC_URL}/`, '');
  await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}
