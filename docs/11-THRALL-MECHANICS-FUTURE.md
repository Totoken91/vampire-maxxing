# Thrall Mechanics — Future Patterns (deferred from v1.0)

Pattern A (bespoke secondary effects per thrall) shipped at L6. This
file captures the patterns we explicitly decided to defer, with
enough detail to revisit later.

## Pattern B — Set bonuses by archetype

Reward equipping multiple thralls of the same archetype.

```
2× Harvester equipped   → +5% blood gen (stacks on top of each thrall's
                          own primary effect)
3× Harvester equipped   → +12% blood gen + "blood overflow" — every
                          unspent blood beyond the soft cap converts
                          to Ichor at 0.1%/h
2× Nocturne equipped    → +5% offline gain
3× Nocturne equipped    → +12% offline gain + offline cap extended to 12h
2× Predator equipped    → +5% active gain
3× Predator equipped    → +12% active gain + permanent tap_mult ×1.5
```

Set bonuses *oppose* mono-build (high niche payoff) to mixed-build (the
Ashen Vale flex from Pattern A) — the deck-building tension that makes
gacha rosters feel deep on small casts. Trivial to implement: 5-10
lines in `awakening.ts` to count equipped archetypes and register a
modifier per active set.

## Pattern C — Conditional / situational triggers

Some thralls' bonuses fire only under specific conditions. Adds depth
but UI cost (need to surface the trigger state to the player).

Examples:
- "+50% blood gen during NEWBORN form" (early-prestige scaling)
- "+30% Dread gain when ascending with Blood < 1M" (low-stake risk play)
- "tap streak (5+ taps in 1s) → +20% click power for the next 3 taps"
- "first ascend after 4h+ offline → +50% Dread"

Risk: opaque to new players ("why does it feel different sometimes?").
Mitigation: each conditional gets a clear active/inactive indicator on
the equipped thrall card.

## Pattern D — Awakening branches at ★3+

At ★3, a thrall picks between 2-3 "schools" that diverge its kit.

Example for Velmor:
- ★3 path A — "Auto-Collect" : passive blood ticks even when screen
  off. Loses some offline cap.
- ★3 path B — "Eternal Sleep" : offline cap extended to 12h. No
  auto-collect.
- ★3 path C — "Bloodline Memory" : offline gain doesn't decay below
  100% efficiency. No cap extension.

Doable cleanly with the existing `stars` field — add a `branch?: string`
field, picker UI at ★3 transition. Awakening engine reads `branch` and
publishes the matching modifier set.

UI cost: a "branch picker" sub-modal at the ★3 awakening tap. Worth it
for iconic thralls (Mirella, Velmor), overkill for commons.

## Pattern E — Active abilities (Clash Royale style)

Each equipped thrall gets a tappable button with a cooldown. Tap fires
a bespoke effect.

Examples:
- Mirella → tap to spend 5% current Blood, gain 30% Blood for 60s
- Velmor → tap to claim full offline cap immediately (cooldown 8h)
- Duskward → tap to guarantee 5 critical taps in a row (cooldown 5min)

Big scope: each thrall needs its own VFX, animation, balance, sound.
Worth shipping 1-2 iconic thralls with abilities at v1.1+ as a teaser.

Pre-requisite: an active-ability slot on the HUD (similar to the
existing Boost / Ascend buttons).

## Pattern F — Synergy buddies (cross-thrall pairs)

A thrall's bonus is amplified when another specific thrall is equipped.
Like FEH support pairs.

Example:
- Mira + Velmor → both gain +10% offline (Watcher and Dread are kin)
- Lilith + Mirella → Mirella's tap particles unlock + 5% blood
- Roderick + Duskward → Duskward's crit damage transfers to Roderick

UI cost: a small "pair hint" icon on the detail modal. Engine cost:
extra check at publish time for each thrall's pair.

Best as v1.2+ feature when more thralls exist (12 thralls = 66
possible pairs, only ~8-12 should actually have synergy).

---

## What we deliberately did NOT defer

- Pattern A — secondary effects bespoke per thrall — shipped at L6
  via `BespokeMechanic` in `src/game/config/thralls.ts`.

## Decision rationale

For v1.0 launch with 12 thralls, Pattern A solves the "stat-clones"
problem with low engine cost. Patterns B (set bonuses) and D (awakening
branches) are the natural follow-ups for the v1.1 expansion when the 2
Legendaries land — those rares deserve the deeper mechanics.
