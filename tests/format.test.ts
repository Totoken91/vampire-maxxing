import { describe, expect, it } from 'vitest';
import { fmt, fmtShort } from '../src/utils/format';

describe('fmt', () => {
  it('renders small ints', () => {
    expect(fmt(0)).toBe('0');
    expect(fmt(9)).toBe('9');
    expect(fmt(999)).toBe('999');
  });

  it('uses thousands separators below 1M', () => {
    expect(fmt(1000)).toBe('1,000');
    expect(fmt(28_471)).toBe('28,471');
    expect(fmt(999_999)).toBe('999,999');
  });

  it('uses suffixes from 1M and above', () => {
    expect(fmt(1_000_000)).toBe('1.0M');
    expect(fmt(1_200_000)).toBe('1.2M');
    expect(fmt(999_999_999)).toBe('999M');
    expect(fmt(1_000_000_000)).toBe('1.0B');
  });

  it('drops decimal above 100 of a tier', () => {
    expect(fmt(123_000_000)).toBe('123M');
  });

  it('handles negatives', () => {
    expect(fmt(-1234)).toBe('-1,234');
    expect(fmt(-1_500_000)).toBe('-1.5M');
  });

  it('handles Infinity and NaN', () => {
    expect(fmt(Infinity)).toBe('∞');
    expect(fmt(NaN)).toBe('—');
  });

  it('scales into high tiers', () => {
    expect(fmt(1e12)).toBe('1.0T');
    expect(fmt(1e15)).toBe('1.0Qa');
    expect(fmt(1e18)).toBe('1.0Qi');
  });
});

describe('fmtShort', () => {
  it('uses K even in thousands', () => {
    expect(fmtShort(1000)).toBe('1.0K');
    expect(fmtShort(28_471)).toBe('28.4K');
  });

  it('keeps small ints raw', () => {
    expect(fmtShort(999)).toBe('999');
  });
});
