import { describe, expect, it } from 'vitest';
import { toRoman } from '../src/utils/roman';

describe('toRoman', () => {
  it('converts 1-10 correctly', () => {
    expect(toRoman(1)).toBe('I');
    expect(toRoman(2)).toBe('II');
    expect(toRoman(3)).toBe('III');
    expect(toRoman(4)).toBe('IV');
    expect(toRoman(5)).toBe('V');
    expect(toRoman(6)).toBe('VI');
    expect(toRoman(9)).toBe('IX');
    expect(toRoman(10)).toBe('X');
  });

  it('handles subtractive pairs', () => {
    expect(toRoman(40)).toBe('XL');
    expect(toRoman(90)).toBe('XC');
    expect(toRoman(400)).toBe('CD');
    expect(toRoman(900)).toBe('CM');
  });

  it('converts larger values', () => {
    expect(toRoman(1987)).toBe('MCMLXXXVII');
    expect(toRoman(3999)).toBe('MMMCMXCIX');
  });

  it('floors non-integers', () => {
    expect(toRoman(4.7)).toBe('IV');
  });

  it('returns N for 0 and "…" for invalid inputs', () => {
    expect(toRoman(0)).toBe('N');
    expect(toRoman(-1)).toBe('…');
    expect(toRoman(4000)).toBe('…');
    expect(toRoman(NaN)).toBe('…');
  });
});
