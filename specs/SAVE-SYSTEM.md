# SPEC — Save System

## Spec abrégée (identique au pattern Cosmic Forge)

- Clés : `vampire_maxxing_save`, `vampire_maxxing_save_bak`, `vampire_maxxing_meta`
- Format : JSON sérialisé, `v: 1`, `ts: number` (timestamp)
- Storage : Capacitor Preferences en natif, localStorage en web (voir Cosmic Forge SAVE-SYSTEM.md pour l'abstraction complète)

## Shape SaveV1 spécifique à Vampire Maxxing

```ts
interface SaveV1 {
  v: 1;
  ts: number;
  blood: number;
  totalRunBlood: number;
  totalLifetimeBlood: number;
  dread: number;
  gravityWells: number;
  thralls: Record<string, { owned: number; totalPurchased: number }>;
  baseClickPower: number;
  boost: { active: boolean; endTime: number; cooldownEnd: number; isRewarded: boolean };
  stats: {
    totalTaps: number;
    totalCrits: number;
    totalAscends: number;       // ← CRITIQUE pour déterminer la forme
    firstLaunch: number;
    totalPlayTime: number;
    highestFormReached: string; // ← Sérialisation de VampireForm
  };
  unlockedAchievements: string[];
  skin: string;
  ownedSkins: string[];
  isFounder: boolean;
  settings: { soundEnabled: boolean; hapticsEnabled: boolean; lang: string; notifEnabled: boolean };
}
```

## Migration

```ts
function migrate(raw: any): SaveV1 {
  let data = raw;
  while ((data.v ?? 0) < CURRENT_VERSION) {
    const v = data.v ?? 0;
    if (v === 0) data = migrateV0toV1(data);
    else throw new Error(`Unknown save version: ${v}`);
  }
  return data as SaveV1;
}
```

## Validation

Identique au pattern Cosmic Forge, avec validations additionnelles :
- `stats.totalAscends` ≥ 0
- `stats.highestFormReached` est une VampireForm valide
- `ownedSkins` est un sous-ensemble de `['default', 'nosferatu', 'crimson', 'void']`
- `skin` est dans `ownedSkins`

## Auto-save

- Toutes les 5 secondes (loop)
- Sur `visibilitychange` (background)
- Sur Ascend (immédiat)
- Sur achat de thrall (immédiat)
- Sur changement de skin

## Offline progress

Identique au pattern Cosmic Forge :
- Cap 4h efficiency 50%
- Variante pub : cap 6h, 100%
- Modal au retour si elapsed > 60s

## Tests

- Round-trip serialize/deserialize
- Migration v0 → v1
- Validation fixtures
- `highestFormReached` ne redescend jamais

## Référence

Pour le détail complet de l'implémentation (code complet de load/save/migrate avec backup), voir le pattern Cosmic Forge ou demander à Claude Code d'implémenter selon ce template.
