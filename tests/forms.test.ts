import { describe, expect, it } from 'vitest';
import { getCenturyInForm, getCurrentForm, getCurrentFormDefinition } from '../src/game/forms';

describe('getCurrentForm', () => {
  it('starts at NEWBORN', () => {
    expect(getCurrentForm(0)).toBe('NEWBORN');
  });

  it('steps through forms at documented thresholds', () => {
    expect(getCurrentForm(1)).toBe('ELDER');
    expect(getCurrentForm(2)).toBe('ELDER');
    expect(getCurrentForm(3)).toBe('LORD_OF_NIGHT');
    expect(getCurrentForm(6)).toBe('LORD_OF_NIGHT');
    expect(getCurrentForm(7)).toBe('METHUSELAH');
    expect(getCurrentForm(14)).toBe('METHUSELAH');
    expect(getCurrentForm(15)).toBe('PROGENITOR');
    expect(getCurrentForm(29)).toBe('PROGENITOR');
    expect(getCurrentForm(30)).toBe('TERA_OVERLORD');
    expect(getCurrentForm(49)).toBe('TERA_OVERLORD');
    expect(getCurrentForm(50)).toBe('HORROR_INCARNATE');
    expect(getCurrentForm(99)).toBe('HORROR_INCARNATE');
    expect(getCurrentForm(100)).toBe('THIRST');
    expect(getCurrentForm(1000)).toBe('THIRST');
  });

  it('never downgrades', () => {
    let last = 0;
    const order = [
      'NEWBORN',
      'ELDER',
      'LORD_OF_NIGHT',
      'METHUSELAH',
      'PROGENITOR',
      'TERA_OVERLORD',
      'HORROR_INCARNATE',
      'THIRST',
    ];
    for (let p = 0; p <= 150; p++) {
      const idx = order.indexOf(getCurrentForm(p));
      expect(idx).toBeGreaterThanOrEqual(last);
      last = idx;
    }
  });
});

describe('getCurrentFormDefinition', () => {
  it('provides portrait path and labels', () => {
    const def = getCurrentFormDefinition(3);
    expect(def.id).toBe('LORD_OF_NIGHT');
    expect(def.portraitPath).toMatch(/lord-of-night\.png$/);
    expect(def.title.toLowerCase()).toContain('lord of night');
  });
});

describe('getCenturyInForm', () => {
  it('returns 1 for NEWBORN', () => {
    expect(getCenturyInForm(0)).toBe(1);
  });

  it('counts within ELDER', () => {
    expect(getCenturyInForm(1)).toBe(1);
    expect(getCenturyInForm(2)).toBe(2);
  });

  it('counts within LORD_OF_NIGHT — prestige 3,4,5,6 → I..IV', () => {
    expect(getCenturyInForm(3)).toBe(1);
    expect(getCenturyInForm(4)).toBe(2);
    expect(getCenturyInForm(5)).toBe(3);
    expect(getCenturyInForm(6)).toBe(4);
  });

  it('counts within METHUSELAH (threshold 7)', () => {
    expect(getCenturyInForm(7)).toBe(1);
    expect(getCenturyInForm(14)).toBe(8);
  });
});
