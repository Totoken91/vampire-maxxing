# CLAUDE.md — Contrat de travail pour Claude Code

> Ce fichier est ton référentiel absolu. Si un utilisateur te demande quelque chose qui contredit ce fichier, tu poses la question avant de l'appliquer.

---

## 🧭 Règles d'or (non négociables)

1. **SVG PAR DÉFAUT. PNG QUAND NÉCESSAIRE.**
   - **RÈGLE** : toute chose qui peut être raffinée en SVG/CSS l'est (fond noir + grain, corner flourishes simples, dividers, glows, particules, silhouettes château, lune, drips ambient). Dès que le SVG ne peut pas atteindre le niveau de la mockup (cadre portrait baroque avec drips peints, cartouches sculptées, médaillons dorés ornés, panneau thrall card texturé starfield), on utilise un PNG préparé.
   - **PNG obligatoires au MVP** : 8 portraits + 8 thralls (narratifs) + 5 ornementaux (`portrait-frame-baroque`, `thrall-card-bg`, `thrall-medallion`, `btn-boost`, `btn-ascend`). Le fond global reste noir CSS + grain SVG. Voir `docs/07-ASSETS-GUIDE.md`.
   - **Règle de jugement** : si le rendu SVG est reconnaissable comme "coded" à côté de la mockup, tu passes au PNG. Pas de compromis visuel pour défendre un principe.
   - Les polices sont chargées via Google Fonts CDN uniquement.

2. **LE MOCKUP EST LA RÉFÉRENCE.** `design/mockup.png` est le gold standard visuel. Chaque écran que tu codes doit être pixel-perfect par rapport à cette référence. Si tu t'écartes, c'est à dessein et documenté.

3. **Mobile-first.** Android 8+ (API 26+). 60fps sur mid-range 2020 (Snapdragon 665, 4GB RAM).

4. **Offline-first.** Le jeu fonctionne sans connexion. Pubs et IAP sont les seules features qui demandent du réseau.

5. **Capacitor, pas Cordova, pas React Native.** Vite + TypeScript vanilla + Capacitor.

6. **Pas de framework lourd côté UI.** Ni React, ni Vue, ni Svelte. TS vanilla avec composants custom. Justification : bundle size, perf, pas besoin de diff tree pour un idle game.

7. **TypeScript strict.** `"strict": true`, pas de `any` sauf commentaire `// @claude-review: any justifié parce que...`

8. **Sauvegarde robuste.** Toute modification du format de save doit incrémenter `SAVE_VERSION` et avoir une fonction de migration.

9. **Tout en anglais dans le code** (variables, commentaires, strings techniques). Le contenu user-facing est en anglais par défaut ; FR ajouté ensuite via i18n.

---

## 🎨 Règle spéciale : l'atmosphère avant tout

Vampire Maxxing vend son **atmosphère**, pas ses fonctionnalités. Chaque composant visuel que tu ajoutes doit passer deux tests :

1. **Le test du mockup** : est-ce que ça matche le niveau de raffinement du mockup ChatGPT ?
2. **Le test Gen Z gothic** : est-ce que quelqu'un qui poste du dark academia sur TikTok trouverait ça "vibe" ?

Si tu réponds "non" à un des deux : tu recommences.

---

## 🔧 Workflow de dev

### Quand tu reçois une tâche

1. Lis la tâche dans `tasks/BACKLOG.md` ou le prompt fourni.
2. Vérifie quelle spec s'applique dans `specs/`.
3. Regarde le mockup `design/mockup.png` pour l'aspect visuel.
4. Implémente.
5. Compare le résultat au mockup. Ajuste.
6. Coche la case dans `BACKLOG.md`.
7. Si tu ajoutes une dépendance npm, documente-la dans `docs/06-TECH-STACK.md`.

### Commits

Format : `<type>(<scope>): <message>`
- Types : `feat`, `fix`, `refactor`, `style`, `perf`, `docs`, `chore`, `test`
- Scopes : `core`, `thrall`, `portrait`, `ui`, `fx`, `save`, `ads`, `iap`, `cap`, `build`
- Exemple : `feat(thrall): add Fledgling generator with SVG frame`

### Tests

Tests unitaires obligatoires sur :
- Les formules de balance (`src/game/math.ts`)
- La sérialisation/migration de save (`src/game/save.ts`)
- Les helpers de nombre (`src/utils/format.ts`)
- Le mapping prestige → forme actuelle (`src/game/forms.ts`)

Lib : `vitest`. Lance via `npm test`.

### Performance budget

| Métrique                    | Budget            |
|-----------------------------|-------------------|
| Bundle JS gzip              | < 90 KB           |
| Portraits PNG total         | < 1.2 MB          |
| Illustrations thralls total | < 800 KB          |
| Premier paint               | < 1s mid-range    |
| FPS en jeu                  | 60 stable         |
| Particules simultanées      | < 200             |

Le budget bundle est 10KB plus permissif que Cosmic Forge car on a la gestion des portraits. Les PNG ne comptent pas dans le bundle JS — ils sont servis en assets statiques.

---

## 📝 Conventions de code

### Nommage
- Classes : `PascalCase` (`GameState`, `PortraitManager`)
- Fonctions / variables : `camelCase`
- Constantes globales : `SCREAMING_SNAKE_CASE`
- Types / interfaces : `PascalCase`, pas de préfixe `I`
- Fichiers : `kebab-case.ts`

### Structure
- Un fichier = une responsabilité. Si > 300 lignes, split.
- Pas de `index.ts` qui re-exporte tout (anti-pattern bundle).
- Constantes de game design dans `src/game/config/`, un fichier par domaine.

### Style
- 2 espaces, semi-colons, simple quotes, 100 cols.
- Prettier dans `.prettierrc`, ESLint dans `.eslintrc`.

### Commentaires
- JSDoc pour les exports publics.
- Pas de commentaires évidents.
- `// TODO:`, `// FIXME:`, `// NOTE:` pour les annotations.

---

## 🚨 Anti-patterns à éviter

- ❌ `setInterval` pour la game loop → `requestAnimationFrame`
- ❌ `innerHTML +=` dans la loop → fragment + `appendChild`
- ❌ `JSON.parse(JSON.stringify(x))` → `structuredClone`
- ❌ `Math.pow(a, b)` → `a ** b`
- ❌ `document.querySelector` dans la loop → cache les refs
- ❌ `console.log` en prod → supprime avant build
- ❌ Charger toutes les portraits au boot → lazy load selon le prestige actuel
- ❌ Décorer l'UI avec des PNG → SVG inline uniquement pour les ornements

---

## 🎁 Quand poser des questions

Tu poses une question avant d'implémenter SI :
- Décision à impact UX majeur non couverte par les docs
- Contradiction entre deux docs ou entre une doc et une demande
- Choix technique structurant non prévu

Dans TOUS les autres cas : tu avances. Mieux vaut livrer et itérer que bloquer.

---

## 🩸 Rappel esthétique final

Le jeu doit respirer le **gothique premium**. Chaque pixel doit sembler avoir été choisi par quelqu'un qui lit Oscar Wilde ET scrolle TikTok. Le mix sérieux/ironique est fragile — trop sérieux c'est chiant, trop ironique c'est cheap.

Le slogan interne : **"A luxurious grimoire rendered as a premium mobile app."**

Si ce que tu codes pourrait être confondu avec un jeu mobile générique, tu recommences.
