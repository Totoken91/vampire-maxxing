// L10/L11 — IAP catalog + purchase flow + Pacte Fondateur trigger.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { gameState } from '../src/game/state';
import { events } from '../src/game/events';
import {
  PACKS,
  PACKS_BY_SKU,
  FOUNDER_PACK_SKU,
  packForSku,
} from '../src/game/config/packs';
import {
  installFounderPackTrigger,
  isFirstTimeAvailable,
  packDisplayMode,
  purchasePack,
} from '../src/game/iap';

function snap(): {
  ichor: number;
  packsFirstTimeBought: Set<string>;
  welcomePackFirstRareAt: number | null;
} {
  return gameState.get() as unknown as {
    ichor: number;
    packsFirstTimeBought: Set<string>;
    welcomePackFirstRareAt: number | null;
  };
}

describe('Pack catalog integrity', () => {
  it('every PACK has a unique sku starting with vm_', () => {
    const seen = new Set<string>();
    for (const p of PACKS) {
      expect(p.sku.startsWith('vm_')).toBe(true);
      expect(seen.has(p.sku)).toBe(false);
      seen.add(p.sku);
    }
  });

  it('PACKS_BY_SKU round-trips with PACKS', () => {
    for (const p of PACKS) {
      expect(PACKS_BY_SKU[p.sku]).toBe(p);
    }
  });

  it('every pack price aligns with the standard ladder', () => {
    const allowed = new Set([0.99, 2.99, 4.99, 9.99, 19.99, 49.99]);
    for (const p of PACKS) {
      expect(allowed.has(p.priceEur)).toBe(true);
    }
  });

  it('Ichor/€ ratio improves monotonically across the ladder', () => {
    // Ignore packs with non-Ichor bonuses (Pacte / Starter Coven) since
    // their value isn't pure Ichor — the ladder check applies to the
    // pure-Ichor SKUs only.
    const pureIchor = PACKS.filter((p) => p.bonus.kind === 'none').sort(
      (a, b) => a.priceEur - b.priceEur,
    );
    let prevRatio = 0;
    for (const p of pureIchor) {
      const ratio = p.baseIchor / p.priceEur;
      expect(ratio).toBeGreaterThanOrEqual(prevRatio);
      prevRatio = ratio;
    }
  });

  it('Cataclysmique FT bonus is capped at +50% of base (not +100%)', () => {
    const cataclysm = packForSku('vm_ichor_cataclysm');
    expect(cataclysm).toBeDefined();
    expect(cataclysm!.firstTimeBonusIchor).toBe(cataclysm!.baseIchor / 2);
  });

  it('Pacte Fondateur is the only triggered pack', () => {
    const triggered = PACKS.filter((p) => p.triggered !== undefined);
    expect(triggered.length).toBe(1);
    expect(triggered[0].sku).toBe(FOUNDER_PACK_SKU);
  });

  it('Pacte Fondateur grants Nox specifically', () => {
    const founder = packForSku(FOUNDER_PACK_SKU);
    expect(founder).toBeDefined();
    expect(founder!.bonus.kind).toBe('guaranteed_thrall');
    if (founder!.bonus.kind === 'guaranteed_thrall') {
      expect(founder!.bonus.thrallId).toBe('nox-the-hunger');
    }
  });
});

describe('purchasePack — happy path (web stub)', () => {
  beforeEach(() => {
    gameState.reset();
    gameState.setAgeConfirmation('over13');
  });

  it('credits base + FT bonus on first purchase', async () => {
    const pack = packForSku('vm_ichor_modest')!;
    const before = snap().ichor;
    const outcome = await purchasePack(pack.sku);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.grant.ichorWasFirstTime).toBe(true);
      expect(outcome.grant.ichorCredited).toBe(
        pack.baseIchor + pack.firstTimeBonusIchor,
      );
    }
    expect(snap().ichor).toBe(before + pack.baseIchor + pack.firstTimeBonusIchor);
  });

  it('credits only base on second purchase (FT consumed)', async () => {
    const pack = packForSku('vm_ichor_modest')!;
    await purchasePack(pack.sku);
    const after1 = snap().ichor;
    const outcome2 = await purchasePack(pack.sku);
    expect(outcome2.ok).toBe(true);
    if (outcome2.ok) {
      expect(outcome2.grant.ichorWasFirstTime).toBe(false);
      expect(outcome2.grant.ichorCredited).toBe(pack.baseIchor);
    }
    expect(snap().ichor).toBe(after1 + pack.baseIchor);
  });

  it('records each purchase in the spending log', async () => {
    const pack = packForSku('vm_ichor_substantial')!;
    await purchasePack(pack.sku);
    expect(gameState.getLifetimeSpent()).toBeCloseTo(pack.priceEur);
    expect(gameState.getTodaySpent()).toBeCloseTo(pack.priceEur);
  });

  it('grants Nox on Pacte Fondateur first purchase', async () => {
    expect(gameState.isThrallOwned('nox-the-hunger')).toBe(false);
    const outcome = await purchasePack(FOUNDER_PACK_SKU);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.grant.thrallGranted).toBe('nox-the-hunger');
    }
    expect(gameState.isThrallOwned('nox-the-hunger')).toBe(true);
  });

  it('grants a random un-owned Rare on Starter Coven', async () => {
    const outcome = await purchasePack('vm_starter_coven');
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.grant.rarePullThrall).not.toBeNull();
      const id = outcome.grant.rarePullThrall!;
      expect(gameState.isThrallOwned(id)).toBe(true);
    }
  });
});

describe('purchasePack — guards', () => {
  beforeEach(() => {
    gameState.reset();
  });

  it('rejects unknown SKUs with a clear reason', async () => {
    const outcome = await purchasePack('vm_does_not_exist');
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.reason).toBe('unknown-sku');
    }
  });

  it('blocks purchase when player is under 13', async () => {
    gameState.setAgeConfirmation('under13');
    const outcome = await purchasePack('vm_ichor_modest');
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.reason).toBe('blocked-under13');
      expect(outcome.message).toContain('under 13');
    }
  });

  it('blocks purchase when daily spending cap is exceeded', async () => {
    gameState.setAgeConfirmation('over13');
    gameState.setDailySpendCap(0.5); // less than 0.99€
    const outcome = await purchasePack('vm_ichor_modest');
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.reason).toBe('blocked-spending-cap');
      expect(outcome.message).toContain('cap');
    }
  });

  it('does not record a blocked purchase in the spending log', async () => {
    gameState.setAgeConfirmation('under13');
    await purchasePack('vm_ichor_modest');
    expect(gameState.getLifetimeSpent()).toBe(0);
  });
});

describe('Pacte Fondateur trigger', () => {
  let teardown: (() => void) | null = null;

  beforeEach(() => {
    gameState.reset();
    events.clear();
    installFounderPackTrigger();
  });

  afterEach(() => {
    if (teardown) teardown();
    teardown = null;
    events.clear();
  });

  it('arms welcome-pack-armed on first Rare obtained (any source)', () => {
    let armedCount = 0;
    teardown = events.on('welcome-pack-armed', () => {
      armedCount += 1;
    });
    expect(snap().welcomePackFirstRareAt).toBeNull();
    gameState.obtainThrall('nox-the-hunger'); // Rare
    expect(snap().welcomePackFirstRareAt).not.toBeNull();
    expect(armedCount).toBe(1);
  });

  it('does NOT arm on a Common acquisition', () => {
    let armedCount = 0;
    teardown = events.on('welcome-pack-armed', () => {
      armedCount += 1;
    });
    gameState.obtainThrall('ash-the-wretched'); // Common
    expect(snap().welcomePackFirstRareAt).toBeNull();
    expect(armedCount).toBe(0);
  });

  it('is idempotent — second Rare does not re-arm', () => {
    let armedCount = 0;
    teardown = events.on('welcome-pack-armed', () => {
      armedCount += 1;
    });
    gameState.obtainThrall('nox-the-hunger');
    const first = snap().welcomePackFirstRareAt;
    gameState.obtainThrall('lilith-whisper');
    expect(snap().welcomePackFirstRareAt).toBe(first);
    expect(armedCount).toBe(1);
  });

  it('arms on first Epic obtained (Mirella) without a prior Rare', () => {
    gameState.obtainThrall('mirella'); // Epic
    expect(snap().welcomePackFirstRareAt).not.toBeNull();
  });
});

describe('packDisplayMode + isFirstTimeAvailable', () => {
  beforeEach(() => {
    gameState.reset();
  });

  it('triggered pack is hidden until trigger fires', () => {
    const pacte = packForSku(FOUNDER_PACK_SKU)!;
    expect(packDisplayMode(pacte)).toBe('hidden');
  });

  it('triggered pack is featured during the 7-day window', () => {
    const pacte = packForSku(FOUNDER_PACK_SKU)!;
    gameState.markWelcomeFirstRareEarned();
    expect(packDisplayMode(pacte)).toBe('featured');
  });

  it('triggered pack falls back to grid after window closes', () => {
    const pacte = packForSku(FOUNDER_PACK_SKU)!;
    gameState.markWelcomeFirstRareEarned();
    const armedAt = gameState.getWelcomeFirstRareAt()!;
    const future = armedAt + 8 * 24 * 60 * 60 * 1000;
    expect(packDisplayMode(pacte, future)).toBe('grid');
  });

  it('always-on packs always show in grid', () => {
    for (const p of PACKS) {
      if (p.triggered) continue;
      expect(packDisplayMode(p)).toBe('grid');
    }
  });

  it('FT availability flips to false after first purchase', async () => {
    gameState.setAgeConfirmation('over13');
    const pack = packForSku('vm_ichor_modest')!;
    expect(isFirstTimeAvailable(pack)).toBe(true);
    await purchasePack(pack.sku);
    expect(isFirstTimeAvailable(pack)).toBe(false);
  });
});

describe('IAP bypasses Ichor soft cap', () => {
  beforeEach(() => {
    gameState.reset();
    gameState.setAgeConfirmation('over13');
  });

  it('credits full base + FT bonus even when balance is at cap', async () => {
    // Fill the wallet to the soft cap.
    const s = gameState.get() as unknown as { ichor: number };
    s.ichor = 1000;
    expect(gameState.getIchor()).toBe(1000);

    const pack = packForSku('vm_ichor_modest')!;
    const outcome = await purchasePack(pack.sku);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      // 15 base + 15 FT = 30 — must all credit despite cap.
      expect(outcome.grant.ichorCredited).toBe(30);
    }
    expect(gameState.getIchor()).toBe(1030);
  });

  it('large IAP credits even when wallet is far above the cap', async () => {
    const s = gameState.get() as unknown as { ichor: number };
    s.ichor = 5000;
    const pack = packForSku('vm_ichor_cataclysm')!;
    const outcome = await purchasePack(pack.sku);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      // 1800 base + 900 FT (capped at +50%) = 2700.
      expect(outcome.grant.ichorCredited).toBe(2700);
    }
    expect(gameState.getIchor()).toBe(7700);
  });
});

describe('Save round-trip — IAP fields', () => {
  beforeEach(() => {
    gameState.reset();
    gameState.setAgeConfirmation('over13');
  });

  it('persists packsFirstTimeBought + welcomePackFirstRareAt', async () => {
    await purchasePack('vm_ichor_modest');
    gameState.markWelcomeFirstRareEarned();
    const ts = gameState.getWelcomeFirstRareAt();
    expect(ts).not.toBeNull();

    const save = (
      gameState as unknown as { toSave: () => Record<string, unknown> }
    ).toSave();
    expect(save.packsFirstTimeBought).toEqual(['vm_ichor_modest']);
    expect(save.welcomePackFirstRareAt).toBe(ts);
  });
});
