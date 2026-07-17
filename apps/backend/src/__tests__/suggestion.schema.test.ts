import { describe, it, expect } from 'vitest';
import { createSuggestionSchema } from '../modules/coffees/coffees.schema';

describe('createSuggestionSchema (mass-assignment guard)', () => {
  it('accepts a suggestion touching allowed fields only', () => {
    const r = createSuggestionSchema.safeParse({ payload: { name: 'New Name', roastColor: 'LIGHT' } });
    expect(r.success).toBe(true);
  });

  it('rejects an empty payload', () => {
    const r = createSuggestionSchema.safeParse({ payload: {} });
    expect(r.success).toBe(false);
  });

  it('rejects a payload trying to reassign ownership/relations', () => {
    const r = createSuggestionSchema.safeParse({
      payload: { name: 'x', roasteryId: 'other', createdBy: 'attacker', isActive: false },
    });
    expect(r.success).toBe(false);
  });

  it('rejects unknown/injected keys via .strict()', () => {
    const r = createSuggestionSchema.safeParse({ payload: { __proto__: {}, admin: true } });
    expect(r.success).toBe(false);
  });
});
