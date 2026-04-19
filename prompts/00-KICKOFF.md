# Prompt Kickoff — À coller dans Claude Code au démarrage

> Prompt à coller **exactement** dans Claude Code au début du projet. Il donne le contexte complet nécessaire.

---

## Le prompt

```
Bonjour Claude. Tu vas m'aider à développer VAMPIRE MAXXING, un 
idle game mobile Android.

CONTEXTE IMPORTANT :

1. Ce projet a un package de documentation complet déjà préparé. 
   AVANT TOUT CODE, lis dans cet ordre :
   - CLAUDE.md (règles absolues de travail)
   - docs/01-VISION.md
   - docs/02-GAME-DESIGN.md
   - docs/03-ART-DIRECTION.md
   - docs/04-BALANCE.md
   - docs/05-MONETIZATION.md
   - docs/06-TECH-STACK.md
   - docs/07-ASSETS-GUIDE.md (CRITIQUE : règle assets)
   - design/mockup.png (référence visuelle gold standard)
   - tasks/ROADMAP.md (plan jour par jour)

2. RÈGLE ASSET SPÉCIFIQUE : zéro asset décoratif, mais les 
   portraits narratifs (PNG) sont autorisés. Voir 
   docs/07-ASSETS-GUIDE.md pour détail.

3. MOCKUP UI : design/mockup.png est la référence pixel-perfect. 
   Analyse-la avant chaque décision de layout.

4. STACK : Vite + TypeScript vanilla + Capacitor 6 + Android. 
   PAS de React/Vue/Svelte.

OBJECTIF AUJOURD'HUI :

On commence par J1 du roadmap (voir tasks/ROADMAP.md) :
- Bootstrap Vite TS strict
- Structure dossiers
- Formules de balance
- Types centraux (VampireForm, ThrallId, GameState)
- Tests unitaires des formules

NE COMMENCE PAS À CODER AVANT D'AVOIR LU le README, CLAUDE.md, 
les 7 docs, et les tasks. Confirme quand tu as tout lu, puis 
propose une structure de premier commit avant de l'implémenter.

Si une chose te semble ambiguë ou contradictoire dans la doc, 
pose la question avant d'avancer.
```

---

## Après kickoff

Une fois que Claude Code a confirmé avoir tout lu :

### Prompt 2 : valider sa compréhension

```
Parfait. Avant de coder, résume-moi :
1. Le concept central du jeu en 3 phrases
2. Les 8 formes de vampire par ordre
3. La différence entre Cosmic Forge asset rule et Vampire Maxxing 
   asset rule
4. Le mot-clé directeur de la direction artistique
5. Les 3 tech-stack choices les plus impactants

Si un de ces points n'est pas clair, on y revient avant de coder.
```

### Prompt 3 : démarrer J1

```
OK, on démarre J1 de la roadmap. 

Commence par :
1. Setup Vite TS strict
2. Config ESLint + Prettier + Vitest
3. Créer src/game/config/thralls.ts, forms.ts, balance.ts avec 
   les valeurs définies dans docs/04-BALANCE.md
4. Créer src/game/math.ts avec les formules pures
5. Créer src/utils/roman.ts et format.ts
6. Écrire les tests dans tests/

Ne commence PAS les composants UI pour l'instant. Juste les 
fondations.

À la fin, run npm test pour valider que tout passe.
```

---

## Suite : prompts quotidiens

Voir `01-DAILY-PROMPTS.md` pour les prompts J2 à J12.

---

## Tips pour bosser efficacement avec Claude Code

1. **Un commit par tâche**. Ne laisse pas Claude Code accumuler.
2. **Valide visuellement** chaque feature dans le navigateur avant de passer à la suivante.
3. **Si ça tourne mal** : `git reset --hard HEAD` + recommence. Les diagnostics de Claude Code peuvent être longs.
4. **Référence toujours le mockup** pour les décisions visuelles.
5. **Test physique device** à partir de J9 — pas que l'émulateur.

## Si tu veux diverger

Si tu veux ajouter une feature non prévue dans le brief :
1. Explique pourquoi au Claude Code avant
2. Update le brief concerné (CLAUDE.md, docs/, specs/)
3. Commit le brief avec ton code
4. Ça garde la doc synchronisée et référençable
