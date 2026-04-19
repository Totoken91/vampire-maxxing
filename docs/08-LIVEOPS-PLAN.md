# 08 — LiveOps Plan

> 90% des top-grossing mobile games font tourner des LiveOps. Sans calendar events, on laisse ~60% du revenu potentiel sur la table. Cette doc formalise le plan post-launch.

## Philosophie

- **Event = raison de revenir**. Chaque event est un prétexte à :
  1. Notif push ciblée (+25% D7)
  2. Content TikTok / Reddit (+buzz organique)
  3. Pic de revenu 2-5× vs semaine normale
- **Zéro dark pattern** : les events sont des cadeaux/opportunités, pas des pressure points.
- **LiveOps léger** : Kenny est solo, donc tout event doit être livrable en < 2 jours de dev + 1 jour ChatGPT (skin/illustrations).

## Calendrier type (rolling)

| Period | Event | Type | Revenu attendu |
|--------|-------|------|----------------|
| Week 1 post-launch | `First Offering` (starter pack) | FTB | — |
| Week 2 | `Crimson Weekend` (2× blood sat+sun) | Retention | Neutre |
| Week 3 | `Rite of Coins` (4.99€ bundle 48h) | Monetization | 2× week |
| Week 4 | `Century Challenge` (leaderboard) | Engagement | 1.5× week |
| **Halloween (31/10)** | `All Souls Court` pack | Seasonal | **4× week** |
| Nov 2nd week | `Dread Harvest` (offline cap 8h, 72h) | Retention | 1.5× |
| **Black Friday (last Fri Nov)** | 40% off all IAP (48h) | Monetization | **5× week** |
| Dec 1st week | `Winter Thralls` (ambient snow VFX) | Cosmetic | 2× |
| **Christmas (24-26/12)** | `Crimson Yule` skin pack 14.99€ | Seasonal | **3× week** |
| Dec 31 | `Millennium Eve` (×3 ascend bonus) | Retention | 2× |
| Jan 1-7 | `New Blood` challenge pass | Season | 2× |
| **Valentine (14/02)** | `Crimson Romance` skin pack | Seasonal | **3× week** |
| Mars | `Reckoning` (1-week event boss — post v1.2) | Endgame | — |
| Avril | `Lent Fast` (reduce ads week, goodwill) | Retention | Neutre |
| Mai | `Bloodmoon` (rare event 72h) | Monetization | 2× |
| Juin | `Hollow Heat` skin pack summer | Seasonal | 2× |
| Juillet | `Midsummer Rite` (leaderboard top100) | Engagement | 1.5× |
| Août | `Ghost Month` (Asian market event) | Seasonal | 2× |

Total ~22 events / an. **Cadence = 1 event par semaine post-launch.**

## Event types catalogue

### 1. Countdown Offer (72h)
- Bundle limité avec timer visible
- Prix discount 30-50%
- Contenu : skin + boost permanent + title
- **ROI typique** : 4-5× conversion vs offer permanente

### 2. Limited Skin Pack
- 1 skin exclusif + 1 title + 1 particle color
- Prix 4.99€ ou 9.99€
- Disponible 7 jours, puis retrait complet (pas re-sale avant 1 an minimum)
- **ROI typique** : 3-4× semaine normale si bien cadré

### 3. Challenge Pass (3-4 semaines)
- 30 tiers, free + premium (4.99€)
- Premium = +20 extra tiers
- Rewards : blood bonus, boost charges, 1 exclusive cosmetic au tier 30
- **ROI typique** : +145% revenu sur lancement du pass (Playbook 2)
- **Commencer à v1.1** (pas MVP)

### 4. Leaderboard Event
- Top N joueurs sur une métrique (prestiges en 48h, blood total earned, etc.)
- Rewards cosmetic : title + badge
- Zéro IAP-gated — purement engagement
- **Coût dev** : minimal (une metric + un modal)

### 5. Retention Gift Event
- 7 jours consécutifs de connexion = cumul reward
- Jour 1 : +1000 blood
- Jour 3 : +1 boost charge
- Jour 5 : +10% global mult temporaire
- Jour 7 : +1 Dread
- **Coût dev** : daily reward system (à build v1.1)

### 6. Double XP / Double Speed
- Weekend event (48h), pas d'IAP, pure retention
- 2× blood gain sur tous les thralls
- ROI direct = 0 mais **boost des D7 retention** de 5-10 points

## Content associated per event

Pour chaque event, créer :
- [ ] 1 push notif ciblée ("The Bloodmoon rises. Feed now.")
- [ ] 1 modal d'annonce in-game (affiché 1× par session pendant event)
- [ ] 1 post TikTok (Kenny filme 15s avec le gameplay event)
- [ ] 1 post Reddit (r/idlegames si retention event, r/gothic si seasonal)
- [ ] Update store listing featured graphic pour les big events (Halloween, Xmas, Black Friday)

## Dev effort by event type

| Event type | Dev time | ChatGPT asset time |
|------------|----------|---------------------|
| Countdown Offer | 2h (reuse bundle code) | 0 |
| Limited Skin Pack | 4h + 1h wire IAP | 2h (1 skin ChatGPT) |
| Challenge Pass | **20h** (dev) + 3h assets | 4h |
| Leaderboard Event | 6h (+1h backend stub) | 0 |
| Retention Gift | 4h (daily reward system once built) | 0 |
| Double XP | 1h (state flag) | 0 |

**Total annuel estimé** : ~80h dev post-v1.0 (soit ~1j/sem moyenne).

## Battle Pass / Challenge Pass — v1.1

### Structure
- **Durée** : 28 jours (4 semaines, reset 1er du mois)
- **Tiers** : 30 free + 20 premium = 50 total
- **Prix** : 4.99€ premium track
- **Content premium** : 1 unique skin variant pour la forme actuelle + 8 boost charges + 1 badge + 1 title

### Progression
- 1 tier toutes les 3h de jeu actif OU 1 tier par achievement spécial du mois
- Pas de pay-to-progress : les tiers sont **uniquement** débloqués par le gameplay
- Accelerators (+2 tiers instantanés) dispos en rewarded ad, 1×/jour max

### Golden rule (from shark)
> "Players must experience the value before paying. Let them earn 2-3 free tiers first, then purchase retroactively."

→ le Challenge Pass est **gratuit à commencer**. Le premium track peut être acheté même au tier 10, tous les tiers gagnés sont retroactivement unlockés.

### First launch timing
**v1.1**, environ 4 semaines post-launch (quand la base a 2000+ DAU stable).

## Whale Path Roadmap (v1.2+)

Voir `docs/05-MONETIZATION.md` pour détail. Dans l'ordre :

- **v1.2 (3 mois post-launch)** : Blood Pact 19.99€ (all 3 skins + title "Eternal" + permanent +5% blood mult)
- **v1.2 (3 mois)** : Bloodline+ subscription 2.99€/mois (monthly exclusive skin + cloud save + ad-free)
- **v1.3 (6 mois)** : Bloodline Keeper 49.99€ one-time (disponible seulement pour joueurs ayant $100+ lifetime spend)
- **v2.0 (12 mois)** : VIP tier system avec 3 paliers spending ($50 / $200 / $1000)

## KPI tracking par event

Tracker via Firebase Analytics :
- `event_seen` (combien de DAU ont vu la promo event)
- `event_clicked` (combien ont cliqué l'offer)
- `event_purchased` (combien ont payé)
- `event_revenue` (total €)
- `event_retention_d1` (retention spike vs baseline)
- Funnel : seen → clicked → purchased

**Si un event converti < 1% des `event_seen`**, l'offre est mal positionnée. Itérer.

## Red flags à éviter (from shark anti-patterns)

- ❌ Faux timers qui resettent (brise confiance)
- ❌ Event pay-to-win dans un leaderboard
- ❌ Randomness dans les rewards premium (= loot box = légal risk)
- ❌ Dark pattern "acheter avant que ça finisse" sans fair warning
- ❌ Power-creep qui rend les anciens skins obsolètes visuellement
- ❌ Events exclusive "whales only" qui frustrent les F2P
