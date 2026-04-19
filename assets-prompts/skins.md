# Skins Prompts — 3 variantes × 8 formes (post-MVP)

> À faire après la release v1.0. Pas nécessaire pour le MVP.

## Pourquoi pas au MVP ?

- 24 portraits supplémentaires = beaucoup de temps de génération
- Les 3 skins sont des IAP, on peut les ship en v1.1 après avoir validé que les joueurs accrochent
- Ça fait une raison de poster une update + nouvelle vidéo TikTok

## Les 3 packs

### NOSFERATU Pack

**Thème** : expressionnisme allemand, monochrome dramatique, angles durs, ombres découpées.

**Palette** :
- Noir profond absolu
- Blanc os légèrement jauni
- UN seul accent rouge carmin très localisé (yeux, gouttes)
- Pas d'or
- Pas de pourpre

**Modifier le prompt de base** :

```
Portrait illustration of a vampire character, head and shoulders, 
facing camera slightly 3/4 view. 

Style: German Expressionism meets silent film aesthetic, 
reminiscent of Murnau's Nosferatu (1922) and Caligari. Dramatic 
sharp shadows, angular contrast, almost woodcut quality, 
monochromatic.

Color palette: absolute deep black (#000000), warm bone white 
(#f3ead8), single carmine red accent only on eyes or blood drops 
(#8b0000). NO gold, NO purple, NO color variation. Stark, 
theatrical.

Background: pure black void.

Square 1:1 format, 1024×1024 resolution. 

Highly detailed, elegant, archaic, theatrical. NOT cartoon, 
NOT anime, NOT cute.

CHARACTER: [même description de stade que la version default mais 
avec "wrapped in dramatic shadow, sharp angular features, 
expressionist composition"]
```

### CRIMSON COURT Pack

**Thème** : baroque décadent, opulence, dorures, rubis, velours rouge.

**Palette** :
- Noir profond
- Rouge sang Renaissance
- Or abondant (pas le muted antique - or plus brillant)
- Blanc nacré sur la peau
- Détails dorés saturés

**Modifier le prompt de base** :

```
Portrait illustration of a vampire character, head and shoulders, 
facing camera slightly 3/4 view.

Style: Baroque decadence, Venetian nobility, Italian Renaissance 
oil painting. Rich, ornate, maximalist. Heavy gold brocade, red 
velvet, ruby jewelry. Think Caravaggio meets Gustav Klimt meets 
noble vampire aristocracy.

Color palette: deep black background, Renaissance blood red 
(#a51423), lustrous warm gold (#d4a944), pearl-white skin 
(#f8f0e0). Gold should feel abundant but still elegant — 
not cheap glitter.

Background: deep black with suggestion of dark velvet drapery.

Square 1:1 format, 1024×1024 resolution.

Ultra detailed, rich, opulent, decadent. 

CHARACTER: [description + "wearing ornate gold-embroidered 
crimson robes with ruby ornaments, golden chains, heavy 
jewelry"]
```

### VOID CULT Pack

**Thème** : horreur cosmique, occulte, éthéréen, froid.

**Palette** :
- Noir profond
- Violet profond mystique
- Cyan glacier (au lieu du rouge)
- Peau bleu-gris
- Aucun or

**Modifier le prompt de base** :

```
Portrait illustration of a vampire character, head and shoulders, 
facing camera slightly 3/4 view.

Style: Cosmic horror, occult, eldritch void entity. Reminiscent 
of Beksinski paintings crossed with H.R. Giger's delicacy. 
Otherworldly, unsettling, chilling beauty.

Color palette: absolute void black, deep mystical purple 
(#6b2d8f), glacier cyan (#a8d8e8), blue-grey pale skin 
(#c8d0d8). NO gold, NO blood red — replaced entirely by purple 
and cyan. Cold temperature.

Background: deep purple-black void with subtle swirls of darker 
purple nebula.

Square 1:1 format, 1024×1024 resolution.

Ultra detailed, eldritch, cosmic, unsettling. Not horror-shock 
but horror-awe.

CHARACTER: [description + "with cyan glowing eyes instead of red, 
dark purple robes with occult symbols in silver thread, aura 
of cosmic void, pale blue-tinted skin"]
```

## Les 24 portraits à générer

Pour chaque pack (NOSFERATU, CRIMSON, VOID), refaire les 8 formes :

- newborn
- elder
- lord-of-night
- methuselah
- progenitor
- tera-overlord
- horror-incarnate
- thirst

→ 24 PNG supplémentaires à ranger dans :
```
assets/portraits/
├── nosferatu/
│   ├── newborn.png
│   ├── elder.png
│   └── ... (8 total)
├── crimson/
│   └── ...
└── void/
    └── ...
```

## Workflow suggéré

Ne génère PAS les 24 d'un coup. Fais-le par vagues :

1. **Semaine après release** : générer le pack le plus demandé par les retours utilisateurs
2. **2 semaines plus tard** : les 2 autres packs
3. **Event** : update v1.1 avec les 3 packs → vidéo TikTok + buzz

Ça permet aussi d'adapter la DA de chaque pack selon le feedback community.

## Tests visuels

Pour chaque pack, générer d'abord les 3 formes "vedettes" :
- Newborn (pour voir la base)
- Lord of Night (le plus affiché)
- Tera Overlord (le peak visuel)

Si ces 3 font le job visuellement → greenlight pour les 5 autres.

## Qualité attendue

Même niveau que les portraits default. Si le résultat est inférieur, **ne release pas**. Un skin médiocre fait plus de mal que pas de skin.

La promesse des IAP est une expérience visuelle différente mais aussi raffinée. Si ce n'est pas le cas, c'est un manque de respect pour le client payeur.
