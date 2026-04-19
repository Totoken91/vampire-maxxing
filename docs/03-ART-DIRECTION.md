# 03 — Art Direction

## Le mot-clé directeur

> **"A luxurious grimoire rendered as a premium mobile app."**

Fond noir profond absolu, frame baroque doré lourd autour d'un portrait à l'huile dark romantic, cartouches sculptées pour les boutons, thrall cards en panneaux rouge sang texturés "nébuleuse/starfield" dans des médaillons or. Drips de sang peints qui coulent du cadre. Silhouettes de tours de château tout en bas. Le contraste noir profond + or baroque + accents sang est la signature.

La référence canonique est `design/mockup.png`. L'ancienne version est conservée pour historique en `design/mockup-v1.png`.

## Références à avoir en tête

- **Alphonse Mucha** — art nouveau, ornements filigranés, portraits élégants
- **Aubrey Beardsley** — gravures noir et blanc théâtrales, silhouettes
- **Edward Gorey** — illustrations gothiques semi-ironiques
- **Manuscrits enluminés médiévaux** — marges ornées, lettrines
- **Ex-libris XIXe** — gravures dorées sur fond noir
- **Interview with the Vampire (2022)** — dark romantic TV aesthetic
- **Dracula BBC / Nosferatu (2024)** — contemporain mais classique

**À éviter absolument :**
- Cartoon / kawaii / anime chibi
- Flat design / Material Design / iOS natif
- Neomorphism / glass-morphism
- Neon cyberpunk
- Retro pixel art (ça casse le register premium)

## Palette (strict)

```css
/* BASE */
--void:       #08050a   /* noir profond avec soupçon pourpre — FOND GLOBAL */
--deep:       #12090e   /* sombre tinted */
--paper:      #1a0f14   /* parchemin vieilli noir */
--ink:        #f3ead8   /* blanc os, jamais pur blanc */
--ink-dim:    #a89986
--ink-faint:  #5c4f42

/* ACCENTS */
--blood:      #a51423   /* rouge profond riche, numbers principaux */
--blood-dark: #6b0e18
--blood-glow: #ff3342   /* pour glow, crits, highlights */
--gold:       #c9a962   /* or antique oxydé, ornements */
--gold-dim:   #8a7444
--shadow:     #6b2d8f   /* pourpre mystique, méta-layer */
--moon:       #c9a962   /* lune OR (pas blanc-os), avec rayons */

/* TEXTURES via PNG */
/* Le fond des thrall cards est un panneau rouge sang starfield */
/* fourni par ornaments/thrall-card-bg.png, tiled/stretched */
```

### Règles de couleur

- **80% de l'écran en noir profond.** Le fond global est `--void`, pas une texture. On ajoute un grain SVG turbulence et des fog gradients très subtils.
- **Les thrall cards sont la seule zone "rouge sang texturé"** de l'UI — panneau rouge nébuleuse/starfield (asset PNG) qui contraste avec le fond noir.
- **Gold** → ornements, frames, titres de rank, nom de thrall, lune décorative avec rayons
- **Blood** → chiffres principaux, accents de vie/sang, bordure ASCEND
- **Shadow (pourpre)** → ressource Dread uniquement, très rare
- **Un seul accent dominant par écran** à un instant donné
- **Pas de rouge vif** (on utilise blood-dark ou blood, pas blood-glow sauf crits et glow ASCEND)
- **Silhouettes de tours de château** en gold très faible (`opacity: 0.15`) aux coins bas de l'écran — élément de décor signature.

## Typographie

### Display ornementale — `UnifrakturCook`
- Uniquement pour le titre "VAMPIRE MAXXING" (2 lignes, en haut à gauche)
- Blood color, subtle text-shadow rouge
- Ne JAMAIS utiliser ailleurs

### Elegance — `Cormorant Garamond`
- Titres de sections, titre de rank actuel ("a Lord of Night"), flavor text
- Weights 400/500/600, italics pour emphases
- Letter-spacing : 0.05-0.15em

### Data — `JetBrains Mono`
- Tous les chiffres (blood counter, cost, rate, dread)
- UI meta (labels "YOU ARE", "DREAD", "BLOOD")
- Weights 300/400/500
- **Toujours `font-variant-numeric: tabular-nums`**
- Letter-spacing : 0.2-0.4em pour les caps

**Le contraste 3-way est essentiel** : ornemental gothique + elegant serif + modern mono. C'est l'identité. Ne pas simplifier.

## Ornementation

### Principe

**Aucun bord n'est nu.** Toute carte, cadre, bouton a une ornementation. La règle est : **SVG par défaut, PNG quand le SVG casserait le raffinement**.

### Split SVG / PNG

| Élément | Implémentation | Raison |
|---------|----------------|--------|
| Fond global | CSS pur (`--void`) + grain SVG turbulence | Noir uni texturé léger |
| Corner flourishes simples | SVG | Lisible en petit, themable |
| Divider avec ❦/◈ centerpiece | SVG + glyphe | Trivial |
| Fog gradients, embers, drips ambient, grain | SVG/Canvas/CSS | Natif |
| Silhouettes château (coins bas) | SVG inline faint | Détail minimal |
| Lune avec rayons | SVG (simple path + rayons filigrane) ou PNG faible poids | Joli petit asset |
| **Portrait frame baroque complet** | **PNG** (`ornaments/portrait-frame-baroque.png`) | Rosettes détaillées + filigree + drips peints — impossible en SVG propre |
| **Thrall card background** (panel rouge nébuleuse) | **PNG** (`ornaments/thrall-card-bg.png`) | Texture starfield, répété 8× |
| **Thrall medallion** (cercle or orné réutilisable) | **PNG** (`ornaments/thrall-medallion.png`) | Détail doré baroque |
| **BOOST / ASCEND cartouches** | **PNG** (`ornaments/btn-boost.png`, `btn-ascend.png`) | Métal sculpté volumétrique |

Les PNG ornementaux sont **réutilisables et peu nombreux** — la majorité du bundle reste dans les 8 portraits + 8 thralls narratifs. Pas de PNG pour le fond global (il reste noir CSS + grain).

### Règles SVG résiduel

Quand un élément reste en SVG :
- Code en SVG inline (TS template literal)
- Couleur via `currentColor` ou CSS variable
- Scalable (viewBox proportionnel)
- Pas de fichier externe

### Drips de sang (détail signature)

Le cadre portrait a **3 drips de sang** qui coulent depuis le haut du cadre vers l'intérieur. Dans le PNG du frame, ils font partie intégrante de l'asset (peints). Un complément CSS anime 2-3 drips supplémentaires qui tombent du bas du cadre (voir `src/fx/drips.ts`).

### Références visuelles dans le mockup

Regarder `design/mockup.png` et noter :
- **Fond** : noir profond uni avec grain subtil, vignette légère
- **Cadre portrait** : ornements baroques lourds dorés, rosettes aux coins, drips de sang peints qui coulent du haut du cadre, titre "Lord of Night · Century IV" intégré en cartouche basse
- **Thrall cards** : panneau rouge sang foncé texturé starfield (nébuleuse) + médaillon doré circulaire à gauche avec mini-portrait peint réaliste du sbire (pas une icône Phosphor)
- **Boutons** : cartouches en métal sculpté volumétriques, BOOST en or, ASCEND en rouge avec glow
- **Divider** : ligne horizontale avec centerpiece ❦ en or, avec petits ornements secondaires
- **Lune** : or avec rayons filigranes, haut-droite
- **Tours de château** : silhouettes gold très faintes aux coins inférieurs de l'écran

**Claude Code reproduit fidèlement le mockup — en SVG si possible, en PNG quand nécessaire (cf. tableau ci-dessus).**

## Composants visuels clés

### 1. Portrait central (LE cœur de l'UI)
- Taille : ~70% de la largeur de l'écran
- Aspect ratio : 1:1 (carré)
- Image chargée depuis `assets/portraits/[form-id].png`
- **Encadré** par le portrait-frame ornementé (SVG)
- **Aura rouge douce** émanant (CSS box-shadow + filter)
- Au-dessus : label "— THE BLOODLINE —" en mono caps
- Au-dessous : titre italique "Lord of Night · Century IV"
- Animation : léger breathing effect (scale 1→1.02 sur 4s)
- **Lors d'un prestige avec changement de forme** : transition dramatique (fade to black, fade in nouveau portrait, titre qui change en scroll)

### 2. Blood counter
- Font : JetBrains Mono, 42-48px
- Color : `--blood` avec text-shadow rouge
- `font-variant-numeric: tabular-nums`
- Au-dessus : "— blood —" italique serif faint
- Au-dessous : "+342 / per second" en mono, "+342" en `--blood-glow`
- Sur tap : bump animation micro (scale 1→1.03→1 sur 150ms)

### 3. Thrall cards
- Structure grid : `48px (médaillon) | 1fr (info) | auto (cost)`
- Fond : PNG `ornaments/thrall-card-bg.png` (panneau rouge sang nébuleuse/starfield) stretched ou 9-slice
- Bordure : intégrée au PNG (ornements aux coins)
- Médaillon : PNG `ornaments/thrall-medallion.png` (cercle doré orné) + image du thrall au centre via mask circle
- État affordable : shimmer CSS overlay + glow gold sur le coût
- État locked : opacity 0.3, filter saturate(0.25), label "sealed" en gris

### 4. Boutons actions (BOOST + ASCEND)
- Deux colonnes égales en bas d'écran
- Fond : PNG `ornaments/btn-boost.png` (or) et `ornaments/btn-ascend.png` (rouge sang avec glow intégré) — cartouches sculptées volumétriques
- Texte superposé en CSS : label mono caps + sub-label italique serif
- ASCEND : pulse animation CSS box-shadow rouge en plus du glow peint
- État pressed : scale(0.97) + légère brightness

### 5. Header
- 3 colonnes : brand | identity | dread
- Brand "Vampire Maxxing" sur 2 lignes en UnifrakturCook
- Identity avec label mono + titre serif italique + rang en chiffres romains
- Dread en mono avec symbole ×

## Effets visuels (VFX)

### Particles de sang (tap)
- Burst 8 particules sur tap normal, 18 sur crit
- Normal : rouges (`--blood` et `--blood-glow`)
- Crit : dorées (`--gold`)
- Gravité positive (tombent)
- Fade sur 800ms-1.2s
- Shadow-blur 10px pour glow

### Embers ambient
- Particules qui montent lentement depuis le bas
- Rouge foncé (75%) et or (25%)
- ~30 particules max on-screen
- Très subtile, ajoute profondeur atmosphérique

### Fog animé
- 2 gradients radiaux très subtils qui dérivent
- Animation 30s ease-in-out infinite alternate
- Mix-blend-mode screen
- Teinte rouge/pourpre

### Grain texture
- Overlay plein écran via SVG turbulence filter
- Opacity 0.06
- Mix-blend-mode overlay
- Donne un feel "papier ancien"

### Drips de sang
- Depuis le portrait, 3 drips à intervalles désynchronisés
- Goutte qui tombe ~30px puis fade
- Animation 5s staggered

### Chauves-souris
- 1-2 silhouettes qui traversent l'écran rarement
- Très faibles (opacity 0.4)
- Icône Phosphor `ph-fill ph-bat`

### Ascension (prestige animation)
1. Screen flash rouge → noir (500ms)
2. Portrait actuel se dissout en particules rouges (800ms)
3. Nouveau portrait apparaît avec aura dorée (800ms)
4. Nouveau titre se révèle caractère par caractère (600ms)
5. Toast avec flavor text ("You have become something greater.")

**Skip** : l'animation est incontournable pour les 5 premiers Ascends (moment narratif fort). À partir du 6e, tap sur l'écran pendant la transition → skip direct au nouveau state.

## Accessibility & Settings

### Settings modal (accessible via gear icon header)

Toggles disponibles :

| Setting | Default | Effet |
|---------|---------|-------|
| **Sound** | OFF | Active Tone.js pour tap sounds + ambience |
| **Ambience** | OFF (requires Sound ON) | Active le drone ambient pad |
| **Haptics** | ON | Vibrations 4ms tap / 20ms crit (si device supporte) |
| **Reduce motion** | auto-detect | Désactive screen shake, fog animation, bats traversant, divise particules par 2 |
| **Reduce embers** | OFF (auto si perf bas) | Désactive les 30 embers ambient (gain de ~3-4 FPS sur low-end) |
| **Skip ascension anim after 5th** | ON | Auto-skip des animations d'ascension post-5 pour éviter l'irritant |
| **Language** | auto (fr/en) | FR ou EN |

### Auto-detection au first launch

```ts
const defaults = {
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  reduceEmbers: isLowEndDevice(),  // heuristic sur navigator.deviceMemory, hardwareConcurrency
  lang: navigator.language.startsWith('fr') ? 'fr' : 'en',
};
```

### Règles accessibility strictes

- **Reduce motion ON** → screen shake supprimé complètement, particules divisées par 2, fog freezed, bats hidden, aura pulse du portrait ralentie (8s au lieu de 4s)
- **Haptics OFF** → zéro vibration (même sur crit)
- **Sound OFF par default** : respecte le contexte (transport public, bureau) — player active si il veut
- **Touch targets** : tous les toggles dans settings sont ≥ 48×48 dp (standard Android)
- **Contrast ratio** : texte principal sur fond noir respecte WCAG AA (≥ 4.5:1)

### Perf targets avec accessibility

- Device mid-range 2020 (Snapdragon 665, 4GB) : 60 fps stable même sans reduce
- Device low-end 2018 (Snapdragon 450, 2GB) : 60 fps avec reduce-motion + reduce-embers ON
- Auto-suggest "reduce-embers" si FPS < 55 mesuré sur 10 secondes

## Sonore (placeholder MVP)

Audio désactivé par défaut. Option "AMBIENCE" dans settings qui active :
- Ambient drone via Tone.js (pad lent + vent léger)
- Tap : sine wave 220Hz (plus grave que Cosmic Forge, plus organique)
- Crit : triangle 440Hz avec décay long
- Achat thrall : cloche grave 150Hz
- Ascension : accord montant mineur sur 3s

Pas d'audio file. Tout généré. Voir `specs/AUDIO-ENGINE.md`.

## Ce qu'on évite absolument

- ❌ Icônes "Material Design" ou "Feather Icons" cutesy
- ❌ Border-radius > 4px (sauf cercles complets)
- ❌ Fond gris ou beige
- ❌ Gradients violet → rose générique (pas Spotify aesthetic)
- ❌ Animations bouncy / overshoot cartoon
- ❌ Polices sans-serif modernes
- ❌ Emoji dans l'UI (sauf dans achievements mémés textuels)
- ❌ Fluos saturés
- ❌ Assets décoratifs en PNG (tout ornement est SVG code)
- ❌ Drop shadows banals — on utilise des glows ou rien

## Référence absolue

Le fichier `design/mockup.png` est le **gold standard visuel**. Claude Code doit :
1. L'ouvrir et l'analyser à chaque début de session
2. Le référencer pour chaque décision de layout ou d'ornementation
3. Signaler si une spec contredit le mockup (la spec gagne, mais on discute)

Le but : que quelqu'un qui compare le jeu fini et le mockup ait du mal à les distinguer.
