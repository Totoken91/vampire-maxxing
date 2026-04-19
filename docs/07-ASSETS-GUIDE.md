# 07 — Assets Guide

> Ce document est CRITIQUE pour Vampire Maxxing. Lis-le en entier avant de toucher au code.

## La règle

**SVG par défaut. PNG quand le SVG casserait le raffinement.**

- **SVG/CSS obligatoire pour** : fond noir + grain, dividers, corner flourishes simples, fog/embers/drips ambient, silhouettes château, lune, glows, particules.
- **PNG obligatoire pour** :
  - 8 portraits de vampires (narratifs, une par forme)
  - 8 illustrations de thralls (narratifs, une par type)
  - 5 ornementaux (baroque trop fin pour du SVG propre) :
    - `portrait-frame-baroque.png` (cadre portrait complet avec drips peints)
    - `thrall-card-bg.png` (panneau rouge sang texturé starfield)
    - `thrall-medallion.png` (cercle doré orné réutilisable)
    - `btn-boost.png` (cartouche métal or sculptée)
    - `btn-ascend.png` (cartouche métal rouge sang sculptée avec glow)
- **Post-MVP** : 3 × 8 = 24 portraits alternatifs pour les skins IAP + éventuelles variantes ornementales par skin.

**Total MVP** : **21 PNG** (8 portraits + 8 thralls + 5 ornements réutilisables).

## Pourquoi cette règle ?

La mockup de référence (`design/mockup.png`) a établi un niveau de finition baroque qu'on ne peut pas atteindre en SVG pour les éléments à forte texture ou à forte densité d'ornementation (cadre portrait, médaillons dorés, cartouches boutons, fond thrall card starfield). Coder ces éléments en SVG donnerait un rendu reconnaissable comme "coded" à côté du mockup.

En revanche, le fond global (noir uni + grain), les dividers simples, les corner flourishes légers, les effets (fog, embers, drips) restent codés pour garder le bundle léger, themable, et scalable.

## La liste exhaustive des assets

### Portraits (8 PNG)

| Fichier | Forme | Prestige # | Taille cible |
|---------|-------|-----------|--------------|
| `newborn.png` | Newborn | 0 | 512×512 |
| `elder.png` | Elder | 1-2 | 512×512 |
| `lord-of-night.png` | Lord of Night | 3-6 | 512×512 |
| `methuselah.png` | Methuselah | 7-14 | 512×512 |
| `progenitor.png` | Progenitor | 15-29 | 512×512 |
| `tera-overlord.png` | Tera Overlord Vampire | 30-49 | 512×512 |
| `horror-incarnate.png` | Horror Incarnate | 50-99 | 512×512 |
| `thirst.png` | The Thirst | 100+ | 512×512 |

Chacun existe en version @2x (1024×1024) pour les écrans haute densité.

### Thralls (8 PNG)

| Fichier | Thrall | Usage |
|---------|--------|-------|
| `rat.png` | Stray Rat | Affiché dans médaillon |
| `ghoul.png` | Feral Ghoul | Idem |
| `fledgling.png` | Fledgling | Idem |
| `thrall.png` | Thrall | Idem |
| `blade.png` | Nightblade | Idem |
| `courtesan.png` | Blood Courtesan | Idem |
| `elder.png` | Elder | Idem |
| `cardinal.png` | Cardinal of the Night | Idem |

Taille cible : 256×256 (@2x si besoin pour écrans denses — probablement pas nécessaire car ils sont masqués en cercle ~48px dans l'UI).

### Ornaments (5 PNG)

| Fichier | Usage | Taille cible |
|---------|-------|--------------|
| `ornaments/portrait-frame-baroque.png` | Cadre portrait complet, rosettes coins + filigree + drips peints + cartouche titre intégré | 800×960 (portrait + cadre), transparent |
| `ornaments/thrall-card-bg.png` | Panneau rouge sang texturé starfield avec coins ornés intégrés | 720×120 (stretchable horizontalement) |
| `ornaments/thrall-medallion.png` | Cercle doré orné réutilisable pour les 8 thralls | 128×128 transparent |
| `ornaments/btn-boost.png` | Cartouche or sculpté | 400×160 (9-slice ou fixe) |
| `ornaments/btn-ascend.png` | Cartouche rouge sang sculpté avec glow peint | 400×160 (9-slice ou fixe) |

Ces 5 PNG sont **réutilisables** (surtout `thrall-medallion` qui sert 8 fois) et se comptent comme un seul téléchargement. Total ornaments < 400 KB.

## Spécifications techniques

### Portraits

- **Format** : PNG-24 avec transparence
- **Dimensions** : 512×512 (normal) + 1024×1024 (@2x)
- **Fond** : transparent OU dark mat (à tester visuellement avec le frame)
- **Compression** : optimizée via `sharp` (script `scripts/optimize-images.js`)
- **Taille fichier cible** : < 150 KB par portrait
- **Budget total portraits** : < 1.2 MB (8 × 150KB)

### Thralls

- **Format** : PNG-24 transparent
- **Dimensions** : 256×256
- **Style** : fond transparent, personnage centré en buste ou composition symbolique
- **Compression** : sharp
- **Taille fichier cible** : < 80 KB par thrall
- **Budget total thralls** : < 640 KB (8 × 80KB)

## Comment générer les assets

**Tu ne génères pas les assets toi-même (Claude Code).** Ils sont fournis par Kenny via ChatGPT DALL-E / generation IA.

Les prompts exacts sont dans `assets-prompts/` :
- `assets-prompts/00-README.md` — guide d'utilisation
- `assets-prompts/portraits.md` — les 8 prompts pour les portraits
- `assets-prompts/thralls.md` — les 8 prompts pour les thralls
- `assets-prompts/ornaments-and-backgrounds.md` — les 5 prompts pour les assets décoratifs
- `assets-prompts/skins.md` — les 24 prompts pour les skins IAP (post-MVP)

Kenny génère les PNG, les place dans `/assets/portraits/`, `/assets/thralls/`, `/assets/ornaments/` (ou te les donne pour que tu les places).

## Chargement dans le code

### Portrait manager

```ts
// src/ui/components/portrait.ts
import type { VampireForm } from '../../game/forms';

const PORTRAIT_PATHS: Record<VampireForm, string> = {
  NEWBORN:           '/assets/portraits/newborn.png',
  ELDER:             '/assets/portraits/elder.png',
  LORD_OF_NIGHT:     '/assets/portraits/lord-of-night.png',
  METHUSELAH:        '/assets/portraits/methuselah.png',
  PROGENITOR:        '/assets/portraits/progenitor.png',
  TERA_OVERLORD:     '/assets/portraits/tera-overlord.png',
  HORROR_INCARNATE:  '/assets/portraits/horror-incarnate.png',
  THIRST:            '/assets/portraits/thirst.png',
};

export class Portrait extends Component<HTMLDivElement> {
  private img: HTMLImageElement;
  private currentForm: VampireForm | null = null;
  
  constructor() {
    super();
    this.root = document.createElement('div');
    this.root.className = 'portrait-container';
    this.root.appendChild(createPortraitFrame());  // SVG ornamental frame
    this.img = document.createElement('img');
    this.img.className = 'portrait-image';
    this.img.alt = 'Your current form';
    this.root.appendChild(this.img);
  }
  
  async setForm(form: VampireForm): Promise<void> {
    if (this.currentForm === form) return;
    
    // Preload next image
    const nextSrc = PORTRAIT_PATHS[form];
    await preloadImage(nextSrc);
    
    // If transition, animate
    if (this.currentForm !== null) {
      await this.animateTransition(nextSrc);
    } else {
      this.img.src = nextSrc;
    }
    
    this.currentForm = form;
  }
  
  private animateTransition(nextSrc: string): Promise<void> {
    return new Promise((resolve) => {
      this.img.classList.add('dissolving');
      setTimeout(() => {
        this.img.src = nextSrc;
        this.img.classList.remove('dissolving');
        this.img.classList.add('materializing');
        setTimeout(() => {
          this.img.classList.remove('materializing');
          resolve();
        }, 800);
      }, 800);
    });
  }
  
  update(): void {
    // No per-tick update needed
  }
}
```

### Lazy loading

On ne charge pas les 8 portraits au boot. On charge :
1. La forme actuelle du joueur (immédiatement)
2. La forme suivante (preload en background dès que le joueur approche du seuil)

Économise ~1 MB de download initial pour les joueurs early-game.

### Skin system (post-MVP)

Quand un skin IAP est activé, on change le chemin de base :

```ts
const skin = getState().currentSkin; // 'default' | 'nosferatu' | 'crimson' | 'void'
const path = `/assets/portraits/${skin}/${form}.png`;
```

La structure des assets doit donc prévoir :
```
assets/
├── portraits/
│   ├── (default)           ← MVP
│   │   └── newborn.png
│   ├── nosferatu/          ← v1.1+
│   │   └── newborn.png
│   ├── crimson/
│   └── void/
```

Au MVP, on garde la structure plate et on refactoring quand les skins arrivent.

## Script d'optimisation

`scripts/optimize-images.js` (à créer) :

```js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PORTRAITS_DIR = path.join(__dirname, '..', 'assets', 'portraits');
const THRALLS_DIR = path.join(__dirname, '..', 'assets', 'thralls');

async function optimizePortrait(file) {
  const inputPath = path.join(PORTRAITS_DIR, file);
  const name = path.basename(file, path.extname(file));
  
  // @1x at 512x512
  await sharp(inputPath)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 85, compressionLevel: 9 })
    .toFile(path.join(PORTRAITS_DIR, `${name}.optimized.png`));
  
  // @2x at 1024x1024
  await sharp(inputPath)
    .resize(1024, 1024, { fit: 'cover' })
    .png({ quality: 85, compressionLevel: 9 })
    .toFile(path.join(PORTRAITS_DIR, `${name}@2x.optimized.png`));
}

// Similar for thralls at 256x256
// ...

// Run
async function main() {
  const portraits = fs.readdirSync(PORTRAITS_DIR).filter(f => f.endsWith('.png') && !f.includes('.optimized.'));
  for (const f of portraits) await optimizePortrait(f);
  console.log(`Optimized ${portraits.length} portraits.`);
}
main();
```

Kenny run `npm run optimize:assets` manuellement avant les builds release.

## Checklist qualité visuelle

Avant d'intégrer les assets, vérifier :
- [ ] Les 8 portraits ont le même cadrage (épaules + tête, légèrement 3/4)
- [ ] La palette est cohérente entre les 8 (palette définie dans `docs/03-ART-DIRECTION.md`)
- [ ] La progression est sensible : Newborn doit sembler jeune et vulnérable, Tera Overlord intimidant
- [ ] Tous les portraits ont un fond sombre (pour fusionner avec le frame)
- [ ] Les 8 thralls ont le même style (gravure engraving sur fond sombre)
- [ ] Les 8 thralls sont reconnaissables en petit format (256×256 → affichés à ~48px dans l'UI)

Si un asset ne passe pas la checklist, retour case départ : regénérer via ChatGPT.

## Fallback en développement

Pendant le dev, tant que les vrais assets ne sont pas générés, Claude Code utilise des **placeholders** :
- Portraits : SVG placeholder avec le titre de la forme écrit au centre ("LORD OF NIGHT") dans le style du mockup
- Thralls : Phosphor icons temporaires (`ph-mouse`, `ph-skull`, etc.)

Placeholder est défini dans `src/ui/components/portrait-placeholder.ts` et utilisé tant que l'image n'est pas disponible (`onerror` handler).

Quand Kenny livre les vrais assets, le placeholder s'efface automatiquement.
