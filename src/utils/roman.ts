// Roman numerals for the "Century N" label ("Lord of Night · Century IV").

const ROMAN_PAIRS: ReadonlyArray<readonly [number, string]> = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
] as const;

/**
 * Convert a positive integer (1-3999) to Roman numerals.
 * 0 returns "N" (nulla) for defensive display.
 * Values above 3999 overflow to "…" to avoid ugly M-strings.
 */
export function toRoman(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '…';
  const x = Math.floor(n);
  if (x === 0) return 'N';
  if (x > 3999) return '…';

  let rest = x;
  let out = '';
  for (const [value, symbol] of ROMAN_PAIRS) {
    while (rest >= value) {
      out += symbol;
      rest -= value;
    }
  }
  return out;
}
