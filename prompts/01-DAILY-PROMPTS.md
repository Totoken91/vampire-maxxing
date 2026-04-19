# Prompts quotidiens — J2 à J12

> Copie-colle ces prompts dans Claude Code au début de chaque session. Adapte selon l'avancement réel.

---

## J2 — Core loop + UI basique

```
Aujourd'hui, J2 : core loop et premiers composants UI.

Référence : tasks/ROADMAP.md section J2.

Objectifs :
1. src/game/state.ts — GameState singleton avec API publique 
   (voir specs/GAME-STATE.md)
2. src/game/events.ts — event bus typé
3. src/game/loop.ts — game loop rAF, tick 60fps pour physics, 
   tick 10Hz pour UI
4. src/ui/app.ts — controller principal avec grid layout
5. src/ui/components/base.ts — Component abstract class
6. src/ui/components/header.ts — header 3 colonnes du mockup
7. src/ui/components/blood-display.ts — gros chiffre blood
8. src/ui/components/thrall-list.ts + thrall-card.ts — version 
   minimaliste sans ornements (ornements à J7)
9. src/styles/tokens.css — les variables de docs/03-ART-DIRECTION.md
10. src/styles/base.css — reset, typography de base

À la fin, on doit avoir : le jeu tourne dans le navigateur, on 
peut tap le (placeholder) portrait pour gagner du blood, et 
acheter des thralls.

Les ornements SVG viendront plus tard — focus core loop.
```

---

## J3 — Portrait system + polish thralls

```
J3 : système de portrait et peaufinage thralls.

Référence : specs/PORTRAIT-SYSTEM.md en détail.

Objectifs :
1. src/ui/components/portrait.ts — composant central avec :
   - Conteneur qui accueillera le frame SVG (vide pour l'instant)
   - <img> avec src dynamique selon la forme
   - Placeholder SVG si image absente (voir spec)
   - Label "— THE BLOODLINE —" au-dessus
   - Titre "a Lord of Night · Century IV" en-dessous
2. src/ui/components/divider.ts — div avec centerpiece ❦
3. Améliore thrall-card pour matcher le mockup :
   - Layout 3 colonnes (icon placeholder | info | cost)
   - État affordable vs locked
   - Shimmer animation sur affordable
4. src/ui/components/boost-button.ts
5. src/ui/components/ascend-button.ts (disabled pour l'instant)

Test : le placeholder doit afficher "NEWBORN" quand prestige 0, 
"ELDER" quand ascends 1, etc.

Ne JUSTE pas encore les vrais assets PNG — on est toujours en 
placeholder mode. Les vrais portraits arrivent J8.
```

---

## J4 — FX Engine

```
J4 : moteur d'effets visuels pour créer l'atmosphère.

Référence : specs/FX-ENGINE.md.

Objectifs :
1. src/fx/particle-engine.ts — canvas plein écran, 60fps, 
   max 200 particules
2. src/fx/embers.ts — braises qui montent depuis le bas (30 max)
3. src/fx/blood-particle.ts — burst sur tap, normal vs crit
4. src/fx/fog.ts — div avec gradients animés (CSS pur)
5. src/fx/drips.ts — 3 gouttes de sang depuis le portrait (CSS)
6. src/fx/bats.ts — 2 silhouettes Phosphor qui traversent (CSS)
7. src/fx/float-number.ts — "+10" qui monte au tap
8. src/ui/components/toast.ts — toast générique stylé

À la fin, le jeu doit RESPIRER gothique :
- Embers qui montent doucement
- Fog qui dérive
- Drips qui tombent du portrait
- Bat qui traverse de temps en temps
- Tap qui produit des particules rouges (or sur crit)

Vérifie le 60fps stable.
```

---

## J5 — Save + Offline

```
J5 : sauvegarde et progression offline.

Référence : specs/SAVE-SYSTEM.md.

Objectifs :
1. src/platform/storage.ts — abstract layer (Preferences natif, 
   localStorage fallback)
2. src/game/save.ts — serialize/deserialize/migrate
3. Auto-save toutes les 5s + sur visibilitychange + sur Ascend
4. Offline progress : cap 4h, 50% efficiency
5. src/ui/components/offline-modal.ts — modal de récap au retour 
   (avec option rewarded ad)

Tests dans tests/save.test.ts : 
- Round-trip serialize/deserialize
- Validation d'un save corrompu
- Migration v0 → v1 (simule un ancien format)

Test manuel : quitte le jeu 2 min, reviens → doit y avoir gain 
offline affiché dans une modal.
```

---

## J6 — Prestige + Ascension FX

```
J6 : le moment fort du jeu, la transition de forme.

Référence : specs/PORTRAIT-SYSTEM.md section "Animation 
d'ascension" + specs/FX-ENGINE.md section Ascension.

Objectifs :
1. Implémenter triggerAscend dans state.ts
2. src/ui/components/ascend-modal.ts :
   - Affiche le gain de Dread
   - Preview de la nouvelle forme si seuil franchi
   - Confirm/Cancel
   - Option "INVOKE THE CURSE" (rewarded ad ×2)
3. src/fx/ascension.ts — animation cinématique 3s :
   - Flash rouge
   - Portrait dissolve
   - Change de source
   - Materialize avec particules dorées
   - Titre change avec scroll reveal
4. L'événement form-change doit déclencher la transition

Test : atteins 1e6 blood, Ascend → doit passer NEWBORN → ELDER 
avec animation complète. C'est LE moment, prends le temps pour 
que ce soit satisfaisant.
```

---

## J7 — Ornements SVG

```
J7 : tous les ornements gothiques en SVG code pur.

Référence : specs/ORNAMENTS.md + design/mockup.png pour la 
référence visuelle.

Objectifs :
1. src/ui/ornaments/corner.ts — coin flourishes, 4 variantes 
   positionnelles
2. src/ui/ornaments/divider.ts — ligne avec centerpiece ❦
3. src/ui/ornaments/thrall-frame.ts — cercle ornementé
4. src/ui/ornaments/button-border.ts — bordures boutons 
   ornementées
5. src/ui/ornaments/portrait-frame.ts — LE BIG ONE, frame 
   baroque complet
6. src/ui/ornaments/moon.ts (simple via Phosphor)
7. Intégration dans TOUS les composants existants

Étudie design/mockup.png pour le portrait-frame — il a des 
rosettes aux 4 coins + filigrees sur les bords + ornements 
centraux en haut et en bas.

Pour rendre ça pixel-parfait, itère avec des screenshots. Ne 
te contente pas d'un rectangle simple.

Validation : le jeu doit maintenant matcher visuellement le 
mockup à ~90%.
```

---

## J8 — Intégration assets réels

```
J8 : intégration des 16 PNG générés.

Prérequis : Kenny a généré les 8 portraits + 8 thralls via 
ChatGPT et les a placés dans /assets/portraits/ et 
/assets/thralls/.

Objectifs :
1. scripts/optimize-images.js — script sharp pour resize+compress
2. Run optimization
3. Portrait component charge les vraies images via 
   getFormPortraitPath()
4. Thrall card charge la vraie illustration dans le cercle 
   ornementé
5. Lazy loading : ne charger que la forme actuelle + preload de 
   la suivante quand le joueur dépasse 70% du seuil
6. Fallback placeholder si asset manquant

Test : lance le jeu, vérifie que chaque forme affiche le bon 
portrait. Ascend plusieurs fois, vérifie les transitions.

Validation FINALE : le jeu ressemble au mockup à 95%+. Screenshot 
et compare côte à côte.
```

---

## J9 — Capacitor Android

```
J9 : build Android physique.

Référence : specs/BUILD-ANDROID.md.

Objectifs :
1. npm install @capacitor/core @capacitor/cli @capacitor/android
2. npx cap init → appId quest.kenny.vampiremaxxing
3. capacitor.config.ts avec backgroundColor #08050a
4. npx cap add android
5. Premier build + run sur device physique
6. npm install @capacitor/preferences @capacitor/haptics
7. Wire storage.ts sur Preferences
8. Wire haptics dans tap, crit, purchase, ascend
9. Fix responsive pour petits écrans (360×640)
10. Fix safe areas (notch, navigation bar)
11. Splash screen config (noir profond, pas de flash blanc)
12. Status bar styling (overlay, dark content)

Test sur device (pas émulateur) : 60 fps stable en gameplay 
normal, 60 fps pendant les ascensions.

Si perf dégradée : réduis le nombre max de particules, ou 
désactive les embers.
```

---

## J10 — AdMob

```
J10 : monétisation par pub récompensée.

Référence : specs/ADS-INTEGRATION.md.

Prérequis : Kenny a créé le compte AdMob + app + ad unit rewarded.

Objectifs :
1. npm install @capacitor-community/admob
2. AndroidManifest.xml meta-data avec APP_ID
3. src/platform/ads.ts wrapper avec 4 types :
   - 'summon-night' : boost 2× 2 min
   - 'embrace-dawn' : offline +2h 100% eff
   - 'invoke-curse' : Dread ×2 sur ascend
   - 'offering' : daily bonus blood
4. UMP consent flow au premier lancement EU
5. Intégration des 4 boutons dans le jeu :
   - SUMMON THE NIGHT : variante du Boost button
   - EMBRACE THE DAWN : dans offline modal
   - INVOKE THE CURSE : dans ascend modal
   - OFFERING : bouton dans header pour daily gift
6. Fallback gracieux si ad fail

Test : utilise les IDs de test AdMob, check que les pubs s'affichent 
et rewards sont bien déclenchés.
```

---

## J11 — IAP + Skins

```
J11 : store Apothecary et système de skins.

Référence : specs/IAP-INTEGRATION.md + docs/05-MONETIZATION.md.

Prérequis : Kenny a créé les 4 produits dans Play Console (IDs 
exacts : skin_nosferatu, skin_crimson, skin_void, founder_pack).

Objectifs :
1. npm install @capacitor-community/in-app-purchases
2. src/platform/iap.ts wrapper (init, getProducts, purchase, 
   restore)
3. src/ui/components/store-modal.ts — Apothecary :
   - 3 cartes skins avec preview (utilise portrait Lord of Night 
     en background flouté)
   - Prix 2.99€ chacun
   - Bouton "ACQUIRE" ou "OWNED"
   - Founder Pack 9.99€ (visible uniquement les 90 premiers jours)
   - Bouton RESTORE PURCHASES en bas
4. Skin switching dans Portrait :
   - applySkin() change le chemin de base
   - Animation crossfade 500ms
5. Founder Pack logic avec limitation temporelle

Test : mock les achats en dev mode via toggle "UNLOCK ALL" dans 
settings, teste que les 3 skins changent visuellement le portrait.

Note : pour les vrais skins, il faudrait les 24 PNG supplémentaires. 
Au MVP on teste juste que le switching fonctionne. Les skins 
images réelles peuvent être ajoutées en v1.1.
```

---

## J12 — Final polish + release

```
J12 : tout ce qui reste, puis upload.

Objectifs :
1. src/i18n/en.ts + fr.ts complets (tous les strings)
2. src/i18n/index.ts API t(key, vars)
3. Tous les composants utilisent t() au lieu de strings en dur
4. Switch langue dans settings modal
5. Achievements system (src/game/achievements.ts + check loop)
   - Les 20 achievements de specs/ACHIEVEMENTS.md
   - Toast d'unlock + Gravity Wells counter
6. Audio engine lazy Tone.js (src/audio/engine.ts) — peut être 
   partial si le temps manque
7. Settings modal complète (ambience, haptics, lang, reset, 
   privacy)
8. Privacy policy hébergée
9. App icon 512×512 (utilise le portrait Lord of Night dans un 
   cadre ornemental stylisé)
10. 8 screenshots pris
11. Build release signé

Dernière heure :
- npm run build
- npx cap sync android
- cd android && ./gradlew bundleRelease
- Upload app-release.aab en Play Console Internal Testing
- Release notes EN + FR
- Submit for review

🧛 Ton bébé est dans les mains de Google maintenant.
```

---

## Prompts transversaux (à tout moment)

### Si un bug apparaît
```
J'ai un bug : [description]

Avant de fix, identifie :
1. La cause racine (pas juste le symptôme)
2. Si ça pourrait casser autre chose
3. Le fix minimal le plus propre

Propose la fix avant de l'appliquer.
```

### Si tu veux ajouter une feature hors-scope
```
J'aimerais ajouter [feature]. 

Avant de coder :
1. Est-ce que c'est dans le scope MVP (voir docs/01-VISION.md) ?
2. Si non, est-ce rapide à faire (< 2h) ?
3. Quel fichier brief doit être updaté en même temps ?

Conseille-moi : on ajoute ou on note pour v1.1 ?
```

### Si tu veux valider visuellement
```
Compare l'état actuel du jeu au design/mockup.png.

Liste les différences, par ordre d'impact visuel décroissant. 
Pour chacune, propose comment s'en rapprocher.
```

### Si les perfs sont mauvaises
```
Les perfs ne sont pas 60fps sur device. 

Profil Chrome DevTools sur tab Performance pendant 10s de 
gameplay. Identifie les 3 pires bottlenecks.

Propose une optimisation pour chacun (la moins invasive d'abord).
```
