# SPEC — Portrait System

> Le cœur émotionnel de Vampire Maxxing. Cette spec est critique.

## Ce que fait le système

Le **Portrait** est le composant UI central qui :
1. Affiche une illustration PNG du vampire correspondant à la forme actuelle du joueur
2. S'entoure d'un **frame ornementé SVG** (codé, pas un asset)
3. Affiche un titre dynamique ("a Lord of Night · Century IV")
4. Gère la **transition cinématique** lors d'un changement de forme (Ascend qui franchit un seuil)
5. Gère les **skins** (portraits alternatifs pour les 3 packs IAP)

## Architecture

```
PortraitComponent (src/ui/components/portrait.ts)
├── createPortraitFrame()           ← SVG ornemental (src/ui/ornaments/portrait-frame.ts)
├── <img> (l'illustration chargée dynamiquement)
├── Label au-dessus: "— THE BLOODLINE —"
├── Titre en dessous: "Lord of Night · Century IV"
└── Méthodes:
    ├── setForm(form)              ← change la forme avec ou sans animation
    ├── preloadNextForm()          ← charge la prochaine en arrière-plan
    ├── applySkin(skin)             ← change le chemin des assets
    └── playAscensionAnimation()   ← l'animation cinématique
```

## Le frame ornemental (SVG)

Codé dans `src/ui/ornaments/portrait-frame.ts`. Inspiré du mockup ChatGPT.

Structure :
- Rectangle avec coins arrondis (légers, 4px max)
- Aux 4 coins : **rosettes ornementales** (4 petits SVG paths identiques, rotations 90° chacun)
- Sur les 4 bords : **filigree patterns** (courbes répétées type art nouveau)
- Couleur : `var(--gold-dim)` par défaut, vire vers `var(--gold)` au hover/highlight
- Drop-shadow subtile rouge autour du cadre pour l'aura

```ts
// src/ui/ornaments/portrait-frame.ts
export function createPortraitFrame(size: number = 400): SVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('class', 'portrait-frame');
  
  // Main rectangle
  const rect = document.createElementNS(ns, 'rect');
  rect.setAttribute('x', '2');
  rect.setAttribute('y', '2');
  rect.setAttribute('width', `${size - 4}`);
  rect.setAttribute('height', `${size - 4}`);
  rect.setAttribute('fill', 'none');
  rect.setAttribute('stroke', 'currentColor');
  rect.setAttribute('stroke-width', '1.5');
  svg.appendChild(rect);
  
  // Inner rectangle for double-border effect
  const inner = document.createElementNS(ns, 'rect');
  inner.setAttribute('x', '12');
  inner.setAttribute('y', '12');
  inner.setAttribute('width', `${size - 24}`);
  inner.setAttribute('height', `${size - 24}`);
  inner.setAttribute('fill', 'none');
  inner.setAttribute('stroke', 'currentColor');
  inner.setAttribute('stroke-width', '0.5');
  inner.setAttribute('opacity', '0.5');
  svg.appendChild(inner);
  
  // 4 corner rosettes
  for (const corner of ['tl', 'tr', 'bl', 'br']) {
    svg.appendChild(createCornerRosette(corner, size));
  }
  
  // Mid-edge filigree ornaments
  for (const edge of ['top', 'right', 'bottom', 'left']) {
    svg.appendChild(createEdgeFiligree(edge, size));
  }
  
  return svg;
}

function createCornerRosette(position: string, size: number): SVGElement {
  // Dessiner un motif ornemental complexe sur ~30×30px
  // Style art nouveau, inspiré du mockup
  // ...
}
```

Claude Code doit **étudier le mockup** pour reproduire la sensation visuelle du cadre. Ne pas faire un cadre simple — l'ornementation est critique.

## Le composant Portrait

```ts
// src/ui/components/portrait.ts
import { Component } from './base';
import { on } from '../../game/events';
import { getCurrentForm, getState } from '../../game/state';
import { getFormDisplayName, getFormTagline, getFormPortraitPath, getCenturyForForm } from '../../game/forms';
import { createPortraitFrame } from '../ornaments/portrait-frame';
import { playAscensionFx } from '../../fx/ascension';

export class Portrait extends Component<HTMLDivElement> {
  readonly root: HTMLDivElement;
  private img: HTMLImageElement;
  private label: HTMLElement;
  private title: HTMLElement;
  private currentForm: VampireForm | null = null;
  private preloadedNextSrc: string | null = null;
  
  constructor() {
    super();
    this.root = document.createElement('div');
    this.root.className = 'portrait-container';
    
    // Label above
    this.label = document.createElement('div');
    this.label.className = 'portrait-label';
    this.label.textContent = '— THE BLOODLINE —';
    this.root.appendChild(this.label);
    
    // Frame + image wrapper
    const frameWrap = document.createElement('div');
    frameWrap.className = 'portrait-frame-wrap';
    
    const frame = createPortraitFrame(400);
    frameWrap.appendChild(frame);
    
    this.img = document.createElement('img');
    this.img.className = 'portrait-image';
    this.img.alt = 'Your current form';
    this.img.onerror = () => this.showPlaceholder();
    frameWrap.appendChild(this.img);
    
    this.root.appendChild(frameWrap);
    
    // Title below
    this.title = document.createElement('div');
    this.title.className = 'portrait-title';
    this.root.appendChild(this.title);
    
    // Wire events
    on('form-change', (e) => this.handleFormChange(e.previousForm, e.newForm));
    
    // Initial state
    this.refresh();
  }
  
  update(): void {
    // Called at UI tick - check if form changed via non-event path (load state)
    const form = getCurrentForm();
    if (form !== this.currentForm) {
      this.refresh();
    }
    // Preload next form if we're close to threshold
    this.maybePreloadNext();
  }
  
  private refresh(): void {
    const form = getCurrentForm();
    const skin = getState().skin;
    const displayName = getFormDisplayName(form);
    const century = getCenturyForForm(form, getState().stats.totalAscends);
    const titleText = century
      ? `${displayName} · Century ${century}`
      : displayName;
    
    this.img.src = getFormPortraitPath(form, skin);
    this.title.textContent = titleText;
    this.currentForm = form;
  }
  
  private async handleFormChange(previousForm: VampireForm, newForm: VampireForm): Promise<void> {
    // Transition animée
    await playAscensionFx({
      portraitEl: this.img,
      titleEl: this.title,
      previousForm,
      newForm,
      nextPortraitSrc: getFormPortraitPath(newForm, getState().skin),
      newTitle: getFormDisplayName(newForm),
    });
    this.currentForm = newForm;
  }
  
  private maybePreloadNext(): void {
    // Heuristic: if we're past 80% of the threshold for next form, preload it
    // (details: calculer le seuil en blood pour le prochain prestige, si > 80% → preload)
    // ...
  }
  
  private showPlaceholder(): void {
    // Image failed to load - show SVG placeholder with form name
    this.img.style.display = 'none';
    // Insert a placeholder div with the form name in gothic font
    // ...
  }
}
```

## L'animation d'ascension (cinématique)

```ts
// src/fx/ascension.ts
export async function playAscensionFx(opts: {
  portraitEl: HTMLImageElement;
  titleEl: HTMLElement;
  previousForm: VampireForm;
  newForm: VampireForm;
  nextPortraitSrc: string;
  newTitle: string;
}): Promise<void> {
  // Timeline (3 seconds total)
  
  // 1. Screen flash rouge (0-400ms)
  const flash = document.createElement('div');
  flash.className = 'ascension-flash';
  document.body.appendChild(flash);
  
  await sleep(400);
  
  // 2. Portrait se dissout en particules (400-1200ms)
  opts.portraitEl.classList.add('dissolving');
  spawnDissolveParticles(opts.portraitEl);
  
  await sleep(800);
  
  // 3. Changement silencieux (1200ms)
  opts.portraitEl.src = opts.nextPortraitSrc;
  // Wait for image loaded
  await imageLoaded(opts.portraitEl);
  opts.portraitEl.classList.remove('dissolving');
  opts.portraitEl.classList.add('materializing');
  
  await sleep(200);
  
  // 4. Titre change avec scroll reveal (1200-1800ms)
  animateTitleChange(opts.titleEl, opts.newTitle);
  
  // 5. Nouveau portrait se révèle avec aura dorée (1200-2000ms)
  spawnMaterializeParticles(opts.portraitEl, 'gold');
  
  await sleep(800);
  opts.portraitEl.classList.remove('materializing');
  
  // 6. Flash se dissipe (2000-2500ms)
  flash.classList.add('fading');
  await sleep(500);
  flash.remove();
  
  // 7. Toast avec flavor text
  showToast(getFormTagline(opts.newForm), 'FORM_CHANGE');
}
```

CSS associé :

```css
/* src/styles/animations.css */

.ascension-flash {
  position: fixed; inset: 0; z-index: 300;
  background: radial-gradient(circle, rgba(255, 51, 66, 0.6) 0%, rgba(165, 20, 35, 0.3) 40%, transparent 80%);
  pointer-events: none;
  animation: flash-in 400ms ease-out forwards;
}
.ascension-flash.fading {
  animation: flash-out 500ms ease-in forwards;
}
@keyframes flash-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes flash-out {
  to { opacity: 0; }
}

.portrait-image.dissolving {
  animation: dissolve 800ms ease-out forwards;
}
@keyframes dissolve {
  0%   { opacity: 1; filter: blur(0) brightness(1); transform: scale(1); }
  100% { opacity: 0; filter: blur(8px) brightness(2); transform: scale(1.1); }
}

.portrait-image.materializing {
  animation: materialize 800ms ease-out forwards;
}
@keyframes materialize {
  0%   { opacity: 0; filter: blur(8px) brightness(2); transform: scale(0.9); }
  100% { opacity: 1; filter: blur(0) brightness(1); transform: scale(1); }
}
```

## Preload strategy

Pour éviter le flash blanc pendant le chargement d'une nouvelle image :

```ts
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

function imageLoaded(img: HTMLImageElement): Promise<void> {
  return new Promise((resolve) => {
    if (img.complete && img.naturalWidth > 0) resolve();
    else img.onload = () => resolve();
  });
}
```

## Lazy loading

On ne charge PAS les 8 portraits au boot :
- **Boot** : charge le portrait de la forme actuelle
- **Dès 70% du seuil de prochaine forme atteint** : preload la forme suivante
- **Après un changement de forme** : l'ancienne forme est GC naturellement (pas de cache explicite)

Ça économise jusqu'à 1 MB au premier démarrage pour un nouveau joueur.

## Skin switching

```ts
export function applySkin(skinId: SkinId): void {
  // Recharge le portrait actuel avec le nouveau skin
  const form = getCurrentForm();
  const newSrc = getFormPortraitPath(form, skinId);
  preloadImage(newSrc).then(() => {
    // Animation de transition rapide (500ms crossfade)
    portraitComponent.img.classList.add('skin-transitioning');
    setTimeout(() => {
      portraitComponent.img.src = newSrc;
      portraitComponent.img.classList.remove('skin-transitioning');
    }, 250);
  });
}
```

## Placeholder en dev

Si les PNG ne sont pas encore fournis :

```ts
function showPlaceholder(form: VampireForm): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 400 400');
  svg.setAttribute('class', 'portrait-placeholder');
  
  // Background
  const bg = /* ... rect noir */;
  svg.appendChild(bg);
  
  // Form name in the center
  const text = document.createElementNS(/* ... */);
  text.setAttribute('x', '200');
  text.setAttribute('y', '200');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-family', 'UnifrakturCook, serif');
  text.setAttribute('font-size', '40');
  text.setAttribute('fill', 'var(--blood)');
  text.textContent = getFormDisplayName(form).toUpperCase();
  svg.appendChild(text);
  
  return svg;
}
```

Le placeholder disparaît automatiquement quand la vraie image est disponible.

## Tests

- `forms.test.ts` : `computeFormFromAscends(0) === 'NEWBORN'`, etc.
- `forms.test.ts` : `getFormPortraitPath('LORD_OF_NIGHT') === '/assets/portraits/lord-of-night.png'`
- `roman.test.ts` : conversion chiffres arabes → romains

## Checklist d'intégration

Avant de marquer le Portrait comme "done" :
- [ ] Les 8 formes ont leur image chargeable
- [ ] Le frame SVG est cohérent avec le mockup
- [ ] La transition entre 2 formes fonctionne visuellement (testée sur ELDER → LORD)
- [ ] Le preload fonctionne (l'image suivante est prête avant le prestige)
- [ ] Le placeholder s'affiche si une image manque
- [ ] Le titre s'anime correctement au changement
- [ ] Les skins switch change le portrait
