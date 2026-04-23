// Central bus of gameplay modifiers. Multiple systems (upgrades,
// regions, awakenings, aspects, generations, thralls) all want
// to tweak the same grandeurs (servant rate, servant cost, dread gain,
// offline cap, click power, global multiplier). Putting the logic in
// each caller = exponential branching; the registry holds every active
// delta in one place, sources publish/unregister on state changes, and
// consumers read a single number per grandeur at evaluation time.
//
// The registry is NEVER persisted — sources reconstitute their entries
// at load time from their own state. Double source-of-truth = bugs.

export type ModifierTarget =
  | 'servantRate'
  | 'servantCost'
  | 'clickPower'
  | 'dreadGain'
  | 'offlineCap'
  | 'globalMult';

export type ModifierOp = 'mult' | 'add';

interface Modifier {
  source: string;
  target: ModifierTarget;
  op: ModifierOp;
  value: number;
}

/**
 * Cap logarithmique appliqué à la multiplication finale des `mult` sur
 * `globalMult` et `servantRate`. Sans ça, empiler 5 sources de +20% donne
 * un produit qui explose en post-launch. La courbe log garde les gros
 * bonus ressentis sans jamais passer en scientifique.
 *
 *   raw 1   → 1       (neutre)
 *   raw 2   → ~2.2
 *   raw 5   → ~3.8
 *   raw 10  → ~5
 *   raw 100 → ~9
 *   raw 1e4 → ~17
 */
function capLog(raw: number): number {
  if (raw <= 1) return raw;
  return 1 + Math.log10(raw) * 4;
}

const CAPPED_TARGETS: ReadonlySet<ModifierTarget> = new Set([
  'globalMult',
  'servantRate',
]);

class ModifierRegistry {
  private readonly modifiers = new Map<string, Modifier>();

  /** Replace any existing modifier from this source on this target. */
  register(source: string, target: ModifierTarget, op: ModifierOp, value: number): void {
    this.modifiers.set(key(source, target, op), { source, target, op, value });
  }

  /** Remove every modifier published by this source. */
  unregister(source: string): void {
    for (const k of Array.from(this.modifiers.keys())) {
      if (k.startsWith(`${source}::`)) this.modifiers.delete(k);
    }
  }

  /** Product of every `mult` op on `target`. Returns 1 on empty. */
  getMultiplier(target: ModifierTarget): number {
    let product = 1;
    for (const m of this.modifiers.values()) {
      if (m.target === target && m.op === 'mult') product *= m.value;
    }
    return CAPPED_TARGETS.has(target) ? capLog(product) : product;
  }

  /** Sum of every `add` op on `target`. Returns 0 on empty. */
  getAdditive(target: ModifierTarget): number {
    let sum = 0;
    for (const m of this.modifiers.values()) {
      if (m.target === target && m.op === 'add') sum += m.value;
    }
    return sum;
  }

  /** Test-only. Drop every entry. */
  clear(): void {
    this.modifiers.clear();
  }

  /** Test-only. Snapshot for assertions. */
  list(): readonly Modifier[] {
    return Array.from(this.modifiers.values());
  }
}

function key(source: string, target: ModifierTarget, op: ModifierOp): string {
  return `${source}::${target}::${op}`;
}

export const modifierRegistry = new ModifierRegistry();
