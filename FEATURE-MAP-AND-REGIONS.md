# Feature — Map & Regions

> **Status** : feature post-MVP, priorité #1 pour la première update majeure (1.1). Design note ouverte, pas une spec rigide.

> **Contexte** : un mockup visuel de la map a été créé (référence : screenshot "WORLD MAP" avec texture de pierre volcanique noire, chemins en lave rougeoyante, château "Crimson Keep" au centre, panel de navigation "The Black Veil"). Le mockup a une qualité visuelle AAA et doit servir de référence pour l'implémentation.

> **Objectif** : donner aux joueurs un axe d'expansion horizontal après le prestige, avec un support pour du LiveOps infini et une narration émergente.

---

## L'idée centrale

La map est un **système de progression géographique parallèle au prestige**. Le joueur explore un monde de vampires en débloquant des régions successives, chacune offrant :

- Des **bonus passifs permanents** (modificateurs de gameplay)
- Des **nodes intermédiaires** (mini-events ou boss)
- Un **event narratif au déblocage** (texte procédural court)
- Un **asset visuel distinct** (chaque région a son ambiance)

### Ce que ça résout

1. **Un deuxième axe de progression** à côté du prestige → les joueurs ont toujours un objectif même quand ils sont coincés sur leur form actuelle
2. **Support pour LiveOps infini** → ajouter une nouvelle région tous les 2 mois = content permanent
3. **Narrative emergente** → chaque région raconte un bout de lore, les joueurs collectent des morceaux d'histoire
4. **Opportunité de monétisation éthique** → certaines régions avancées peuvent demander un temps de jeu important OU un pack de raccourci (pas pay-to-win, juste time-saving optionnel)

---

## Architecture générale

### Structure des régions

Chaque région est un objet contenant :

```
{
  id: "the-black-veil",
  name: "The Black Veil",
  order: 1,                        // ordre de déblocage
  dread_cost: 12,                  // coût pour entrer
  parent_region: null,             // région prérequis
  nodes: [...],                    // 3-5 nodes intermédiaires
  final_node: {...},               // le "boss" / feature principal
  passive_bonus: {...},            // modificateur une fois complétée
  narrative_event: {...},          // event au déblocage
  visual_theme: {...},             // palette, texture, ambiance
  unlock_requirements: {...}       // conditions supplémentaires
}
```

### Structure d'un node intermédiaire

Chaque node dans une région est un **point d'intérêt** sur le chemin :

- **Small node** : petit event textuel + récompense mineure (10-30 blood, bonus temporaire)
- **Medium node** : event avec choix + récompense moyenne (100-500 blood, thrall XP, etc)
- **Boss node** (final) : feature majeure (nouveau thrall exclusif, cosmétique, titre)

Les nodes se débloquent **dans l'ordre** — le joueur traverse la région de node en node jusqu'au boss.

### Progression dans une région

Le joueur dépense du **Dread** pour entrer dans une région. Une fois dedans, il doit accumuler **un autre type de ressource** propre à la région (par exemple "Black Veil Essence") pour débloquer les nodes successifs.

Cette ressource se génère **passivement pendant que le joueur est dans la région**. Elle ne s'accumule pas ailleurs. Ça crée une raison de **rester** dans une région un certain temps avant de passer à la suivante.

### Régulation de la progression

Pour éviter qu'un joueur speedrun les régions en 5 minutes :
- Chaque région nécessite **du temps réel minimum** (quelques heures à plusieurs jours pour les régions avancées)
- Les nodes se débloquent à **intervalles croissants** (premier node rapide, dernier long)
- Le **boss final** demande des ressources accumulées depuis plusieurs régions précédentes

---

## Liste des régions suggérées (roadmap 12 mois)

### Régions de launch (update 1.1)

| # | Nom | Thème | Bonus passif | Essence narrative |
|---|-----|-------|--------------|-------------------|
| 1 | **The Black Veil** | Pierre volcanique, lave | +10% blood rate | Vallée où les vampires exilés se cachent |
| 2 | **The Crimson Keep** | Château gothique sanglant | +15% thrall efficiency | Forteresse d'une ancienne lignée déchue |
| 3 | **Nameless Crypts** | Catacombes infinies | +20% dread gain | Labyrinthe sous une cité oubliée |

### Régions post-launch (updates suivants)

| # | Nom | Thème | Bonus passif |
|---|-----|-------|--------------|
| 4 | **Moonlit Ossuary** | Os, lune pleine | +25% crit chance |
| 5 | **The Drowned Cathedral** | Eau noire, vitraux brisés | +30% offline progress |
| 6 | **Gardens of Ash** | Jardins cendreux | +15% all multipliers |
| 7 | **The Starless Tower** | Tour impossible, void | Unlock : aspect system (lien avec feature Aspects) |
| 8 | **The Primordial Nest** | Origine de la lignée | Unlock : generation system (lien avec feature Generations) |

Les régions 7 et 8 sont des **gates narratifs** vers les grosses features long-terme. Passer la 7 = tu peux choisir ton premier Aspect. Passer la 8 = tu peux Sire ta deuxième génération.

Cette architecture **connecte les 3 features majeures du roadmap** entre elles en un seul système cohérent.

---

## Événements narratifs au déblocage

C'est **la feature signature** qui différencie Vampire Maxxing des autres idle.

### Principe

Quand le joueur **entre** dans une nouvelle région, un modal s'affiche avec :

1. **Un court texte narratif** (3-5 lignes maximum)
2. **Un choix** à faire (2-3 options)
3. **Des conséquences** variées selon le choix (bonus, malus, items, narratives)

### Exemples concrets

#### Region 1 — The Black Veil (au déblocage)

```
Tu franchis la brume noire. Le sang que tu as versé pour venir jusqu'ici 
coule encore sur tes mains. Un vieillard estropié t'attend au bord du 
chemin. Il lève les yeux vers toi et murmure quelque chose dans une 
langue morte. Ses prunelles sont laiteuses. Ses lèvres tremblent.

Que fais-tu ?

[ L'ÉPARGNER ]
→ +100 Blood
→ Débloque le titre "L'Indulgent" (rare)

[ LE DRAINER ]  
→ +500 Blood
→ +1 Dread
→ Les futurs mendiants te fuient (+5% blood drop sur certains nodes)

[ LUI DEMANDER CE QU'IL A VU ]
→ +50 Blood
→ Débloque un fragment de lore : "Les Premières Nuits"
→ Révèle l'emplacement d'un node caché dans la région
```

#### Region 3 — Nameless Crypts (node intermédiaire)

```
Dans les profondeurs humides, tu découvres un cercueil entrouvert. 
Un jeune vampire y dort encore, figé dans l'âge qu'il avait quand on 
l'a enterré. Peut-être dix-sept étés. Son visage est paisible. Autour 
de lui, des griffures sur le bois. Il a essayé de sortir, jadis.

[ L'ÉVEILLER ]
→ Gagne un nouveau thrall (rare, type Fledgling)
→ Il ne parlera jamais de sa vie passée

[ REFERMER LE CERCUEIL ]
→ +200 Dread
→ Débloque le titre "Celui qui n'éveille pas"
→ Certains joueurs disent avoir entendu pleurer la nuit suivante

[ VOLER SES OSSEMENTS POUR UN RITUEL ]
→ +5 Ritual Components
→ -50 Blood (le rituel drained you)
→ Perd définitivement la possibilité de recruter ce thrall
```

### Structure technique des événements

Chaque event est un objet simple :

```
{
  id: "black_veil_intro",
  trigger: "region_unlock",      // ou "node_enter", "region_complete", etc
  region_id: "the-black-veil",
  title: "La Brume Noire",
  narrative: "Tu franchis la brume...",
  choices: [
    {
      label: "L'ÉPARGNER",
      consequences: [
        { type: "currency", value: "blood", amount: 100 },
        { type: "title_unlock", value: "the-indulgent" }
      ],
      narrative_after: "Le vieillard te remercie..."
    },
    // ...
  ]
}
```

### Génération des events

**Ne pas écrire 50 events à la main**. Pour chaque région, prévoir :
- 1 event **d'entrée** (obligatoire, raconte la région)
- 2-3 events **de nodes** (sur les points d'intérêt intermédiaires)
- 1 event **boss** (au node final)

Soit 4-5 events par région × 8 régions = 32-40 events total. Faisable sur 12 mois si tu en écris 3-4 par mois.

### Principe d'écriture

Les events doivent être **courts (max 5-6 lignes)**, **atmosphériques** (décrire une image, pas expliquer une histoire), **avec des choix réellement différents** (pas juste +X vs +Y, mais des conséquences narratives qui divergent).

Inspirations de ton narratif :
- *Disco Elysium* (court, littéraire, choix moralement ambigus)
- *Sunless Sea* (atmosphère, pas d'exposition)
- *Darkest Dungeon* (ton et vocabulaire gothique)

À **éviter absolument** :
- Events trop longs (> 8 lignes = skip)
- Choix binaires évidents (bien/mal cheap)
- Vocabulaire moderne ("cool", "sympa")
- Humour (pas de ton léger, Vampire Maxxing est sérieux)

---

## Visuels et UI

### Le mockup de référence

Le mockup "WORLD MAP" contient tous les éléments clés :

- **Background** : texture de pierre volcanique noire avec veines rougeoyantes (lave). Même approche que la frame dorée du portrait.
- **Chemins** : lignes brillantes ambre/rouge qui connectent les nodes
- **Nodes** : cercles dorés avec petit emblème central (tu peux réutiliser les glyphes stylistiques des portraits)
- **Château central** : structure imposante avec lumière rouge intérieure (pour "The Crimson Keep")
- **Panel bas** : "The Crimson Keep — Dread × 15 — [ENTER]" avec bordure dorée
- **Header** : "WORLD MAP" centré, "Current Region: THE BLACK VEIL, Dread × 12"
- **Bordure générale** : cadre ornemental doré cohérent avec le reste du jeu

### Variations par région

Chaque région a sa **propre texture de background** :
- The Black Veil = pierre volcanique rougeoyante (fait)
- The Crimson Keep = pierre ensanglantée, vitraux brisés
- Nameless Crypts = pierre humide, moisissure dorée
- Moonlit Ossuary = os empilés, reflets lunaires
- The Drowned Cathedral = pierre sous l'eau, vitraux brisés
- etc.

Les backgrounds peuvent être **générés via image AI** avec des prompts cohérents (même style, seule la matière change). Budget asset : ~1 jour par région pour le background.

### Animation des chemins

Les chemins en lave/lumière doivent **pulser légèrement** (animation CSS simple, opacity qui varie entre 0.6 et 1.0 sur 2-3 secondes). Ça donne l'impression que la map est "vivante".

### Indicateur de progression

Chaque région a une **barre de progression discrète** affichée en haut :
- Nombre de nodes débloqués / total
- Jauge de "Région Essence" (la ressource de la région)
- Timer si la région a un unlock basé sur du temps réel

---

## Intégration avec le gameplay existant

### Point d'entrée dans l'UI

Ajouter un 6e bouton dans la nav bar du bas : **MAP** (en plus de BLOODLINE, SERVANTS, RITES, TOME, SHOP).

Ou : accéder à la map via un **bouton proéminent sur l'écran principal** (pas dans la nav bar), pour souligner son importance comme feature majeure.

À tester — option "bouton proéminent" plus friendly pour retention (visibilité), option "nav bar" plus épurée.

### Flow du joueur

1. Le joueur joue normalement (core loop)
2. À un moment, un badge apparaît sur le bouton MAP → "Nouvelle région disponible"
3. Il ouvre la map, voit la nouvelle région accessible
4. Il paye le coût en Dread pour entrer
5. Event narratif d'entrée
6. Il revient au core loop, maintenant avec un modificateur passif actif
7. Au fil des sessions, les nodes se débloquent progressivement
8. Chaque node → event narratif court + récompense
9. Boss final → récompense majeure + déblocage de la région suivante

### Impact sur la core économie

La map **ne remplace pas** le core loop de tap + generators + prestige. Elle vient **en surplus**.

Les bonus passifs des régions **se stackent** avec les autres bonus (Awakenings futurs, Aspects futurs). Une région qui donne +10% blood rate s'additionne avec un Awakening qui donne +15% global multiplier.

Il faut **calibrer les bonus** pour qu'ils soient ressentis mais pas game-breaking. Ordre de magnitude suggéré :
- Région 1-3 : bonus de +10% à +20%
- Région 4-6 : bonus de +15% à +25%
- Région 7-8 : bonus spéciaux (débloquent des features)

---

## Monétisation autour de la map

### Opportunités éthiques

**Region Skip Pass** (pas prioritaire, à envisager après launch) :
- Un pack qui permet de **sauter le timer** d'une région (utile pour les joueurs pressés)
- Prix suggéré : $2.99 par skip
- Ne donne **aucun bonus de gameplay**, juste du temps
- Reste ethical (time-saving, pas pay-to-win)

**Cosmetic Region Themes** :
- Re-skins des régions (version "Blood Moon" de The Black Veil par exemple)
- Prix : $4.99
- Purement visuel, collectionnable

**Event LiveOps** :
- Des régions **temporaires** (30 jours) avec des récompenses exclusives
- Exemple : "The Halloween Veil" en octobre, "Winter's Eternal Grasp" en décembre
- Le pack associé donne accès à la région + cosmétiques associés
- Prix : $9.99 event bundle

### À éviter

- **Pay-to-unlock régions principales** (les 8 régions core doivent être accessibles à tous)
- **Lock les bonus derrière monétisation** (tout bonus de gameplay doit s'obtenir en jouant)
- **Gacha sur les régions** (drop de cartes de régions etc → pas thématique, problématique légalement)

---

## Implications techniques à anticiper

Sans te demander de coder maintenant, quelques pistes pour que l'architecture actuelle ne bloque pas plus tard :

### Save state

Prévoir un champ `map_state` dans la structure de sauvegarde qui peut ressembler à :

```
map_state: {
  current_region: "the-black-veil",
  unlocked_regions: ["the-black-veil"],
  region_progress: {
    "the-black-veil": {
      nodes_completed: 2,
      region_essence: 450,
      events_triggered: ["black_veil_intro", "black_veil_mendicant"],
      choices_made: { "black_veil_mendicant": "drain" }
    }
  },
  active_passive_bonuses: [...]
}
```

Peu importe la forme exacte, juste avoir une **structure extensible** qui peut accepter l'ajout de régions et de propriétés sans migration.

### Modificateurs de gameplay

Les bonus passifs des régions doivent pouvoir s'**empiler** avec les autres bonus du jeu. Si actuellement ton code fait `blood_rate = base * thrall_multiplier`, prévoir à terme :

```
blood_rate = base 
  * thrall_multiplier 
  * region_multipliers_product  // somme des régions complétées
  * awakening_multipliers_product
  * aspect_multiplier
```

### Event system

Avoir un système d'events qui peut être **déclenché par différents triggers** (region_unlock, node_enter, region_complete, time_elapsed, etc) avec un **payload générique** (narrative + choices + consequences).

Si tu prévois ça dès maintenant, tu pourras réutiliser le même système pour les **events LiveOps** futurs (Halloween, Christmas, etc).

### Assets organization

Structurer les assets dès maintenant comme :

```
/assets/regions/
  /the-black-veil/
    background.png
    thumbnail.png
    paths.svg
    nodes/
      node-1.png
      node-2.png
      ...
  /the-crimson-keep/
    ...
```

Si tu commences avec une seule région pour l'instant, prévoir déjà la structure. Ça évitera de tout refactor quand tu ajouteras la 2e.

---

## Priorités de développement pour update 1.1

Si tu ships la map en update 1.1, ordre suggéré :

### Phase 1 (MVP de la feature)
- 1 seule région : The Black Veil
- 3 nodes + 1 boss node
- 3 events narratifs (entrée + 2 nodes + boss)
- Bonus passif unique (+10% blood rate)
- UI : écran de map avec le background + nodes + panel d'info

### Phase 2 (dépth)
- 2 régions de plus (The Crimson Keep, Nameless Crypts)
- 3-4 events par région
- Bonus variés

### Phase 3 (système étendu)
- Ressource par région
- Timer de déblocage
- Nodes cachés / events secrets
- Cosmétiques liés aux régions

À shipper progressivement sur 3-4 updates mineures après la feature initiale.

---

## En résumé

La **map + régions + events narratifs** est la première grosse feature post-MVP. Elle :

- Résout le problème de "quoi faire après avoir atteint Thirst"
- Ajoute un axe d'expansion LiveOps infini (ajouter des régions à volonté)
- Introduit de la narrative emergente via les events au déblocage
- Connecte vers les features long-terme (Awakenings, Aspects, Generations)

Le mockup visuel est déjà fait et fournit une référence de qualité AAA. Le gros du travail c'est :
1. **Coder le système** (map rendering, progression, state)
2. **Écrire les events** (3-5 par région, ton littéraire gothique)
3. **Générer les backgrounds** (1 par région, style cohérent)

Pas urgent, pas bloquant. À intégrer sereinement quand le MVP est stable.
