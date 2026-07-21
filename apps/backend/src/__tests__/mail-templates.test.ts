import { describe, it, expect } from 'vitest';
import { buildVerificationEmail, buildPasswordResetEmail } from '../shared/utils/mail-templates';

describe('buildVerificationEmail', () => {
  const url = 'https://1cup.app/verify-email?token=abc123';
  const ttlHours = 24;

  it('returns subject, text and html', () => {
    const msg = buildVerificationEmail(url, ttlHours);
    expect(msg).toHaveProperty('subject');
    expect(msg).toHaveProperty('text');
    expect(msg).toHaveProperty('html');
  });

  it('subject contains 1Cup', () => {
    const { subject } = buildVerificationEmail(url, ttlHours);
    expect(subject).toContain('1Cup');
  });

  it('text and html contain the passed url', () => {
    const { text, html } = buildVerificationEmail(url, ttlHours);
    expect(text).toContain(url);
    expect(html).toContain(url);
  });

  it('mentions the validity in hours', () => {
    const { text } = buildVerificationEmail(url, ttlHours);
    expect(text).toContain(`${ttlHours}`);
  });

  it('html contains an href link to the url', () => {
    const { html } = buildVerificationEmail(url, ttlHours);
    expect(html).toContain(`href="${url}"`);
  });
});

describe('buildPasswordResetEmail', () => {
  const url = 'https://1cup.app/reset-password?token=abc123';
  const ttlMinutes = 60;

  it('returns subject, text and html', () => {
    const msg = buildPasswordResetEmail(url, ttlMinutes);
    expect(msg).toHaveProperty('subject');
    expect(msg).toHaveProperty('text');
    expect(msg).toHaveProperty('html');
  });

  it('subject contains 1Cup', () => {
    const { subject } = buildPasswordResetEmail(url, ttlMinutes);
    expect(subject).toContain('1Cup');
  });

  it('text and html contain the passed url', () => {
    const { text, html } = buildPasswordResetEmail(url, ttlMinutes);
    expect(text).toContain(url);
    expect(html).toContain(url);
  });

  it('mentions the validity in minutes', () => {
    const { text } = buildPasswordResetEmail(url, ttlMinutes);
    expect(text).toContain(`${ttlMinutes} minutos`);
  });

  it('mentions to ignore the email if it was not the user', () => {
    const { text } = buildPasswordResetEmail(url, ttlMinutes);
    expect(text.toLowerCase()).toContain('se não foi você');
  });

  it('html contains an href link to the url', () => {
    const { html } = buildPasswordResetEmail(url, ttlMinutes);
    expect(html).toContain(`href="${url}"`);
  });
});
