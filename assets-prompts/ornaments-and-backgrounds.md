# Ornaments Prompts — 5 assets décoratifs

> Ces 5 assets ne sont pas narratifs mais leur niveau de finition définit le raffinement de l'UI. Sans eux, le jeu ressemble à un idle générique. Avec eux, il matche la mockup.

## Ordre recommandé

1. `thrall-medallion.png` (le plus simple, pour calibrer le style doré)
2. `thrall-card-bg.png` (sert de backdrop aux médaillons)
3. `portrait-frame-baroque.png` (le plus complexe)
4. `btn-boost.png`
5. `btn-ascend.png`

Entre chaque génération, dire à ChatGPT : *"Keep the exact same antique gold tone, same line quality, same level of baroque detail as the previous asset."*

---

## 1. THRALL MEDALLION

**Fichier** : `assets/ornaments/thrall-medallion.png`
**Dimensions** : 128×128 transparent PNG
**Usage** : cadre circulaire doré réutilisable pour les 8 thralls. L'image du thrall sera appliquée en mask circulaire à l'intérieur.

```
Ornate circular gold medallion frame, empty center (transparent),
for a gothic dark vampire mobile game.

Style: baroque antique gold filigree, hand-engraved quality, like
an 18th century ornate picture frame reduced to a small round medallion.
The frame is a perfect ring with detailed ornamental work: four small
rosettes at cardinal points (top, bottom, left, right), fine filigree
curls between them, subtle inner and outer bevel lines. Tarnished
oxidized antique gold (#c9a962), not shiny modern gold.

Background: fully transparent (alpha channel).
Center: empty transparent circle for the thrall portrait to be placed.

Square 1:1 format, 128×128 resolution, transparent PNG with alpha.

Highly detailed, crisp at small sizes, not cartoon, not flat vector,
not cheap. Think "commissioned gold leaf on a cathedral reliquary".

NO text, NO background, NO image inside the center ring, NO shadow
behind the medallion.
```

---

## 2. THRALL CARD BACKGROUND

**Fichier** : `assets/ornaments/thrall-card-bg.png`
**Dimensions** : 720×120 PNG (étiré en largeur dans l'UI selon le device)
**Usage** : panneau de fond pour chaque ligne de thrall. Texture rouge sang foncé avec constellation/starfield subtil.

```
Horizontal rectangular panel background for a mobile game UI card,
for a gothic dark vampire idle game.

Style: deep blood-red (#3a0a0f to #6b0e18) textured panel with a
subtle starfield / nebula effect — tiny red stars and faint red
mist swirls scattered across the surface. Feels like looking into
a cosmic wound or a dried blood galaxy. Darkened vignette at the
left and right edges. Subtle aged paper texture, very subtle grain.

Ornamental corners: small antique gold (#c9a962) angular corner
flourishes integrated into the panel's 4 corners (top-left,
top-right, bottom-left, bottom-right). Thin gold frame line outlining
the entire panel (1px visual), dim opacity.

Rectangular 6:1 aspect, 720×120 resolution.

Highly detailed texture, premium quality, not flat color, not
uniform. The red should feel painted, slightly uneven, like a
blood-stained parchment with occult cosmic elements.

NO text, NO icons, NO thrall illustration — this is ONLY the
background panel. The illustration will be added on top separately.
NO cartoon, NO bright red, NO flat design.
```

---

## 3. PORTRAIT FRAME BAROQUE

**Fichier** : `assets/ornaments/portrait-frame-baroque.png`
**Dimensions** : 800×960 transparent PNG
**Usage** : cadre complet autour du portrait vampire principal. Inclut : frame baroque, drips de sang peints qui coulent du haut, cartouche titre intégré en bas.

```
Ornate baroque gothic picture frame, rectangular portrait format,
empty center (transparent), for a premium dark vampire mobile game.

Style: heavy antique gold baroque frame in the tradition of 17th
century Venetian painting frames, intricately carved with:
- Large ornamental rosettes at the 4 corners (3-4cm visual size each)
- Vertical and horizontal filigree patterns running along each edge
- Small central ornaments at the top and bottom midpoints
- A horizontal gold cartouche integrated into the bottom edge — empty,
  ready to receive a title text like "Lord of Night · Century IV"

Overlay: 2-3 drips of wet crimson blood (#a51423 with #ff3342 highlights)
running down from the top inner edge of the frame, trailing 20-40% down
into the picture area. The drips look fresh and glossy, with subtle
highlights. NOT running off the frame — running inside, from top inner
border downward.

Background: fully transparent (alpha channel).
Center: empty transparent rectangular area where the vampire portrait
will be placed.

Portrait format 5:6, 800×960 resolution, transparent PNG with alpha.

The gold is tarnished, oxidized, antique — NOT shiny or modern. Small
pits and patina give it age. Very detailed, hand-engraved quality.

NO text inside the cartouche (leave empty), NO portrait inside the frame
(leave transparent center), NO background around the frame, NO shadow.

This frame should look like it was removed from a haunted palace and
composited into a luxury app. Baroque maximalism meets digital premium.
```

---

## 4. BOOST BUTTON CARTOUCHE

**Fichier** : `assets/ornaments/btn-boost.png`
**Dimensions** : 400×160 transparent PNG
**Usage** : fond cartouche sculpté or pour le bouton BOOST. Le texte est ajouté par-dessus en CSS.

```
Ornate rectangular button cartouche, sculpted metal gold appearance,
for a dark gothic vampire mobile game.

Style: antique gold (#c9a962) metal plaque with subtle volumetric
3D shading — looks sculpted, not flat. Small angular gold corner
flourishes at all 4 corners, integrated into the plaque's edges.
Inner recessed panel with slightly darker gold (#8a7444) where the
button text will sit. Subtle bevel at edges giving thickness /
depth. A very faint filigree pattern along the top and bottom edges
of the inner recessed panel.

Slight subtle glow halo around the edges (very dim).

Background: fully transparent (alpha channel).
Center: empty recessed panel, NO text, NO icons — text will be
added by code.

Rectangular 5:2 aspect, 400×160 resolution, transparent PNG.

Premium volumetric metalwork feel, like a boutique watch box clasp.
NOT flat design, NOT cartoon, NOT plastic-looking. Feels like real
forged metal.

NO text inside, NO image inside, NO shadow behind the cartouche.
```

---

## 5. ASCEND BUTTON CARTOUCHE

**Fichier** : `assets/ornaments/btn-ascend.png`
**Dimensions** : 400×160 transparent PNG
**Usage** : fond cartouche sculpté rouge sang pour le bouton ASCEND, avec glow peint rouge.

```
Ornate rectangular button cartouche, sculpted dark red metal
appearance with blood-red inner glow, for a dark gothic vampire
mobile game.

Style: dark blood-red (#6b0e18 to #a51423) sculpted metal plaque
with volumetric 3D shading. Small angular blood-red and antique
gold corner flourishes at all 4 corners. Inner recessed panel with
slightly brighter blood glow (#a51423) where the button text will
sit. Subtle bevel at edges giving thickness.

Painted-in glow halo around the edges in #ff3342, as if the
cartouche is infused with dark ritual energy. The glow is SUBTLE
and painted into the asset — not a harsh neon. Fades outward.

Background: fully transparent (alpha channel).
Center: empty recessed panel, NO text, NO icons — text will be
added by code.

Rectangular 5:2 aspect, 400×160 resolution, transparent PNG.

Premium metalwork feel with ominous ritual energy. Feels dangerous
and powerful. NOT flat design, NOT cartoon, NOT neon.

NO text inside, NO image inside, NO shadow behind the cartouche.
```

---

## Checklist après génération

Pour chaque asset :
- [ ] PNG transparent vérifié (ouvrir dans GIMP/Photoshop, confirmer alpha channel)
- [ ] Dimensions exactes respectées
- [ ] Pas de texte, pas d'image parasite dans les zones à laisser vides
- [ ] Palette cohérente entre les 5 ornements (même tone de gold, même tone de blood)
- [ ] Lisible en petit (zoom dans la taille réelle d'affichage)
- [ ] Pas de watermark AI, pas de signature

Si un critère échoue → regénérer. Ces 5 assets sont **critiques** pour le feel premium — ne pas prendre de compromis.

## Post-génération

1. Placer dans `assets/ornaments/`
2. Run `npm run optimize:assets` (sharp compresse en place)
3. Commit : `feat(assets): add baroque ornamental assets`
4. Vérifier visuellement en jeu
