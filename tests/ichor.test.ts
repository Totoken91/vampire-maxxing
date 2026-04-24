// L3 — Ichor core + reward hooks.

import { beforeEach, describe, expect, it } from 'vitest';
import {
  grantIchor,
  spendIchor,
  lifetimeEarnedIchor,
  ICHOR_SOFT_CAP,
} from '../src/game/ichor';
import { gameState } from '../src/game/state';
import { events } from '../src/game/events';

function snap(): {
  ichor: number;
  ichorLedger: Array<{ amount: number; source: string; earnedNotPaid: boolean; ts: number }>;
  ichorFlags: Record<string, boolean>;
} {
  return gameState.get() as unknown as {
    ichor: number;
    ichorLedger: Array<{ amount: number; source: string; earnedNotPaid: boolean; ts: number }>;
    ichorFlags: Record<string, boolean>;
  };
}

describe('grantIchor', () => {
  beforeEach(() => {
    gameState.reset();
  });

  it('credits the amount and appends a ledger entry', () => {
    const credited = grantIchor(25, 'milestone_prestige');
    expect(credited).toBe(25);
    expect(snap().ichor).toBe(25);
    expect(snap().ichorLedger.length).toBe(1);
    expect(snap().ichorLedger[0]!).toMatchObject({
      amount: 25,
      source: 'milestone_prestige',
      earnedNotPaid: true,
    });
  });

  it('clips at the soft cap without going over', () => {
    grantIchor(ICHOR_SOFT_CAP - 10, 'debug');
    const credited = grantIchor(50, 'debug');
    expect(credited).toBe(10);
    expect(snap().ichor).toBe(ICHOR_SOFT_CAP);
  });

  it('returns 0 and does not append when already at cap', () => {
    grantIchor(ICHOR_SOFT_CAP, 'debug');
    const ledgerBefore = snap().ichorLedger.length;
    const credited = grantIchor(100, 'debug');
    expect(credited).toBe(0);
    expect(snap().ichor).toBe(ICHOR_SOFT_CAP);
    expect(snap().ichorLedger.length).toBe(ledgerBefore);
  });

  it('iap_pack source flags the ledger entry as paid', () => {
    grantIchor(50, 'iap_pack');
    expect(snap().ichorLedger[0]!.earnedNotPaid).toBe(false);
  });

  it('emits ichor-earned + ichor-changed', () => {
    const earns: number[] = [];
    const changes: number[] = [];
    const offA = events.on('ichor-earned', ({ amount }) => {
      earns.push(amount);
    });
    const offB = events.on('ichor-changed', ({ balance }) => {
      changes.push(balance);
    });
    grantIchor(15, 'daily_login');
    offA();
    offB();
    expect(earns).toEqual([15]);
    expect(changes).toEqual([15]);
  });

  it('rejects non-positive amounts silently', () => {
    grantIchor(0, 'debug');
    grantIchor(-5, 'debug');
    expect(snap().ichor).toBe(0);
    expect(snap().ichorLedger.length).toBe(0);
  });
});

describe('spendIchor', () => {
  beforeEach(() => {
    gameState.reset();
    grantIchor(100, 'debug');
  });

  it('deducts and appends a negative ledger entry', () => {
    const ok = spendIchor(40);
    expect(ok).toBe(true);
    expect(snap().ichor).toBe(60);
    const tail = snap().ichorLedger[snap().ichorLedger.length - 1]!;
    expect(tail.amount).toBe(-40);
    expect(tail.source).toBe('ritual_spent');
  });

  it('refuses insufficient balance', () => {
    const ok = spendIchor(999);
    expect(ok).toBe(false);
    expect(snap().ichor).toBe(100);
  });
});

describe('lifetimeEarnedIchor', () => {
  beforeEach(() => {
    gameState.reset();
  });

  it('sums only earned grants (excludes spends + paid IAP)', () => {
    grantIchor(50, 'milestone_prestige');
    grantIchor(30, 'iap_pack'); // paid → excluded
    spendIchor(20); // negative → excluded
    expect(lifetimeEarnedIchor()).toBe(50);
  });
});
