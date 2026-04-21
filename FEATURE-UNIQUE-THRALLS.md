# Feature — Unique Thralls / The Sanctum

> **Status** : feature post-MVP, design note ouverte. Priorité moyenne pour update 1.1 ou 1.2 (à caler selon les autres features). Traite ça comme **piste long-terme**, pas spec rigide.

> **Contexte** : les thralls classiques (Stray Rat, Fledgling, etc) forment la workforce générique du joueur. Ce document décrit un système parallèle de **personnages nommés uniques** qui viennent s'ajouter par-dessus, avec une identité propre, un visuel dédié, un trait spécifique, et une acquisition par events narratifs.

> **Objectif** : ajouter au jeu une couche de **collection de personnages** qui crée de l'attachment émotionnel, de la différenciation entre les rosters des joueurs, et une source inépuisable de content live ops.

---

## Le concept core

Les 8 thralls classiques sont ta **workforce** (génèrent du blood passivement, achetables en quantité illimitée dans le shop). Les thralls uniques sont ton **roster de personnages nommés** (1 exemplaire par joueur, acquis via events, apportent des bonus synergiques).

Différences fondamentales :

| Aspect | Thralls classiques | Thralls uniques |
|--------|---------------------|-----------------|
| Nombre | Illimité | **1 exemplaire par joueur** |
| Acquisition | Shop (blood) | Events narratifs spécifiques |
| Identité | Type générique | **Nom, visuel, backstory** |
| Fonction | Blood passif | **Bonus synergiques** |
| Affichage | Liste avec quantité | **Roster séparé, cartes** |
| Permanence | Reset au prestige | **Permanents** |
| Total possible (long-terme) | Infini | ~50 sur 2 ans |

### Permanence cross-prestige

Le hook principal : **les thralls uniques survivent aux prestiges**. Le joueur garde son roster d'une run à l'autre. C'est une forme de meta-progression par collection, parallèle au Dread.

Ça crée un loop motivant : *"cette run, je vais chopper Seraphiel, comme ça elle rejoindra Mordecai dans mon roster permanent."*

---

## Anatomie d'un thrall unique

Chaque thrall unique est défini par :

### 1. Identité narrative
- **Nom** : gothique, évocateur ("Seraphiel la Pleureuse", "Mordecai aux Mille Nuits")
- **Épithète** : surnom court qui le/la résume
- **Carte** : asset vertical dédié (voir ci-dessous)
- **Backstory** : 3-5 lignes de lore courte
- **Voix** (optionnel) : 5-10 lignes de dialogue débloquables progressivement

### 2. Fonction mécanique
- **Trait unique** : bonus gameplay spécifique
- **Synergie** (optionnel) : bonus additionnel conditionnel
- **Coût d'entretien** : certains demandent du blood/dread en continu

### 3. Acquisition
- **Source** : boss de région, event narratif, achievement, LiveOps
- **Condition** : choix spécifique dans un event, accomplissement, timing

### 4. Slot d'activation
Le joueur a un nombre limité de slots actifs (3 au début, extensible). Il peut posséder plus de thralls qu'il n'en active → choix tactique selon la build.

---

## Format visuel — cartes verticales 2:3

**Décision de design importante** : les thralls uniques sont rendus comme des **cartes verticales full-body** au format 2:3 (ex: 800×1200 px), distinctes des portraits carrés 1:1 du protagoniste.

### Pourquoi ce format

Le portrait carré head-and-shoulders est **réservé au protagoniste** (toi, le vampire qui évolue à travers les 8 formes). C'est un format intime, centré sur le visage, qui dit *"c'est toi dans le miroir"*.

Les thralls sont des **compagnons**, pas toi. Ils appartiennent à un **roster à collectionner**. Le format vertical carte est le langage visuel universel de la collection de personnages mobile (Hearthstone, Genshin Impact, Honkai Star Rail, Marvel Snap, Reigns, etc).

Bénéfices concrets :
1. **Plus de narrative par personnage** — on voit le corps, les accessoires, la posture, le contexte, pas juste un visage
2. **Différenciation visuelle protagoniste/thralls** — le format lui-même dit "ce n'est pas toi, c'est un allié"
3. **Ratio mobile-friendly** — occupe l'écran vertical parfaitement
4. **Scan rapide en grille** — on lit une carte verticale plus vite qu'un portrait carré
5. **Collection mindset** — le cerveau voit "carte" = "collectionnable" instantanément
6. **Background narratif** — chaque carte a son décor qui raconte l'origine du personnage
7. **Viralité TikTok/Reels** — format vertical matche les plateformes sociales

### Spécifications techniques

- **Ratio** : 2:3 (plus dramatique que 3:4, reste mobile-friendly)
- **Résolution** : 800×1200 px minimum, 1024×1536 px idéal
- **Composition** : personnage en plan américain (genoux-vers-le-haut) ou full-body
- **Background** : narratif, décor qui raconte l'origine / le lieu d'appartenance du personnage
- **Frame** : optionnel, fin, art nouveau, ne doit pas dominer la composition
- **Format de fichier** : PNG (pas JPEG, pour préserver les noirs profonds et l'éventuelle transparence du frame)

### Organisation des assets

```
/assets/unique-thralls/
  /seraphiel/
    card.png                  (800×1200 — la carte principale)
    card-hd.png               (1024×1536 — version haute résolution pour écran détail)
    card-thumb.png            (400×600 — version miniature pour grille)
    variants/
      mourning-silk.png       (variante cosmétique)
      at-dawn.png             (variante event)
  /mordecai/
    ...
```

### Génération et cohérence visuelle

Pour garder une **cohérence stylistique** à travers tous les thralls uniques :
- Même palette de base (noir + rouge + or + bone white)
- Même technique de rendu (oil painting, art nouveau inspired)
- Même traitement d'éclairage (clair-obscur dramatique)
- Variabilité dans : pose, background, costume, archétype, détails caractéristiques

Voir le document compagnon `THRALL-EXAMPLE-SERAPHIEL.md` pour un prompt complet exemplaire qui peut être cloné et adapté pour chaque nouveau thrall.

---

## Le Sanctum — UI dédiée

Les thralls uniques méritent un écran dédié, pas une ligne de plus dans la liste des thralls classiques.

### Layout suggéré

**Header** : "THE SANCTUM" avec compteur "X / Y Eternal Souls"

**Section 1 — Active Roster** (en haut) :
- 3 slots de **cartes verticales** visibles côte à côte (format 2:3)
- Chaque carte montre le personnage full-body avec son background narratif
- Nom + épithète en bas de la carte (ou par-dessus en overlay doré)
- Trait actif affiché en texte court sous la carte
- Tap sur carte = écran détail (page complète)

**Section 2 — Collection** (dessous, scrollable) :
- Grille de **cartes verticales miniatures** (2 cartes par ligne en portrait mobile, 3 en tablette)
- Thralls possédés affichés en couleur, avec leur carte complète en réduction
- Thralls non-acquis affichés en **silhouette grisée** sur un fond de carte noir avec indice cryptique
- Thralls jamais rencontrés : **??? carte vide à l'ombre** totale

**Section 3 — Statistiques** (en bas) :
- Total roster taille
- Affinité moyenne (si système d'affinité implémenté)
- Achievements de collection

### Écran de détails d'un thrall

Tap sur un thrall ouvre sa fiche complète :

- **Carte en grand** (plein écran ou ~80% de la hauteur écran)
- **Nom + épithète** en overlay ou dessous
- **Backstory** complète (texte stylisé, scrollable si long)
- **Trait actif** clairement affiché
- **Synergie** (si applicable, avec nom du thrall partenaire et effet)
- **Historique** : date d'acquisition, affinité (si système), runs passés ensemble
- **Citation** (une ligne de dialogue affichée sous la carte)

Cette page est **screenshot-worthy**. Format vertical parfait pour TikTok/Reels/Instagram Stories. C'est là que les joueurs partagent.

### Point d'accès dans l'UI

Option 1 : ajouter un bouton dédié "SANCTUM" dans la nav bar du bas (à côté de SERVANTS).

Option 2 : accès via un bouton proéminent sur l'écran principal, type **mini-carte du compagnon actif** qui occupe un coin discret de l'écran de jeu. Tap dessus → ouvre le Sanctum. Ça a l'avantage d'afficher en permanence un de tes thralls = attachment visuel continu.

Option 2 plus engageante, j'ai tendance à la recommander. À tester sur le MVP.

---

## Sources d'acquisition

Pour varier les plaisirs, les thralls uniques peuvent venir de sources multiples.

### 1. Boss de région (les plus prestigieux)

Un thrall unique majeur par région principale. C'est le reward du boss node final de chaque région. Ce sont les **thralls signature** du monde.

Exemple : battre le boss de "Nameless Crypts" débloque l'event final qui permet de recruter *Seraphiel la Pleureuse*.

### 2. Events narratifs (choix rares)

Certains events à choix peuvent débloquer un thrall selon la décision prise. Les choix "moralement difficiles" ou "non-évidents" donnent souvent les thralls les plus intéressants.

Exemple : dans un event, le joueur trouve un vampire enterré vivant. Le choix *"Refermer le cercueil"* donne accès à un thrall unique (Seraphiel veillera toujours sur lui). Le choix *"L'éveiller"* donne un autre thrall unique (le vampire éveillé devient ton allié).

### 3. Achievements d'exploit

Accomplir des actions rares ou difficiles débloque des thralls. Exemples :
- *"Atteindre Thirst sans jamais drainer un innocent"* → débloque un thrall pacifiste
- *"Recruter 10 000 Stray Rats cumulés"* → débloque "Le Roi des Rats"
- *"Maintenir un thrall classique à niveau max pendant 100 jours réels"* → débloque son "aspect ultime"

### 4. LiveOps events temporaires

Events saisonniers avec thralls uniques exclusifs à la période.

Exemples :
- **Halloween** : thrall "Jack O'Blood" disponible 2 semaines
- **Christmas** : thrall "Krampus Noir" disponible 2 semaines
- **Valentine's** : thrall "La Duchesse Écarlate" disponible 2 semaines
- **Anniversaire du jeu** : thrall anniversaire unique

Les thralls LiveOps sont **perdus définitivement** si non acquis pendant la fenêtre (ou reviennent 1 an plus tard lors du même event). Crée de la vraie FOMO sans passer par de la monétisation cash.

### 5. Cross-generation (long-terme avec feature Generations)

Terminer une génération peut débloquer des thralls "vétérans" de cette génération, utilisables dans les générations suivantes.

Exemple : *"Le Vétéran de la Première Soif"* est disponible uniquement si tu as maxxed Gen 1 avant de commencer Gen 2.

Crée de la rejouabilité pour les anciennes générations.

### ❌ Ce qu'il faut éviter

- **Pay-to-unlock les thralls uniques principaux** — les thralls de gameplay doivent s'obtenir en jouant
- **Gacha randomisé** — ça devient un problème légal (surtout EU) et éthique
- **Thralls uniques "meilleurs" uniquement pour les whales** — chaque thrall doit être intéressant

### ✅ Ce qu'on peut vendre éthiquement

- **Skins cosmétiques** pour les thralls uniques déjà possédés (ex: *"Seraphiel in Mourning Silk"* à $4.99)
- **Packs d'event** qui contiennent un thrall + cosmétiques + boost (mais le thrall doit aussi être obtenable en jouant)
- **Time-skip pass** pour accélérer un event d'acquisition longue

---

## Exemples de roster pour le launch

Pour le MVP ou update 1.1, je viserais **3-5 thralls uniques** disponibles dès le launch. Un par région initiale.

Suggestions de direction pour 5 thralls signature :

### Seraphiel la Pleureuse
- Source : boss de "Nameless Crypts"
- Trait : buff sur les Fledglings
- Archétype : **la gardienne**

### Mordecai aux Mille Nuits
- Source : event rare dans "The Black Veil"
- Trait : bonus crits nocturnes
- Archétype : **l'ancien sage**

### Lysandre la Brisée
- Source : boss de "The Crimson Keep"
- Trait : bonus quand le joueur perd du blood
- Archétype : **la martyre**

### Gaspard de Vermeil
- Source : event d'achievement
- Trait : bonus sur le shop / économie
- Archétype : **le marchand**

### Cendre
- Source : déblocage rare par choix narratif
- Trait : bonus passif pendant absence (offline)
- Archétype : **la silencieuse** (enfant vampire ?)

Chaque thrall a un archétype clair qui le rend mémorable et distinct des autres.

---

## Mécaniques de base (MVP)

Pour la première version du système, rester simple :

### Acquisition
1. Trigger event (boss battu, choix fait)
2. Event avec narrative + visuel du thrall
3. Prompt "Le/La recruter ?" → action [EMBRACE] ou [REFUSE]
4. Si EMBRACE → thrall ajouté à la collection
5. Si REFUSE → thrall perdu pour ce run (peut revenir plus tard selon design)

### Activation
1. Joueur ouvre le Sanctum
2. Voit ses slots actifs (3 par défaut)
3. Tap sur un slot → liste de thralls possédés
4. Sélection d'un thrall → il devient actif
5. Son trait s'applique immédiatement au gameplay

### Désactivation / Swap
Libre et sans coût. Le joueur peut réorganiser son roster à tout moment.

### Affichage en jeu
Les thralls actifs n'apparaissent PAS en gros dans l'écran principal (pour ne pas encombrer). Juste une petite icône discrète en bas du portrait qui signale "3 souls bound to you". Tap sur l'icône → ouvre le Sanctum.

---

## Mécaniques avancées (post-MVP)

Une fois le système de base stable, possibilité d'enrichir :

### Affinité (loyauté)

Chaque thrall a un **niveau d'affinité** qui monte avec le temps d'usage. Haute affinité = trait amélioré progressivement.

Exemple : trait de base *"+15% Fledgling production"* devient *"+20%"* à affinité 50, *"+25%"* à affinité 100.

L'affinité stagne si le thrall n'est pas dans le roster actif. Elle monte quand il est actif et que le joueur joue. Pas de perte d'affinité (ne pas punir les joueurs qui explorent des builds différentes).

### Synergies (équipes optimales)

Certains thralls ont des **synergies mutuelles** qui se déclenchent si les deux sont actifs ensemble.

Exemple : Seraphiel + Mordecai → *"Les morts ne sont jamais seuls"* — les deux gagnent +10% supplémentaire.

Crée de la méta, des discussions communautaires sur les "optimal team comps", du guide-hunting.

### Conflicts (rivalités)

Certains thralls **ne peuvent pas coexister** dans le même roster actif. Rivaux narratifs qui se détestent, opposition philosophique, etc.

Exemple : *"Lysandre la Brisée"* et *"Gaspard de Vermeil"* ne peuvent pas être actifs en même temps. Elle l'a ruiné autrefois.

Crée des **choix difficiles**, empêche les builds optimales trop évidentes, enrichit la narrative.

### Dialogues évolutifs

Chaque thrall a 5-10 lignes de dialogue qui se débloquent progressivement selon l'affinité. À haute affinité, il révèle :
- Des secrets sur sa backstory
- Des indices sur la lore du monde
- Des commentaires sur les autres thralls du roster
- Des opinions sur les choix narratifs du joueur

Lore gating élégant. Les joueurs qui s'attachent à un personnage sont récompensés par plus de content.

### Memorial / Rappel

Si un joueur supprime un thrall (pour libérer un slot de collection saturée), il apparaît dans un **mémorial** consultable. Certains thralls peuvent être **rappelés** via des rituels coûteux (beaucoup de blood ou dread).

Possibilité émotionnelle : les joueurs qui perdent un thrall rare peuvent le regretter mais avoir une chance de le récupérer à grand effort.

---

## Intégration avec les autres features

### Avec la Map
Chaque région principale a son thrall signature. La map devient un pèlerinage pour collectionneurs. *"Je DOIS battre Nameless Crypts pour avoir Seraphiel."*

### Avec les events narratifs
Les events gagnent en poids parce que certains choix débloquent des thralls uniques → les joueurs lisent vraiment avant de cliquer. Justifie l'investissement écriture.

### Avec les Awakenings (feature future)
Certains Awakenings pourraient **débloquer des slots additionnels** dans le Sanctum. *"The Many"* pourrait permettre 5 slots actifs au lieu de 3.

### Avec les Aspects (feature future)
Chaque Aspect pourrait **modifier l'efficacité** de certains thralls. *"Thirst of Blood"* booste tous les thralls qui buffent le blood rate, mais réduit l'effet des thralls qui buffent la défense (exemple).

### Avec les Generations (feature future)
Chaque génération a son propre roster de thralls uniques. Ils **ne se mélangent pas** entre gen (sauf cross-gen specials débloqués par achievement).

Total potentiel : 8 gen × 6-8 thralls uniques par gen = 50-60+ thralls uniques à long terme.

---

## Impact attendu sur les metrics

### Retention
Un joueur qui a investi 40+ heures pour collectionner 15 thralls uniques abandonne rarement son save. **L'attachment émotionnel = meilleure retention possible**.

Estimation : D30 retention +3-7 points vs sans le système, basé sur comparables (hero collectors).

### Session length
Les thralls uniques donnent un **objectif concret** à poursuivre. *"Je veux chopper Mordecai ce weekend"* = sessions plus longues, plus fréquentes.

### ARPDAU
Les skins cosmétiques pour thralls uniques sont **parmi les meilleurs convertisseurs** en F2P mobile. Un joueur attaché à Seraphiel paiera $4.99 pour sa variante.

### Partage social
Les rosters créent du content viral naturel. "Mon roster endgame Vampire Maxxing" devient un format TikTok/Discord. Marketing organique.

---

## Priorités d'implémentation

### Phase 1 (MVP du système)
- Structure de données (save state, thrall registry)
- UI basique du Sanctum (roster actif + collection)
- 1 seul thrall unique pour tester (Seraphiel recommandée, voir doc dédié)
- Event d'acquisition fonctionnel
- Trait appliqué au gameplay

### Phase 2 (premier contenu)
- 4 thralls uniques supplémentaires (5 au total pour le launch de la feature)
- Système de slots actifs (3 par défaut)
- UI des détails thrall (page complète)

### Phase 3 (mécaniques de richesse)
- Synergies entre thralls
- Conflicts
- Citations / dialogues de base

### Phase 4 (LiveOps integration)
- Thralls saisonniers (Halloween, Christmas)
- Système d'affinité
- Memorial / Rappel

### Phase 5 (expansion long-terme)
- Thralls cross-gen
- Achievement thralls
- Dialogues évolutifs

À étaler sur 12-18 mois de live ops selon stats et feedback.

---

## Implications techniques à anticiper

Sans coder la feature maintenant, quelques pistes pour que l'architecture actuelle reste ouverte :

### Save state

Prévoir un champ dans la structure de sauvegarde qui peut accepter des thralls uniques :

```
unique_thralls: {
  owned: [
    {
      id: "seraphiel",
      acquired_at: 1234567890,
      affinity: 0,
      active_slot: 1,  // null si pas actif
      notes: {}        // extensible pour futures mécaniques
    }
  ],
  max_active_slots: 3,
  encountered: ["seraphiel", "mordecai"],  // thralls vus dans le jeu mais pas acquis
}
```

### Trait system

Les traits doivent pouvoir appliquer des **modificateurs au gameplay global** via une architecture de listeners ou modifiers empilables.

Exemple : si Seraphiel est active → un modifier `+15% fledgling_blood_rate` est appliqué au calcul global du blood.

Architecture suggérée : les thralls uniques actifs publient leurs modifiers dans une liste globale, le gameplay lit cette liste au calcul des rates.

### Assets

Organisation suggérée (cohérent avec le format carte vertical 2:3 défini plus haut) :

```
/assets/unique-thralls/
  /seraphiel/
    card.png              (800×1200 — carte principale, ratio 2:3)
    card-hd.png           (1024×1536 — haute res pour écran détail)
    card-thumb.png        (400×600 — miniature pour grille)
    variants/
      mourning-silk.png   (skin cosmétique)
    dialogue-audio/       (optionnel si tu ajoutes du son plus tard)
```

### Event system

Le système d'events narratifs (voir doc Map) peut avoir un **type d'action** dédié aux thralls uniques :

```
{
  type: "offer_unique_thrall",
  thrall_id: "seraphiel",
  accept_label: "EMBRACE HER",
  refuse_label: "LET HER REST",
  on_accept: { ... },
  on_refuse: { ... }
}
```

Simple à réutiliser pour tous les futurs events d'acquisition.

---

## Écriture des thralls

### Format standardisé

Chaque thrall unique a sa **fiche** dans le même format :

- Identité (nom, épithète, pronoms, archétype)
- Portrait (prompt + fichier image)
- Backstory (3-5 lignes)
- Trait principal (mécanique précise + chiffre)
- Synergie (optionnelle)
- Conflict (optionnel)
- Coût d'entretien (s'il y a)
- Acquisition (source + condition)
- Voix (5-10 lignes de dialogue)
- Balancing notes

Cohérence totale d'un thrall à l'autre = faci pour le dev, cohérent pour le joueur.

### Ton d'écriture

Vocabulaire :
- Archaïque, gothique, littéraire
- Évocateur sans être pompeux
- Mélancolique, pas horror cheap

Inspirations :
- *Disco Elysium* (court, littéraire, ambigu moralement)
- *Bloodborne* (lore fragmentaire, atmosphérique)
- *Darkest Dungeon* (ton et vocabulaire)
- Anne Rice / Interview with the Vampire (romantisme gothique)

Éviter :
- Exposition lourde
- Humour léger
- Vocabulaire moderne
- Explications trop claires (garder du mystère)

### Cadence de production

Ne pas écrire 50 thralls d'un coup. Rythme soutenable :
- 5 pour le launch de la feature
- 1-2 par mois ensuite
- 1 event LiveOps = 1-2 thralls additionnels

Sur 2 ans tu construis un roster de 40-60 thralls avec un investissement écriture digeste (~3-4 heures par thrall tout compris : nom, backstory, trait, dialogue, portrait prompt).

---

## Inspiration de structure

Pour visualiser à quoi ressemble un système qui marche, regarder :

- **Hades (Supergiant)** : relations avec les NPCs, cadeaux d'affinité, dialogues évolutifs
- **Disco Elysium** : choix narratifs qui débloquent des "skills" personnalité
- **Reigns** : events courts à choix conséquents
- **Slay the Spire** : deck building avec cartes uniques qui débloquent par choix
- **Darkest Dungeon** : roster de héros avec personnalités et traits uniques

Aucun n'est un 1:1 mais tous ont résolu avec élégance la tension entre "système mécanique" et "attachement narratif".

---

## En résumé

Le système de thralls uniques transforme Vampire Maxxing d'un idle game de chiffres en un idle game de **personnages et d'histoires**. C'est un multiplicateur de retention, d'engagement, de partage social et de richesse narrative.

Il coexiste avec le système de thralls classiques (ne le remplace pas). Il s'acquiert progressivement via la map, les events, les achievements et les LiveOps. Il donne au joueur un **roster personnel** qu'il construit à travers les runs et les prestiges, créant de l'attachement durable.

Architecture initiale : simple (collection + roster actif + traits). Expansions possibles : riches (affinité, synergies, conflicts, dialogues évolutifs, cross-gen).

Priorité : moyenne. À implémenter après la map, idéalement pour une update 1.2 ou 1.3.

Pour voir un exemple complet de thrall unique prêt à être implémenté, voir le document compagnon `THRALL-EXAMPLE-SERAPHIEL.md`.
