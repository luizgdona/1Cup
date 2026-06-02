import { describe, it, expect } from 'vitest';
import { validateImageUpload } from '../shared/utils/s3';

describe('validateImageUpload', () => {
  it('accepts jpeg within size limit', () => {
    expect(() => validateImageUpload('image/jpeg', 1 * 1024 * 1024)).not.toThrow();
  });

  it('accepts png within size limit', () => {
    expect(() => validateImageUpload('image/png', 3 * 1024 * 1024)).not.toThrow();
  });

  it('accepts webp within size limit', () => {
    expect(() => validateImageUpload('image/webp', 4 * 1024 * 1024)).not.toThrow();
  });

  it('rejects gif (not in allowed list)', () => {
    expect(() => validateImageUpload('image/gif', 100)).toThrow();
  });

  it('rejects pdf', () => {
    expect(() => validateImageUpload('application/pdf', 100)).toThrow();
  });

  it('rejects file over 5 MB', () => {
    const overLimit = 5 * 1024 * 1024 + 1;
    expect(() => validateImageUpload('image/jpeg', overLimit)).toThrow();
  });

  it('accepts file exactly at 5 MB limit', () => {
    const atLimit = 5 * 1024 * 1024;
    expect(() => validateImageUpload('image/jpeg', atLimit)).not.toThrow();
  });
});
