import { describe, it, expect } from 'vitest';
import { createCoffeeSchema, listCoffeesSchema } from '../modules/coffees/coffees.schema';

describe('createCoffeeSchema', () => {
  const base = { name: 'Gesha Village', roasteryId: 'clxxxxxxxxxxxxxxx0000000000' };

  it('accepts minimal valid coffee', () => {
    const r = createCoffeeSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('accepts full coffee data', () => {
    const r = createCoffeeSchema.safeParse({
      ...base,
      variety: 'Gesha',
      roastColor: 'LIGHT',
      processMethod: 'Washed',
      tastingNotes: ['Jasmine', 'Bergamot', 'Peach'],
      scaScore: 90.5,
      brewMethods: ['V60', 'Aeropress'],
    });
    expect(r.success).toBe(true);
  });

  it('rejects invalid roastColor', () => {
    const r = createCoffeeSchema.safeParse({ ...base, roastColor: 'VERY_DARK' });
    expect(r.success).toBe(false);
  });

  it('rejects scaScore above 100', () => {
    const r = createCoffeeSchema.safeParse({ ...base, scaScore: 101 });
    expect(r.success).toBe(false);
  });

  it('rejects name shorter than 2 chars', () => {
    const r = createCoffeeSchema.safeParse({ ...base, name: 'X' });
    expect(r.success).toBe(false);
  });

  it('defaults tastingNotes and brewMethods to empty array', () => {
    const r = createCoffeeSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.tastingNotes).toEqual([]);
      expect(r.data.brewMethods).toEqual([]);
    }
  });
});

describe('listCoffeesSchema', () => {
  it('parses page and perPage as numbers', () => {
    const r = listCoffeesSchema.safeParse({ page: '2', perPage: '10' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(2);
      expect(r.data.perPage).toBe(10);
    }
  });

  it('accepts valid roastColor filter', () => {
    const r = listCoffeesSchema.safeParse({ roastColor: 'MEDIUM' });
    expect(r.success).toBe(true);
  });

  it('rejects invalid roastColor filter', () => {
    const r = listCoffeesSchema.safeParse({ roastColor: 'BURNT' });
    expect(r.success).toBe(false);
  });
});
