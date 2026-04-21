# Future Features — Design Notes

> **Status** : vision post-MVP. Ces features ne sont PAS à implémenter maintenant. Ce document existe pour donner une direction long-terme à ton architecture actuelle, afin d'éviter les culs-de-sac techniques. Traite ça comme des **pistes** à garder en tête, pas des specs à livrer.

> **Contexte** : après discussion stratégique sur l'expansion du jeu une fois le MVP shippé, ces 3 features ont été retenues comme prioritaires pour le live ops. L'idée est qu'une fois que les joueurs atteignent le form final (The Thirst), on ne peut plus les faire progresser verticalement (on a vissé le plafond visuel avec l'évolution des 8 formes). Du coup, il faut leur donner **d'autres axes d'expansion**.

> **Implémentation** : à traiter en update post-launch, une feature à la fois, basé sur les stats et feedback des joueurs. Ordre suggéré : Awakenings → Aspects → Generations.

---

## Feature 1 — Awakenings (priorité haute, dev léger)

### L'idée

Une fois The Thirst atteint, le joueur peut débloquer des **états transcendants** appelés *Awakenings*. Ce ne sont PAS de nouveaux portraits. Ce sont des **effets VFX appliqués au portrait Thirst existant** qui montrent que le joueur a dépassé la forme divine.

### Pourquoi cette direction

On ne peut pas rendre Thirst "plus badass" sans basculer dans le ridicule. Par contre, on peut suggérer que **dépasser Thirst = quitter la forme elle-même**. Thématiquement c'est juste (un vampire devient tellement ancien qu'il transcende le corps). Visuellement c'est un axe d'expansion infini sans générer de nouveaux assets lourds.

### Les Awakenings suggérés (modifiables)

| # | Nom | Effet visuel | Effet gameplay |
|---|-----|--------------|----------------|
| 1 | **The Eternal** | Halo doré pulsant autour du portrait, aura lumineuse animée | +X% global multiplier |
| 2 | **The Many** | 2-3 silhouettes Thirst fantomatiques en background, alignées | +X% thrall production |
| 3 | **The Primordial** | Background cosmique devient animé (étoiles qui bougent lentement) | +X% dread gain |
| 4 | **The Nameless** | Le portrait se fond progressivement dans l'abstraction (glitch artistique occasionnel) | +X% crit multiplier |
| 5 | **The Silent** | Le portrait disparaît, remplacé par un espace vide ornementé (cadre + silhouette vide) | +X% passive income |

Les numéros, noms et stats sont des suggestions — à caler selon la courbe de balancing.

### Coût de déblocage suggéré

Chaque Awakening coûte **une quantité énorme de Dread** (l'équivalent de plusieurs prestiges complets) + accomplir un **objectif narratif** (ex: avoir accumulé X total blood across all runs, avoir possédé tous les thralls niveau X, etc).

### Implications techniques (à anticiper dès maintenant)

Si tu veux préparer le terrain sans l'implémenter :

- Avoir un système de **modificateurs empilables** sur le portrait affiché (overlay CSS/animations activables)
- Prévoir dans la structure de save state un champ `awakenings_unlocked: []` ou similaire
- Garder l'architecture du rendu de portrait suffisamment découplée pour pouvoir y empiler des VFX sans tout réécrire

Pas besoin de coder la feature, juste de pas fermer la porte.

---

## Feature 2 — Aspects of The Thirst (priorité moyenne, dev moyen)

### L'idée

Une fois Thirst atteint, le joueur peut re-prestige dans des **Aspects** — des variations colorimétriques / thématiques du Thirst qui modifient le gameplay. Chaque Aspect = même portrait de base mais palette différente + bonus gameplay unique + build path distinct.

### Pourquoi cette direction

Transforme le endgame en **meta-game de spécialisation** (type Path of Exile). Les joueurs high-level ne cherchent plus à grimper, ils cherchent à **maxer plusieurs Aspects**. Chaque Aspect = un nouveau run avec des paramètres différents. Rejouabilité infinie.

### Les Aspects suggérés (5 à 6)

| Aspect | Palette dominante | Gameplay focus |
|--------|-------------------|----------------|
| **Thirst of Blood** | Rouge profond (#a51423) | Optimisé blood rate, crits fréquents |
| **Thirst of Gold** | Or (#c9a962) | Optimisé currency/shop, meilleurs prix |
| **Thirst of Void** | Noir absolu (#08050a) | Optimisé dread accumulation |
| **Thirst of Moon** | Argent bleuté | Optimisé thralls (production passive) |
| **Thirst of Dawn** | Or clair (contre-intuitif) | Paradoxal — crit multiplier extrême mais blood de base réduit |

### Génération d'assets

Pour chaque Aspect, l'image de base est **la même composition que le Thirst original**, avec **variations colorimétriques seulement**. Tu peux soit :
- Régénérer via ChatGPT avec le prompt Thirst en changeant juste la palette
- Appliquer des filtres CSS / canvas au portrait Thirst existant (plus technique mais zéro asset supplémentaire)

Option 2 recommandée si tu veux minimiser l'effort asset et pouvoir ajouter des Aspects en runtime via config.

### Progression entre Aspects

Le joueur qui a atteint un Aspect peut **recommencer un run** en choisissant un autre Aspect. Il garde une partie de son Dread (ex: 50%) et sa collection de thralls, mais ses stats et ses Awakenings se re-calibrent selon l'Aspect choisi.

C'est un système d'**Infusion** — chaque Aspect complété donne un bonus permanent qui s'accumule sur les runs futurs. Maxxer les 5 Aspects = "True Thirst" unlock.

### Implications techniques (à anticiper)

- La palette de couleur du portrait doit être **théoriquement modifiable** par config (CSS vars, canvas filter, ou shader)
- Le système de prestige doit pouvoir accepter un **paramètre de "mode"** (l'Aspect actif)
- Les formules de gameplay (blood rate, dread gain, etc) doivent être **multipliées par un modificateur** qui dépend de l'Aspect

Pas besoin de le coder mais garder ça en tête pour pas avoir des formules en dur qu'il faudra ré-écrire partout plus tard.

---

## Feature 3 — Generations / Bloodlines (priorité basse, dev lourd, impact énorme)

### L'idée

La grosse feature long-terme. Une fois qu'un joueur a maxxed son Aspect final et plusieurs Awakenings, il peut **"Sire" un nouveau vampire** et commencer une **nouvelle génération**. Il recommence à Newborn — mais :

- Il garde 10% de son Dread cumulé comme **"Sang Ancestral"**
- Il accède à un **arbre de talents dynastique** (permanent entre générations)
- Ses anciens Thirst apparaissent comme **silhouettes tutélaires** en background
- Chaque génération = **un siècle qui passe** dans la lore
- Le joueur peut accumuler **jusqu'à 8 générations**

### Pourquoi cette direction

1. **Thématiquement parfait** : un vampire qui sire une nouvelle lignée, c'est du pur lore gothique
2. **Screenshot viral** : un joueur Gen 5 avec 4 silhouettes monumentales de Thirst derrière son petit Newborn = c'est une photo TikTok qui se screenshot toute seule
3. **Flex social** : "t'es Gen combien ?" devient le nouveau marqueur de statut
4. **Content infini** : chaque gen = nouvelle collection de 8 portraits à chasser

### 8 Generations thématiques (direction visuelle)

Chaque génération garde **la même structure narrative** (Newborn → Elder → Lord of Night → Methuselah → Progenitor → Tera → Horror → Thirst) mais ré-interprétée visuellement :

| Gen | Nom | Palette | Essence narrative |
|-----|-----|---------|-------------------|
| 1 | La Première Soif | Noir + rouge + or | Vampire romantique gothique XIXe *(ta série actuelle)* |
| 2 | La Lignée Pourpre | Noir + violet profond + argent | Vampire médiéval guerrier |
| 3 | La Cour Écarlate | Noir + cramoisi + or blanc | Vampire baroque Versailles |
| 4 | Les Ombres Vertes | Noir + vert émeraude + or oxydé | Vampire sorcier/nécromancien |
| 5 | Le Givre Éternel | Noir + bleu glacial + argent | Vampire des terres gelées |
| 6 | La Flamme Noire | Noir + orange braise + or | Vampire démoniaque |
| 7 | La Marée Lunaire | Noir + argent bleuté + opale | Vampire lunaire mystique |
| 8 | L'Ultime Silence | Blanc cassé + or + noir absolu (palette inversée) | Vampire angélique/déchu |

### Principe visuel clé

**Les générations ne sont PAS une progression verticale**. Gen 8 n'est pas "plus puissante" que Gen 1, elle est **différente**. La progression est dans le **nombre de générations complétées**, pas dans le niveau intrinsèque de chacune.

### Génération d'assets

64 portraits total (8 gen × 8 forms) sur 18-24 mois de live ops. À raison d'une génération tous les 2-3 mois. Chaque gen shippée comme update majeur avec son propre teasing / event de launch.

**Ne pas les générer à l'avance**. On génère Gen 2 quand les stats montrent que assez de joueurs sont en train de maxxer Gen 1.

### Implications techniques (à anticiper dès maintenant)

- La structure de save state doit supporter **plusieurs runs de générations différentes** (`current_generation: 3`, `completed_generations: [1, 2]`)
- Le système de rendu de portrait doit accepter **un paramètre de génération** en plus de la forme (`renderPortrait(form, generation)`)
- Les assets doivent être organisés en `assets/portraits/gen-{N}/{form}.png` dès maintenant (renommer `assets/portraits/newborn.png` en `assets/portraits/gen-1/newborn.png` par exemple)
- Prévoir un système de **"silhouettes ancêtres"** affichables en background (utilisera les portraits Thirst des générations précédentes avec transparence)

### Système "Ancestors"

Feature additionnelle qui pourrait accompagner Generations plus tard : les joueurs peuvent **équiper jusqu'à 3 ancestors** (personnages de leurs générations précédentes) qui donnent des bonus passifs actifs dans la gen courante.

Système de collection qui rend la rejouabilité des anciennes gen plus intéressante.

---

## Priorités d'implémentation suggérées

Si tu veux un ordre de déploiement :

1. **Ship le MVP** avec Gen 1 uniquement (en cours)
2. **Update 1.1** : Map + Regions (voir `FEATURE-MAP-AND-REGIONS.md`)
3. **Update 1.2** : Awakenings (léger, impact immédiat sur l'endgame)
4. **Update 1.3** : Aspects of The Thirst (moyen, rejouabilité)
5. **Update 2.0 ("Crimson Chronicles")** : Generations (gros, marketing event)

Entre les updates majeures : events LiveOps, nouveaux thralls, cosmetics, seasonal stuff.

---

## Notes pour l'architecture

Sans te demander de coder ces features maintenant, si tu peux garder ces 3 flexibilités en tête dans ton code actuel :

1. **Portrait rendering découplé** — possibilité d'empiler des VFX, changer la palette, ajouter des silhouettes en background
2. **Save state extensible** — structure qui accepte l'ajout de nouvelles clés sans migration lourde (`awakenings: []`, `current_aspect: null`, `generation: 1`)
3. **Formulas de gameplay paramétrées** — les multiplicateurs de blood/dread/crit doivent pouvoir accepter des modificateurs additifs provenant de plusieurs sources

Ça évitera d'avoir à réécrire la moitié du code dans 6 mois. Mais si ta structure actuelle ne permet pas ça naturellement, **ne force pas** — on réécrira au moment voulu quand la feature sera clairement définie.

---

## En résumé

Ces 3 features existent pour résoudre un problème prévisible : **une fois Thirst atteint, quoi ?** Chacune répond différemment :

- **Awakenings** → transcendance VFX sur le portrait existant
- **Aspects** → specialisation et rejouabilité avec variations colorimétriques
- **Generations** → nouveau départ narratif avec collection infinie

Combinées, elles donnent **18-24 mois de roadmap** au jeu sans jamais avoir à dire à un joueur "désolé, t'as tout fait".

La feature principale à ship à court terme c'est **la map** (voir doc séparée). Les 3 features ci-dessus sont la vision long-terme qui informe les décisions techniques actuelles.
