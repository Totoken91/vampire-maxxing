// Number formatting for large idle-game values.
// Short suffixes after 999,999, standard notation below.

const SUFFIXES = [
  '',
  'K',
  'M',
  'B',
  'T',
  'Qa',
  'Qi',
  'Sx',
  'Sp',
  'Oc',
  'No',
  'Dc',
  'Ud',
  'Dd',
  'Td',
  'Qad',
  'Qid',
  'Sxd',
  'Spd',
  'Ocd',
  'Nod',
] as const;

/**
 * Format a number for idle-game display.
 * - Below 1,000: integer.
 * - 1,000–999,999: locale-separated integer (28,471).
 * - 1,000,000+: one decimal + short suffix (1.2M, 14.3K is NOT used — tenK still prints 14,300).
 * - Infinity / NaN → "∞" / "—".
 */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) {
    return Number.isNaN(n) ? '—' : '∞';
  }

  const neg = n < 0;
  const abs = Math.abs(n);

  if (abs < 1e6) {
    const rounded = Math.floor(abs);
    return (neg ? '-' : '') + rounded.toLocaleString('en-US');
  }

  const tier = Math.min(Math.floor(Math.log10(abs) / 3), SUFFIXES.length - 1);
  const scaled = abs / 10 ** (tier * 3);
  const rounded = scaled >= 100 ? Math.floor(scaled) : Math.floor(scaled * 10) / 10;
  const str = scaled >= 100 ? `${rounded}` : rounded.toFixed(1);
  return (neg ? '-' : '') + str + SUFFIXES[tier];
}

/** Shorter variant for tight UI cells: always uses suffix even for thousands. */
export function fmtShort(n: number): string {
  if (!Number.isFinite(n)) {
    return Number.isNaN(n) ? '—' : '∞';
  }

  const neg = n < 0;
  const abs = Math.abs(n);

  if (abs < 1000) {
    return (neg ? '-' : '') + Math.floor(abs).toString();
  }

  const tier = Math.min(Math.floor(Math.log10(abs) / 3), SUFFIXES.length - 1);
  const scaled = abs / 10 ** (tier * 3);
  const rounded = scaled >= 100 ? Math.floor(scaled) : Math.floor(scaled * 10) / 10;
  const str = scaled >= 100 ? `${rounded}` : rounded.toFixed(1);
  return (neg ? '-' : '') + str + SUFFIXES[tier];
}
