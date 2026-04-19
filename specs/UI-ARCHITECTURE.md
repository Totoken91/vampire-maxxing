# SPEC — UI Architecture

## Pattern général

Pas de framework réactif. Pattern **"poll + diff-lite"** :

1. Tick UI à 10Hz (100ms) lit l'état
2. Chaque composant compare ses valeurs affichées à l'état, update uniquement ce qui a changé
3. Événements ponctuels (ascend, tap) via event bus → animations immédiates

## Layout mobile-first

Single screen, pas de scroll de page. Grid layout :

```
┌─────────────────────────────────┐
│  HEADER (brand | status | dread)│  ← auto height
├─────────────────────────────────┤
│      ORNAMENT DIVIDER ❦         │  ← auto
├─────────────────────────────────┤
│                                 │
│        PORTRAIT (framed)         │  ← ~35% of height
│         + label + title          │
│                                 │
├─────────────────────────────────┤
│          BLOOD COUNTER           │  ← auto
│      +342 / per second           │
├─────────────────────────────────┤
│   — thy hollow servants —       │
│                                 │
│   [▢ rat     × STRAY RAT    124]│  ← scroll internal
│   [▢ ghoul   × FERAL GHOUL 186 ]│
│   [▢ fledg.  × FLEDGLING   248 ]│
│   [▢ thrall  × THRALL      512 ]│
│   [▢ blade  NIGHTBLADE      — ]│
├─────────────────────────────────┤
│  [× BOOST 2×]  [◈ ASCEND +8]   │  ← auto
└─────────────────────────────────┘
```

CSS grid :
```css
.app {
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  gap: 10px;
  height: 100dvh;
  padding: 12px 16px;
}
```

Le portrait prend `1fr` proportionnellement, la liste des thralls scroll en interne si elle overflow.

## Base abstract component

```ts
// src/ui/components/base.ts
export abstract class Component<TRoot extends HTMLElement = HTMLElement> {
  abstract readonly root: TRoot;
  protected mounted = false;
  
  mount(parent: HTMLElement): void {
    parent.appendChild(this.root);
    this.mounted = true;
    this.onMount();
  }
  unmount(): void {
    this.root.remove();
    this.mounted = false;
    this.onUnmount();
  }
  abstract update(): void;
  protected onMount(): void {}
  protected onUnmount(): void {}
}
```

## Controller principal

```ts
// src/ui/app.ts
export class App {
  private components: Component[] = [];
  
  init(root: HTMLElement): void {
    const container = document.createElement('div');
    container.className = 'app';
    
    const header = new Header();
    const divider = new Divider('❦');
    const portrait = new Portrait();
    const blood = new BloodDisplay();
    const thralls = new ThrallList();
    const actions = new ActionsBar();
    
    this.components = [header, portrait, blood, thralls, actions];
    
    header.mount(container);
    divider.mount(container);
    portrait.mount(container);
    blood.mount(container);
    thralls.mount(container);
    actions.mount(container);
    
    root.appendChild(container);
  }
  
  tick(dt: number): void {
    // Every UI tick (10Hz)
    for (const c of this.components) c.update();
  }
}
```

## Composants principaux

### Header
3 colonnes : brand (gothic) | identity (mono + serif italic) | dread (mono purple)

### Portrait
Voir `PORTRAIT-SYSTEM.md` pour le détail.

### BloodDisplay
Grand chiffre en mono blood, label italic au-dessus, rate en dessous.

### ThrallList
Contient 8 ThrallCard. Gère la scrollability interne.

### ThrallCard
Grid `48px | 1fr | auto`. Icone dans cercle ornementé, info, cost+label.

### ActionsBar
2 boutons BOOST + ASCEND.

## Navigation & modals

Au MVP, 1 écran principal + modals overlay :
- `ascend-modal.ts` — confirmation d'Ascend avec gain + ad variant
- `offline-modal.ts` — récap offline progress au retour
- `store-modal.ts` — "Apothecary", skins IAP
- `settings-modal.ts` — langue, sound, haptics, reset
- `achievements-modal.ts` — grille des unlocks (optionnel MVP)

Toutes les modals :
- Fond semi-opaque noir
- Frame ornemental SVG
- Animation fade+scale 200ms in, 150ms out
- Fermeture par ✕ en haut-droite ou tap sur backdrop

## Accessibilité

- Touch targets ≥ 44×44px
- `prefers-reduced-motion` : désactive dissolve/materialize, remplace par fondu simple
- `aria-label` sur tous les boutons iconiques

## DOM helpers

Identiques à Cosmic Forge :

```ts
// src/utils/dom.ts
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Record<string, string>, children?: (Node|string)[]): HTMLElementTagNameMap[K];
export function q<T extends HTMLElement>(sel: string, parent?: ParentNode): T;
```
