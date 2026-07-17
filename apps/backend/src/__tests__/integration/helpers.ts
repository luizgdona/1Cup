import { createHash } from 'crypto';
import { prisma } from '../../config/database';

/** Same hashing the auth service uses for tokens at rest (SHA-256 hex). */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Removes all rows this suite may create. Ordered to respect FKs for the
 * relations that don't cascade from User (friendships).
 */
export async function cleanDb(): Promise<void> {
  await prisma.emailVerificationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.editSuggestion.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.user.deleteMany();
}
