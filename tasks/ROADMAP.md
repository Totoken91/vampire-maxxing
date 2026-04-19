# ROADMAP — 12 jours

> Plus court que le Cosmic Forge original (14j) car une partie de l'architecture est transférable. Compense avec le temps à intégrer les assets et à peaufiner l'expérience narrative.

## Vue d'ensemble

| Jour | Focus | Livrable fin de jour |
|------|-------|----------------------|
| J1 | Bootstrap + state + formules | Repo compile, state testé, formules OK |
| J2 | Core loop + boucle UI minimale | Tap donne du blood, tick passe, affichage basique |
| J3 | Portrait + thralls system | Portrait avec placeholder, achat thralls fonctionnel |
| J4 | FX engine | Particules tap, embers, fog, drips, bats |
| J5 | Save + offline progress | State persisté, retour offline OK |
| J6 | Prestige + animation d'ascension | Ascend fonctionne, transition de forme animée |
| J7 | Ornements SVG + frames | Tous les ornements codés, rendu premium |
| J8 | Intégration assets réels | Portraits et thralls intégrés, rendu finalisé |
| J9 | Capacitor Android + device test | Build Android signé, lance sur téléphone |
| J10 | AdMob | Rewarded ads fonctionnels en prod |
| J11 | IAP + skins | Store Apothecary, skins applicables |
| J12 | i18n + achievements + polish + release | Build prod uploadé en Play Console internal |

---

## J1 — Bootstrap & Formules

**Matin**
- [ ] `npm create vite@latest . -- --template vanilla-ts`
- [ ] `tsconfig.json` strict mode
- [ ] ESLint + Prettier configs
- [ ] Structure dossiers (voir TECH-STACK.md)
- [ ] `vitest` configuré
- [ ] Copier `CLAUDE.md`, `docs/`, `specs/` dans le repo
- [ ] Copier `design/mockup.png` (référence visuelle)

**Après-midi**
- [ ] `src/game/config/thralls.ts` — 8 thralls
- [ ] `src/game/config/balance.ts` — constantes
- [ ] `src/game/config/forms.ts` — 8 formes
- [ ] `src/game/math.ts` — formules pures (cost, rate, dreadGain, etc.)
- [ ] `src/game/forms.ts` — mapping prestige → form
- [ ] `src/utils/format.ts` — fmt(n)
- [ ] `src/utils/roman.ts` — chiffres romains
- [ ] **Tests** : `math.test.ts`, `forms.test.ts`, `roman.test.ts`

**Soir**
- [ ] README projet synchronisé
- [ ] Premier commit : `feat(core): bootstrap project with types and formulas`

---

## J2 — Core Loop

**Matin**
- [ ] `src/game/state.ts` — GameState singleton
- [ ] Actions : `tapCore`, `tickPassive`, `buyThrall`
- [ ] Event bus : `src/game/events.ts`
- [ ] `src/game/loop.ts` — rAF loop

**Après-midi**
- [ ] `src/ui/app.ts` — controller
- [ ] Layout grid app (voir UI-ARCHITECTURE.md)
- [ ] `src/ui/components/base.ts` — Component abstract
- [ ] `src/ui/components/header.ts` — header 3 colonnes
- [ ] `src/ui/components/blood-display.ts` — compteur blood
- [ ] `src/ui/components/thrall-list.ts` + `thrall-card.ts` — liste minimaliste
- [ ] `src/styles/tokens.css` — variables design
- [ ] `src/styles/base.css` — reset, body

**Soir**
- [ ] Test manuel : tap augmente blood, achat thrall réduit blood
- [ ] Commit : `feat(core): playable loop with basic UI`

---

## J3 — Portrait System

**Matin**
- [ ] `src/ui/components/portrait.ts` — composant Portrait
- [ ] Placeholder SVG quand image manquante
- [ ] Affichage nom + titre selon forme
- [ ] `src/ui/components/divider.ts`

**Après-midi**
- [ ] Améliorer thrall-card avec layout du mockup
- [ ] `src/ui/components/boost-button.ts`
- [ ] `src/ui/components/ascend-button.ts`
- [ ] Validation : layout matche le mockup à 70%

**Soir**
- [ ] Commit : `feat(portrait): portrait component with placeholder system`

---

## J4 — FX Engine

**Matin**
- [ ] `src/fx/particle-engine.ts` — canvas engine
- [ ] `src/fx/embers.ts` — braises ambient
- [ ] `src/fx/bloodparticle.ts` — burst sur tap

**Après-midi**
- [ ] `src/fx/fog.ts` (CSS pur)
- [ ] `src/fx/drips.ts`
- [ ] `src/fx/bats.ts`
- [ ] `src/fx/float-number.ts`
- [ ] Toast component basique

**Soir**
- [ ] Validation visuelle : le jeu "respire" gothique
- [ ] Commit : `feat(fx): atmospheric particle engine and ambient effects`

---

## J5 — Save + Offline

**Matin**
- [ ] `src/game/save.ts` — serialize / deserialize
- [ ] `src/platform/storage.ts` — abstract (Preferences + fallback)
- [ ] Auto-save (intervalle + visibility change)
- [ ] Migration system

**Après-midi**
- [ ] Offline progress computation
- [ ] `src/ui/components/offline-modal.ts`
- [ ] **Tests** : `save.test.ts` (round-trip, migration)

**Soir**
- [ ] Validation : quitter 2 min → récupère des gains
- [ ] Commit : `feat(save): persistence layer with offline progress`

---

## J6 — Prestige & Ascension FX

**Matin**
- [ ] `triggerAscend` dans state.ts
- [ ] `src/ui/components/ascend-modal.ts`
- [ ] Logic : affiche le gain, confirme, reset du run

**Après-midi**
- [ ] `src/fx/ascension.ts` — animation cinématique
- [ ] Test : ELDER form atteinte → transition animée
- [ ] Validation UX : le moment se sent fort

**Soir**
- [ ] Commit : `feat(prestige): ascend with cinematic form transition`

---

## J7 — Ornaments SVG

**Matin**
- [ ] `src/ui/ornaments/corner.ts` — coin flourishes
- [ ] `src/ui/ornaments/divider.ts` — ligne avec centerpiece
- [ ] `src/ui/ornaments/thrall-frame.ts` — cercles ornementés
- [ ] `src/ui/ornaments/button-border.ts`

**Après-midi**
- [ ] `src/ui/ornaments/portrait-frame.ts` — LE BIG ONE
- [ ] Intégration dans tous les composants
- [ ] Validation visuelle : matche le mockup à 90%

**Soir**
- [ ] Commit : `feat(ornaments): complete SVG ornamental system`

---

## J8 — Intégration assets

**Matin**
- [ ] Placement PNG portraits dans `/assets/portraits/`
- [ ] Placement PNG thralls dans `/assets/thralls/`
- [ ] Script `scripts/optimize-images.js` créé
- [ ] Run optimization

**Après-midi**
- [ ] Portrait component charge les vraies images
- [ ] Thrall cards affichent les vraies illustrations
- [ ] Lazy loading du prochain portrait (seuil 70%)
- [ ] Fallback si asset manquant

**Soir**
- [ ] Validation finale : le jeu ressemble au mockup à 95%+
- [ ] Commit : `feat(assets): integrate generated portraits and thrall illustrations`

---

## J9 — Capacitor Android

**Matin**
- [ ] `npm install @capacitor/core @capacitor/cli @capacitor/android`
- [ ] `npx cap init` → appId `quest.kenny.vampiremaxxing`
- [ ] `npx cap add android`
- [ ] Config `capacitor.config.ts`
- [ ] First build : `npm run cap:run`

**Après-midi**
- [ ] Test sur device physique
- [ ] Installer `@capacitor/preferences` + `@capacitor/haptics`
- [ ] Wire haptique (tap, crit, purchase, ascend)
- [ ] Fix responsive sur petits écrans
- [ ] Fix safe areas (notch)

**Soir**
- [ ] Validation : 60fps sur device de référence
- [ ] Commit : `feat(cap): Android platform with haptics`

---

## J10 — AdMob

**Matin**
- [ ] Création compte AdMob
- [ ] `npm install @capacitor-community/admob`
- [ ] `src/platform/ads.ts` wrapper
- [ ] Config `AndroidManifest.xml`

**Après-midi**
- [ ] Intégration "SUMMON THE NIGHT" (boost variant)
- [ ] Intégration "EMBRACE THE DAWN" (offline variant)
- [ ] Intégration "INVOKE THE CURSE" (ascend variant)
- [ ] UMP consent flow

**Soir**
- [ ] Test sur device (IDs test)
- [ ] Commit : `feat(ads): rewarded video integration`

---

## J11 — IAP + Skins

**Matin**
- [ ] Play Console : créer les 4 produits IAP
- [ ] `npm install @capacitor-community/in-app-purchases`
- [ ] `src/platform/iap.ts` wrapper

**Après-midi**
- [ ] `src/ui/components/store-modal.ts` — Apothecary
- [ ] Skin switcher dans Portrait
- [ ] Restore purchases flow
- [ ] Founder Pack avec limitation 90 jours

**Soir**
- [ ] Test en sandbox (compte tester)
- [ ] Commit : `feat(iap): apothecary store with skins system`

---

## J12 — i18n, achievements, polish & release

**Matin**
- [ ] `src/i18n/en.ts` complet
- [ ] `src/i18n/fr.ts` complet
- [ ] Tous les composants utilisent `t()`
- [ ] Switch lang dans settings

**Midi**
- [ ] Achievements system complet (20)
- [ ] Toast d'unlock
- [ ] Gravity Wells counter

**Après-midi**
- [ ] Audio engine (Tone.js lazy)
- [ ] Settings modal
- [ ] Privacy policy page hébergée
- [ ] Icons Play Store générés
- [ ] Screenshots (8) préparés
- [ ] Store description EN/FR

**Soir**
- [ ] Build release AAB
- [ ] Upload Play Console → Internal Testing
- [ ] Release notes
- [ ] Commit : `chore(release): v1.0.0 internal testing build`
- [ ] 🧛 **CHAMPAGNE**

---

## Après J12 (post-launch)

- Attendre review (1-3 jours)
- Feedback testeurs
- Bug fixes rapides
- Itération sur le game balance
- Préparer le content TikTok (posts de progression)
- Passer en Closed Testing (100 testers)
- Puis Production avec staged rollout 20% → 100%

## Checkpoint si en retard

Si un jour dérape de > 4h, re-prioritiser :
- **Skippable** : audio, i18n FR (release EN only), achievements avancés
- **Non-négociable** : core loop, save, prestige, portraits, Capacitor Android
- **Critical path** : J1-J3 (base), J6 (prestige), J8 (assets), J9 (Android), J12 (release)

L'objectif J12 est **un build uploadé en internal testing**, pas production. La production peut attendre 1-2 jours de plus pour polish.
