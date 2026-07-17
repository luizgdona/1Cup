import { describe, it, expect } from 'vitest';
import { detectImageType, validateImageUpload } from '../shared/utils/s3';

// Minimal valid magic-byte headers padded to 12 bytes.
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const webp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
// HTML masquerading as PNG (the classic stored-XSS payload).
const htmlPayload = Buffer.from('<html><script>alert(1)</script></html>', 'utf8');

describe('detectImageType', () => {
  it('detects jpeg / png / webp by signature', () => {
    expect(detectImageType(jpeg)).toBe('image/jpeg');
    expect(detectImageType(png)).toBe('image/png');
    expect(detectImageType(webp)).toBe('image/webp');
  });

  it('returns null for non-image content', () => {
    expect(detectImageType(htmlPayload)).toBeNull();
    expect(detectImageType(Buffer.from([1, 2, 3]))).toBeNull();
  });
});

describe('validateImageUpload with buffer', () => {
  it('accepts a real png even if declared png', () => {
    expect(() => validateImageUpload('image/png', png.length, png)).not.toThrow();
  });

  it('rejects HTML spoofing an image/png Content-Type', () => {
    expect(() => validateImageUpload('image/png', htmlPayload.length, htmlPayload)).toThrow();
  });

  it('still rejects a disallowed declared mimetype', () => {
    expect(() => validateImageUpload('image/svg+xml', png.length, png)).toThrow();
  });
});
