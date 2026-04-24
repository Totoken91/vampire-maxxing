# 🩸 Vampire Maxxing — Thralls System v1.2 (MVP Launch FINAL)
## Gacha-grade economy + Star system + Banner architecture

> Brief consolidé pour Claude Code. Version finale suite à audit du skill gacha-systems-expert.
>
> **Décisions verrouillées dans cette version :**
> 1. **Système d'Essence + étoiles intégré dès v1.0** — pas de pull "perdu"
> 2. **Architecture banner Standard/Featured** (remplace Mineur/Majeur)
> 3. **Ladder de packs complète avec First-Time Double** (pattern industrie universel)
> 4. **Disclosure légale des taux** (obligatoire UE/KR, protection juridique)
> 5. **Trigger Pack Fondateur refactor** (post-succès, pas post-frustration — conformité UE)
> 6. **Refactor Dread → Power Level visuel** (chiffres romains, badge séparé)
> 7. **Ichor comme currency de pull** (plate, anti-inflation)
> 8. **25 Ichor offerts en fin de FTUE** + First Rare Guarantee

---

## 📋 Table des matières

1. [Principes de design non-négociables](#principes)
2. [Architecture économique — 3 currencies](#currencies)
3. [Refactor Dread → Power Level](#dread)
4. [Ichor — spécification complète](#ichor)
5. [Les 12 thralls MVP + système d'étoiles](#thralls)
6. [Système d'Essence (dupes = progression)](#essence)
7. [Architecture Banner — Standard / Featured](#banners)
8. [Rates, pity et garanties](#rates)
9. [Première session — FTUE avec pull cadeau](#ftue)
10. [Monétisation — Ladder de packs](#monetization)
11. [Rewarded ads — placements](#ads)
12. [UX du Roaster screen](#ux)
13. [Disclosure légale obligatoire](#legal)
14. [Architecture technique](#tech)
15. [Checklist launch](#checklist)
16. [Roadmap post-launch](#roadmap)

---

<a name="principes"></a>
## 🎯 1. Principes de design non-négociables

Ces règles sont issues de 15 ans de benchmarks gacha. Les violer = churn garanti.

### Règle 1 — Aucun pull ne doit "ne rien donner"
Le pire moment gacha = pull un doublon sans système de conversion. **Chaque pull doit donner quelque chose de valeur**, même un doublon. → Système Essence obligatoire.

### Règle 2 — Rates affichés, pity visible, historique accessible
Obligation légale en Corée (loi mars 2024, amende ₩20M) et best practice UE. Non-négociable en 2026.

### Règle 3 — Une currency = un verbe
- Blood = grind
- Ichor = collectionner
- Dread = ma puissance (NON dépensable)

### Règle 4 — Le F2P complet doit être possible
Un joueur qui ne paye jamais doit pouvoir compléter 10/12 thralls en ~30 jours. Sinon = churn massif + reviews toxiques.

### Règle 5 — Les whales payent pour accélérer, jamais pour exclusivité
Aucun thrall exclusif IAP. La monétisation vend **du temps**, pas **du contenu**.

### Règle 6 — Transparence radicale = trust = rétention
Chaque chiffre du système gacha est affiché au joueur. Chaque pull est loggué dans un historique consultable.

---

<a name="currencies"></a>
## 💰 2. Architecture économique — 3 currencies distinctes

| Currency | Rôle | Nature | Source | Inflation |
|---|---|---|---|---|
| **🩸 Blood** | Grind / upgrades in-run | Réserve dépensable (bigint) | Génération passive | Oui, trilliards |
| **⬢ Dread** | **Power Level** (stat, PAS currency) | **Rank affiché en chiffres romains** | Ascension | Oui (rank I → C+) |
| **⚫ Ichor** | Rituels d'invocation | Réserve dépensable **plate** | Quotidien + achievements + ads + IAP | **Non, cap naturel 5-7/jour F2P** |

---

<a name="dread"></a>
## ⬢ 3. Refactor du Dread → Power Level

### Diagnostic
Le Dread actuellement affiché "DREAD × 12" **ressemble à une currency** → cognitive load permanent ("où je le dépense ?"). Trust killer silencieux.

### Solution : refactor visuel et sémantique

**On garde le nom "Dread"** (changer le nom d'une mécanique centrale = risque joueurs actuels). **Mais on refactor le traitement :**

#### Transformations obligatoires

1. **Chiffres romains** (XII, XXV, L, C) → signal "c'est un rank"
2. **Pas de suffixes numériques** (K, M, B) → on accumule pas des Dread
3. **Badge distinct** — séparé visuellement de la rangée currencies
4. **Label permanent** sous le rank : `×12 Blood Multiplier`
5. **Icône de rank** (hexagone, couronne, sceau) — pas une "pièce"
6. **Animation cinématographique au rank-up** (X → XI : flash, roar, haptique heavy)

### Layout header refactoré

```
┌─────────────────────────────────────────┐
│  🩸 12.4K     ⚫ 17         ⚙️          │  ← Currencies (rangée 1, même style)
│                                          │
│         ┌─────────────────┐              │
│         │  ⬢  DREAD XII   │              │  ← Power Level (rangée 2, badge distinct)
│         │  ×12 Blood Mult │              │     
│         └─────────────────┘              │
├─────────────────────────────────────────┤
│     [CORE GAMEPLAY]                      │
```

### Test de validation
Tu montres l'UI à un non-joueur. Il demande :
- "C'est un score ?" ✅ → refactor réussi
- "Je peux le dépenser où ?" ❌ → itérer

---

<a name="ichor"></a>
## ⚫ 4. Ichor — spécification complète

### Identité
- **Icône** : goutte iridescente noir/violet avec reflets rouges
- **Couleur** : violet foncé (#4A1A4F) avec highlight iridescent
- **Lore** : *"Le nectar des Anciens. Il attire à toi ceux qui dorment dans la nuit."*

### Règles économiques non-négociables

**1. Currency PLATE :** ne scale jamais avec la progression. 5-7/jour F2P à prestige 1 = 5-7/jour F2P à prestige 50.

**2. Sources multiples cappées :** aucune source unique > 40% de l'Ichor quotidien.

**3. F2P completion possible :** 12/12 en ~30 jours pour F2P actif, ~14 jours pour payant.

**4. Flag earned/paid dans le save** (future-proofing pour rewards dédiés plus tard) :
```typescript
interface IchorTransaction {
  amount: number;
  source: 'tutorial' | 'daily_quest' | 'login_chain' | 'ad' | 'milestone' | 'achievement' | 'event' | 'iap';
  earnedNotPaid: boolean; // pour futures mechanics "Ichor gratuit uniquement"
  timestamp: Date;
}
```

### Sources F2P

| Source | Ichor | Fréquence |
|---|---|---|
| **Pack de bienvenue tutorial** | **25** | One-shot fin FTUE |
| **Quête quotidienne** (login + 1 action) | 2 | 1x/jour |
| **Chaîne de connexion** (+1 par jour consécutif) | 1-3 | 1x/jour, cap 3 |
| **Rewarded ad "Offrande du Soir"** | 1 | 3x/jour max |
| **Milestone Prestige 1** | 5 | One-shot |
| **Milestone Prestige 3** | 10 | One-shot |
| **Milestone Prestige 5** | 15 | One-shot |
| **Milestone Prestige 10** | 25 | One-shot |
| **Milestone Prestige 15** | 40 | One-shot |
| **Premier thrall Rare obtenu** | 5 | One-shot |
| **Premier thrall Épique obtenu** | 10 | One-shot |
| **Premier thrall de chaque archétype équipé** | 3 | 3 one-shots |
| **Collection complète 12/12** | 100 | One-shot endgame |
| **Events** (v1.1+) | 20-50 | ~1x/mois |

**Total daily F2P actif : 5-7 Ichor/jour**
**Total one-shots v1.0 : ~139 Ichor de bonus sur durée de vie**

---

<a name="thralls"></a>
## 🩸 5. Les 12 thralls MVP + système d'étoiles

### Répartition
- **6 Communs** (le socle, drop facile)
- **4 Rares** (mi-parcours, visibles session 1)
- **2 Épiques** (long terme, visibles mais inaccessibles avant prestige ~3)
- **0 Légendaire** au launch (arrive en v1.1, silhouette verrouillée "Lord of Night")

### Le roster v1.0

#### 🔴 Communs (6)

| # | Nom | Archétype | Bonus primaire | Bonus secondaire |
|---|---|---|---|---|
| 1 | **Ash the Wretched** | Harvester | +8% Blood generation | - |
| 2 | **Mira the Watcher** | Nocturne | +12% offline gains | Cap offline 2h |
| 3 | **Roderick the Tracker** | Predator | +10% active session gains | - |
| 4 | **Iron Maw** | Harvester | +6% Blood generation | -2% prestige cost |
| 5 | **Crypt Warden** | Nocturne | +10% offline gains | +5% cap offline time |
| 6 | **Gravebound** | Predator | +8% active gains | Tap ×1.1 |

#### 🟣 Rares (4)

| # | Nom | Archétype | Bonus primaire | Bonus secondaire |
|---|---|---|---|---|
| 7 | **Nox the Hunger** | Harvester | +25% Blood generation | - |
| 8 | **Lilith's Whisper** | Nocturne | +30% offline gains | Cap étendu 4h |
| 9 | **Duskward** | Predator | +22% active gains | Haptic spécial au tap |
| 10 | **Ashen Vale** | Hybrid | +15% toutes sources | Débloque slot actif +1 |

#### 🟡 Épiques (2)

| # | Nom | Archétype | Bonus primaire | Bonus secondaire |
|---|---|---|---|---|
| 11 | **Mirella, Thorn of the Court** | Harvester | +60% Blood generation | Particles roses sang au tap |
| 12 | **Velmor the Dread** | Nocturne | +80% offline gains | Cap 8h + auto-collect unlock |

### Système d'étoiles (dès v1.0)

Chaque thrall a un niveau d'étoiles qui multiplie son bonus.

| Rareté | ★ de départ | ★ max | Multiplicateur final |
|---|---|---|---|
| Commun | 1★ | 5★ | ×2.0 (5 paliers : 100% / 125% / 150% / 175% / 200%) |
| Rare | 1★ | 5★ | ×2.5 |
| Épique | 1★ | 5★ | ×3.0 |
| Légendaire (v1.1) | 1★ | 6★ | ×4.0 |

### Coût d'awakening (monter une étoile)

Les étoiles se montent en consommant des **Essences** (voir section suivante). Coût exponentiel :

| Passage | Essences requises (Commun) | Rare | Épique |
|---|---|---|---|
| 1★ → 2★ | 3 | 2 | 1 |
| 2★ → 3★ | 6 | 4 | 2 |
| 3★ → 4★ | 12 | 8 | 4 |
| 4★ → 5★ | 24 | 16 | 8 |
| **Total 1→5★** | **45** | **30** | **15** |

---

<a name="essence"></a>
## 💎 6. Système d'Essence (dupes = progression)

**LA feature qui transforme les doublons de frustration en progression.**

### Principe

Chaque pull qui donne un thrall **déjà possédé** → conversion automatique en Essences de la rareté correspondante.

| Rareté du thrall dupe | Essences gagnées |
|---|---|
| Commun dupe | 1 Essence Commune |
| Rare dupe | 3 Essences Rares |
| Épique dupe | 10 Essences Épiques |

### Usage des Essences (v1.0)

**Uniquement awakening des étoiles.** Les Essences sont spécifiques par rareté :
- Essence Commune → awakening thralls Communs
- Essence Rare → awakening thralls Rares
- Essence Épique → awakening thralls Épiques

### Conversion downward (v1.0)

Pour éviter la frustration "j'ai trop d'Essences Épiques" (improbable en v1.0 mais couvre les cas) :
- 1 Essence Épique → 3 Essences Rares (taux 1:3)
- 1 Essence Rare → 3 Essences Communes (taux 1:3)
- **Pas de conversion upward** (pas de trick F2P → power)

### Duplicate Protection (soft, invisible)

Si un pull va donner un thrall déjà possédé **ET** que des thralls de même rareté restent à obtenir → **50% chance** de reroll vers un non-possédé de même rareté.

**Non affiché**, mais **massivement ressenti**. Cette mécanique seule lift la complétion perçue de ~40%.

### Pourquoi c'est critique en v1.0

Sans Essence : ton joueur pull Ash au pull #4, ressent "doublon nul", abandonne le système. Avec Essence : chaque pull donne **toujours** une valeur. Le système reste engageant même à 10/12 thralls.

---

<a name="banners"></a>
## 🎰 7. Architecture Banner — Standard / Featured

**Changement vs V1.1 :** on abandonne "Rituel Mineur / Majeur" pour un pattern **banner-based** (standard industrie HoYo/Kuro/Blue Archive). Même currency, différents pools.

### Les 2 banners v1.0

#### 🌑 Rituel Ancien (Banner Standard)
- **Coût :** 10 Ichor / pull
- **Pool :** les 12 thralls (tous)
- **Disponibilité :** toujours actif
- **Rôle :** onboarding, acquisition de base, farming d'Essences

#### 🌙 Rituel Invoqué (Banner Featured)
- **Coût :** 10 Ichor / pull (même prix)
- **Pool :** tous les thralls **+ rate-up sur 1-2 thralls** featured
- **Disponibilité :** rotation 3 semaines (en v1.0 : 1 featured fixe = Mirella)
- **Rôle :** preparer event system + teaser v1.1 Légendaires

### Bundle de pulls (nouveau)

**Aligné sur le standard industrie (HoYo-like) :**

| Bundle | Coût Ichor | Pulls | Garantie |
|---|---|---|---|
| 1 pull | 10 | 1 | - |
| **10 pulls** | **95** (5 Ichor discount) | 10 | **1 Rare+ garanti** |

**Pourquoi :** la garantie dans le 10-pull = standard universel (Genshin, HSR, Blue Archive, Arknights). Tout joueur qui a joué 1 gacha l'attend.

---

<a name="rates"></a>
## 🎲 8. Rates, pity et garanties

### Rates par banner

#### Rituel Ancien (Standard)

| Rareté | Rate de base | Rate "rate-up" |
|---|---|---|
| Commun | 82% | - |
| Rare | 15% | - |
| Épique | 3% | - |

#### Rituel Invoqué (Featured)

| Rareté | Rate de base | Share du rate-up |
|---|---|---|
| Commun | 80% | - |
| Rare | 17% | dont 50% sur Rare featured (si présent) |
| Épique | 3% | dont 75% sur Épique featured |

### Pity systems (visibles en permanence)

#### Rituel Ancien
- **Rare garanti** tous les **10 pulls** (compteur visible)
- **Anti-streak** : 5 Communs d'affilée → prochain pull forcé Rare min (silent)

#### Rituel Invoqué
- **Rare garanti** tous les **10 pulls**
- **Épique garanti** tous les **40 pulls** (pity long, s'étend across banners featured)
- **Anti-streak** identique

### Garanties spéciales

#### First Rare Guarantee (FRG)
**Le tout premier pull de la vie du joueur = Rare garanti.** Flag permanent dans le save.

#### Pool Dynamic (nouveau — remplace option A)
Quand **tous les thralls d'une rareté sont possédés**, le rate de cette rareté est **redistribué vers la rareté immédiatement supérieure** :

- Tous les Rares possédés → 15% de Rare redistribué vers Épique = **18% Épique effectif**
- Tous les Épiques possédés → 3% redistribué vers Légendaire (v1.1+) ou vers Essences bonus

**Résultat :** le pull reste pertinent même après complétion partielle. Les Essences continuent d'affluer pour l'awakening des étoiles.

### Compteurs visibles (UI obligatoire)

```
RITUEL ANCIEN
━━━━━━━━━━━━━━━━━━━━━━━
Prochain Rare garanti dans 7 pulls
[●●●○○○○○○○]

Historique récent : 🟣 🔴 🔴 🔴 🟣 🔴 🔴
```

### Tableau comparatif benchmarks

| Système | Rate top | Pity hard | Espérance |
|---|---|---|---|
| Genshin (5★) | 0.6% | 90 | ~62 pulls |
| HSR (5★) | 0.6% | 90 | ~62 pulls |
| WuWa (5★) | 0.8% | 80 | ~55 pulls |
| Blue Archive (3★) | 3% | 200 | ~35 pulls |
| Arknights (6★) | 2% | 99 | ~34 pulls |
| **Vampire Maxxing Épique** | **3%** | **40** | **~22 pulls** |

**Positionnement :** tu es plus généreux que les leaders du genre sur l'Épique. C'est **voulu** : pool de 12 = il faut saturer l'obtention en ~30 jours, pas ~180.

---

<a name="ftue"></a>
## 🎁 9. Première session — FTUE avec pull cadeau

### Structure (loi du 60-second rule)

**Seconde 0-30 : core loop**
- Tap, Blood monte, premier générateur acheté
- Juice stack full (visual + audio + haptic) dès le premier tap

**Seconde 30-60 : intro narrative Ichor**
- Animation courte 2-3s : "Les Anciens t'offrent leur nectar..."
- 25 Ichor apparaissent avec glow iridescent
- Tooltip : "Avec l'Ichor, tu peux invoquer des Thralls"

**Seconde 60-90 : premier Rituel guidé**
- Arrow pulse sur "RITUEL ANCIEN" (coût 10 Ichor)
- Player tap → animation 2.5s → **First Rare Guarantee** appliquée
- Juice cinématographique : screen flash, particles, chœur, haptique heavy
- "Nox/Lilith/Duskward/Ashen rejoint ton Coven"

**Seconde 90-150 : équipement guidé**
- Arrow vers slot actif 1
- Drag-to-equip (ou tap + tap)
- Confirmation : "Asservi à ta volonté"
- Blood generation visible ↗ (glow sur multiplicateur)

**Seconde 150-180 : autonomy**
- 15 Ichor restent (25 - 10)
- Rituel Ancien affordable mais **pas guidé**
- Tutorial skip button visible

### Pourquoi 25 Ichor et pas 10

- 10 = 1 pull forcé, zéro agency
- 25 = **2 pulls garantis + 5 reste** = joueur choisit quand faire le 2e
- Le 2e pull (non garanti) enseigne la variance naturelle
- 5 Ichor restants = teasing du prochain pull = raison de revenir demain

### Test de validation FTUE
- [ ] Premier pull dans les 90 secondes : oui
- [ ] Rare garanti au premier pull : oui
- [ ] Thrall équipé dans la session 1 : oui
- [ ] Ichor restant en fin de session 1 : oui (5 Ichor = teasing)
- [ ] Skip button visible après seconde 120 : oui

---

<a name="monetization"></a>
## 💸 10. Monétisation — Ladder de packs complète

### Principe clef : First-Time Double

**Chaque pack donne 2× sa valeur la première fois qu'il est acheté.** Label "×2 PREMIÈRE FOIS" visible sur chaque pack. C'est le **single plus efficace pricing trick** du gacha mobile (benchmark : 6-8 first-time packs achetés par paying user en 2 semaines).

### Ladder de packs v1.0

| Pack | Prix | Contenu base | First-time bonus | Total 1ère fois |
|---|---|---|---|---|
| **Offrande Modeste** | 0,99€ | 15 Ichor | +15 Ichor | **30 Ichor** |
| **Pacte Fondateur** ⭐ | 2,99€ | 50 Ichor + Nox garanti | +100 Ichor | **150 Ichor + Nox** |
| **Offrande Substantielle** | 4,99€ | 100 Ichor | +100 Ichor | **200 Ichor** |
| **Offrande Majeure** | 9,99€ | 250 Ichor | +250 Ichor | **500 Ichor** |
| **Starter Coven** | 9,99€ | 200 Ichor + 1 Rare garanti | +200 Ichor | **400 Ichor + Rare** |
| **Offrande Royale** | 19,99€ | 600 Ichor | +600 Ichor | **1200 Ichor** |
| **Offrande Cataclysmique** | 49,99€ | 1800 Ichor | +1800 Ichor | **3600 Ichor** |

### Ratio valeur croissant (anchoring)

| Prix | Ichor/€ base | Ichor/€ 1ère fois |
|---|---|---|
| 0,99€ | 15 | 30 |
| 4,99€ | 20 | 40 |
| 9,99€ | 25 | 50 |
| 19,99€ | 30 | 60 |
| 49,99€ | 36 | 72 |

**Ratio croissant** = psychologie anchoring (le 49,99€ paraît "plus rentable par Ichor" que le 9,99€). Classic tier design.

### Trigger Pack Fondateur (refactor éthique)

**Ancien trigger V1.1 (problématique) :** "après 5e Rituel sans Rare" = ciblage vulnérabilité = risque légal UE 2027+.

**Nouveau trigger V1.2 (éthique + conforme) :**
- **Après l'obtention du premier Rare** (FRG ou pull naturel)
- **Disponibilité : 7 jours** (pas de countdown anxiogène 48h)
- **Label clair :** "Offre de bienvenue — disponible une fois"
- Ne se reset jamais

**Même conversion**, zéro risque légal, zéro exploitation de frustration.

### Règles non-négociables

1. **Aucun thrall Épique ou Légendaire dans un pack direct** (le Pack Fondateur contient un Rare, c'est la limite)
2. **Aucun thrall exclusif IAP** — tous obtenables via pulls F2P
3. **Confirmation explicite sur packs > 19,99€** (double tap + preview contenu)
4. **Spending dashboard accessible** depuis settings (obligation éthique + future-proofing RGPD)

---

<a name="ads"></a>
## 📺 11. Rewarded ads — placements

| Placement | Reward | Cap |
|---|---|---|
| **Offrande du Soir** | 1 Ichor | 3x/jour |
| **Bénédiction Nocturne** | 2× offline progress au retour | 1x/session |
| **Sang Bouillonnant** | Blood ×3 pendant 10min | Cooldown 2h |
| **Frisson du Destin** | Pity counter +1 après pull Commun | 1x/prestige |

### Priorité d'intégration
1. **Offrande du Soir** (Ichor) → plus haute valeur perçue joueur
2. **Bénédiction Nocturne** (offline ×2) → placement "retour dans l'app", très revenue-efficient
3. **Sang Bouillonnant** (Blood boost) → placement active session
4. **Frisson du Destin** (pity bump) → placement engagement maximum

---

<a name="ux"></a>
## 🎨 12. UX du Roaster screen

### Layout mobile (portrait, thumb-zone aware)

```
┌─────────────────────────────────────┐ TOP 10% — Status
│ 🩸 VM  THRALLS ROASTER    ⬢ XII    │
│              Collected: X/12         │
├─────────────────────────────────────┤ 10-20% — Filtres
│ [ALL] [HARVESTER] [NOCTURNE] [PRED] │
├─────────────────────────────────────┤ 20-70% — Grille scrollable
│  ┌────┐ ┌────┐ ┌────┐              │
│  │🔴1★│ │🟣2★│ │ ?  │              │  Cards 3×N sur mobile
│  │Ash │ │Nox │ │???│              │  (PAS 5×N comme desktop mockup)
│  │Lv.8│ │Lv12│ │    │              │
│  └────┘ └────┘ └────┘              │
├─────────────────────────────────────┤ 70-85% — ACTIVE THRALLS
│       ─── ACTIVE THRALLS ───         │
│  ┌──┐ ┌──┐ ┌──┐ ┌🔒┐                │  3 slots + locked
│  │👤│ │👤│ │+ │ │D20│                │
│  └──┘ └──┘ └──┘ └──┘                │
├─────────────────────────────────────┤ 85-100% — Bottom nav
│ [COVEN][RITUALS][THRALLS•][BL][SHOP]│
└─────────────────────────────────────┘
```

### Simplifications vs mockup ChatGPT

| Élément mockup | Décision v1.0 |
|---|---|
| 56 thralls collected | **12 max** |
| 5 slots actifs | **3 slots** (scale 4 à Dread X, 5 à Dread XXV) |
| Tabs BLOODLINE/CURSED/SUPPORT/TANK/DPS | **ALL + HARVESTER + NOCTURNE + PREDATOR** |
| Étoiles ★★★★★ sous le nom | **✅ ACTIF v1.0** (système Essence) |
| Niveaux Lv.47, Lv.40 | **Cap Lv.20 en v1.0** |
| Onglet BLOODLINE | **Stubbed "Coming soon"** (v1.3) |
| Onglet RITUALS | **Actif v1.0** |
| Onglet COVEN | **Stubbed "Coming soon"** (v2+) |

### Règles UX non-négociables

1. **Touch targets ≥ 48dp** — cards 3×N sur mobile, pas 5×N
2. **Feedback < 200ms** sur tout tap (scale bounce + haptic léger)
3. **Silhouettes pour non-possédés** — pas de slot vide
4. **Long-press sur card** = détail thrall (modal, pas navigation)
5. **Drag-to-equip** : card → slot = équiper, haptic + son confirmation
6. **Pulsation glow** sur cards nouvellement drop (badge NEW)
7. **Badge count rouge** sur THRALLS bottom nav quand nouveaux drops

### Juice par rareté (pull animation)

| Rareté | Animation | Son | Haptique |
|---|---|---|---|
| Commun | Fade-in 0.5s | Click doux | Tap léger |
| Rare | Zoom + particles violet 1.5s | Cloche profonde | Double tap |
| Épique | Screen darkening + flames roses 2.5s | Chœur grave | Heavy triple tap |
| Légendaire (v1.1) | Cinematic 4s + flash écran | Tonnerre + chœur | Full haptic séquence |

### Skip animation (obligatoire)

Bouton "Skip" visible **dès 1 seconde** sur les animations de pull. **Never force**. Les vétérans skippent, les newbies regardent. Loi UX n°3 ("skip buttons are gold").

### Narrative copy (ton gothique)

- Pull → **"INVOQUER"** / **"SACRIFIER LE NECTAR"**
- Thrall équipé → **"Asservi à ta volonté"**
- Thrall non possédé → **"Encore libre des chaînes"**
- Prestige → **"ASCENSION"**
- Pack 2,99€ → **"LE PACTE FONDATEUR"**
- Pack 49,99€ → **"OFFRANDE CATACLYSMIQUE"**

---

<a name="legal"></a>
## ⚖️ 13. Disclosure légale obligatoire

### Obligations réglementaires 2026

| Juridiction | Exigence | Sanction |
|---|---|---|
| **Corée du Sud** (loi mars 2024) | Rates publiés + mécaniques transparentes | ₩20M + 2 ans prison |
| **Chine** (règlement 2017) | Rates publiés + limites mineurs | Retrait licence |
| **Japon** (JOGA self-reg) | Rates publiés (best practice) | Exclusion industrie |
| **UE** (DSA + UCPD) | Best practice, pas d'obligation directe | Actions collectives possibles |
| **Belgique** | Loot boxes = gambling (de facto ban) | Selon produit |

### Ton marché = France → obligatoire côté UE

### Page "Taux de tirage" obligatoire

Accessible en **≤ 2 taps** depuis le screen Rituals. Doit contenir :

```markdown
# Taux de tirage — Rituels

## Rituel Ancien (permanent)
- Commun : 82%
- Rare : 15%
- Épique : 3%

Garanties :
- Rare garanti tous les 10 pulls
- 10-pull = 1 Rare+ garanti

## Rituel Invoqué (featured)
- Commun : 80%
- Rare : 17% (dont 50% sur Rare en rate-up)
- Épique : 3% (dont 75% sur Épique en rate-up)

Garanties :
- Rare garanti tous les 10 pulls
- Épique garanti tous les 40 pulls
- 10-pull = 1 Rare+ garanti

## Méthodologie
Les taux sont appliqués par pull indépendamment. Les garanties
fonctionnent via un compteur visible en permanence dans l'interface.
Les pulls gagnés via Essences (conversion de doublons) ne comptent
pas dans les compteurs de pity.
```

### CGU à mettre à jour

Ajouter :
- Mention système gacha
- Explicitation mécanique pity et 50/50 (si implémenté v1.1)
- Renvoi vers page Taux
- Âge minimum (13+ recommandé)
- Politique de remboursement

### Contrôle parental (obligation éthique + RGPD)

- Age gate fonctionnel (12+/13+ au lancement)
- Limite de dépenses journalière optionnelle (settings)
- Spending dashboard dans settings (accessible sans friction)

---

<a name="tech"></a>
## 🏗️ 14. Architecture technique

### Data model complet

```typescript
// ─── Currencies ───
interface PlayerCurrencies {
  blood: bigint;
  ichor: number;           // cap soft 1000
  dreadRank: number;       // entier, affiché en romain
}

// ─── Thrall data (extensible) ───
interface ThrallData {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  archetype: 'harvester' | 'nocturne' | 'predator' | 'hybrid';
  maxLevelV1: number; // 20 en v1.0

  primaryEffect: {
    type: 'blood_gen' | 'offline_gain' | 'active_gain' | 'prestige_cost' | 'tap_multiplier';
    value: number;
    scalesWithLevel: boolean;
    scalesWithStars: boolean;
  };
  secondaryEffect?: { /* same shape */ };

  // Acquisition
  acquisitionSources: ('tutorial' | 'milestone' | 'standard_banner' | 'featured_banner' | 'pack')[];
  milestoneUnlock?: { type: 'prestige', value: number };

  // Art
  portraitPath: string;

  // Pool routing (v1.0)
  pool: 'standard' | 'featured' | 'event_exclusive';
  featuredUntil?: Date;
  lastRerunAt?: Date;

  // Star system (v1.0)
  maxStars: number; // 5 pour C/R/E, 6 pour L
  starMultipliers: number[]; // [1.0, 1.25, 1.5, 1.75, 2.0] par ex

  // V1.1+ extensible
  bloodline?: string;
  equippableSkins?: string[];
  eventExclusive?: { eventId: string, validFrom: Date, validTo: Date };
  set3Bonus?: string;
}

// ─── Player state par thrall ───
interface PlayerThrallState {
  thrallId: string;
  owned: boolean;
  level: number;
  xp: number;
  stars: number;                  // 1-5 (1-6 pour L)
  firstObtainedAt: Date;
  isNew: boolean;
  isEquipped: boolean;
  equippedSlot?: number;
  totalDupes: number;             // tracking historique
}

// ─── Essences ───
interface PlayerEssences {
  common: number;
  rare: number;
  epic: number;
  legendary: number; // v1.1+
}

// ─── Ichor tracking (earned/paid) ───
interface IchorLedger {
  transactions: IchorTransaction[];
  currentEarned: number;
  currentPaid: number;
  total: number; // = earned + paid (ce qu'on affiche au joueur)
}

interface IchorTransaction {
  id: string;
  amount: number;
  source: IchorSource;
  earnedNotPaid: boolean;
  timestamp: Date;
}

type IchorSource =
  | 'tutorial_gift'
  | 'daily_quest'
  | 'login_chain'
  | 'ad_offering'
  | 'milestone_prestige'
  | 'achievement_first_rare'
  | 'achievement_first_epic'
  | 'achievement_archetype'
  | 'achievement_collection'
  | 'event_reward'
  | 'iap_pack';

// ─── Rituel state ───
interface RitualState {
  standard: {
    pityCounter: number;        // 0-10
    commonStreak: number;       // anti-streak
    totalPulls: number;
  };
  featured: {
    pityCounterRare: number;    // 0-10
    pityCounterEpic: number;    // 0-40
    commonStreak: number;
    totalPulls: number;
    currentFeaturedIds: string[]; // thralls en rate-up
  };
  firstRareGuaranteeUsed: boolean;  // FRG
  pullHistory: PullEntry[];         // historique des 50 derniers pulls
}

interface PullEntry {
  timestamp: Date;
  banner: 'standard' | 'featured';
  result: {
    thrallId: string;
    rarity: string;
    wasDupe: boolean;
    essenceGained: number;
  };
  pityActive: boolean;
  frgApplied: boolean;
}

// ─── Player state global ───
interface PlayerState {
  currencies: PlayerCurrencies;
  thralls: PlayerThrallState[];
  essences: PlayerEssences;
  ichorLedger: IchorLedger;
  ritualState: RitualState;
  activeSlots: number;        // 3 en v1.0, scale
  equippedThralls: (string | null)[];  // index = slot

  // Daily
  lastDailyQuestClaim: Date | null;
  dailyLoginStreak: number;
  dailyLoginLastClaim: Date | null;
  rewardedAdsToday: {
    ichorOffering: number;
    offlineBoost: boolean;
    bloodBoost: Date | null;
    pityBoost: boolean;
  };

  // Milestones
  milestonesClaimed: Set<string>;

  // Packs
  welcomePackFirstRareAt?: Date;  // trigger du Pack Fondateur
  welcomePackPurchased: boolean;
  packsFirstTimeBought: Set<string>;  // pour le First-Time Double

  // Settings
  settings: {
    reducedMotion: boolean;
    hapticsEnabled: boolean;
    soundEnabled: boolean;
    dailySpendingCapEur?: number;  // éthique
  };
}
```

### Structure de fichiers

```
/src
  /features
    /currencies
      /data
        currency-config.ts         # définitions Blood/Ichor/DreadRank
      /components
        CurrencyHeader.tsx         # Blood + Ichor rangée 1
        DreadRankBadge.tsx         # Badge rank distinct
        IchorCounter.tsx           # Compteur Ichor avec toast pédagogique
      /logic
        roman-numeral.ts           # 1 → "I", 12 → "XII"
        currency-math.ts           # bigint safe operations

    /thralls
      /data
        thralls-roster.ts          # les 12 thralls v1.0
        star-progression.ts        # multiplicateurs par étoile
        rarity-config.ts           # couleurs, juice specs
      /screens
        ThrallsRoasterScreen.tsx
        ThrallDetailModal.tsx      # long-press → modal
      /components
        ThrallCard.tsx
        ThrallStarDisplay.tsx      # ★ indicator
        ActiveSlotBar.tsx
      /logic
        thrall-bonus-calc.ts       # bonus cumulés équipés
        acquisition.ts             # milestones, tutorial gift

    /rituals
      /screens
        RitualsScreen.tsx          # choix banner + pull
      /components
        BannerCard.tsx             # Standard vs Featured
        PityCounter.tsx            # barre pity visible
        PullAnimation.tsx          # juice par rareté
        PullResultModal.tsx        # résultat + Essence si dupe
        PullHistoryLog.tsx         # historique transparent
      /logic
        ritual-pull.ts             # RNG + pity + FRG + duplicate protection + pool dynamic
        ritual-pool.ts             # config pools par banner
        rates-config.ts            # rates exposés (utilisés par disclosure screen)

    /essence
      /screens
        AwakeningScreen.tsx        # monter les étoiles
      /components
        EssenceCounter.tsx
        StarUpgradePreview.tsx
      /logic
        awakening-cost.ts          # coûts par rareté et par palier
        essence-conversion.ts      # downward conversion

    /economy
      /logic
        ichor-sources.ts           # tous les triggers de gain
        daily-quest.ts
        login-chain.ts
        milestone-rewards.ts

    /monetization
      /data
        packs-catalog.ts           # ladder complète avec first-time
      /components
        PackCard.tsx               # avec badge "×2 FIRST TIME"
        WelcomePackModal.tsx       # trigger refactoré
        RewardedAdButton.tsx
        SpendingDashboard.tsx      # accessible settings, RGPD friendly
      /logic
        welcome-pack-trigger.ts    # déclenchement post-succès (premier Rare)
        first-time-bonus.ts        # gestion du doublement
        iap-integration.ts         # Play Store billing

    /legal
      /screens
        RatesDisclosureScreen.tsx  # OBLIGATOIRE — ≤ 2 taps from Rituals
        PrivacySettingsScreen.tsx  # age gate, spending cap, RGPD
      /data
        rates-public-data.ts       # rates exactes affichées

    /tutorial
      /flows
        first-session-flow.ts
      /components
        IchorGiftCeremony.tsx      # moment émotionnel 25 Ichor
        GuidedFirstPullTutorial.tsx
```

### Analytics à instrumenter

```typescript
// Core events
analytics.track('thralls_screen_opened', { session_number });
analytics.track('thrall_equipped', { thrall_id, rarity, slot, stars });
analytics.track('thrall_awakened', { thrall_id, from_star, to_star, essence_cost });

// Pulls
analytics.track('pull_performed', { 
  banner: 'standard' | 'featured',
  bundle: 1 | 10,
  results: Array<{ rarity, thrall_id, was_dupe, essence_gained }>,
  pity_active,
  frg_applied,
});

// Ichor economy
analytics.track('ichor_earned', { source, amount, total_after, earned_or_paid });
analytics.track('ichor_spent', { ritual_banner, ritual_bundle, amount });

// Monetization
analytics.track('welcome_pack_shown', { trigger: 'first_rare_obtained' });
analytics.track('welcome_pack_purchased', { days_since_shown });
analytics.track('pack_purchased', { pack_id, price_eur, first_time: boolean });
analytics.track('rewarded_ad_completed', { placement, reward_type });

// Progression
analytics.track('prestige_performed', { prestige_level, thralls_owned, dread_rank });
analytics.track('dread_rank_up', { from_rank, to_rank });

// Legal / trust
analytics.track('rates_disclosure_viewed', {});
analytics.track('spending_cap_set', { amount_eur });

// Session
analytics.track('session_started', {
  ichor_balance,
  dread_rank,
  blood_balance_log10,
  thralls_owned,
  days_since_install,
});
```

---

<a name="checklist"></a>
## ✅ 15. Checklist launch v1.2

### 🔴 Critique — bloquant launch

#### Économie & currencies
- [ ] Refactor visuel Dread en badge rank (chiffres romains, label multiplicateur)
- [ ] Icône/couleur/naming Ichor (goutte iridescente noir/violet)
- [ ] Architecture triple-wallet propre (Blood bigint / Ichor flat / Dread rank)
- [ ] Ichor ledger avec flag earned/paid (future-proofing)

#### Pulls & banner
- [ ] Screen RITUALS accessible depuis bottom nav
- [ ] 2 banners implémentés (Standard + Featured)
- [ ] Bundle 10-pulls avec 1 Rare+ garanti
- [ ] Pool dynamic (redistribution rates quand rareté complète)
- [ ] Pity system visible avec barre progress + compteur
- [ ] First Rare Guarantee (premier pull = Rare)
- [ ] Anti-streak protection (5 Communs → forcé Rare)
- [ ] Duplicate protection soft (50% reroll)

#### Dupes & étoiles
- [ ] Système Essence (Commun/Rare/Épique)
- [ ] Conversion doublons → Essences automatique
- [ ] Screen Awakening avec montée d'étoiles
- [ ] Calcul bonus avec étoiles (multiplicateur appliqué)
- [ ] Conversion downward Essences (Épique→Rare, Rare→Commun)

#### Tutorial & FTUE
- [ ] 25 Ichor offerts en fin de FTUE
- [ ] Premier pull guidé avec FRG
- [ ] Animation cérémonielle pour le gift Ichor
- [ ] Explication pity et banner visible (pas caché)

#### Légal
- [ ] **Page "Taux de tirage"** accessible ≤ 2 taps
- [ ] CGU mises à jour avec mentions gacha
- [ ] Age gate fonctionnel
- [ ] Spending dashboard dans settings
- [ ] Limite dépenses journalière optionnelle
- [ ] Politique de remboursement publiée

#### Monétisation
- [ ] Ladder de 7 packs (0,99€ → 49,99€)
- [ ] **First-Time Double** implémenté sur chaque pack
- [ ] Label "×2 PREMIÈRE FOIS" visible
- [ ] Pack Fondateur 2,99€ avec trigger **post-premier-Rare** (7 jours disponible)
- [ ] 4 placements rewarded ads
- [ ] Intégration Play Store billing

### 🟠 Important — lift rétention

- [ ] Daily login chain (Ichor progressif)
- [ ] Quête quotidienne (+2 Ichor)
- [ ] Milestones prestige 1/3/5/10/15 avec Ichor
- [ ] First-time achievements (Rare, Épique, archétype)
- [ ] Historique des pulls consultable (transparence)
- [ ] Animation rank-up Dread cinématographique
- [ ] Juice stack par rareté (visual + audio + haptic)
- [ ] Silhouettes pour thralls non-possédés
- [ ] Badge "NEW" sur drops non-vus

### 🟡 Polish — différenciation premium

- [ ] Shimmer sur Rituel quand bundle 10 affordable
- [ ] Toast contextuel à chaque gain d'Ichor (source visible)
- [ ] Tooltip contextuel première apparition Ichor
- [ ] Reduced-motion respecté
- [ ] Haptique toggle + sound toggle
- [ ] Contrast 4.5:1 sur texte body (WCAG AA)
- [ ] Touch targets ≥ 48dp verified sur device

---

<a name="roadmap"></a>
## 🗓️ 16. Roadmap post-launch

### v1.0 — LAUNCH (ce brief)
12 thralls, 2 banners, ladder packs, étoiles, disclosure

**Go/no-go v1.1 (2-4 semaines observation) :**
- D1 retention > 35%
- D7 retention > 12%
- D30 retention > 4%
- FTB conversion > 1%
- ARPDAU > 0,05€
- >60% DAU ouvre Rituals ≥ 1x/session
- Aucune fuite majeure sur l'awakening

### v1.1 — Légendaires & subscription
- **+2 Légendaires** (Lord of Night + Blood Countess, rate-up featured)
- **Event one-shot "La Nuit du Sang"** (2 semaines, thrall event-exclusive)
- **Welkin equivalent "Pacte Éternel"** 4,99€/mois (200 Ichor total sur 30 jours)
- **Founder Pack whale** 19,99€ one-time (Légendaire + skin + bonus permanent)
- Slot actif 4 débloqué à Dread XXX

### v1.2 — Depth
- +5 thralls (18 total), 1 Légendaire additionnel
- Skins pour 3 thralls populaires (2,99-4,99€)
- Tab BLOODLINE activée (3 lignées, set bonuses 3-piece)
- 6e étoile pour les Légendaires débloquée
- Selector character après 300 pulls standard (pattern HSR)

### v1.3 — LiveOps cadence
- Battle Pass "Pacte Nocturne" 4,99€ / 4 semaines / 30 tiers
- **Rareté Mythique** (BP + events only)
- Event mensuel récurrent
- Tab COVEN activée (social light)
- Cadence banner : nouveau thrall toutes les 3 semaines
- Rerun policy : chaque thrall limited re-run 9-12 mois post-release

### v2+ — Maturité
- Guilds / clans
- Leaderboards
- Collab banner (IP externe si opportunity)
- Collection complete rewards (mythique exclusif)

---

## 🎤 Notes finales pour Claude Code

### Priorisation si temps limité

**Si tu dois ship absolument minimal :**
1. Refactor Dread (2h)
2. Ichor + sources F2P (1 jour)
3. Banner Standard + pulls simples + pity visible (1-2 jours)
4. Essence + étoiles (2 jours)
5. Page Taux disclosure (3h)
6. Pack Fondateur + 1 pack additionnel (1 jour)

**Ce qui peut attendre v1.0.1 :**
- Banner Featured (peut être activé en second, après Standard validé)
- Ladder complète (3-4 packs minimum pour ship)
- Analytics detailed (core events suffisent au début)

### La règle d'or

**Ship l'économie claire AVANT tout contenu supplémentaire.** Un gacha avec 8 thralls et une économie transparente + étoiles + disclosure > 12 thralls avec économie floue.

Le Pack Fondateur à trigger post-succès est **ton bouton rouge éthique** : ne reviens jamais dessus même sous pression revenue. Les ARPPU se construisent sur la trust, pas sur la friction.

### Sur le système d'étoiles

Tu as dit "ça a pas l'air compliqué" — tu as raison, mais **le piège c'est le tuning**. Après 2-3 semaines de launch, regarde :
- Combien de joueurs ont au moins un thrall 2★ à D7 → cible >50%
- Combien de joueurs ont un thrall 5★ à D30 → cible 10-20%
- Le ratio essence-gagnées / essence-utilisées → cible proche de 1 (pas de stockage massif inutile)

Si tu vois que les Essences s'accumulent sans être utilisées → baisse les coûts d'awakening ou ajoute un usage alternatif.

### Sur la disclosure légale

Ne skippe PAS cette page. C'est 3h de dev pour te protéger d'un risque légal réel (Corée du Sud, potentiellement UE 2027+). Même si ton marché est principalement France, tu es dans l'UE = même obligation DSA/UCPD.

### Pourquoi tout ça

Ton concurrent direct dans 6 mois sera un idle gacha vampire clone qui aura copié ton visual mais pas ton système. Ce brief = la **fondation mécanique qui survit aux copies visuelles**. L'économie claire + étoiles + essence + banners = ce qui fera que tes joueurs restent quand un concurrent plus joli sort.

---

**Ship it.**
