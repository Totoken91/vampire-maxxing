# 02 — Game Design

## Boucles de gameplay

### Boucle coeur (loop de 5-60 sec)
> Tap le portrait → gagne du Blood → regarde la valeur monter → clique quelque part ou attend

### Boucle secondaire (loop de 5-30 min)
> Débloquer les thralls 1 par 1 → viser le prochain palier → atteindre 10/25/50/100 d'un thrall pour les milestones → anticiper le prochain

### Boucle méta (loop de 1-24h)
> Accumuler assez de Blood pour ASCEND → voir ton titre évoluer, ton portrait changer → multiplicateur permanent → nouveau run plus fort

### Boucle narrative (bonus de rétention)
> Chaque stade de prestige débloque un nouveau titre + nouveau portrait → satisfaction d'incarnation

## Ressources

| Ressource         | Gagnée par                              | Sert à                                | Reset par     |
|-------------------|-----------------------------------------|---------------------------------------|---------------|
| **Blood**         | Tap, thralls                            | Acheter/upgrade thralls                | Ascend        |
| **Dread**         | Ascend the Bloodline                    | Multiplie tous les gains (+10% chacun) | Jamais        |
| **Gravity Wells** | Achievements, événements                | Upgrades permanents (post-MVP)         | Jamais        |

Noms : Blood ❦ Dread ◈ Gravity Wells ⚜

## Thralls (les 8 générateurs)

Progression narrative : montée en hiérarchie vampirique.

| # | Nom | Coût base | Rate base /s | Déblocage | Illustration |
|---|-----|-----------|--------------|-----------|--------------|
| 1 | **Stray Rat** | 10 | 0.5 | Début | Rat écumeur dans médaillon doré |
| 2 | **Feral Ghoul** | 100 | 4 | 30% du coût en total earned | Crâne humain avec chair |
| 3 | **Fledgling** | 1.2K | 32 | Owner du précédent | Jeune vampire avec cape |
| 4 | **Thrall** | 14K | 240 | Owner du précédent | Humain encapuchonné |
| 5 | **Nightblade** | 180K | 1.8K | Owner du précédent | Dague/assassin silhouette |
| 6 | **Blood Courtesan** | 2.5M | 14K | Owner du précédent | Figure aristocratique avec collerette |
| 7 | **Elder** | 40M | 110K | Owner du précédent | Vampire couronné ancien |
| 8 | **Cardinal of the Night** | 700M | 900K | Owner du précédent | Figure cornue majestueuse |

Formule de coût : `cost(n) = baseCost × 1.15^owned`
Formule de rate : `rate = owned × baseRate × globalMultiplier × boost`

Voir `docs/04-BALANCE.md` pour les justifications et simulations.

## Milestones par thrall

Paliers débloqués par nombre possédé :
- 10 owned → rate × 2
- 25 owned → rate × 2
- 50 owned → rate × 2
- 100 owned → rate × 3
- 200 owned → rate × 3
- 300 owned → rate × 3
- 400 owned → rate × 5

Multiplicateur cumulatif à 400 : **×1080**.

Chaque milestone affiche une ligne de lore gothique :
- 10 Stray Rats : *"The vermin know your name."*
- 25 Fledglings : *"A coven forms in silence."*
- 100 Elders : *"The bloodline bends to your will."*
- Etc. — écrire dans `src/game/config/milestones.ts` pour les 56 lignes (8 thralls × 7 paliers).

## Prestige : ASCEND THE BLOODLINE

**Déblocage** : 1e6 Blood total earned sur le run courant.

**Formule de gain** :
```
dreadGain = floor( sqrt(totalRunBlood / 1e6) × 2 )
```

**Effet de base** :
- Reset complet du run (blood, thralls, upgrades dérivés)
- +N Dread permanent
- Multiplicateur global = `1 + (dread × 0.10)`
- **PASSAGE À LA FORME SUIVANTE** si seuil atteint (voir table ci-dessous)
- Animation : flash rouge profond, portrait se dissout, nouveau portrait apparaît, titre change
- Sauvegarde automatique

### Prestige Transition Unlocks (gameplay content débloqué par forme)

**Principe** : chaque nouvelle forme débloque un ajout mécanique, pas juste un portrait. Sans ça, l'Ascend est un simple number bump (anti-pattern idle-expert "5% multiplier per token = bad prestige").

| Forme atteinte | Prestige # | Unlock mécanique | Justification design |
|----------------|-----------|------------------|----------------------|
| **ELDER** | 1 | **Auto-claim** : les thralls affordables s'achètent automatiquement toutes les 5s | La première transition doit donner un "wow" → réduit drastiquement le grind initial |
| **ELDER** | 2 | **Boost charges : 3/day** | Le joueur a 3 boost disponibles par jour (reset 24h), cumulatifs |
| **LORD OF NIGHT** | 3 | **Boost cooldown réduit** : 60s → 30s | Plus réactif, récompense l'investissement |
| **LORD OF NIGHT** | 4-6 | **Daily Vows** débloqués (voir Achievements) | Retention levier D3+ |
| **METHUSELAH** | 7 | **Frenzy boost** débloqué : nouveau type de boost × crit rate ×3 pendant 30s | Variété tactique |
| **METHUSELAH** | 10 | **Offline cap 6h** (au lieu de 4h) en base, **8h** avec rewarded | Récompense pour loyauté |
| **PROGENITOR** | 15 | **Auto-prestige** (optionnel toggle dans settings) | Automation endgame, respect du temps |
| **PROGENITOR** | 20 | **Blood mult × 1.5 permanent** bonus | Mini-milestone |
| **TERA OVERLORD** | 30 | **Second prestige layer** : "Break Reality" (v1.2 feature, scaffolded) | Late-game retention |
| **HORROR INCARNATE** | 50 | **Exclusive endgame challenge modes** (v1.2+) | Whale / hardcore content |

### Implémentation MVP
- Les unlocks 1-7 et 10 sont **obligatoires au MVP**
- L'unlock 15 (Auto-prestige) est **strongly encouraged** au MVP
- Les unlocks 20, 30, 50 = stubbés au MVP (affichent "coming soon"), livrés v1.2

### Config location
```ts
// src/game/config/prestige-unlocks.ts
export const PRESTIGE_UNLOCKS = {
  1: { autoClaim: true },
  2: { dailyBoostCharges: 3 },
  3: { boostCooldownSec: 30 },
  7: { frenzyBoost: true },
  10: { offlineCapHours: 6, offlineCapHoursRewarded: 8 },
  15: { autoPrestige: true },
  20: { globalMultBonus: 1.5 },
};
```

## Les 8 formes (la colonne vertébrale narrative)

Chaque forme = un portrait + un titre + un stade dans la narration.

| Prestige # | Forme affichée | Vibe |
|-----------|----------------|------|
| 0 | **NEWBORN** | Vampire fraîchement tourné, pâle et désorienté |
| 1-2 | **ELDER** | Premier siècle, composé et confiant |
| 3-6 | **LORD OF NIGHT** | Aristocrate raffiné, autorité, rubis |
| 7-14 | **METHUSELAH** | Millénaire, beauté dérangeante, cornes spectrales |
| 15-29 | **PROGENITOR** | Fondateur de lignée, marbre et sang, couronne d'os |
| 30-49 | **TERA OVERLORD VAMPIRE** | L'apex, mi-homme mi-cauchemar, halo cosmique |
| 50+ | **HORROR INCARNATE** | Transcendé, silhouette de ténèbres et sang |
| 100+ | **THE THIRST** | Concept abstrait, vampire-dieu de pure volonté |

**Le stade 6 "TERA OVERLORD VAMPIRE" est l'apex du MVP**. Les stades 7-8 sont dispo mais sous-utilisés jusqu'à ce que la 2e couche de prestige soit introduite en v1.2.

La progression du titre affiché dans le header : *"You are a [forme actuelle]"* — c'est le cœur émotionnel du jeu.

## Rythme visé pour le premier prestige

- 0-2 min : Premier Stray Rat, premier "aha"
- 2-10 min : Thralls 2-3, découverte du boost
- 10-30 min : Thralls 4-5, anticipation du premier Ascend
- 30-60 min : Premier Ascend → **transition NEWBORN → ELDER** (moment fort)
- 1-3h : 2-3 Ascends, flow installé, premier Lord of Night
- 3-10h : Méta-progression vers Methuselah
- 10h+ : Grind vers Progenitor, optimisation

## Boost

Bouton **"× BOOST 2×"** à côté du ASCEND. Double tous les revenus pendant 15 s. Cooldown 60 s.

**Variante pub récompensée** : "SUMMON THE NIGHT" → boost 2× pendant 2 minutes, pas de cooldown.

## Progression offline

Quand l'app est fermée, les thralls produisent à **50%** de leur taux. Cap à **4 heures**.

**Variante pub récompensée** : "EMBRACE THE DAWN" → récupère 100% de l'offline + 2h supplémentaires (cap 6h).

Le modal au retour utilise le langage du jeu : *"You slept through the dawn. Your thralls fed without you."*

## Tap mechanics

- Chaque tap : `+clickPower × globalMultiplier` Blood
- **`clickPower`** (scaling pour garder le tap pertinent) :
  ```
  clickPower = max(1, currentTotalRate × 0.0015)
  ```
  → au début `rate = 0` donc tap = 1 (tap critical). Après 10 min `rate ~ 500/s` donc tap = ~0.75/s → équivalent à 1 seconde de production passive. **Le tap reste toujours ~1-2 sec de prod**, ce qui garde la boucle core engageante.
- **Crits** : 8% de chance de tap × 5 (indicateur : particules dorées au lieu de rouge, +N en or)
- **Streak** (non affiché) : 10 taps en moins de 3s → +10% tap power pendant 5s
- **Haptique** : vibration 4ms tap, 20ms crit

## Daily Vows (3 au MVP, v1.0) — retention lever D3+

**Nouveau concept** (skill idle-expert : "Games qui ne planifient pas D1/D2/D3 explicitement échouent"). Ce sont des mini-quêtes quotidiennes qui **reset toutes les 24h** et donnent une raison concrète de revenir.

Débloqué à partir de **Prestige 4** (forme LORD OF NIGHT), pour éviter le clutter en early-game.

### Les 3 vœux quotidiens (rotation)

Chaque jour, 3 vœux aléatoires parmi :
1. **Summon 50 thralls in one run** → reward : +1000 blood instant
2. **Reach 1 billion blood in one run** → reward : +1 boost charge
3. **Ascend 3 times today** → reward : +1 Dread bonus
4. **Feed 500 times (500 taps)** → reward : +500 blood
5. **Trigger 10 crits in one run** → reward : double boost duration pendant 1h
6. **Spend 1 minute without tapping** (passive test) → reward : +20% rate pendant 5 min
7. **Claim 100 milestones** (cumulative) → reward : +2 Dread

### UI
- Icône "❦ Vows" dans le header (à côté de Dread, après unlock)
- Tap → modal avec 3 vœux + progress bar + reward preview
- Completion : toast + animation sur l'icône

### Reset
Midnight local (00:00 user timezone). Reward **claimable** dans les 4h qui suivent la completion, sinon perdu.

## Achievements (20 au MVP)

Mix de sérieux gothique et mémé Gen Z.

### Progression (8)
- `first_bite` — *First Spark* → 1 thrall acheté
- `stray_pack` — *The vermin know your name* → 10 Stray Rats
- `feral_tide` — *A rising tide of hunger* → 25 Feral Ghouls
- `first_coven` — *A coven forms* → 10 Fledglings
- `court_assembly` — *Your court assembles* → 10 Thralls
- `shadow_guild` — *Silent blades in your name* → 10 Nightblades
- `grand_salon` — *The aristocracy kneels* → 10 Blood Courtesans
- `eternal_council` — *The ancients heed your call* → 5 Elders

### Prestige / narrative (6)
- `first_ascension` — *First Ascension* → 1 Ascend
- `elder_born` — *You opened your eyes* → Become Elder (prestige 1)
- `lord_risen` — *Kingdoms whisper your name* → Become Lord of Night
- `millennium` — *One thousand years in an evening* → Become Methuselah
- `primordial` — *Source* → Become Progenitor
- `tera_overlord` — *YOU HAVE LOOKSMAXXED (literally)* → Become Tera Overlord

### Mémés / exotiques (4)
- `sigma_arc` — *sigma vampire arc* → 10 prestiges
- `based_bloodpilled` — *based and bloodpilled* → 100 Dread accumulated
- `built_different` — *built different fr* → 30 prestiges
- `mewing_success` — *the mewing worked* → Reach Tera Overlord form

### Temps / bonus (2)
- `night_shift` — *Night shift* → 1h cumulative play
- `immortal_grind` — *Immortal hustle* → 100h cumulative play

Chaque achievement affiche un toast stylé et est **screenshot-able** (le nom mémé est intentionnel).

**Note MVP** : pas de reward mécanique au MVP (pas de Gravity Wells). Les achievements sont du **bragging rights + flavor lore**. Les Gravity Wells (monnaie secondaire pour upgrades permanents) arrivent en v1.1 avec un système d'upgrades dédiés — voir `docs/08-LIVEOPS-PLAN.md`.

## Règles anti-frustration

- **Jamais de soft-lock**. Le tap a toujours une valeur minimale non négligeable grâce au Dread multiplier.
- **Pas de timer obligatoire** (sauf boost cooldown court).
- **Pas de "vie"** à reprendre.
- **Pas de notification push intrusive**. Une seule par jour max, opt-in.
- **Pub jamais forcée.** Toutes les pubs sont récompensées et volontaires.
- **Jamais de payer pour progresser.** IAPs uniquement cosmétiques.
