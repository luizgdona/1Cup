import { describe, it, expect } from 'vitest';
import { BADGE_SEED } from '../modules/badges/badges.service';

// The set of rule types the engine actually implements in checkRule().
const IMPLEMENTED_RULE_TYPES = new Set([
  'checkin_count', 'unique_coffee_count', 'roast_count', 'roastery_count', 'producer_count',
  'country_count', 'variety_count', 'method_count', 'process_count', 'high_rating_count',
  'sca_connoisseur', 'photo_count', 'early_bird', 'night_owl', 'weekend_count', 'streak_days',
  'friend_count', 'follows_count', 'comments_made', 'likes_received',
]);

describe('BADGE_SEED catalog', () => {
  it('has a healthy number of badges', () => {
    expect(BADGE_SEED.length).toBeGreaterThanOrEqual(25);
  });

  it('has unique slugs', () => {
    const slugs = BADGE_SEED.map((b) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('only uses rule types the engine implements', () => {
    for (const b of BADGE_SEED) {
      expect(IMPLEMENTED_RULE_TYPES.has(b.rule.type), `unimplemented rule: ${b.rule.type} (${b.slug})`).toBe(true);
    }
  });

  it('uses valid tiers and categories with positive thresholds', () => {
    const tiers = new Set(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']);
    const cats = new Set(['MILESTONE', 'EXPLORER', 'CONNOISSEUR', 'SOCIAL', 'DEDICATION']);
    for (const b of BADGE_SEED) {
      expect(tiers.has(b.tier)).toBe(true);
      expect(cats.has(b.category)).toBe(true);
      expect(b.rule.value).toBeGreaterThan(0);
    }
  });

  it('covers every badge category', () => {
    const present = new Set(BADGE_SEED.map((b) => b.category));
    ['MILESTONE', 'EXPLORER', 'CONNOISSEUR', 'SOCIAL', 'DEDICATION'].forEach((c) => expect(present.has(c as any)).toBe(true));
  });
});
