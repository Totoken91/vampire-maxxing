# SPEC — Ornaments System

> **SVG par défaut, PNG quand nécessaire.** Les ornements simples (corners, dividers, silhouettes château, lune) sont en SVG inline codé. Les ornements baroques trop fins pour rester lisibles en SVG (portrait frame, thrall card bg, thrall medallion, button cartouches) sont des PNG. Voir `docs/07-ASSETS-GUIDE.md` pour la liste exhaustive.

## Fichiers à créer

### SVG codés

Structure `src/ui/ornaments/` :

```
src/ui/ornaments/
├── index.ts                 ← exports publics
├── corner.ts                ← coin flourishes SVG (4 variantes: tl, tr, bl, br) pour éléments non-PNG
├── divider.ts               ← ligne avec centerpiece (❦, ◈, ♰, ✦)
├── moon.ts                  ← lune décorative or avec rayons, coin haut-droit
└── castle-towers.ts         ← silhouettes château aux coins bas, très faint
```

### PNG pré-rendus (dans `assets/ornaments/`)

Ces fichiers sont fournis (générés via ChatGPT + prompts de `assets-prompts/ornaments-and-backgrounds.md`) :

```
assets/ornaments/
├── portrait-frame-baroque.png   ← cadre portrait complet avec drips peints
├── thrall-card-bg.png           ← panneau rouge sang starfield
├── thrall-medallion.png         ← cercle doré réutilisable
├── btn-boost.png                ← cartouche or
└── btn-ascend.png               ← cartouche rouge sang avec glow
```

Usage côté TS : chargés comme images statiques, placés en `background-image` ou `<img>` dans les composants concernés. Pas de manipulation runtime.

## Principes communs

- Toutes les fonctions retournent un `SVGElement` prêt à insérer
- Toutes utilisent `currentColor` pour le stroke/fill → thémable via CSS `color`
- `viewBox` proportionnel à une taille passée en paramètre
- Pas de style CSS inline en dur — tout via classes et variables

## Corner flourish

```ts
// src/ui/ornaments/corner.ts
export type CornerPosition = 'tl' | 'tr' | 'bl' | 'br';

export function createCorner(position: CornerPosition, size: number = 10): SVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', `${size}`);
  svg.setAttribute('height', `${size}`);
  svg.setAttribute('class', `ornament-corner corner-${position}`);
  
  // Le path du coin - 2 traits perpendiculaires + petit motif floral
  // Designed pour être lisible à 8-12px
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', cornerPath(position, size));
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1');
  path.setAttribute('fill', 'none');
  
  svg.appendChild(path);
  return svg;
}

function cornerPath(position: CornerPosition, s: number): string {
  // Base TL corner : descends du top-left, petit curlicue au centre
  const base = `M 0 ${s/2} L 0 0 L ${s/2} 0 M ${s/4} 0 Q ${s/3} ${s/4}, ${s/2} ${s/4}`;
  // Rotate/flip pour les autres positions
  // ... implémenter les 4 variantes
}
```

Usage dans les composants :

```ts
// Dans une thrall-card
const card = document.createElement('div');
card.className = 'gen';
card.appendChild(createCorner('tl'));  // Coin haut-gauche
// ...
```

CSS :
```css
.ornament-corner {
  position: absolute;
  color: var(--gold-dim);
  opacity: 0.5;
}
.corner-tl { top: 0; left: 0; }
.corner-tr { top: 0; right: 0; transform: rotate(90deg); }
.corner-bl { bottom: 0; left: 0; transform: rotate(-90deg); }
.corner-br { bottom: 0; right: 0; transform: rotate(180deg); }
```

## Divider

```ts
// src/ui/ornaments/divider.ts
export function createDivider(centerpiece: '❦' | '◈' | '♰' | '✦' = '❦'): HTMLElement {
  const div = document.createElement('div');
  div.className = 'ornament-divider';
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 200 20');
  svg.setAttribute('class', 'divider-svg');
  svg.setAttribute('preserveAspectRatio', 'none');
  
  // Left fading line
  const leftLine = document.createElementNS(/* ns */, 'line');
  // ... trait qui fade de 0 opacité à 0.4 en or
  
  // Right fading line  
  const rightLine = /* ... symétrique */;
  
  // Small curl ornaments on each side of the center
  // ...
  
  div.appendChild(svg);
  
  const center = document.createElement('span');
  center.className = 'divider-centerpiece';
  center.textContent = centerpiece;
  div.appendChild(center);
  
  return div;
}
```

CSS :
```css
.ornament-divider {
  position: relative;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.divider-svg {
  position: absolute;
  inset: 0;
  color: var(--gold-dim);
}
.divider-centerpiece {
  position: relative;
  color: var(--gold);
  font-size: 14px;
  padding: 0 12px;
  background: var(--void);
}
```

## Portrait frame

**C'est un PNG** : `assets/ornaments/portrait-frame-baroque.png`. Cf. prompt dans `assets-prompts/ornaments-and-backgrounds.md`.

Intégration dans le composant Portrait :

```ts
// src/ui/components/portrait.ts
this.root.innerHTML = `
  <div class="portrait-label">— THE BLOODLINE —</div>
  <div class="portrait-frame-wrapper">
    <img class="portrait-image" src="..." alt="" />
    <img class="portrait-frame" src="/assets/ornaments/portrait-frame-baroque.png" alt="" />
    <div class="portrait-title">Lord of Night · Century IV</div>
  </div>
`;
```

Le frame PNG a la cartouche vide en bas → on superpose le texte du titre via CSS absolute positioning.

## Thrall medallion + card bg

**PNG également**. Intégration :

```ts
// src/ui/components/thrall-card.ts
this.root.innerHTML = `
  <div class="thrall-medallion">
    <img class="thrall-image" src="/assets/thralls/${id}.png" alt="" />
    <img class="thrall-medallion-frame" src="/assets/ornaments/thrall-medallion.png" alt="" />
  </div>
  <div class="thrall-info">...</div>
  <div class="thrall-cost">...</div>
`;
```

CSS : `.thrall-card { background: url('/assets/ornaments/thrall-card-bg.png') no-repeat center / cover; }` + masque circulaire sur `.thrall-image`.

## Button cartouches

**PNG également**. Intégration :

```ts
// src/ui/components/boost-button.ts
this.root.innerHTML = `<span class="btn-label">× BOOST 2×</span><span class="btn-sub">15 sec</span>`;
// CSS: .btn-boost { background: url('/assets/ornaments/btn-boost.png') no-repeat / 100% 100%; }
```

L'animation pulse ASCEND est un `@keyframes` CSS box-shadow rouge en plus du glow peint dans le PNG.

## Moon

Lune or **avec rayons** (pas juste Phosphor icon). SVG custom dans `src/ui/ornaments/moon.ts` : croissant or + 8-12 rayons filigranés qui irradient. Taille 30-40px, opacity 0.7.

## Silhouettes château

SVG custom dans `src/ui/ornaments/castle-towers.ts` : 2-3 silhouettes de tours gothiques aux coins inférieurs gauche/droit de l'écran. Opacity très faible (0.15). Element purement décoratif, en position fixed en bas.

## Tests visuels

Pas de test unitaire automatique (difficile pour SVG). Mais Claude Code doit :
1. Screenshot chaque ornement isolé → comparer visuellement
2. Intégrer dans l'UI → vérifier que le rendu matche le mockup
3. Tester à plusieurs tailles (responsive)

## Performance

- Les SVG sont légers (quelques ko inline)
- Ils ne sont créés **qu'une fois** par composant (pas recréés à chaque tick)
- Pas de filter SVG lourd (pas de Gaussian blur en SVG — on fait ça en CSS)
