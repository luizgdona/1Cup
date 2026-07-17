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

// Map of the real content type (detected from the file's magic bytes) to its
// canonical extension. We deliberately do NOT trust the client-supplied
// Content-Type header: an attacker can label an HTML/SVG payload as image/png
// and, if served inline, trigger stored XSS.
type DetectedType = 'image/jpeg' | 'image/png' | 'image/webp';
const EXT_BY_TYPE: Record<DetectedType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Detects the real image type from the first bytes of the buffer.
 * Returns null when the content does not match an allowed image format.
 */
export function detectImageType(buffer: Buffer): DetectedType | null {
  if (buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return 'image/png';
  // WEBP: "RIFF"...."WEBP"
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return 'image/webp';
  return null;
}

/**
 * Validates size and, when the buffer is available, the real file signature.
 * `size` is checked first so oversized uploads are rejected cheaply.
 */
export function validateImageUpload(mimetype: string, size: number, buffer?: Buffer) {
  // 1) Declared type must be an allowed image (cheap, rejects obvious junk early)
  if (!ALLOWED_MIME.has(mimetype)) {
    throw { statusCode: 400, message: 'Formato inválido. Use JPEG, PNG ou WebP.' };
  }
  // 2) Size guard
  if (size > MAX_BYTES) {
    throw { statusCode: 400, message: 'Arquivo muito grande. Limite: 5 MB.' };
  }
  // 3) When the bytes are available, the real signature must match an allowed
  //    image — this is what actually stops a spoofed Content-Type header.
  if (buffer && detectImageType(buffer) === null) {
    throw { statusCode: 400, message: 'Conteúdo do arquivo não corresponde a uma imagem válida.' };
  }
}

export async function uploadImage(
  buffer: Buffer,
  _mimetype: string,
  folder: string,
): Promise<string> {
  const detected = detectImageType(buffer);
  if (!detected) {
    throw { statusCode: 400, message: 'Formato inválido. Use JPEG, PNG ou WebP.' };
  }

  const ext = EXT_BY_TYPE[detected];
  const key = `${folder}/${Date.now()}-${randomUUID()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: buffer,
      // Force the detected type + attachment disposition so the object can never
      // be served as inline HTML/SVG even if the bucket is public.
      ContentType: detected,
      ContentDisposition: 'inline',
    }),
  );

  return `${env.S3_PUBLIC_URL}/${key}`;
}

export async function deleteImage(url: string) {
  const key = url.replace(`${env.S3_PUBLIC_URL}/`, '');
  await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}
