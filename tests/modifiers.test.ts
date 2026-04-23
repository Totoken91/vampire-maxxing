import { beforeEach, describe, expect, it } from 'vitest';
import { modifierRegistry } from '../src/game/modifiers';

describe('ModifierRegistry', () => {
  beforeEach(() => {
    modifierRegistry.clear();
  });

  it('returns neutral values on empty', () => {
    expect(modifierRegistry.getMultiplier('servantCost')).toBe(1);
    expect(modifierRegistry.getAdditive('servantCost')).toBe(0);
  });

  it('composes multiple mult modifiers on the same target as a product', () => {
    modifierRegistry.register('a', 'dreadGain', 'mult', 1.1);
    modifierRegistry.register('b', 'dreadGain', 'mult', 1.2);
    // 1.1 × 1.2 = 1.32, not capped because dreadGain isn't in CAPPED_TARGETS
    expect(modifierRegistry.getMultiplier('dreadGain')).toBeCloseTo(1.32, 5);
  });

  it('composes additive modifiers as a sum', () => {
    modifierRegistry.register('a', 'servantCost', 'add', -0.02);
    modifierRegistry.register('b', 'servantCost', 'add', -0.03);
    expect(modifierRegistry.getAdditive('servantCost')).toBeCloseTo(-0.05, 5);
  });

  it('register overrides same source+target+op', () => {
    modifierRegistry.register('a', 'dreadGain', 'mult', 1.1);
    modifierRegistry.register('a', 'dreadGain', 'mult', 1.5);
    // Not 1.1 × 1.5, just the most recent value from source 'a'
    expect(modifierRegistry.getMultiplier('dreadGain')).toBeCloseTo(1.5, 5);
  });

  it('unregister removes all entries from a source', () => {
    modifierRegistry.register('upgrade:x', 'servantRate', 'mult', 1.5);
    modifierRegistry.register('upgrade:x', 'dreadGain', 'mult', 1.2);
    modifierRegistry.register('upgrade:y', 'servantRate', 'mult', 1.3);

    modifierRegistry.unregister('upgrade:x');

    expect(modifierRegistry.getMultiplier('dreadGain')).toBe(1);
    // servantRate has 1.3 raw → log-capped to 1 + log10(1.3)*4 ≈ 1.456
    const expected = 1 + Math.log10(1.3) * 4;
    expect(modifierRegistry.getMultiplier('servantRate')).toBeCloseTo(expected, 5);
  });

  it('applies the log cap on globalMult to prevent power creep', () => {
    // 10× raw should collapse to ~5×
    modifierRegistry.register('a', 'globalMult', 'mult', 10);
    const capped = modifierRegistry.getMultiplier('globalMult');
    expect(capped).toBeGreaterThan(4);
    expect(capped).toBeLessThan(6);
  });

  it('applies the log cap on servantRate', () => {
    // 100× raw should collapse to ~9×
    modifierRegistry.register('a', 'servantRate', 'mult', 100);
    const capped = modifierRegistry.getMultiplier('servantRate');
    expect(capped).toBeGreaterThan(8);
    expect(capped).toBeLessThan(10);
  });

  it('does not cap uncapped targets (dreadGain, servantCost, etc)', () => {
    modifierRegistry.register('a', 'dreadGain', 'mult', 10);
    expect(modifierRegistry.getMultiplier('dreadGain')).toBe(10);
  });

  it('cap passes through raw ≤ 1 without inflation', () => {
    modifierRegistry.register('a', 'globalMult', 'mult', 1);
    expect(modifierRegistry.getMultiplier('globalMult')).toBe(1);

    modifierRegistry.register('b', 'globalMult', 'mult', 0.5);
    // 1 × 0.5 = 0.5, raw ≤ 1 → no log, returned as-is
    expect(modifierRegistry.getMultiplier('globalMult')).toBeCloseTo(0.5, 5);
  });
});
