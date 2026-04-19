# 04 — Balance & Formulas

## Philosophie d'équilibrage

- Courbe **exponentielle** (idle standard) mais accessible pour garder le hook narratif
- Un joueur sans prestige atteint le tier 8 en ~8-12h
- Un joueur qui prestige intelligemment y arrive en ~2-3h
- La progression doit produire un **effet de montagnes russes émotionnel** aligné sur les transitions de forme (Newborn → Elder = pic, Elder → Lord of Night = pic encore plus fort, etc.)

## Formules centrales

### Coût d'un thrall

```ts
thrallCost(thrall, owned) = floor(thrall.baseCost × COST_MULTIPLIER^owned)
COST_MULTIPLIER = 1.15
```

### Taux d'un thrall

```ts
thrallRate(thrall, owned, globalMult, boost) =
  owned × thrall.baseRate × thrallMilestoneMult(owned) × globalMult × boost
```

### Multiplicateur milestone par thrall (cumulatif)

| Owned | Mult cumulé |
|-------|-------------|
| 1     | 1           |
| 10    | 2           |
| 25    | 4           |
| 50    | 8           |
| 100   | 24          |
| 200   | 72          |
| 300   | 216         |
| 400   | 1080        |

```ts
function thrallMilestoneMult(owned: number): number {
  let m = 1;
  if (owned >= 10) m *= 2;
  if (owned >= 25) m *= 2;
  if (owned >= 50) m *= 2;
  if (owned >= 100) m *= 3;
  if (owned >= 200) m *= 3;
  if (owned >= 300) m *= 3;
  if (owned >= 400) m *= 5;
  return m;
}
```

### Multiplicateur global (Dread)

```ts
globalMult = 1 + (dread × 0.10)
```
- 10 Dread = ×2
- 50 Dread = ×6
- 100 Dread = ×11
- 500 Dread = ×51

### Click power (scaling pour rester pertinent)

```ts
clickPower = max(BASE_CLICK_POWER, currentTotalRate × CLICK_SCALING_RATIO) × globalMult × boost
BASE_CLICK_POWER = 1
CLICK_SCALING_RATIO = 0.0015
```

**Rationale** : sans scaling, après 10 min le tap devient inutile (thralls dominent). Avec `rate × 0.0015`, chaque tap vaut ~1.5 seconde de production passive. Le tap reste un booster significatif pendant toute la progression.

Exemples :
- `rate = 0/s` : tap = 1 blood (early game)
- `rate = 100/s` : tap = 1 blood (encore minimum)
- `rate = 1000/s` : tap = 1.5 blood
- `rate = 100K/s` : tap = 150 blood
- `rate = 10M/s` : tap = 15K blood (= ~1.5s de prod, encore utile pour boost les derniers achats avant ascend)

### Ascend gain (Dread)

```ts
dreadGain = floor(sqrt(totalRunBlood / 1e6) × 2)
```

| totalRunBlood | Dread gagné |
|---------------|-------------|
| 1e6 (seuil)   | 2           |
| 1e7           | ~6          |
| 1e8           | ~20         |
| 1e9           | ~63         |
| 1e10          | ~200        |
| 1e12          | ~2000       |

### Offline progress

```ts
offlineSeconds = min((now - saveTime) / 1000, 4 × 3600)
offlineGain = currentTotalRate × offlineSeconds × OFFLINE_EFFICIENCY
OFFLINE_EFFICIENCY = 0.5
```

Pub récompensée : `efficiency = 1.0`, `cap = 6h`, one-shot à l'ouverture.

## Mapping Prestige → Form

```ts
function getCurrentForm(prestigeCount: number): VampireForm {
  if (prestigeCount >= 100) return 'THIRST';
  if (prestigeCount >= 50)  return 'HORROR_INCARNATE';
  if (prestigeCount >= 30)  return 'TERA_OVERLORD';
  if (prestigeCount >= 15)  return 'PROGENITOR';
  if (prestigeCount >= 7)   return 'METHUSELAH';
  if (prestigeCount >= 3)   return 'LORD_OF_NIGHT';
  if (prestigeCount >= 1)   return 'ELDER';
  return 'NEWBORN';
}
```

**CRITIQUE** : ce mapping déclenche le chargement du portrait correspondant et l'animation de transition lorsqu'il change.

## Configuration des thralls

```ts
// src/game/config/thralls.ts
export const THRALLS = [
  { id: 'rat',       tier: 1, name: 'Stray Rat',            baseCost: 10,          baseRate: 0.5,    unlockTotal: 0 },
  { id: 'ghoul',     tier: 2, name: 'Feral Ghoul',          baseCost: 100,         baseRate: 4,      unlockTotal: 30 },
  { id: 'fledgling', tier: 3, name: 'Fledgling',            baseCost: 1_200,       baseRate: 32,     unlockTotal: 360 },
  { id: 'thrall',    tier: 4, name: 'Thrall',               baseCost: 14_000,      baseRate: 240,    unlockTotal: 4_200 },
  { id: 'blade',     tier: 5, name: 'Nightblade',           baseCost: 180_000,     baseRate: 1_800,  unlockTotal: 54_000 },
  { id: 'courtesan', tier: 6, name: 'Blood Courtesan',      baseCost: 2_500_000,   baseRate: 14_000, unlockTotal: 750_000 },
  { id: 'elder',     tier: 7, name: 'Elder',                baseCost: 40_000_000,  baseRate: 110_000,unlockTotal: 12_000_000 },
  { id: 'cardinal',  tier: 8, name: 'Cardinal of the Night',baseCost: 700_000_000, baseRate: 900_000,unlockTotal: 210_000_000 },
] as const;
```

## Courbe de progression — scénarios simulés

### Run 1 (sans Dread, Newborn form)

| Temps | État | Forme |
|-------|------|-------|
| 0:00  | 0 blood, que le portrait Newborn | NEWBORN |
| 0:30  | ~20 blood via tap → 1er Stray Rat | NEWBORN |
| 3:00  | Feral Ghoul unlocked | NEWBORN |
| 8:00  | Fledgling #1, rate ~80/s | NEWBORN |
| 15:00 | Thrall #1-2, rate ~1K/s | NEWBORN |
| 25:00 | Nightblade #1, rate ~20K/s | NEWBORN |
| 45:00 | Courtesan #1, rate ~200K/s, Ascend ready | NEWBORN |
| 60:00 | **ASCEND → ELDER form**, ~6 Dread gagnés | **ELDER** 🎭 |

**Le passage à ELDER est le moment "aha" majeur du premier run.**

### Run 2 (ELDER, 6 Dread, ×1.6 global mult)

Progression ~1.6x plus rapide. Player atteint ~50M total en 20-25 min → ~14 Dread → **total 20 Dread**.

### Après 3 Ascends (total 30+ Dread)

- Form : **LORD OF NIGHT** 🎭 (3e transition, seuil prestige 3)
- Global mult ~×4
- Runs de ~15-20 min pour gagner 30-50 Dread

### Progression typique sur 10h

```
00:00 - 01:00 : Run 1, Newborn → Elder (ascend 1)
01:00 - 01:30 : Run 2, Elder
01:30 - 02:00 : Run 3, Elder → Lord of Night (ascend 3)
02:00 - 04:00 : Runs 4-6, Lord of Night
04:00 - 06:00 : Runs 7-8, Lord of Night → Methuselah (ascend 7)
06:00 - 10:00 : Runs 9-14, Methuselah
```

Sur 10h, le joueur a vu 4 portraits différents. **L'incarnation narrative est rythmique.**

## Seuils anti-abus

- `blood` capé à `Number.MAX_SAFE_INTEGER / 2`
- Si `dt > 1s` dans la game loop (throttling background) : clamp à 1s et log warning
- Validation au load : si corruption → fresh state avec message

## Tuning knobs (dans `src/game/config/balance.ts`)

```ts
export const BALANCE = {
  COST_MULTIPLIER: 1.15,
  DREAD_MULT_PER_UNIT: 0.10,
  ASCEND_THRESHOLD: 1e6,
  DREAD_GAIN_DIVISOR: 1e6,
  DREAD_GAIN_COEF: 2,
  OFFLINE_EFFICIENCY: 0.5,
  OFFLINE_CAP_HOURS: 4,
  OFFLINE_CAP_HOURS_REWARDED: 6,
  OFFLINE_CAP_HOURS_METHUSELAH: 6,       // prestige 10+, devient baseline
  OFFLINE_CAP_HOURS_METHUSELAH_REWARDED: 8,
  BASE_CLICK_POWER: 1,
  CLICK_SCALING_RATIO: 0.0015,
  CRIT_CHANCE: 0.08,
  CRIT_MULTIPLIER: 5,
  CRIT_CHANCE_FRENZY: 0.24,              // x3 crit chance pendant Frenzy boost
  BOOST_DURATION_SEC: 15,
  BOOST_COOLDOWN_SEC: 60,
  BOOST_COOLDOWN_SEC_LORD_OF_NIGHT: 30,  // prestige 3+
  BOOST_DURATION_REWARDED_SEC: 120,
  FRENZY_DURATION_SEC: 30,                // prestige 7+
  AUTO_CLAIM_INTERVAL_SEC: 5,             // prestige 1+
  DAILY_BOOST_CHARGES: 3,                 // prestige 2+
  GLOBAL_MULT_BONUS_PROGENITOR: 1.5,     // prestige 20+
  UNLOCK_THRESHOLD_RATIO: 0.3,
  FORM_THRESHOLDS: {
    ELDER: 1,
    LORD_OF_NIGHT: 3,
    METHUSELAH: 7,
    PROGENITOR: 15,
    TERA_OVERLORD: 30,
    HORROR_INCARNATE: 50,
    THIRST: 100,
  },
};
```

### Retrait Gravity Wells du MVP

**Décision** : Gravity Wells (monnaie secondaire pour upgrades) est **retirée du MVP** (v1.0). Raisons :
- Playbook idle-expert : "1 currency for the first 15 minutes, 2 currencies max à 30 min".
- Au MVP on a déjà Blood (base) + Dread (prestige) = 2 currencies. Ajouter GW = 3 = cognitive load + achievements à tuner.
- Les GW n'avaient **aucun usage au MVP** (upgrades post-MVP) = reward creux.

**Action MVP** :
- Supprimer `gravityWells: number` du save shape V1 (ou le garder à 0 pour la forward-compat)
- Les 20 achievements n'ont **pas de reward mécanique** au MVP — juste toast + badge
- `gravityWells` réintroduit en v1.1 avec **un système d'upgrades permanents** livré en même temps (évite la monnaie orpheline)

## Tests de balance

Scripts à créer dans `src/game/sim/` :
1. **Pure idle simulation** (pas de tap) : combien de temps pour chaque forme ? Cibles :
   - ELDER (prestige 1) : ~60 min
   - LORD OF NIGHT (prestige 3) : ~2h30 cumulé
   - METHUSELAH (prestige 7) : ~6-8h cumulé
   - PROGENITOR (prestige 15) : ~24h cumulé
2. **Tap spam** (1 tap/s) : accélère les 15 premières minutes de ~40%
3. **Optimal play** : 3 Ascends en 90 min

Run ces simulations manuellement avant chaque release pour valider.
