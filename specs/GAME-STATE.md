# SPEC — Game State

## Principes

- **Un seul état source de vérité** : `GameState` dans `src/game/state.ts`
- **Mutations contrôlées** : toute mutation via fonctions nommées (`addBlood`, `buyThrall`, etc.)
- **Pas de réactivité auto** : UI lit l'état au tick (10Hz), événements via event bus

## Shape de l'état

```ts
export interface GameState {
  // Resources
  blood: number;                // Blood actuel
  totalRunBlood: number;        // Total sur le run courant (reset par Ascend)
  totalLifetimeBlood: number;   // Total depuis le début
  dread: number;                // Prestige currency
  gravityWells: number;         // Achievement currency
  
  // Thralls
  thralls: Record<ThrallId, ThrallState>;
  
  // Click
  baseClickPower: number;
  
  // Boost
  boost: {
    active: boolean;
    endTime: number;
    cooldownEnd: number;
    isRewarded: boolean;
  };
  
  // Stats & forme
  stats: {
    totalTaps: number;
    totalCrits: number;
    totalAscends: number;
    firstLaunch: number;
    totalPlayTime: number;
    lastSave: number;
    highestFormReached: VampireForm;  // ← nouveau
  };
  
  // Achievements
  unlockedAchievements: Set<string>;
  
  // Cosmetics
  skin: SkinId;                 // 'default' | 'nosferatu' | 'crimson' | 'void'
  ownedSkins: Set<SkinId>;
  isFounder: boolean;
  
  // Settings
  settings: {
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    lang: 'fr' | 'en';
    notifEnabled: boolean;
  };
  
  // Meta
  saveVersion: number;
}

export interface ThrallState {
  owned: number;
  totalPurchased: number;
}

export type VampireForm =
  | 'NEWBORN'
  | 'ELDER'
  | 'LORD_OF_NIGHT'
  | 'METHUSELAH'
  | 'PROGENITOR'
  | 'TERA_OVERLORD'
  | 'HORROR_INCARNATE'
  | 'THIRST';
```

## API publique

```ts
// src/game/state.ts

// Reads
export function getState(): Readonly<GameState>;
export function getBlood(): number;
export function getThrallRate(id: ThrallId): number;
export function getTotalRate(): number;
export function getGlobalMultiplier(): number;
export function getClickPower(): number;
export function getAscendGain(): number;
export function getCurrentForm(): VampireForm;  // dérivé de stats.totalAscends

// Mutations
export function tapCore(): TapResult;
export function tickPassive(dt: number): void;
export function buyThrall(id: ThrallId, qty?: number): BuyResult;
export function triggerBoost(rewarded: boolean): boolean;
export function triggerAscend(dreadMultiplier?: 1 | 2): AscendResult;
export function applyOfflineProgress(seconds: number, rewarded: boolean): number;
export function setSkin(skin: SkinId): void;
export function unlockSkin(skin: SkinId): void;

// Lifecycle
export function loadState(raw: string | null): void;
export function serializeState(): string;
export function resetAll(): void;  // debug only
```

## Types de résultat

```ts
export interface TapResult {
  gain: number;
  isCrit: boolean;
}

export interface BuyResult {
  success: boolean;
  spent: number;
  qtyBought: number;
  milestoneReached: number | null;  // palier atteint (10, 25, 50...)
}

export interface AscendResult {
  dreadGained: number;
  previousDread: number;
  newDread: number;
  previousForm: VampireForm;
  newForm: VampireForm;
  formChanged: boolean;  // ← clé pour trigger l'animation
}
```

## Event bus

```ts
// src/game/events.ts

type GameEvent =
  | { type: 'tap';        gain: number; isCrit: boolean; x: number; y: number }
  | { type: 'buy';        thrallId: ThrallId; cost: number; totalOwned: number }
  | { type: 'milestone';  thrallId: ThrallId; tier: number; owned: number }
  | { type: 'boost';      rewarded: boolean; duration: number }
  | { type: 'boost-end' }
  | { type: 'ascend';     dreadGained: number; formChanged: boolean; previousForm: VampireForm; newForm: VampireForm }
  | { type: 'form-change';previousForm: VampireForm; newForm: VampireForm }
  | { type: 'achievement';id: string; reward: number }
  | { type: 'offline';    gain: number; seconds: number }
  | { type: 'unlock';     thrallId: ThrallId }
  | { type: 'skin-change';skin: SkinId };

export function emit(event: GameEvent): void;
export function on<T extends GameEvent['type']>(
  type: T,
  handler: (e: Extract<GameEvent, { type: T }>) => void
): () => void;
```

## Le système de forme (spécifique à Vampire Maxxing)

```ts
// src/game/forms.ts

export function computeFormFromAscends(ascends: number): VampireForm {
  if (ascends >= 100) return 'THIRST';
  if (ascends >= 50)  return 'HORROR_INCARNATE';
  if (ascends >= 30)  return 'TERA_OVERLORD';
  if (ascends >= 15)  return 'PROGENITOR';
  if (ascends >= 7)   return 'METHUSELAH';
  if (ascends >= 3)   return 'LORD_OF_NIGHT';
  if (ascends >= 1)   return 'ELDER';
  return 'NEWBORN';
}

export function getFormDisplayName(form: VampireForm): string {
  return FORM_CONFIG[form].displayName;
}

export function getFormTagline(form: VampireForm): string {
  return FORM_CONFIG[form].tagline;
}

export function getFormPortraitPath(form: VampireForm, skin: SkinId = 'default'): string {
  const skinPrefix = skin === 'default' ? '' : `${skin}/`;
  return `/assets/portraits/${skinPrefix}${FORM_CONFIG[form].slug}.png`;
}

export function getCenturyForForm(form: VampireForm, ascends: number): string {
  // Retourne le chiffre romain pour "Century IV" etc.
  if (form === 'NEWBORN') return '';
  const centuriesByForm: Record<VampireForm, number> = {
    NEWBORN: 0, ELDER: 1, LORD_OF_NIGHT: 2, METHUSELAH: 3,
    PROGENITOR: 4, TERA_OVERLORD: 5, HORROR_INCARNATE: 6, THIRST: 7,
  };
  const baseCentury = centuriesByForm[form];
  // Affine avec le nombre d'ascends
  return toRoman(baseCentury + Math.floor(ascends / 5));
}
```

Config :

```ts
// src/game/config/forms.ts
export const FORM_CONFIG: Record<VampireForm, FormDef> = {
  NEWBORN:           { slug: 'newborn',          displayName: 'Newborn',              tagline: 'Your eyes open for the first time.' },
  ELDER:             { slug: 'elder',            displayName: 'an Elder',             tagline: 'A century passes behind your gaze.' },
  LORD_OF_NIGHT:     { slug: 'lord-of-night',    displayName: 'a Lord of Night',      tagline: 'Kingdoms whisper your name.' },
  METHUSELAH:        { slug: 'methuselah',       displayName: 'a Methuselah',         tagline: 'You have seen empires rise and fall.' },
  PROGENITOR:        { slug: 'progenitor',       displayName: 'a Progenitor',         tagline: 'Bloodlines bow before you.' },
  TERA_OVERLORD:     { slug: 'tera-overlord',    displayName: 'a Tera Overlord Vampire', tagline: 'The heavens dim when you yawn.' },
  HORROR_INCARNATE:  { slug: 'horror-incarnate', displayName: 'Horror Incarnate',     tagline: 'Reality cracks at your edges.' },
  THIRST:            { slug: 'thirst',           displayName: 'The Thirst',           tagline: 'You no longer have a name. Only a hunger.' },
};
```

## Exemple d'implémentation `triggerAscend`

```ts
export function triggerAscend(dreadMultiplier: 1 | 2 = 1): AscendResult {
  const gain = Math.floor(getAscendGain() * dreadMultiplier);
  const previousForm = computeFormFromAscends(state.stats.totalAscends);
  
  // Apply
  state.dread += gain;
  state.stats.totalAscends += 1;
  
  const newForm = computeFormFromAscends(state.stats.totalAscends);
  const formChanged = previousForm !== newForm;
  
  // Update highest form reached
  if (isFormHigher(newForm, state.stats.highestFormReached)) {
    state.stats.highestFormReached = newForm;
  }
  
  // Reset run
  state.blood = 0;
  state.totalRunBlood = 0;
  for (const id in state.thralls) {
    state.thralls[id as ThrallId].owned = 0;
  }
  state.boost = { active: false, endTime: 0, cooldownEnd: 0, isRewarded: false };
  
  // Save immediately
  save();
  
  // Emit events
  emit({
    type: 'ascend',
    dreadGained: gain,
    formChanged,
    previousForm,
    newForm,
  });
  
  if (formChanged) {
    emit({ type: 'form-change', previousForm, newForm });
  }
  
  return {
    dreadGained: gain,
    previousDread: state.dread - gain,
    newDread: state.dread,
    previousForm,
    newForm,
    formChanged,
  };
}
```

## Règles d'intégrité

- `blood` jamais négatif, clampé à `Number.MAX_SAFE_INTEGER / 2`
- `dread` jamais négatif
- `totalAscends` jamais décroissant
- `stats.highestFormReached` ne redescend jamais (même après reset de debug)
- Les sets (`unlockedAchievements`, `ownedSkins`) sont sérialisés en arrays
