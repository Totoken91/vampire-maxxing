# 05 — Monétisation

## Philosophie

**Non-hostile.** Pub récompensée uniquement. IAPs cosmétiques exclusivement. Pas de pay-to-progress.

Le joueur F2P a accès à 100% du jeu. Les payeurs soutiennent le projet et se démarquent esthétiquement.

## Règles

- **Zéro pub intrusive.** Pas d'interstitiel, pas de banner, pas de pop-up commercial.
- **Toutes les pubs sont récompensées** et déclenchées par le joueur.
- **IAPs cosmétiques uniquement au MVP.**
- **Pas de dark pattern** : pas de fausse urgence, pas de timer artificiel.
- **Pas de monétisation en première session** — on laisse le joueur découvrir le jeu intact.

## Sources de revenus au MVP

### 1. Pub récompensée (AdMob Rewarded)

Langage in-game : les pubs sont appelées **"rites"** ou **"offerings"**, pour rester dans le ton.

| Contexte                        | Bouton UI                 | Récompense                        |
|---------------------------------|---------------------------|-----------------------------------|
| Bouton × BOOST pub variant      | **"SUMMON THE NIGHT"**    | Boost 2× pendant 2 min, no cooldown |
| Retour après > 30 min           | **"EMBRACE THE DAWN"**    | Offline 100% eff + cap 6h au lieu de 50%/4h |
| Au moment d'Ascend              | **"INVOKE THE CURSE"**    | × 2 Dread sur cet Ascend          |
| Daily gift                      | **"OFFERING"**            | Blood bonus aligned sur le rate actuel |

Implémentation : `@capacitor-community/admob`, IDs de test en dev, vrais en prod.

### 2. Starter Pack — "FIRST BLOOD OFFERING" (2.99€)

**LE produit FTB (first-time-buyer)** le plus important. Cf. playbook shark : 2× le FTB conversion = 2× la LTV.

**Conditions d'affichage** (voir `specs/ONBOARDING.md` pour détail) :
- Session 3-5 minimum
- Au moins 1 Ascend complété (moment de pain / premier plateau)
- Pas encore d'achat IAP
- Timer 72h depuis la première apparition (non-resettable)

**Contenu (8-15× face value minimum)** :
- 1 skin partiel : Nosferatu pack pour les 3 premières formes (Newborn, Elder, Lord of Night) — donne un signal "first collector"
- +50% blood/s **permanent** (stack avec Dread, jamais expiré)
- 10 "rites" offerts (= 10 rewarded ads pré-payés équivalents)
- Title permanent : "Early Awakening" (sous le rank dans le header)
- Badge médaillon ❦ doré à côté du nom

**Display** :
- Modal à l'ouverture de la 3e session (si conditions remplies)
- Prix barré : ~~8.99€~~ **2.99€** "FIRST-TIME ONLY"
- Timer 72h visible
- Label "— WELCOME TO THE BLOODLINE —" (langage de cadeau, pas d'urgence)

**Post-achat** : toast gratitude "— EMBRACED — Welcome, First Blood." puis le pack est retiré du store (one-time).

### 3. Ritual Bundle (4.99€)

**Pour combler le gap de pricing ladder** entre 2.99€ et 9.99€ (playbook shark — gaps de plus de 3× sont un perte de conversion).

**Disponible à partir de la session 7** (après Starter Pack purchase, ou après son expiration). Permanent dans Apothecary, pas de timer.

**Contenu** :
- 1 skin complet (choix du joueur : Nosferatu / Crimson / Void) — pour les 8 formes
- 5 Dread bonus (one-time, s'ajoute au Dread actuel)
- 30 "rites" offerts
- Title "Devout" permanent
- Animation particle pourpre sur le portrait (effect cosmétique permanent)

### 4. IAP cosmétiques — Skins individuels (Google Play Billing)

3 skins au MVP, tous à **2.99€** :

#### **Pack "NOSFERATU"** — *For the old soul*
- Palette : noir profond + blanc os + rouge carmin unique (expressionnisme allemand)
- Portraits variants : plus stylisés, angles durs, ombres dramatiques
- Thralls variants : silhouettes plus marquées
- Pour les 8 formes (8 portraits alternatifs)
- Sous-titre store : *"The original nightmare."*

#### **Pack "CRIMSON COURT"** — *For the aristocrat*
- Palette : rouge profond + or opulent + noir (baroque décadent)
- Portraits variants : plus ornés, dorures, pierreries
- Ornements UI : filigree plus chargés, couleur rouge-or
- Sous-titre store : *"Opulence. Decadence. Eternity."*

#### **Pack "VOID CULT"** — *For the cosmic horror*
- Palette : noir + violet profond + cyan glacier (horror cosmique)
- Portraits variants : plus eldritch, géométries occultes, tentacules
- Effets particules : pourpres au lieu de rouges
- Sous-titre store : *"Reality was never a promise."*

### 5. Founder Pack (9.99€, limité aux 90 premiers jours)
- Inclut les 3 skins ci-dessus
- Titre unique **"ORIGIN"** affiché sous le titre de forme (renommé pour ne pas clasher avec "FIRST BLOOD" du Starter Pack)
- Medaillon doré permanent à côté du nom
- +1 Dread bonus one-time (petit bonus gameplay, pas game-changing)
- Sous-titre : *"Among the first to awaken."*

### 6. Blood Pact (19.99€ — v1.2, whale tier)

**Pas au MVP** mais documenté pour la roadmap. Disponible post-launch v1.2 (3 mois après).

- All 3 skins (Nosferatu / Crimson / Void) si pas déjà possédés
- Title unique "Eternal"
- +10% blood/s permanent (stack avec Starter)
- Exclusive particle effect (choix : blood gold / cyan void / pourpre)
- Access prioritaire aux events saisonniers

Prix justifié par : whale transaction average = $20 selon playbook shark.

### 7. Bloodline Keeper (49.99€ one-time — v1.3, after $100 lifetime)

**Pas au MVP**. Déclenché automatiquement si lifetime spending > $100. One-time offer.

- 2-3 cosmetics uniques (non-disponibles ailleurs)
- Permanent small bonuses (+15% blood, +5% Dread gain)
- Title "Bloodline Keeper"
- Medal visible sur le header

Conversion attendue : 15-25% des $100+ spenders (playbook shark).

## Placements UI

### Store access
- Icône **❦** (fleur gothique or) en haut à droite du header
- Ouvre un modal "APOTHECARY" (nom in-game du store)
- Layout : 3 cartes de skins en grid, chacune avec preview animé du portrait + prix
- Bouton RESTORE PURCHASES en bas

### Rewarded ad buttons
- Toujours un label clair avec icône ▶ ou ◆
- Jamais de popup auto-play
- Premier placement (offline claim) : **après la 2e session**, jamais en première
- Fallback si ad fail : toast discret "THE RITE FAILED"

## Projections

### Target MVP (soft launch, 1-2 mois post-launch)

**Hypothèse : 500-1000 DAU stables, sans starter pack optimisé encore.**

| Source           | ARPDAU estimé | Revenu mensuel (1000 DAU) |
|------------------|---------------|---------------------------|
| Pub récompensée  | 0.05€/DAU     | 1500€                     |
| IAP cosmétiques  | 0.03€/DAU     | 900€                      |
| **Total MVP**    | **0.08€/DAU** | **~2400€**                |

Benchmark genre idle : median ARPDAU = 0.05-0.10€. Notre 0.08€ = **sain pour MVP**.

### Target v1.1 (after Starter Pack + LiveOps + Battle Pass)

**Hypothèse : 2000 DAU, monétisation optimisée.**

| Source           | ARPDAU estimé | Revenu mensuel (2000 DAU) |
|------------------|---------------|---------------------------|
| Pub récompensée  | 0.07€/DAU     | 4200€                     |
| Starter/Ritual   | 0.05€/DAU     | 3000€                     |
| Battle Pass      | 0.03€/DAU     | 1800€                     |
| LiveOps events   | 0.02€/DAU     | 1200€                     |
| **Total v1.1**   | **0.17€/DAU** | **~10200€**               |

Cible v1.1 dans le top 25% des idle casual (benchmark shark : top 25% = 0.18€).

### Target v1.2+ (avec whale path 19.99€ et subscription)

**Hypothèse : 3000 DAU, whale path actif.**

- ARPDAU target : **0.22€+**
- Revenu mensuel : ~20000€

Le thème viral devrait permettre un CTR plus élevé sur le Play Store que Cosmic Forge, et le contenu TikTok organique devrait réduire la dépendance au UA. Les projections v1.1+ supposent que le LiveOps calendar (`docs/08-LIVEOPS-PLAN.md`) est exécuté.

## Ce qu'on NE fait PAS

- ❌ IAP de progression (pas de "pack 1000 Dread")
- ❌ Pub interstitielle
- ❌ Pub au lancement de l'app
- ❌ Notifications push commerciales
- ❌ Limite quotidienne F2P
- ❌ Currency premium (gems) en plus de Dread
- ❌ Loot boxes / gacha
- ❌ Abonnement au MVP (v1.2+ avec "Bloodline+" à 2.99€/mois : cosmétiques mensuels + cloud save + pas de pub)

## Conformité

- **Google Play** : déclarer ads + IAPs dans Play Console
- **GDPR** : UMP consent flow au premier lancement en EU
- **RGPD enfants** : "not made for kids" (thème vampire/blood = pas family-friendly de toute façon). Rating PEGI 12+ visé.
- **Privacy policy** : template dans `specs/PRIVACY-TEMPLATE.md`, hébergée sur domaine dédié
- **Content rating** : déclarer "moderate violence" (fangs, blood motifs), "no drugs", "no nudity"

## ASO (App Store Optimization) — Play Store Listing

### Title (max 30 chars)
```
Vampire Maxxing: Gothic Idle
```
(27 chars — passe sous la limite, inclut le genre hint pour le search Google Play)

### Short description (max 80 chars)
```
Evolve your vampire. Rise in the bloodline. An idle of eternal hunger.
```
(68 chars, benefit-led)

### Long description (max 4000 chars) — 167 premiers critiques
```
Become something. In VAMPIRE MAXXING, you evolve from pale Newborn
to Horror Incarnate through 8 visible forms. Tap to feed, summon
thralls, ascend the bloodline.

━━━━━━━━━━━━━━━━━━━━━━━
GOTHIC PREMIUM IDLE
━━━━━━━━━━━━━━━━━━━━━━━

✦ 8 VAMPIRE FORMS to evolve through
✦ Hand-painted portraits, not generic UI
✦ 8 hollow servants to command
✦ Eternal prestige system: ASCEND THE BLOODLINE
✦ Offline progress: your thralls feed while you sleep
✦ Premium feel, no pay-to-win, no forced ads

━━━━━━━━━━━━━━━━━━━━━━━
HOW YOU PLAY
━━━━━━━━━━━━━━━━━━━━━━━

Tap to feed. Claim thralls. Watch them serve you across centuries.
When your Hunger grows too large, ASCEND to a higher form and
begin again, stronger than before.

━━━━━━━━━━━━━━━━━━━━━━━
RESPECTFUL MONETIZATION
━━━━━━━━━━━━━━━━━━━━━━━

- No pay-to-progress
- All ads are optional and rewarded
- IAPs are cosmetic only
- Your time is not held hostage

The Thirst never ends. Your bloodline awaits.
```

### Graphics requirements
- **App icon** : 512×512, distinctive à 48px, A/B test au moins 2 versions (vampire silhouette vs ornate ❦ vs portrait cropped)
- **Feature graphic** : 1024×500, hero shot avec le portrait Lord of Night dans le frame baroque + titre gothic
- **Screenshots (8)** : 1080×1920 chacun
  1. Gameplay hero shot (le mockup canonique)
  2. Un moment d'Ascension (transition cinématique)
  3. Une forme avancée (Methuselah ou Progenitor)
  4. Les thralls list avec quelques palliers gagnés
  5. Le store Apothecary avec les 3 skins
  6. Un skin actif (Crimson par ex.)
  7. Un achievement screen ("YOU HAVE LOOKSMAXXED")
  8. Un offline modal "YOU SLEPT THROUGH THE DAWN"

### Localization (minimum)
- EN (primary)
- FR (Kenny native, easy)
- DE, ES, PT-BR (high-ROI)
- JA, KO (vampire theme = fort en Asie)

Chaque locale fully-localized = +15-30% install lift (playbook shark).

### Category / Tags
- Primary : **Casual → Idle**
- Tags : `roleplaying`, `idle clicker`, `gothic`, `adventure`, `dark fantasy`

### Reviews / Rating strategy
- **Ne pas prompt for review en first session**. Trigger après la 1ère Ascension réussie (moment émotionnel haut).
- Modal non-bloquant : "Did you enjoy your first Ascension? [★★★★★ Rate] [Not now]"
- Si le joueur met ≥ 4 étoiles → prompt Play Store review
- Si < 4 étoiles → le redirige vers email feedback (évite les reviews négatives publiques sans réponse)
- Répondre aux negative reviews sous 48h (Google weighte ça dans le ranking)

## Roadmap de monétisation post-MVP

- **v1.0 (MVP)** : Rewarded ads (4 variants) + Starter Pack 2.99€ + Ritual Bundle 4.99€ + 3 skins 2.99€ + Founder Pack 9.99€
- **v1.1 (4 semaines post-launch)** : Challenge Pass 4.99€ / 4 semaines (voir `docs/08-LIVEOPS-PLAN.md`) + Halloween skin pack saisonnier
- **v1.2 (3 mois)** : Blood Pact 19.99€ (whale tier) + Bloodline+ subscription 2.99€/mois (monthly skin + cloud save + ad-free)
- **v1.3 (6 mois)** : Bloodline Keeper 49.99€ one-time (automatically offered to $100+ lifetime spenders)
- **v2.0 (12 mois)** : iOS build + VIP tier system ($50/$200/$1000 thresholds) + pass saisonnier narratif (30-day story event)
