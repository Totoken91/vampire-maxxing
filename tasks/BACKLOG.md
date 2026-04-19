# BACKLOG — Tâches granulaires

> Cases à cocher. Classé par système. Chaque tâche est un commit.

## 🏗️ Bootstrap

- [ ] Init Vite vanilla-ts
- [ ] TypeScript strict mode
- [ ] ESLint + Prettier + prettierrc
- [ ] Vitest config
- [ ] Structure dossiers `src/`
- [ ] `.gitignore` (node_modules, dist, android/build, keystore)
- [ ] README synchronisé
- [ ] Copie docs/, specs/, design/mockup.png dans le repo

## 🎮 Game core

- [ ] `src/game/config/balance.ts`
- [ ] `src/game/config/thralls.ts` (8 thralls)
- [ ] `src/game/config/forms.ts` (8 formes)
- [ ] `src/game/config/milestones.ts` (56 flavor lines)
- [ ] `src/game/config/achievements.ts` (20)
- [ ] `src/game/math.ts`
- [ ] `src/game/forms.ts`
- [ ] `src/game/state.ts`
- [ ] `src/game/events.ts`
- [ ] `src/game/loop.ts`
- [ ] `src/game/save.ts`
- [ ] `src/game/achievements.ts`

## 🧪 Tests

- [ ] `tests/math.test.ts`
- [ ] `tests/forms.test.ts`
- [ ] `tests/roman.test.ts`
- [ ] `tests/format.test.ts`
- [ ] `tests/save.test.ts`

## 🎨 UI Components

- [ ] `src/ui/app.ts` (controller)
- [ ] `src/ui/components/base.ts`
- [ ] `src/ui/components/header.ts`
- [ ] `src/ui/components/divider.ts`
- [ ] `src/ui/components/portrait.ts` ⭐ (critical)
- [ ] `src/ui/components/blood-display.ts`
- [ ] `src/ui/components/thrall-list.ts`
- [ ] `src/ui/components/thrall-card.ts`
- [ ] `src/ui/components/boost-button.ts`
- [ ] `src/ui/components/ascend-button.ts`
- [ ] `src/ui/components/toast.ts`
- [ ] `src/ui/components/achievement-toast.ts`
- [ ] `src/ui/components/ascend-modal.ts`
- [ ] `src/ui/components/offline-modal.ts`
- [ ] `src/ui/components/store-modal.ts`
- [ ] `src/ui/components/settings-modal.ts`

## 🎭 Ornaments

- [ ] `src/ui/ornaments/corner.ts`
- [ ] `src/ui/ornaments/divider.ts`
- [ ] `src/ui/ornaments/portrait-frame.ts` ⭐ (complex)
- [ ] `src/ui/ornaments/thrall-frame.ts`
- [ ] `src/ui/ornaments/button-border.ts`
- [ ] `src/ui/ornaments/moon.ts`

## ✨ VFX

- [ ] `src/fx/particle-engine.ts`
- [ ] `src/fx/embers.ts`
- [ ] `src/fx/fog.ts` (CSS)
- [ ] `src/fx/drips.ts` (CSS)
- [ ] `src/fx/bats.ts` (CSS)
- [ ] `src/fx/float-number.ts`
- [ ] `src/fx/ascension.ts` ⭐ (cinematic)
- [ ] `src/fx/blood-particle.ts`

## 📱 Platform

- [ ] `src/platform/storage.ts` (Preferences + fallback)
- [ ] `src/platform/haptics.ts`
- [ ] `src/platform/ads.ts`
- [ ] `src/platform/iap.ts`
- [ ] `src/platform/analytics.ts`

## 🎵 Audio

- [ ] `src/audio/engine.ts` (lazy Tone.js)
- [ ] `src/audio/ambient.ts`
- [ ] `src/audio/sfx.ts`
- [ ] `src/audio/instruments.ts`

## 🌐 i18n

- [ ] `src/i18n/en.ts`
- [ ] `src/i18n/fr.ts`
- [ ] `src/i18n/index.ts`
- [ ] Tous les composants utilisent `t()`

## 🛠️ Utils

- [ ] `src/utils/format.ts` (fmt numbers)
- [ ] `src/utils/roman.ts`
- [ ] `src/utils/dom.ts` (el, q)
- [ ] `src/utils/rng.ts`

## 🎨 Styles

- [ ] `src/styles/index.css`
- [ ] `src/styles/tokens.css` (design variables)
- [ ] `src/styles/base.css` (reset, body)
- [ ] `src/styles/components.css`
- [ ] `src/styles/animations.css`

## 📦 Assets

- [ ] `assets/portraits/newborn.png` (+ @2x)
- [ ] `assets/portraits/elder.png` (+ @2x)
- [ ] `assets/portraits/lord-of-night.png` (+ @2x)
- [ ] `assets/portraits/methuselah.png` (+ @2x)
- [ ] `assets/portraits/progenitor.png` (+ @2x)
- [ ] `assets/portraits/tera-overlord.png` (+ @2x)
- [ ] `assets/portraits/horror-incarnate.png` (+ @2x)
- [ ] `assets/portraits/thirst.png` (+ @2x)
- [ ] `assets/thralls/rat.png`
- [ ] `assets/thralls/ghoul.png`
- [ ] `assets/thralls/fledgling.png`
- [ ] `assets/thralls/thrall.png`
- [ ] `assets/thralls/blade.png`
- [ ] `assets/thralls/courtesan.png`
- [ ] `assets/thralls/elder.png`
- [ ] `assets/thralls/cardinal.png`
- [ ] `scripts/optimize-images.js`
- [ ] Run optimization

## 📱 Capacitor / Android

- [ ] `npm install @capacitor/core @capacitor/cli @capacitor/android`
- [ ] `npx cap init`
- [ ] `capacitor.config.ts`
- [ ] `npx cap add android`
- [ ] `@capacitor/preferences` wire
- [ ] `@capacitor/haptics` wire
- [ ] First build + first run on device
- [ ] Fix responsive + safe areas
- [ ] App icon 512×512 (à créer depuis un portrait)
- [ ] Splash screen config
- [ ] Status bar styling

## 💰 Monétisation

- [ ] AdMob account + app ID
- [ ] Ad unit rewarded
- [ ] `AndroidManifest.xml` meta-data
- [ ] `src/platform/ads.ts`
- [ ] UMP consent flow
- [ ] 4 triggers in-game (summon/embrace/invoke/offering)
- [ ] Play Console : 4 IAP products créés
- [ ] `src/platform/iap.ts`
- [ ] Store modal Apothecary
- [ ] Restore purchases button
- [ ] Test sandbox (tester account)

## 🚀 Release

- [ ] Generate signing keystore
- [ ] Backup keystore Bitwarden
- [ ] `keystore.properties` + build.gradle
- [ ] Privacy policy hébergée
- [ ] Content rating complété
- [ ] Store listing EN
- [ ] Store listing FR
- [ ] Feature graphic 1024×500
- [ ] 8 screenshots
- [ ] App icon
- [ ] Build AAB release
- [ ] Upload Internal Testing
- [ ] Invite testers (soi + 2-3 amis)
- [ ] Release notes v1.0.0

## 🧪 Testing pré-release

- [ ] 30 min de gameplay sans crash
- [ ] Test sur device mid-range
- [ ] Test offline → online transition
- [ ] Test background → foreground
- [ ] Test chaque forme (NEWBORN → TERA OVERLORD)
- [ ] Test chaque thrall
- [ ] Test ascension animation (au moins 2 transitions)
- [ ] Test rewarded ads (les 4 variants)
- [ ] Test IAP purchase + restore
- [ ] Test i18n FR/EN switch
- [ ] Test audio on/off
- [ ] Test haptique on/off
- [ ] Test 60 fps stable
- [ ] Lint + build sans warning
- [ ] Tests unitaires tous verts

---

Total environ **~160 tâches granulaires**. Rate attendu : **~13-14 tâches/jour**.
