# 09 — Architecture Extensions

> **Statut** : spec de flexibilités structurelles. Ce doc n'ajoute PAS de feature — il pose 3 fondations techniques qui débloquent Phases F→J du `ROADMAP-V2.md` sans refactor lourd.
>
> Les 3 features post-launch (Map & Regions, Awakenings, Aspects, Generations, Unique Thralls) partagent des besoins architecturaux communs. Coder chaque feature en dur = dette technique exponentielle. Poser ces 3 extensions **avant B1** (tickets **B0a** + **B0b**) rend la suite triviale.

---

## Les 3 flexibilités à verrouiller

### 1. Modifier Registry (ticket B0a)
### 2. Portrait Overlay Stack (ticket B0b)
### 3. Extensible Save Schema (implicite, à respecter dès B1)

Chaque section ci-dessous décrit le pattern, les garanties à maintenir, et les usages futurs qu'il débloque.

---

## 1. Modifier Registry — le bus de multipliers

### Problème résolu

Plusieurs systèmes veulent modifier les mêmes grandeurs (thrall rate, thrall cost, dread gain, offline cap, click power, global mult) :

- **B1 Upgrades** : Servant Loyalty → +5%/lv sur thrallRate
- **F Regions** : The Black Veil complétée → +10% globalMult
- **G Awakenings** : The Many équipé → +10% multi-targets
- **H Unique Thralls** : Seraphiel active → +15% fledgling rate
- **I Aspects** : Thirst of Blood → +50% blood rate / -20% crit
- **J Generations** : Ancestors équipés → bonus passifs variés

Coder tout ça en dur dans `getTotalRate()` = fonction à 40 lignes de if/else imbriqués. Chaque nouvelle feature casse les existantes. Power creep incontrôlable.

### La solution : registry central

```ts
// src/game/modifiers.ts
export type ModifierTarget =
  | 'thrallRate'
  | 'thrallRate:<thrallId>'   // per-thrall override
  | 'thrallCost'
  | 'clickPower'
  | 'dreadGain'
  | 'offlineCap'
  | 'globalMult';

export type ModifierOp = 'mult' | 'add' | 'addLevel';

interface Modifier {
  source: string;       // 'upgrade:servant_loyalty', 'region:the-black-veil', 'aspect:blood', etc.
  target: ModifierTarget;
  op: ModifierOp;
  value: number;
}

class ModifierRegistry {
  private modifiers = new Map<string, Modifier>();

  register(source: string, target: ModifierTarget, op: ModifierOp, value: number): void {
    this.modifiers.set(`${source}:${target}`, { source, target, op, value });
  }

  unregister(source: string): void {
    // Remove all modifiers from this source
    for (const key of this.modifiers.keys()) {
      if (key.startsWith(`${source}:`)) this.modifiers.delete(key);
    }
  }

  /** Product of all 'mult' ops on a target. Returns 1 if none. */
  getMultiplier(target: ModifierTarget): number {
    let product = 1;
    for (const m of this.modifiers.values()) {
      if (m.target === target && m.op === 'mult') product *= m.value;
    }
    return product;
  }

  /** Sum of all 'add' ops on a target. Returns 0 if none. */
  getAdditive(target: ModifierTarget): number {
    let sum = 0;
    for (const m of this.modifiers.values()) {
      if (m.target === target && m.op === 'add') sum += m.value;
    }
    return sum;
  }
}

export const modifierRegistry = new ModifierRegistry();
```

### Règle anti power-creep : cap logarithmique

Sans plafond, empiler 5 sources de +15% donne un produit de ×2.01, puis ×5 devient ×7.5, puis ×10 → nombres qui explosent.

**Règle** : sur les targets "globalMult" et "thrallRate" uniquement, applique un cap logarithmique au produit final :

```ts
function cappedMult(target: 'globalMult' | 'thrallRate'): number {
  const raw = modifierRegistry.getMultiplier(target);
  // log cap: raw=1 → 1, raw=10 → ~5, raw=100 → ~10, raw=1000 → ~15
  return raw > 1 ? 1 + Math.log10(raw) * 4 : raw;
}
```

Les targets locaux (thrallCost, offlineCap) restent sans cap.

### Usage attendu

Les consommateurs (`getTotalRate`, `thrallCost`, etc.) deviennent :

```ts
getTotalRate(): number {
  const mult = cappedMult('globalMult') * cappedMult('thrallRate');
  const add = modifierRegistry.getAdditive('thrallRate');
  return (this.baseRate() + add) * mult;
}
```

Les producteurs (B1 upgrades, F regions, etc.) font :

```ts
// On upgrade level change:
modifierRegistry.unregister('upgrade:servant_loyalty');
modifierRegistry.register('upgrade:servant_loyalty', 'thrallRate', 'mult', 1 + level * 0.05);
```

### Garanties à maintenir

- **Idempotent** : register 2 fois le même source overwrite, ne duplique pas
- **Serializable** : le state de chaque source PRODUIT les modifiers au load. On ne sauvegarde PAS la registry elle-même, on la reconstitue à partir des states (upgrades, regions, awakenings, etc.)
- **Pas de side-effects cross-source** : chaque source ne touche que les modifiers qu'elle possède

### Ce que ça débloque

- **B1** : upgrades modifier-driven, formules propres
- **F1** : region passive bonuses
- **G** : awakening effects
- **H** : unique thrall traits
- **I** : aspect build specializations
- **J** : ancestor bonuses

---

## 2. Portrait Overlay Stack — le canvas stratifié

### Problème résolu

Le portrait vampire est actuellement un `<img>` simple dans un `<div class="portrait__body">` avec le frame baroque par-dessus. Les features futures veulent empiler dessus :

- **G Awakenings** : halo doré pulsant (The Eternal), silhouettes fantômes en background (The Many), glitch overlay (The Nameless), portrait vide (The Silent)
- **I Aspects** : palette shift via filters CSS (hue-rotate, mix-blend-mode)
- **J Generations** : silhouettes ancêtres en background, lointaines

Si on ajoute chacun en dur, le HTML du Portrait explose et les conflits d'empilement deviennent un enfer.

### La solution : slot system à 4 layers

Le composant Portrait expose 4 layers empilables, chacun avec un z-index défini, et une API publique pour y injecter des éléments.

```
┌──────────────────────────────────────┐
│ .portrait__frame       (z-index: 3)  │  ← frame baroque (existant, immuable)
├──────────────────────────────────────┤
│ .portrait__overlay-front (z-index: 2) │  ← halos, glitch, effets Awakening
├──────────────────────────────────────┤
│ .portrait__image        (z-index: 1)  │  ← l'image du vampire (existant)
├──────────────────────────────────────┤
│ .portrait__overlay-back  (z-index: 0) │  ← silhouettes ancêtres Gen, aura cosmique
└──────────────────────────────────────┘
```

### API publique

```ts
class Portrait {
  // Existant
  protected override onMount(): void { ... }

  // Nouveau — B0b
  addOverlay(id: string, layer: 'front' | 'back', element: HTMLElement): void {
    element.dataset.overlayId = id;
    const target = layer === 'front' ? this.overlayFront : this.overlayBack;
    target.appendChild(element);
  }

  removeOverlay(id: string): void {
    this.overlayFront.querySelector(`[data-overlay-id="${id}"]`)?.remove();
    this.overlayBack.querySelector(`[data-overlay-id="${id}"]`)?.remove();
  }

  getImageElement(): HTMLImageElement {
    return this.image;
  }
}
```

### Garanties à maintenir

- **Layers immuables** : 4 layers exacts, leur z-index ne change JAMAIS
- **API stable** : `addOverlay` / `removeOverlay` signatures figées dès B0b
- **Animations existantes préservées** : les classes `portrait__image--dissolving` / `--materializing` restent sur `.portrait__image`, ne touchent pas aux overlays
- **Pas de conflit avec le portrait swap** : quand la forme vampire change via `form-changed`, seul `.portrait__image.src` mute — les overlays persistent jusqu'à ce que leur propriétaire appelle `removeOverlay`

### Ce que ça débloque

- **G1 The Eternal** : `portrait.addOverlay('aw-eternal', 'front', haloDiv)` où haloDiv a une animation CSS de pulsation dorée
- **G1 The Many** : `addOverlay('aw-many-1', 'back', silhouetteDiv)` × 3 pour 3 silhouettes translucides
- **G2 The Silent** : `addOverlay('aw-silent', 'front', blackMaskDiv)` qui cache complètement l'image
- **I Aspects** : applique `filter: hue-rotate(...)` directement sur `.portrait__image` via une classe `.portrait__image--aspect-blood`
- **J Generations Ancestors** : pour chaque ancestor équipé, `addOverlay('ancestor-1', 'back', ancestorSilhouetteImg)`

Total : 5+ features plug-and-play sans jamais toucher au composant Portrait.

---

## 3. Extensible Save Schema

### Problème résolu

Le save actuel (`SaveV1`) est un objet avec ~15 champs précis. Chaque feature future veut ajouter des champs :

- F : `map: { currentRegion, unlockedRegions, regionProgress }`
- G : `awakenings: { unlocked, active }`
- H : `uniqueThralls: { owned, encountered, maxActiveSlots }`
- I : `aspect: { current, completed, infusionBonuses }`
- J : `generations: { current, completed }`, `ancestralBlood: number`

Chaque ajout = bump SAVE_VERSION + migration function. Après 5 features = 5 migrations chaînées = fragile.

### La solution : namespace extensible

Prévoir dès B1 (save v2) un champ réservé :

```ts
interface SaveV2 {
  v: 2;
  // ... tous les champs v1 existants ...
  upgrades: Record<UpgradeId, { level: number }>;

  /** Namespace extensible pour les features post-launch. Chaque feature
   * post-launch écrit sous sa clé, et lit au load ce qu'elle trouve (avec
   * fallbacks pour saves pré-feature). AUCUNE migration nécessaire.
   */
  schemaExtensions: {
    map?: MapState;                // Phase F
    awakenings?: AwakeningsState;  // Phase G
    uniqueThralls?: UniqueThrallsState; // Phase H
    aspect?: AspectState;          // Phase I
    generations?: GenerationsState; // Phase J
    ancestralBlood?: number;       // Phase J
    [key: string]: unknown;        // Future-proof pour features non-prévues
  };
}
```

### Règle d'écriture

- **Write** : chaque feature écrit SEULEMENT sous sa propre clé dans `schemaExtensions`
- **Read** : à chaque load, la feature lit `save.schemaExtensions[myKey] ?? defaultState()`
- **Jamais de migration** pour les extensions. Juste des fallbacks avec défauts au load.
- Seul l'état "core" (blood, dread, thralls, stats, upgrades, achievements) peut bump SAVE_VERSION et migrer. Tout le reste vit dans les extensions.

### Garanties à maintenir

- **Forward-compatible** : un save écrit par v2.5 reste lisible par v2.0 (ignore les clés inconnues)
- **Backward-compatible** : un save v2.0 reste lisible par v2.5 (défauts appliqués pour clés manquantes)
- **Isolation** : une corruption d'une extension (ex: map state cassé) ne détruit pas les autres. Le load wrappe chaque lecture extension dans try/catch avec fallback silencieux.

### Ce que ça débloque

- Phases F, G, H, I, J ajoutent leurs features **sans toucher au SAVE_VERSION**
- Les saves des early adopters (Phase E) restent jouables quand ils mettent à jour en Phase J
- Possibilité d'A/B tester features post-launch en écrivant dans une extension qui peut être retirée

---

## Ordre de livraison

1. **B0a — ModifierRegistry** (avant B1) — ~1h
2. **B0b — Portrait overlay stack** (avant B1 ou en parallèle) — ~1h
3. **B1 — Upgrades** utilise déjà ModifierRegistry (pas de refactor plus tard)
4. **E — Release** ship avec les 3 extensions actives mais peu utilisées
5. **F, G, H, I, J** utilisent les 3 extensions sans rien refactorer

Temps investi en B0 : 2-3h.
Temps économisé sur Phases F→J : ~15-20h de refactor éparpillé.

---

## Anti-patterns à NE PAS faire

### ❌ Modifier registry qui persist son propre état
Le registry se RECONSTITUE au load depuis les states sources (upgrades, regions actives, etc.). Persister le registry = double source of truth = bugs.

### ❌ Overlay slots avec z-index dynamiques
Les 4 layers ont un z-index fixé une bonne fois pour toutes. Changer les z-index à runtime = empilement imprévisible.

### ❌ Écrire dans `schemaExtensions` hors de sa namespace
Chaque feature possède UNE clé. Lire/écrire dans la clé d'une autre feature = couplage qui pourrit tout.

### ❌ Migrations pour les extensions
Si la shape d'une extension change, la feature elle-même gère la transition via fallbacks — pas de bump SAVE_VERSION pour ça.

### ❌ Modifiers avec side-effects
Un modifier ne fait que publier un delta numérique. Pas de callback, pas d'event. Les side-effects (animations, sons) sont déclenchés par le système qui register le modifier, pas par le registry lui-même.

---

## Tests à écrire dans B0

### modifiers.test.ts
- register / unregister single modifier
- multiple sources on same target compose correctly
- cappedMult respects log cap at >1
- unknown target returns neutral (1 for mult, 0 for add)

### portrait.overlay.test.ts
- addOverlay attaches to correct layer
- removeOverlay removes from either layer
- stacking multiple overlays on same layer preserves order
- overlays survive a form-changed re-render

### save.schemaExtensions.test.ts
- Unknown extension key at load → default applied, no throw
- Corrupted extension JSON → fallback silently, other extensions intact
- Write + round-trip preserves shape

---

Dernière mise à jour : 2026-04-20
