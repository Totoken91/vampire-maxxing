# VAMPIRE MAXXING

> *The Thirst never ends.*
>
> Idle / incremental mobile game, Android-first.
> Gothic semi-ironique. Nosferatu qui scrolle TikTok.

---

## 🧛 Pour Claude Code : ORDRE DE LECTURE OBLIGATOIRE

Avant toute ligne de code, lis dans cet ordre exact :

1. **`CLAUDE.md`** — contrat de travail, règles absolues (dont la règle assets adaptée)
2. **`docs/01-VISION.md`** — pitch, positionnement, scope MVP
3. **`docs/02-GAME-DESIGN.md`** — boucles, prestige, transition unlocks, Daily Vows, narrative
4. **`docs/03-ART-DIRECTION.md`** — DA complète, palette, typo, ornements, accessibility
5. **`docs/04-BALANCE.md`** — formules, courbes, équilibrage, click power scaling
6. **`docs/05-MONETIZATION.md`** — pub récompensée + IAP cosmétiques + starter pack + ASO
7. **`docs/06-TECH-STACK.md`** — stack, arborescence, commandes
8. **`docs/07-ASSETS-GUIDE.md`** — comment gérer les portraits et illustrations générés
9. **`docs/08-LIVEOPS-PLAN.md`** — calendrier events, battle pass v1.1, whale roadmap
10. **`specs/ONBOARDING.md`** — FTUE 0-60s, timing notifs, permissions
11. **`specs/OFFLINE-MODAL.md`** — modal cinématique retention D1
12. **`design/mockup.png`** — le mockup UI de référence (gold standard visuel)
13. **`tasks/ROADMAP.md`** — les 12 jours
14. **`tasks/BACKLOG.md`** — tâches granulaires cochables

Les **specs détaillées** dans `specs/` sont à consulter à la demande quand tu implémentes le système concerné.

---

## 📂 Structure

```
vampire-maxxing/
├── README.md                    ← ce fichier
├── CLAUDE.md                    ← règles pour Claude Code
├── docs/                        ← vision, DA, balance, assets guide
├── design/                      ← mockup UI + prototype HTML
├── specs/                       ← specs techniques par système
├── tasks/                       ← roadmap et backlog
├── prompts/                     ← prompts prêts à coller pour Claude Code
├── assets-prompts/              ← prompts ChatGPT pour générer les illustrations
└── inspiration/                 ← moodboard, références
```

---

## 🎯 La spécificité Vampire Maxxing vs idle classique

**Ce jeu est narratif.** Pas juste un compteur qui monte — **tu incarnes un vampire qui évolue visuellement** à travers 8 formes (Newborn → Tera Overlord Vampire). Le portrait change, les titres changent, tu te vois devenir quelqu'un.

Conséquences techniques :
- Le jeu utilise **des illustrations générées (portraits, sbires)**, pas seulement du code-art
- Nouvelle règle : **"zero asset DÉCORATIF"** mais **OK asset NARRATIF**
- Voir `docs/07-ASSETS-GUIDE.md` pour la liste et la gestion
- Voir `assets-prompts/` pour les prompts ChatGPT à utiliser

---

## 🚀 Kickstart

Quand le repo sera créé :

```bash
# Étape 0 : lire le package (ordre ci-dessus)
cat CLAUDE.md
cat docs/01-VISION.md
cat docs/02-GAME-DESIGN.md

# Étape 1 : générer les assets narratifs via ChatGPT
# (voir assets-prompts/README.md pour les prompts exacts)
# Placer les PNG dans assets/portraits/ et assets/thralls/

# Étape 2 : init Vite + TS
npm create vite@latest . -- --template vanilla-ts

# Étape 3 : suivre tasks/ROADMAP.md jour par jour
```

Voir `prompts/00-KICKOFF.md` pour le prompt exact à coller dans Claude Code au démarrage.

---

## 👤 Contexte auteur

Kenny — dev solo. Stack habituelle Next.js/Supabase/Stripe/Vercel mais ce projet est **mobile-first Android**, donc Capacitor obligatoire. Il utilise Claude Code par prompts structurés. Ce package est conçu pour être auto-suffisant.

Le mockup UI de référence (`design/mockup.png`) a été généré via ChatGPT et validé. Claude Code doit s'y référer en permanence pour le pixel-perfect.
