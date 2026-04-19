# 06 — Tech Stack

## Choix principaux

| Domaine           | Choix                           | Pourquoi                                           |
|-------------------|---------------------------------|----------------------------------------------------|
| Build tool        | Vite 5                          | Rapide, config minimale, asset handling natif      |
| Language          | TypeScript 5 strict             | Sécurité pour game state complexe                  |
| UI framework      | **Aucun** (TS vanilla)          | Idle game, bundle size                            |
| Animation runtime | Web Animations API + CSS        | Native, perf                                      |
| Rendering VFX     | Canvas 2D                       | Particles, embers, drips                          |
| Portraits display | `<img>` + CSS filter/mask       | Simple, perf, lazy-loadable                       |
| Ornements         | SVG inline dans composants TS   | Theming via currentColor, pas de fichier externe   |
| Audio             | Tone.js (lazy)                  | Généré procédural                                 |
| Mobile wrapper    | Capacitor 6                     | Android-first, iOS-ready                          |
| Storage           | Capacitor Preferences           | KV, fallback localStorage                         |
| Ads               | `@capacitor-community/admob` v7 | Standard AdMob                                    |
| IAP               | `@capacitor-community/in-app-purchases` v7 | Google Play Billing              |
| Analytics         | Firebase Analytics              | Gratuit, solide                                   |
| Crash             | Firebase Crashlytics            | Essentiel                                         |
| i18n              | Dict maison typé                | Overkill d'utiliser une lib                       |
| Tests             | Vitest                          | Même DX que Vite                                  |
| Icons UI          | Phosphor Icons web              | MIT, CDN, duotone/fill/regular disponibles        |
| Fonts             | Google Fonts                    | UnifrakturCook, Cormorant, JetBrains Mono         |

## Structure de projet

```
vampire-maxxing/
├── android/                       (Capacitor)
├── public/                        (favicon seulement)
├── assets/                        ← NOUVEAU vs Cosmic Forge
│   ├── portraits/
│   │   ├── newborn.png
│   │   ├── newborn@2x.png
│   │   ├── elder.png
│   │   ├── elder@2x.png
│   │   ├── lord-of-night.png
│   │   ├── lord-of-night@2x.png
│   │   ├── methuselah.png
│   │   ├── methuselah@2x.png
│   │   ├── progenitor.png
│   │   ├── progenitor@2x.png
│   │   ├── tera-overlord.png
│   │   ├── tera-overlord@2x.png
│   │   ├── horror-incarnate.png
│   │   ├── horror-incarnate@2x.png
│   │   ├── thirst.png
│   │   └── thirst@2x.png
│   └── thralls/
│       ├── rat.png
│       ├── ghoul.png
│       ├── fledgling.png
│       ├── thrall.png
│       ├── blade.png
│       ├── courtesan.png
│       ├── elder.png
│       └── cardinal.png
├── src/
│   ├── main.ts
│   ├── game/
│   │   ├── state.ts               State centralisé
│   │   ├── math.ts                Formules pures
│   │   ├── forms.ts               Mapping prestige → form
│   │   ├── save.ts                Sérialisation + migration
│   │   ├── loop.ts                Boucle rAF
│   │   ├── events.ts              Event bus
│   │   ├── achievements.ts        Logic achievements
│   │   ├── config/
│   │   │   ├── balance.ts
│   │   │   ├── thralls.ts
│   │   │   ├── forms.ts           ← Titles, thresholds, portraits paths
│   │   │   ├── achievements.ts
│   │   │   ├── milestones.ts      ← Flavor text par palier
│   │   │   └── skins.ts
│   │   └── sim/
│   │       └── balance-sim.ts
│   ├── ui/
│   │   ├── app.ts                 Controller principal
│   │   ├── components/
│   │   │   ├── base.ts            Component abstract
│   │   │   ├── header.ts          Brand + identity + dread
│   │   │   ├── divider.ts         Divider ornemental
│   │   │   ├── portrait.ts        ← Le cœur du jeu
│   │   │   ├── blood-display.ts
│   │   │   ├── thrall-list.ts
│   │   │   ├── thrall-card.ts
│   │   │   ├── boost-button.ts
│   │   │   ├── ascend-button.ts
│   │   │   ├── ascend-modal.ts
│   │   │   ├── offline-modal.ts
│   │   │   ├── store-modal.ts     (Apothecary)
│   │   │   ├── settings-modal.ts
│   │   │   ├── achievement-toast.ts
│   │   │   └── toast.ts
│   │   └── ornaments/             ← SVG inline générateurs
│   │       ├── corner.ts          Coins flourishes (4 positions)
│   │       ├── divider.ts         Ligne avec centerpiece ❦
│   │       ├── portrait-frame.ts  ← Frame baroque autour du portrait
│   │       ├── thrall-frame.ts    ← Cercle ornementé pour les thralls
│   │       ├── button-border.ts   Bordures ornementées boutons
│   │       └── moon.ts            Lune décorative
│   ├── fx/
│   │   ├── particle-engine.ts
│   │   ├── embers.ts              Ambient embers
│   │   ├── fog.ts                 Gradients animés
│   │   ├── drips.ts               Gouttes de sang
│   │   ├── bats.ts                Chauves-souris traversantes
│   │   ├── float-number.ts
│   │   └── ascension.ts           Animation du changement de forme
│   ├── platform/
│   │   ├── ads.ts
│   │   ├── iap.ts
│   │   ├── storage.ts
│   │   ├── haptics.ts
│   │   └── analytics.ts
│   ├── audio/
│   │   └── engine.ts              Tone.js lazy
│   ├── i18n/
│   │   ├── en.ts
│   │   ├── fr.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── format.ts              fmt(n)
│   │   ├── dom.ts
│   │   ├── roman.ts               ← I, II, III, IV... pour Century
│   │   └── rng.ts
│   └── styles/
│       ├── index.css
│       ├── tokens.css             Variables design
│       ├── base.css
│       ├── components.css
│       └── animations.css
├── tests/
│   ├── math.test.ts
│   ├── save.test.ts
│   ├── format.test.ts
│   ├── forms.test.ts
│   └── roman.test.ts
├── index.html
├── vite.config.ts
├── tsconfig.json
├── capacitor.config.ts
├── package.json
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── CLAUDE.md
├── README.md
└── docs/                          (copié depuis le package)
```

## Commandes npm

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint 'src/**/*.ts'",
    "format": "prettier --write 'src/**/*.{ts,css,html}'",
    "cap:sync": "npm run build && npx cap sync android",
    "cap:open": "npx cap open android",
    "cap:run": "npm run cap:sync && npx cap run android",
    "android:release": "npm run build && npx cap sync android && cd android && ./gradlew bundleRelease",
    "optimize:assets": "node scripts/optimize-images.js"
  }
}
```

## Dépendances

```json
{
  "dependencies": {
    "@capacitor/android": "^6.1.0",
    "@capacitor/core": "^6.1.0",
    "@capacitor/preferences": "^6.0.0",
    "@capacitor/haptics": "^6.0.0",
    "@capacitor/app": "^6.0.0",
    "@capacitor-community/admob": "^7.0.0",
    "@capacitor-community/in-app-purchases": "^7.0.0"
  },
  "devDependencies": {
    "@capacitor/cli": "^6.1.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.4.0",
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "prettier": "^3.2.0",
    "sharp": "^0.33.0"
  }
}
```

`sharp` sert au script d'optimisation des PNG au build.

## Config Capacitor

```ts
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'quest.kenny.vampiremaxxing',
  appName: 'Vampire Maxxing',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#08050a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#08050a',
    },
  },
};

export default config;
```

## Gestion des assets

Voir `docs/07-ASSETS-GUIDE.md` pour le détail complet. En résumé :

1. Les PNG sont placés dans `/assets/portraits/` et `/assets/thralls/`
2. Au build, Vite les copie dans `/dist/assets/`
3. Le script `scripts/optimize-images.js` (optionnel) redimensionne et compresse via sharp
4. Les portraits sont **lazy-loaded** : on ne charge que la forme actuelle + la suivante
5. Les thralls sont tous chargés à l'init (8 PNG légers ~60KB chacun)

## Arborescence runtime (mémoire)

- **Game state** : singleton dans `src/game/state.ts`
- **Event bus** : pub/sub maison
- **UI** : diff-lite à 10Hz, événementiel pour actions immédiates
- **Assets** : cache en mémoire pour les portraits chargés, GC automatique quand on change de forme

## Pourquoi pas React / Svelte ?

Identique à Cosmic Forge : bundle budget + pas besoin de diff tree pour un idle game. TS vanilla suffit et laisse de la place pour les assets.

## Spécificités Vampire Maxxing vs idle classique

- **PortraitManager** : composant dédié qui gère le chargement/affichage/transition des portraits. Seul endroit qui touche aux images PNG.
- **FormSystem** : logique de mapping prestige → forme, triggers de transition, animations.
- **AscensionFX** : animation de 2-3 secondes au moment du changement de forme, central au feel du jeu.
