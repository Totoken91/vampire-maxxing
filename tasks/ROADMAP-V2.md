# ROADMAP V2 — Phases A → E (post-nav-refactor)

> État au 2026-04-24 — **course correction V1.2** (voir `VAMPIRE_MAXXING_THRALLS_V1.2_GACHA_FINAL.md`) :
> - 🆕 Phase **M** (balance overhaul) insérée — fix runaway feedback loop sur Dread (log mult + form-gated cap + offline exclusion).
> - 🆕 Phase **L** (Thralls Gacha MVP) insérée — Ichor currency, banners Standard/Featured, pity + FRG, Essence + étoiles, ladder packs 7 tiers, disclosure légale.
> - Phase **H** (Sanctum post-launch) **absorbée dans Phase L** — plus de roster Sanctum post-launch, tout ship en MVP.
> - Phase **D** (pack ladder) : le contenu est transféré dans L10/L11, D1 (Billing infra) reste standalone.
> - Kill-list "pas de 3e currency MVP" **révoquée** — Ichor EST la 3e currency au MVP (plate, non-inflationniste, pull-only).
>
> État pré-V1.2 : J1–J10 + J12 partiels faits, K1/K4/K5 ✓, L0-L2 ✓ (rename servants + PlayerThrallState + locked/owned Sanctum). v1.0.0 en closed testing.
>
> **Principe directeur** : chaque élément affiché à l'écran doit avoir une fonction. Tout ce qui est mocké "pour le look" devient vraiment jouable — ou est coupé.
>
> Numérotation en phases (A/B/C/D/E) parce qu'on est sorti du cadre strict "12 jours" depuis longtemps.

---

## Sommaire

| Phase | Tickets | Focus |
|-------|---------|-------|
| **A — Fix ship-blockers** | A1, A2 | Progressive disclosure, INVOKE, cooldowns, UX laws, juice tab |
| **B — Meta progression** | B0a, B0b, B1, B2 | Archi prep + upgrades = dread sinks, Shop a un sens |
| **C — Content depth** | C1, C2 | Tome = codex vivant, Servants = gestion réelle |
| **K — MVP readiness (v1.1 prod target)** | K1, K2, K3, K4, K5 | Century VFX scaling, IAP Play Billing, FTB popup, Milestone juice, Daily gift |
| **🆕 M — Balance overhaul (ship-blocker)** | M1, M2, M3 | Fix runaway Dread, log multiplier, form-gated cap, offline exclusion |
| **🆕 L — Thralls Gacha MVP (V1.2)** | L1–L15 | Ichor + Power Level + Banners + Pity + Essence/Stars + Packs + Disclosure |
| **D — Monétisation réelle** | D1 | Play Billing infra (pack contenu → L10/L11) |
| **E — Release prep** | E1, E2, E3, E4 | i18n, audio compression, ASO, AAB internal track |

**Note** : la phase K a été ajoutée suite à l'audit croisé des 3 skills (idle-expert / monetization-shark / ux-sensei) le 2026-04-22. v1.0.0 est en closed testing mais manque les pilonnes monetization + retention pour un vrai MVP. K = ce qui doit shipper en v1.1.0 AVANT Production release. D1+D2+D3 chevauchent avec K2 et seront mergés.
| **F — Post-launch #1 : Map & Regions** | F1, F2, F3 | Premier axe d'expansion horizontal, events narratifs |
| **G — Post-launch #2 : Awakenings** | G1, G2 | VFX overlay system + 5 états transcendants post-Thirst |
| **H — Post-launch #3 : Unique Thralls (Sanctum)** | H1, H2, H3 | Roster de personnages nommés, cartes 2:3 collection |
| **I — Post-launch #4 : Aspects of The Thirst** | I1, I2 | 5 color variants + build specialization |
| **J — Post-launch #5 : Generations (Crimson Chronicles)** | J1, J2, J3 | 2e bloodline (Gen 2) + Ancestors + Ancestral Blood currency |
| **LiveOps continu** | — | Events saisonniers toutes les ~2 mois (Halloween / Christmas / Valentine / Summer / anniversary) |

Ordre strict : faire A avant B avant C… Les dépendances suivent cet ordre (B utilise le gating de A, D utilise le shop de B, E dépend du tout). **Phases F→J sont post-launch** et démarrent après E4 (AAB live en Internal Testing stabilisé).

> Voir `docs/09-ARCHITECTURE-EXTENSIONS.md` pour les 3 flexibilités structurelles (portrait overlays, modifier registry, save extensible) qui débloquent Phases F→J sans refactor lourd. Les prep tickets B0a et B0b posent ces fondations.

---

## Design réajusté des systèmes

### Currencies (V1.2 — triple-wallet)

| Currency | Rôle | Nature | Source | Spendable ? |
|---|---|---|---|---|
| 🩸 **Blood** | Soft currency du run, achats servants | Réserve bigint, reset à chaque ascend | Génération passive + tap | ✓ |
| ⚫ **Ichor** | Currency de pulls (rituels) | Réserve **plate** (cap soft 1000), 5-7/jour F2P actif | Daily quest, login chain, ads, milestones, achievements, IAP | ✓ |
| ⬢ **Dread Level** | Power Level / rank permanent | Rang entier (pas de "réserve"). Donne mult Blood global | Ascend (avec cap per Form, voir Phase M) | **Non spendable** — c'est un rank, pas une pièce |

**Layout HUD décidé** :
- Ichor = top-right (place actuelle de Dread) — currency spendable → placement visible pour friction min sur les pulls.
- Dread Level = badge juste en dessous d'Ichor, label permanent `×N.NN Blood Mult` — chiffres arabes (pas romains, trop galère à lire selon Kenny), format `DREAD LEVEL 12`.
- Blood = top-left comme aujourd'hui.

**⚠️ Implication à résoudre en M1** : les upgrades meta du Shop (B2) consomment actuellement du Dread. Si on sémantise Dread en "rank non-spendable", il faut soit (a) ajouter une sub-currency "Ascend Points" gagnée à l'ascend, (b) migrer les upgrades sur Ichor (mélange les deux économies), (c) garder Dread dual (rank affiché + réserve internal). Option (a) est la plus propre. Décision à valider en M1.

### Shop — restructuré

**Offers (IAP réels, €)** — 3 packs, Playbook 1 + 5 :
| Pack | Prix | Contenu | Rôle |
|------|------|---------|------|
| **Night's Blessing** | 1,49 € | +100% offline efficiency × 24h | Impulse buy (Playbook 1 : entry-level) |
| **Starter Pact** | 2,99 € | 20 Dread + "First Blood" title + +5% thrall rate permanent | FTB anchor (Playbook 1) |
| **Founder Pact** | 9,99 € | Exclusive frame + "Founding Elder" title + 50 Dread + -5% cost mult permanent | Whale anchor (Playbook 5, limité 90j) |

Plus tard (post-launch) : **Bloodline Keeper 19,99 €** (whale), **Ritual Bundle 4,99 €** (mid-tier).

**Upgrades (Dread sinks, permanents)** — 5 upgrades qui remplacent les "Altar Expansion / Servant Training" du mockup, tous utiles :

| Upgrade | Levels | Effet | Coût (par level) | Justification |
|---------|--------|-------|------------------|---------------|
| **Blood Altar** | 0→5 | Auto-claim passif toutes les 4h → 1h (lv 5) d'un round de blood | 10 / 25 / 60 / 150 / 400 dread | Automation (idle-expert Playbook) |
| **Servant Loyalty** | 0→10 | +5% production thralls par level (max +50%) | 5 / 10 / 20 / 40 / 80 / 160 / 320 / 640 / 1280 / 2500 | Multiplier progression sink |
| **Bloodline Scholar** | 0→5 | Cost mult 1.15 → 1.10 (−0.01 par level) | 15 / 40 / 100 / 250 / 600 | Quality of life, énorme late-game |
| **Dread Amplifier** | 0→3 | +10% dread gain sur ascend par level | 25 / 80 / 250 | Meta-meta boost |
| **Offline Keeper** | 0→3 | +1h offline cap (4h → 7h) | 20 / 60 / 200 | Retention mechanism |

**Total dread à drop pour full-upgrade** : ~6000 dread → ~30-50h de jeu sérieux. Endgame propre.

### Rites — cooldowns réels

| Rite | Effet | Cooldown | État |
|------|-------|----------|------|
| **Summon the Night** | ×2 boost × 2 min | 60s (existant) | ✓ câblé J10 |
| **Offering** | +10 min de production instantanée | **4h** (à ajouter) | ⚠️ manque CD |
| **Invoke the Curse** | ×2 dread sur prochaine ascension | 1 usage par ascend | ❌ à coder |
| **Embrace the Dawn** | +2h offline à 100% efficiency | Déclenché par le offline modal uniquement (non cliquable ici) | ✓ câblé J10 |

### Tome — vrai codex

| Section | Contenu | Unlock |
|---------|---------|--------|
| **Chronicle** | Dread, Ascensions, Blood lifetime, Playtime, Taps, Crits | Default |
| **Achievements** | Grille 20 cards | Default |
| **Bestiary** | 8 entrées de lore (1 par thrall) avec flavor text narratif | Unlock au 1er achat de chaque thrall |
| **Histories** | 8 entrées sur chaque forme vampire (paragraphes dark academia) | Unlock à chaque forme atteinte |
| **Run log** | 10 derniers runs (durée, blood max, dread gagné) | Après 3 ascensions |

### Servants — gestion réelle

- **Per-thrall tap** → modal détail : nom, lore, stats (total produit, % du rate global), et les upgrades de ce thrall
- **Mass-buy** : boutons ×1 / ×10 / ×25 / MAX
- **Thrall milestones** (intra-run) : à 10/25/50/100/200/300/400 possédés, mult cumulé ×2 → ×1080 (déjà dans la balance, juste à afficher)

### Bloodline — trim

- Garder portrait + blood + ascend
- Liste thralls **condensée** : afficher seulement **3 tiers** (dernier possédé + actuel en cours de buy + prochain à débloquer). La liste complète part dans Servants.
- Free up visual space for the portrait to breathe.

---

## Phase A — Fix ship-blockers

### A1 — Progressive disclosure + INVOKE + UX laws

**Why** : l'audit montre 5 tabs visibles session 1 = paralysie Playbook 6. Shop visible session 1 = anti-pattern monétisation. 4 rites = 1 wired = 3 coming soon = "le jeu est cassé". × close 28px = violation Law 4.

**Scope**
- Gating progressif des tabs (flags in state.ts + tab-bar masque les locked)
  - BLOODLINE : visible d'entrée
  - SERVANTS : unlock après 1er achat de thrall
  - RITES : unlock après 1ère ascension
  - TOME : unlock après 3 achievements unlockés
  - SHOP : unlock après 3ème ascension (ou 1h de play, premier des deux)
  - Animation "tab apparaît" : petit fade + glow doré 400ms
- **INVOKE THE CURSE** wired :
  - Ajouter `pendingCurseMult: number` dans state
  - Rite "INVOKE" consomme 1 ad → set `pendingCurseMult = 2`
  - `ascend()` utilise `pendingCurseMult` comme rewardedMultiplier puis reset à 1
  - UI rite card : badge "Active" quand pendingCurseMult > 1
- **OFFERING cooldown** 4h :
  - Ajouter `ritesLastUsed: { [id]: timestamp }` dans state
  - UI rite card montre "Available in 3h 24m" quand en CD
  - Persiste dans save (survit offline)
- UX laws fix :
  - × close tous les modals : 48×48 touch target (icône reste petite visuellement)
  - Rites empty-state : "Rites awaken as your power grows." quand aucun utilisable
  - Tab transition 260ms → 180ms

**Definition of done**
- Nouveau joueur ne voit que BLOODLINE au lancement
- Les 4 rites sont tous utilisables (3 manuels + 1 contextuel offline)
- × de l'ascend modal tappe sans rater
- OFFERING ne peut pas être spammé

### A2 — Notification dots + shop clean-up + polish juice

**Why** : discoverability (le joueur doit savoir qu'un rite est prêt, qu'un achievement l'attend). Shop actuel "Coming soon" sur tout = anti-pattern Playbook 1. Juice manquante sur tab switch.

**Scope**
- **Notification dots** sur tab bar :
  - RITES : dot rouge quand au moins 1 rite utilisable et non-used-since-available
  - TOME : dot quand achievement unlocké non consulté
  - SHOP : dot quand nouvelle offer apparaît (prep pour D2 FTB popup)
  - Store `viewedRiteAvailable: timestamp`, `viewedAchievement: Set<id>`, `viewedOffers: Set<id>` in save
- **Shop clean-up** :
  - Cacher la section "SPECIAL OFFERS" entièrement jusqu'à D1 (placeholder "Offers open soon — rites first")
  - Afficher juste la section "UPGRADES" avec les 5 dread sinks → mais encore disabled (câblés en B2)
  - Wallet affiche seulement Dread (blood redondant, déjà dans la top bar) — OU repositionne blood pill quand c'est le prix d'un upgrade
- **Juice** :
  - Haptic light sur tab switch (vibrate 4ms)
  - Haptic medium sur rite activé (successful)
  - Screen-flash subtle quand tab unlock (nouveau tab révélé)
  - Shimmer sweep CSS sur shop card qui devient affordable

**Definition of done**
- Dots apparaissent/disparaissent selon état
- Shop affiche une section claire, aucune card disabled-with-no-meaning
- Tab switch a un tap de haptic

---

## Phase B — Meta progression (donner sens au Shop)

### B0a — Modifier registry (archi prep)

**Why** : à terme on va empiler modifiers de plusieurs sources (upgrades B1, régions F, awakenings G, aspects I, generations J). Coder ça en dur dans state.ts = dette technique garantie. Poser le registry maintenant rend toutes les phases suivantes triviales à intégrer.

**Scope**
- `src/game/modifiers.ts` : `ModifierRegistry` exposing `register(source, target, op, value)`, `unregister(source)`, `getMultiplier(target): number`, `getAdditive(target): number`.
- Targets supportés au MVP : `'thrallRate'`, `'thrallCost'`, `'clickPower'`, `'dreadGain'`, `'offlineCap'`, `'globalMult'`.
- Ops supportées : `'mult'` (multiplicatif, combiné en produit), `'add'` (additif, combiné en somme), `'addLevel'` (pour scaling par level).
- Refactor `getTotalRate()` + `thrallCost()` + `dreadGain()` pour consommer le registry au lieu de constantes en dur.
- Les constantes existantes (`COST_MULTIPLIER = 1.15`, etc) restent les valeurs de base ; le registry applique des deltas par-dessus.
- Tests : `modifiers.test.ts` avec register/unregister/compose.
- **Cap logarithmique** sur le produit final des globalMult pour éviter le power creep inter-features (cf. anti-pattern Monetization-shark).

**Definition of done**
- `getTotalRate()` identique output qu'avant sur un registry vide
- Register un modifier test (`+50% thrallRate` from source `'test'`) → rate augmente de 50%
- Unregister → rate revient
- Tous les tests existants toujours verts

### B0b — Portrait overlay stack (archi prep)

**Why** : Phase G (Awakenings) va empiler des VFX sur le portrait (halo doré, silhouettes fantômes, background animé). Phase J (Generations) va ajouter silhouettes ancêtres en background. Si le portrait component reste un simple `<img>`, chaque ajout casse le layout. Prep = pose un slot `.portrait__overlays` vide mais prêt.

**Scope**
- Refactor `src/ui/components/portrait.ts` : wrapper le `<img>` dans `.portrait__canvas` avec trois layers empilables :
  - `.portrait__overlay--back` (z-index: 0) — silhouettes ancêtres, aura cosmique (Gen J)
  - `.portrait__image` (z-index: 1) — l'image du portrait (existant)
  - `.portrait__overlay--front` (z-index: 2) — halo, particules, glitches (Awakenings G)
  - `.portrait__frame` (z-index: 3) — le cadre baroque existant
- Exposer `portrait.addOverlay(id, layer, el)` et `portrait.removeOverlay(id)` pour que les phases futures puissent injecter sans toucher portrait.ts.
- Ne rien dessiner de visible ici — les slots sont vides. Le système est testable via console : `vm.portrait.addOverlay('test', 'front', someDiv)`.
- Les animations existantes (dissolving/materializing classes) restent sur `.portrait__image`.

**Definition of done**
- Visuellement identique à avant (aucune régression)
- 3 layers accessibles via API publique
- Console test ajoute un div rouge dans `front` → visible devant l'image, derrière le frame

### B1 — Upgrade system data + state

**Why** : le Shop doit avoir une fonction réelle, pas juste un layout. Les 5 upgrades proposés (Blood Altar / Servant Loyalty / Bloodline Scholar / Dread Amplifier / Offline Keeper) sont les dread sinks qui donnent un vrai endgame (30-50h de jeu). Idle-expert : "prestige currency doit avoir des sinks permanents, sinon le meta-loop est vide".

**Scope**
- `src/game/config/upgrades.ts` — 5 upgrades with levels + costs + effects
- State : `upgrades: Record<UpgradeId, { level: number }>` (persisté)
- `buyUpgrade(id)` : vérifie dread ≥ cost, décrémente, incrémente level, emit event, **re-publie les modifiers dans le ModifierRegistry (B0a)**
- Les effets passent TOUS par le registry (source = `'upgrade:<id>'`) :
  - **Blood Altar** : pas un modifier direct — utilise un timer/heartbeat qui déclenche un auto-blood-gain. Lv 0 = OFF, lv 1 = 4h CD, lv 5 = 1h CD. Amount = rate × 60s × (1 + level × 0.2).
  - **Servant Loyalty** : `register('upgrade:servant_loyalty', 'thrallRate', 'mult', 1 + level × 0.05)`
  - **Bloodline Scholar** : `register('upgrade:bloodline_scholar', 'thrallCost', 'add', -level × 0.01)` → le `getEffectiveCostMultiplier()` retourne `1.15 + additive`
  - **Dread Amplifier** : `register('upgrade:dread_amplifier', 'dreadGain', 'mult', 1 + level × 0.1)`
  - **Offline Keeper** : `register('upgrade:offline_keeper', 'offlineCap', 'add', level)` (en heures)
- Tests : `upgrades.test.ts` pour chaque formule + un test d'intégration avec le registry
- Save migration : bump SAVE_VERSION 1 → 2, migrer v1 → v2 avec upgrades all level 0

**Definition of done**
- Les 5 upgrades sont achetables via console : `vm.gameState.buyUpgrade('servant_loyalty')`
- Les effets sont visibles (rate bumps, cost baisse, etc.)
- Save v1 migre proprement vers v2

### B2 — Shop UI wire + upgrade card component

**Why** : B1 a construit la plomberie, B2 rend le Shop utilisable par le joueur normal.

**Scope**
- `UpgradeCard` component : icon + title + description + level indicator (◆◆◆◇◇ style) + cost + disabled si unaffordable
- ShopTab restructuré :
  - Section "SPECIAL OFFERS" : placeholder "Opens on launch" jusqu'à D1
  - Section "UPGRADES" : 5 UpgradeCards, chacun affiche level actuel / max + next cost
  - Click affordable → achat confirmé + toast + haptic medium + card re-render
- Juice : particle doré sur achat upgrade + sound cue
- Blood Altar : affiche timer "Next claim in 2h 14m" quand level > 0
- Cacher le wallet blood (garder juste dread pill)

**Definition of done**
- Joueur peut dépenser dread dans les 5 upgrades
- Chaque upgrade visible donne un effet ressenti en jeu
- Blood Altar fait un auto-claim visible (toast "+X blood from the altar")

---

## Phase K — MVP readiness (v1.1.0 prod target)

Audit 2026-04-22 a identifié 3 trous critiques pour un MVP monétisé :
1. Zéro IAP → -70% revenue
2. Progression intra-forme (Century I → V) invisible → violation Law 2 (tease next unlock)
3. Pas de D2/D3 retention hook → D7 retention projeté < 10%

Ces 5 tickets ferment ces trous. Ship en v1.1.0 au moment du promote Production.

### K1 — Century VFX progressif (awakening-style, autour du portrait)

**Why** : actuellement la Century I/II/III/IV/V dans une même forme n'apporte aucun feedback visuel au-delà du chiffre romain du titre. Le joueur grind 3-7 ascends sans sensation de power up jusqu'au form bump. Kenny's intuition : VFX ambiants **autour** du portrait (pas dessus) qui scalent par Century, à la manière des Awakenings de The Thirst mais pour tous les cycles.

**Scope**
- `src/fx/century-aura.ts` — controller qui spawne des particules AUTOUR du portrait (pas sur l'image). Lit `getCenturyInForm()` à chaque tick, ajuste les spawners.
- 3 nouvelles classes de particules dans le particleEngine existant :
  - `CenturyEmber` — braises rouge/or qui montent depuis sous le portrait, traversent l'espace hors du cadre
  - `CrimsonDrip` — gouttes de sang qui tombent depuis les bords du cadre baroque
  - `GoldMote` — petits éclats dorés orbitant lentement dans l'espace latéral du portrait
- Progression par Century :
  - **Century I** : base, pas de VFX ajoutés (embers globaux existants restent)
  - **Century II** : embers spawn rate +1/s autour du portrait
  - **Century III** : + crimson drips occasionnels des coins du cadre + aura rouge sur le cadre
  - **Century IV** : + gold motes orbitant + drips plus fréquents
  - **Century V** (imminent form bump) : intensité max, teasing imminent du form bump
- Hook : Portrait component onMount/teardown → start/stop de l'aura. Re-read century au event `ascended`.

**Definition of done**
- Century II vs I : différence visuelle claire (embers flottent visiblement autour du portrait)
- Century V : on SENT que la form bump est imminente (densité et intensité des VFX)
- Aucun VFX ne touche l'image du portrait elle-même, tout vit dans l'espace autour
- Particles comptent dans le budget < 200 particules simultanées
- Performance 60fps stable

### K2 — IAP Google Play Billing + 3 packs

**Why** : shipper sans IAP = plafond revenue $300-500/mois. Avec 3 packs de base = $1500-3000/mois même DAU équivalents. Playbook 1.

**Scope**
- Pré-requis Kenny : Play Console merchant account activé + 3 produits IAP déclarés
  - `vm_nights_blessing` 1.49€
  - `vm_starter_pact` 2.99€
  - `vm_founder_pact` 9.99€
- Code : `@capacitor-community/in-app-purchases` (ou équiv récent), wrapper `src/platform/iap.ts` avec dynamic import (même pattern que ads.ts)
- State : `ownedIAPs: Set<string>`, `iapFlags: { firstBlood: boolean, foundingElder: boolean, blessingUntil: number }`
- Effects à l'achat :
  - Night's Blessing → offline efficiency = 1.0 pendant 24h
  - Starter Pact → +30 dread + title "First Blood" + register modifier `upgrade:iap_starter` = +5% thrallRate permanent
  - Founder Pact → +50 dread + title "Founding Elder" + register modifier `-5% cost mult` permanent + exclusive portrait frame cosmetic
- Restore purchases button dans le menu ⚙

**Definition of done**
- 3 packs achetables en test track via Play Console sandbox account
- Effets appliqués au purchase + persistés dans save
- Restore marche après wipe/reinstall

### K3 — FTB Starter Pact popup

**Why** : Playbook 1. Sans popup au bon moment, FTB conversion tombe à ~1%. Avec, elle passe à 3-5%.

**Scope**
- Trigger : après 3ème ascend OR 1h totalPlayTime (premier atteint)
- One-shot modal "A rite awaits you..." avec offer Starter Pact 2.99€
- Displays "Total value: 8.97€ → Now 2.99€" (value slashed)
- Timer 72h visible (mais ne reset jamais si rate)
- Flag persistant `firstOfferShown: true`
- Post-purchase : gratitude toast + plus d'offre avant 24h

**Definition of done**
- Popup se déclenche une seule fois, au bon moment
- Tap buy → Play Billing → purchase flow standard
- Si refuse, l'offer reste accessible dans le Shop tab pendant 72h avec countdown visible

### K4 — Milestone celebrations

**Why** : actuellement quand tu achètes le 10ème Stray Rat (milestone ×2 silencieux). Aucune juice = missed Playbook 5 progression feedback.

**Scope**
- Détecter les milestones en `buyThrall()` : 10 / 25 / 50 / 100 / 200 / 300 / 400
- Emit `milestone-reached` event avec { thrallId, milestone, newMult }
- Toast premium : `STRAY RAT · ×4` + flavor line + particles dorées autour de la thrall-card
- Screen-shake micro 2px
- Haptic medium
- Sound cue dédié

**Definition of done**
- Chaque milestone donne un moment "wow"
- Pas de spam (délai min entre toasts si plusieurs milestones d'un coup)

### K5 — Daily login gift

**Why** : zéro hook D2-D7. Retention idle médiane sans daily = ~10% D7. Avec daily login streak = 18-22% D7.

**Scope**
- Au boot, si `lastDailyGift < today 00:00` : affiche modal "DAILY TRIBUTE — Day N / 7"
- Reward ramping sur 7 jours :
  - J1 : +1h rate offert (applied via offline gain)
  - J2 : +1 dread
  - J3 : +2h rate
  - J4 : +2 dread
  - J5 : +4h rate
  - J6 : +5 dread
  - J7 : +10h rate + titre "Seven Nights"
- Reset au J8 (boucle)
- Save : `dailyStreak: { lastClaim: timestamp, day: number }`
- Skip un jour = reset day à 0

**Definition of done**
- Chaque boot du jour montre le modal une fois
- Série persiste entre sessions
- Skip propre (si tu rates un jour, day revient à 0)

---

## 🆕 Phase M — Balance overhaul (ship-blocker)

**Context** : observé par Kenny le 2026-04-24 après 2 jours de jeu léger + 1 nuit offline → **3375 Dread accumulés** en partant de 0. Target design (`docs/04-BALANCE.md:151`) était 6 Dread en 60min de Run 1 → le jeu est **~500× au-dessus** du barème. Cause : runaway feedback loop.

**Diagnostic** :
1. `globalMult = 1 + dread × 0.10` → linéaire en Dread → chaque prestige rend la prochaine course exponentiellement plus rapide.
2. `dreadGain = floor(sqrt(totalRunBlood / 1e6) × 2)` → sqrt n'amortit pas parce que le ceiling Blood lui-même saute d'un ordre de grandeur à chaque run.
3. Offline overnight (4h cap) + générateurs achetés = Blood hors barème au réveil → drop massif de Dread au next ascend.

**Fix** (combinaison A+B+E validée par Kenny) :

### M1 — Log multiplier + Dread as pure rank + upgrade prune (ship-blocker)

**Décision prise 2026-04-24 après synthèse 4 skills (idle-expert / gacha-expert / ux-sensei / monetization-shark)** :
Option **(c) refined** — Dread devient un pur rank non-spendable. Le système d'upgrades meta est démantelé : 4 des 5 upgrades sont déjà couvertes par des effets de thralls V1.2 (Velmor → auto-collect, Nox/Mirella → Blood gen %, Lilith/Crypt Warden → offline cap). La 5e upgrade unique (Bloodline Scholar, -cost mult) devient un bonus de milestone débloqué automatiquement par paliers de Dread Level, gratuit. Dread Amplifier (+dread gain/ascend) est supprimée (dangereuse vs. M2 cap par forme). Aucune nouvelle currency ajoutée.

**Scope**

- `src/game/math.ts` : remplacer `globalMult = 1 + 0.10 × d` par `globalMult = 1 + log2(1 + d)`.
  - d=0 → ×1.00
  - d=10 → ×4.5 (courbe agressive early, early Dread hyper récompensé)
  - d=100 → ×7.7
  - d=500 → ×10.0
  - d=1000 → ×11.0
  - d=3375 (save actuelle Kenny) → ×12.7 au lieu de ×338 — correctif massif intentionnel.
- `BALANCE.DREAD_MULT_COEF: 1.0` (renommé depuis `DREAD_MULT_PER_UNIT: 0.1`).
- **Dread devient monotonically increasing** : on supprime `GameState.spendDread()`. Le champ `dread` du save reste (c'est maintenant le rank, pas une réserve).
- **Upgrades prune** (`config/upgrades.ts`) : suppression de `blood_altar`, `servant_loyalty`, `dread_amplifier`, `offline_keeper`. Ces effets sont redondants avec les thralls V1.2 ou dangereux.
- **Bloodline Scholar migré en milestone** : nouveau module `src/game/milestones.ts` qui publie le modifier `servantCost -0.01/level` via `ModifierRegistry`. Paliers débloqués automatiquement : Dread Level 10/25/50/100/200 → level 1/2/3/4/5 du Scholar effect.
- Update affichage : `Dread × 12` → `DREAD LEVEL 12` + label `×4.52 Blood Mult` toujours visible (voir HUD layout V1.2). Chiffres arabes (pas romains).
- Tests `math.test.ts` : assertions sur 5 points de la courbe log, non-régression existantes mises à jour.
- Tests `upgrades.test.ts` : purger les upgrades supprimées, ajouter tests Scholar-via-milestones.
- Tests `save.test.ts` : migration v3 → v4 strippe les upgrade keys obsolètes, tolère les saves avec Scholar levels legacy (ignorés — Scholar est auto-granted).

**Definition of done**
- Old save avec Dread=3375 doit rester jouable (le mult passera de ×338 ridicule à ×2.18 raisonnable — c'est un correctif intentionnel, pas de compensation nécessaire en closed testing).
- Balance sim : Run 1 = 45-60 min pour 6-10 Dread (match design target).
- Sim Run 5 = ~15 min pour 15-25 Dread (progression croissante mais pas explosive).

### M2 — Form-gated Dread cap per Ascend

**Scope**
- Ajouter `BALANCE.DREAD_GAIN_CAP_PER_FORM: { NEWBORN: 10, FLEDGLING: 15, THRALL: 20, ELDER: 30, LORD_OF_NIGHT: 50, METHUSELAH: 75, PROGENITOR: 120, TERA_OVERLORD: 200, HORROR_INCARNATE: 350, THIRST: 600 }`.
- `math.ts:dreadGain()` → min de (sqrt formula, cap_for_current_form).
- Gate narratif : "you must ascend your form to claim more Dread" quand le cap est atteint → tension motivante.

**Definition of done**
- Impossible de farm 100 Dread en Newborn même avec une nuit offline.
- Form bump = vraie promotion (débloque un palier de cap).
- UI montre "{gain} / {cap} Dread this run" dans le modal Ascend.

### M3 — Offline exclusion de totalRunBlood pour Dread

**Scope**
- Split `totalRunBlood` en deux champs : `totalRunBloodOnline` (incrémenté par gameplay actif) et `totalRunBloodOffline` (incrémenté au retour offline).
- `dreadGain()` utilise **uniquement** `totalRunBloodOnline` pour le calcul.
- Offline gain reste utile pour acheter des servants / maintenir la run, mais ne fait pas snowball le prestige.
- Migration save : inchangée (champ ajouté optionnel, migration v3→v4 initialise online=legacyTotal).

**Definition of done**
- Dormir 8h avec des générateurs achetés ne multiplie plus le Dread gain du prochain ascend.
- Sim 24h offline : le joueur retrouve sa Blood, peut jouer normalement, Dread gain identique à un run 100% online équivalent.

---

## 🆕 Phase L — Thralls Gacha MVP (V1.2)

**Spec complète** : `VAMPIRE_MAXXING_THRALLS_V1.2_GACHA_FINAL.md`
**Skill** : invoquer `gacha-systems-expert` à chaque décision de tuning rates / pity / packs.
**Status** : L0 ✓ (rename servants), L1 ✓ (Sanctum grid + 7 thralls), L2 ✓ (PlayerThrallState + locked/owned + save). L3+ ci-dessous.

### L3 — Ichor currency (fondation)

**Scope**
- `src/game/config/balance.ts` : `ICHOR_CAP_SOFT: 1000`.
- State : `ichor: number` + `ichorLedger: IchorTransaction[]` (flag earned/paid pour futures features).
- Save v4 : ajouter champs optionnels (migration legacy → 0 Ichor).
- Sources F2P initiales (les plus critiques) :
  - Daily quest login+1action → +2 Ichor
  - Login chain jour N (cap 3) → +1-3 Ichor
  - Rewarded ad "Offrande du Soir" → +1 Ichor (3×/jour)
  - Milestone Prestige 1/3/5/10/15 → +5/10/15/25/40 Ichor
  - First Rare obtenu → +5 Ichor
  - First Epic obtenu → +10 Ichor
  - Collection complète 12/12 → +100 Ichor
- Events `'ichor-changed'` + `'ichor-earned'` pour juice.
- UI : `IchorCounter` component dans le header (top-right, remplace placement actuel de Dread).

### L4 — Dread → Power Level UI refactor

**Scope** (complément de M1 qui gère la math)
- Déplacer le badge Dread sous Ichor dans le HUD.
- Format `DREAD LEVEL 12` + label `×1.35 Blood Mult`.
- Animation rank-up : flash, particle burst, haptic heavy, sound "roar" au passage à N+1.
- `src/utils/roman.ts` → conservé pour les Century dans le titre de forme (YOU ARE A METHUSELAH · Century III), pas utilisé sur Dread.

### L5 — Banners, Pulls & Pity

**Scope**
- `src/game/config/ritual-rates.ts` : rates Standard (82/15/3) + Featured (80/17/3 avec rate-up).
- `src/game/config/ritual-pools.ts` : quels thralls dans chaque pool.
- `src/game/ritual.ts` : RNG + pity (Rare/10, Epic/40 featured) + FRG (Flag `firstRareGuaranteeUsed`) + anti-streak (5 Communs → force Rare) + duplicate protection soft (50% reroll) + pool dynamic (redistribute rates si rareté complète).
- State : `ritualState: { standard: {pity, streak, total}, featured: {pityRare, pityEpic, streak, total, featuredIds[]}, frgUsed, history[50] }`.
- UI : `RitualsScreen` avec 2 cards banners, pity counter visible, historique des 50 derniers pulls.
- Bundle 10-pull = 95 Ichor (5 discount) + 1 Rare+ garanti.
- `src/fx/pull-animation.ts` : 4 tiers d'animation (Commun fade 0.5s / Rare zoom+violet 1.5s / Epic darken+flames 2.5s / Legendary 4s cinematic — legendary prêt pour v1.1).
- Skip button visible dès 1s.

### L6 — Essence & Stars (awakening)

**Scope**
- `src/game/config/star-progression.ts` : multiplicateurs par rareté (C: [1.0, 1.25, 1.5, 1.75, 2.0] / R: [1.0, 1.375, 1.75, 2.125, 2.5] / E: [1.0, 1.5, 2.0, 2.5, 3.0]).
- State : `essences: { common, rare, epic }` + `PlayerThrallState.stars` déjà en place (L2).
- Conversion dupe → essence (auto à chaque pull dupe).
- `AwakeningScreen` : card thrall + slider ★ → ★+1 + coût essences visible + confirm.
- Conversion downward (1 Epic → 3 Rare, 1 Rare → 3 Common) — pas upward.
- Plumber le multiplicateur étoiles dans `thrall-bonus-calc.ts`.

### L7 — Roster v1.0 (6C + 4R + 2E)

**Spec** : voir `docs/10-THRALL-ROSTER-V1.md`.

**Scope**
- Refactor `src/game/config/thralls.ts` pour 12 thralls (6 Commons + 4 Rares + 2 Epics).
- Les 3 Legendaries actuels (Lord of Night, Blood Countess, Crimson Reaper) restent dans le code mais flaggés `v1_1Preview: true` — affichés en silhouette verrouillée "v1.1 coming" dans le Sanctum (tease).
- Bonuses rebalancés par le brief V1.2 : C +6-12%, R +22-30%, E +60-80%.
- **Bloquant assets** : 8 portraits à générer (6 Commons + 2 Rares), prompts dans `docs/10-THRALL-ROSTER-V1.md`.

### L8 — FTUE rework (Ichor gift + FRG)

**Scope**
- Suppression du plan "L2.5 Welcome Summon grant Nox gratis".
- Nouveau flow FTUE (sec 0-180) :
  - sec 0-30 : core loop inchangé.
  - sec 30-60 : animation "Les Anciens t'offrent leur nectar…" → +25 Ichor.
  - sec 60-90 : arrow pulse sur RITUEL ANCIEN, player tap → First Rare Guarantee applied → cérémonie juice full.
  - sec 90-150 : arrow vers slot actif, drag-to-equip.
  - sec 150-180 : autonomy, 15 Ichor restants, skip tuto visible.

### L9 — Page Taux disclosure (légal bloquant)

**Scope**
- `src/ui/screens/rates-disclosure-screen.ts` : page statique listant rates Standard + Featured + garanties + méthodologie.
- Accessible ≤ 2 taps depuis Rituals screen (bouton "ℹ Taux").
- CGU mis à jour avec mention gacha + renvoi.

### L10 — Ladder packs (7 tiers + First-Time Double)

**Scope** (remplace contenu K2 + D1 pack offerings) :
| Pack | SKU | Prix | Base | FT Double |
|---|---|---|---|---|
| Offrande Modeste | `vm_ichor_modest` | 0,99€ | 15 Ichor | +15 |
| Pacte Fondateur ⭐ | `vm_founder_pact` | 2,99€ | 50 Ichor + Nox garanti | +100 |
| Offrande Substantielle | `vm_ichor_substantial` | 4,99€ | 100 Ichor | +100 |
| Offrande Majeure | `vm_ichor_major` | 9,99€ | 250 Ichor | +250 |
| Starter Coven | `vm_starter_coven` | 9,99€ | 200 Ichor + 1 Rare garanti | +200 |
| Offrande Royale | `vm_ichor_royal` | 19,99€ | 600 Ichor | +600 |
| Offrande Cataclysmique | `vm_ichor_cataclysm` | 49,99€ | 1800 Ichor | +1800 |

- State : `packsFirstTimeBought: Set<sku>` pour tracking du doublement.
- UI : badge "×2 PREMIÈRE FOIS" visible tant que non acheté.
- Confirmation explicite sur packs > 19,99€.
- **Dépend de** : K2 (Play Billing infra) → K2 devient un ticket "Billing infra only", le contenu des 3 packs K2 est remplacé par la ladder L10.

### L11 — Pack Fondateur trigger (post-first-Rare)

**Scope**
- Détecter le 1er Rare obtenu (quelle que soit la source : FRG / pull / pack / milestone).
- Flag `welcomePackFirstRareAt: timestamp`.
- Modal "Offre de bienvenue — disponible 7 jours" (pas de countdown 48h anxiogène).
- Ne se reset jamais ; reste accessible dans Shop tab après les 7 jours (au tarif de base sans le ×2).
- Flag `welcomePackPurchased` pour masquer.
- **Remplace K3** (FTB starter pact popup post-3-ascends) — trigger éthique.

### L12 — Rewarded ads (4 placements)

**Scope**
- Offrande du Soir → +1 Ichor, 3×/jour.
- Bénédiction Nocturne → offline progress ×2 au retour, 1×/session.
- Sang Bouillonnant → Blood ×3 pendant 10min, cooldown 2h.
- Frisson du Destin → pity counter +1 après pull Commun, 1×/prestige.

### L13 — Spending dashboard + Age gate (légal/RGPD)

**Scope**
- Settings → "Historique de dépenses" : total à vie, par mois, liste triable.
- Settings → "Limite de dépenses journalière" (optionnelle, EUR).
- First launch : age gate 13+ (pas d'upload de date, juste checkbox ≥ 13).

### L14 — Analytics events gacha

**Scope** : instrumenter les events du brief V1.2 sec 14 (pull_performed, thrall_awakened, ichor_earned, welcome_pack_shown, pack_purchased avec first_time, …). Persist queue offline si besoin.

### L15 — Polish & QA

**Scope**
- Shimmer sur Rituel quand 10-pull affordable.
- Toast contextuel à chaque gain d'Ichor avec source visible.
- Reduced-motion respecté sur anim pulls.
- Touch targets ≥ 48dp verified on device.
- Passage complet de la checklist V1.2 sec 15.

### L_QUESTS — Daily quests + Achievement claim mechanic

**Why** : la V1.2 spec liste "Quête quotidienne login + 1 action = 2 Ichor"
mais ne définit pas un vrai système de tâches rotatives. Sans ça :
- D7-D30 retention faible (rien à faire après le daily login + ad)
- Achievements donnent zéro Ichor (juste un dot dans Tome)
- Aucun **claim mechanic** → tous les rewards arrivent en auto-grant
  silencieux, dopamine perdue

**Sources de design** consolidées :
- *gacha-systems-expert* : daily rotation = high D7-D30 retention driver
  (FGO, Blue Archive). Reward target = 3-5% du pull cost = 2 Ichor
  pour pull à 10. Meta-streak bonus possible v1.1+.
- *idle-game-expert* : quest objective visible au launch = D1 hook ;
  rotating pool variety = D7 hook ; never force play patterns,
  achievable through normal play.
- *monetization-shark* : free Ichor drumbeat trains "I want more
  pulls" mental loop → 3-5× higher conversion when L10 ships.
- *ux-sensei* : claim button = the dopamine moment. Never
  auto-grant. Tome tab dot = accurate "claimable" reflect.
- *aaa-mobile-game-ui* : quest cards baroque parchment style ;
  CLAIM button = breathing pulse Tier 1 CTA ; progress bars
  with shimmer at 100%.

**Scope**

1. **Daily quests engine** (`src/game/quests.ts`, `config/quests.ts`)
   - Pool 10-12 quests (mix metrics : taps, pulls, servants bought,
     awakenings, ascends, ichor earned, equip swaps).
   - Daily rotation : 1 quest/day, deterministic seed (date hash)
     so all players on same day see the same quest. Pool exhaustion
     handled via rolling cycle.
   - Reward 2 Ichor per quest (4-7 Ichor/jour total avec daily
     login chain).
   - Reset midnight local. State : `questState: { date, activeId,
     progress, claimed, metrics: Record<metric, count> }`.

2. **Achievement Ichor rewards**
   - Add `ichorReward?: number` field to AchievementDef.
   - Backfill existing 30+ achievements : 1 Ichor (minor) → 5 Ichor
     (major) → 10 Ichor (collection / 100 ascends).
   - Replace auto-grant with **claim flow** : on unlock, mark
     `unclaimedAchievements` (pending). Player goes to Tome → tap
     CLAIM button per row → grant + clear flag.

3. **Tome UI rework**
   - New section TOP : **DAILY QUESTS** card with title + progress
     bar + reward + claim button (if completed).
   - Reset timer "New quest in 3h 12m" italic serif italic.
   - **ACHIEVEMENTS** section : each unlocked-but-unclaimed row
     shows `CLAIM +N ⚫` button (golden, breathing pulse).
   - Tome tab nav dot logic : fire when (claimable quest) OR
     (unclaimed achievement) OR (existing unseen).

4. **First archetype equipped** (V1.2 spec §4)
   - 3 new achievements : First Harvester / Nocturne / Predator
     equipped, +3 Ichor each. Hooks `thrall-equipped` event.

5. **Cheats** : `vm.completeQuest()`, `vm.rotateQuest()`,
   `vm.claimAllAchievements()`.

6. **Tests** : quest rotation determinism, metric tracking, claim
   gating, achievement Ichor backfill, daily reset.

**Pourquoi avant K2+L10+L11** (monétisation packs) :
- Consolide la boucle F2P engagement avant les paywalls landent.
- 14 jours de claims daily = joueurs warmed-up → 3-5× conversion
  rate quand le pack store ouvre.
- Pas de risque de cannibalization : Ichor F2P ≠ Ichor IAP, pull
  cost reste 10 Ichor.

**Estimation** : 1 jour de dev (quest engine + achievement claim
field + Tome UI + tests).

---

## 🩸 Phase BAL — Anti-Treadmill Hotfix (V1.2-HF1)

**Why** : passé Methuselah Century I, le jeu dégénère en spirale exponentielle
"ascend → ascend plus vite → ascend encore plus vite". Les 4 Lois idle audit:
LAW 2 (always tease next unlock) ❌, LAW 4 (respect player time) ❌. Three-loop test
à Methuselah Century II = TOUS les 3 loops cassés. Cause racine: `ASCEND_THRESHOLD`
fixe → chaque ascend reset les servants mais préserve les multiplicateurs accumulés
→ temps d'ascend converge vers <30s. C'est un game-killer pour D7-D14.

**Sources de design** consolidées (4 skills consultés 2026-04-25):
- *idle-game-expert* : threshold scale per form pour plateau stable 3-5min/ascend.
- *ux-sensei* : grandfather les saves existants + +10 Ichor compensation; auto-ascend
  toggle dans Settings + inline button Ascend modal; "MULT PEAKED" badge avec teaser
  Soulreave; pause auto sur form bump pour cinematic.
- *aaa-ui* : pas de change visuel — les fixes sont mécaniques.
- *gacha-systems* : pas de touchpoint gacha sur ce hotfix.

**Scope (V1.2-HF1)**

1. **`ASCEND_THRESHOLD` per form** (`src/game/config/balance.ts`)
   - Recalibré 2026-04-25 après audit idle-expert : les valeurs
     initiales (×20 à Methuselah) donnaient toujours 25-50s ascends.
     Nouvelle table calibrée avec les VRAIES form thresholds (forms
     durent 2-50 ascends, pas 200+) :
   - NEWBORN ×1, ELDER ×3, LORD_OF_NIGHT ×10, METHUSELAH ×60,
     PROGENITOR ×400, TERA_OVERLORD ×3000, HORROR_INCARNATE ×25000,
     THIRST ×200000
   - Form bumps en ×6-8 = peaks-and-valleys cadence (5-10 min reset
     post-bump, growth dans la form accélère naturellement).
   - Le globalMult cap ×10 plateau la rate, donc les form mults
     n'ont qu'à ajuster la cadence d'entry de form.
   - Communique via tooltip Ascend modal: "Methuselah requires deeper feeding."

2. **Soft cap globalMult à ×10** (`src/game/math.ts globalMult()`)
   - Cap progressif via `Math.min(10, base)` après le bonus progenitor.
   - "MULT PEAKED" badge gold sur le multiplier readout HUD quand atteint.
   - Teaser tooltip: "Continue stacking Dread to unlock the Soulreave (V1.3)".

3. **Auto-Ascend toggle** unlock à Methuselah Century III (totalAscends ≥ 9
   — Methuselah threshold 7 + 2 within-form ascends; the FORM_THRESHOLDS table
   tops out at THIRST = 100, not 250)
   - State : `settings.autoAscend: boolean` (default false)
   - UI placement : Settings panel (Accessibility section) + inline secondary
     "AUTO" button next to ASCEND CTA on the Ascend modal.
   - Mechanic : auto-fire ascend dès que `canAscend()` AND `dreadGain >= 1`.
   - Pause auto sur form-bump threshold pour que le joueur voit la cinematic
     du nouveau form (1-shot per form bump).
   - Tap manuel ascend reste fonctionnel.

4. **Save migration** (`src/game/save.ts`) — V1.2-HF1 patch
   - Grandfather: pas de scaling rétroactif. Les players déjà à Methuselah+
     gardent leur progression actuelle, seul l'ASCEND prochain utilise le
     nouveau threshold.
   - Compensation: +10 Ichor crédités à l'install patch (one-shot via
     `ichorFlags['hotfix:v1.2-hf1:compensation']`).
   - Toast au boot: "Balance Update — your bloodline owes you 10 Ichor."

5. **Tests**
   - `dreadGain` returns expected values across forms post-scale.
   - `globalMult` clamps at ×10.
   - Auto-ascend fires only at threshold + pauses on form bump.
   - Save round-trip preserves grandfathered progress.

**Estimation** : 2 jours dev solo. Ship-bloquant V1.2 release car le treadmill
tue la D7 retention.

---

## 🌑 Phase S — SOULREAVE — Second-Layer Prestige (V1.3)

**Why** : V1.2-HF1 retarde le treadmill mais ne le guérit pas. Sans Axis 3
(meta-currency permanente), un idle game post-3rd-prestige finit toujours en
treadmill. Soulreave = second-layer prestige qui déverrouille un meta-tree
permanent et transforme "ascend → ascend faster" en CHOIX stratégique.

**Sources de design** consolidées (idle-game-expert, ux-sensei):
- Pattern PROVEN sur 10+ idle hits (Cookie Clicker Heavenly Chips, Idle Slayer
  Soul Shards, AdCap Angel Investors, AFK Arena Hero Affinity).
- Trigger : `lifetimeDread >= 200` (~10-15h jeu actif, sweet spot D7).
- Formula : `floor(3 × sqrt(lifetimeDread / 100))` Soul Shards.
- Reset : Dread, totalAscends, Form, Servants. KEEP : Ichor, Thralls collection,
  Awakening stars, Achievements, Daily quest progress, Equipped slots, Settings.
- 6 meta-tree nodes (3/5/8/10/15/25 SS = 66 total ⇒ 5-7 Soulreaves pour max).

**Scope (V1.3)**

1. **State + save** (`src/game/state.ts`, `save.ts`)
   - `soulShards: number`
   - `lifetimeDread: number` (cumul jamais reset, drives la formula)
   - `metaTree: Record<MetaNodeId, number>` — niveau owned par node
   - `totalSoulreaves: number` — counter (pour achievements + UI)
   - Save migration V5 (bump SAVE_VERSION) avec defaults legacy.

2. **Soulreave engine** (`src/game/soulreave.ts`)
   - `canSoulreave()` → lifetimeDread ≥ 200
   - `projectedSoulShards()` → preview pour le UI
   - `performSoulreave()` → grant SS + reset scoped fields + emit
     `soulreaved` event + push `runHistory` entry tagged 'soulreave'.

3. **Meta-tree config** (`src/game/config/meta-tree.ts`)
   ```ts
   ETERNAL_FLAME (3 SS)   — +50% blood gen base permanent
   IRON_WILL (5 SS)        — +25% click power permanent
   WELCOME_TRIBUTE (8 SS)  — start each run with 25 Ichor + 1 Rare guaranteed
   AUTO_BUY (10 SS)        — auto-buy servants when affordable (toggle)
   AUTO_ASCEND_PRO (15 SS) — auto-ascend with configurable threshold mult
   ETERNAL_BOND (25 SS)    — +1 equip slot permanent (4ème thrall)
   ```
   - Linear progression : nodes débloquent dans l'ordre listé (chaque node
     requires the previous bought).

4. **UI** (`src/ui/components/soulreave-modal.ts`)
   - Triggered from Ascend modal when `canSoulreave()` (button "SOULREAVE"
     remplace ou s'ajoute à côté de "ASCEND").
   - Sub-screen full-overlay : Soul Shards counter + meta-tree 6 nodes
     (visual : tree branches with locked/unlocked/owned states).
   - Cinematic Soulreave : 3s anticipation (screen darken + crimson particles)
     + 2s release (white burst + "SOULREAVE" title slam Cinzel display 64px +
     meta-tree reveal). Skip dispo après 1.5s.
   - Sound : sub-bass rumble + impact + ambient whisper layer.

5. **Achievements + tutorial**
   - 5 achievements one-shot : "First Soulreave", "Soulreave 5×", "All nodes
     bought", "Ichor accumulé via Welcome Tribute = 1000", etc.
   - Onboard FTUE post-1st-Soulreave : tooltip teaser "The Ancients remember.
     Spend your Soul Shards in the meta-tree."

6. **Cheats** (`src/dev/cheats.ts`)
   - `vm.soulreave()` — instant trigger (skips threshold check)
   - `vm.addSoulShards(n)` — for meta-tree testing
   - `vm.unlockMetaTree()` — buys all 6 nodes

7. **Tests**
   - Soul Shards formula correctness across lifetimeDread tiers.
   - Reset scope (Dread → 0, Thralls preserved, Ichor preserved).
   - Meta-tree purchase gating (linear progression).
   - Save migration V4 → V5.

**Estimation** : 1 semaine dev solo. Cette phase est THE FIX retention long-
terme. Sans Soulreave, V2.0 Combat Layer ne suffit pas à retenir les D14+.

---

## Phase C — Content depth

### C1 — Tome expanded (Bestiary + Histories + Run log)

**Why** : le Tome actuel = stats + achievements. C'est pauvre pour le thème "codex / grimoire gothique". Le joueur doit avoir envie d'ouvrir le Tome, pas juste vérifier ses achievements.

**Scope**
- `src/game/config/lore.ts` — 2 dictionnaires :
  - `thrallLore[ThrallId]` : 8 paragraphes narratifs (80-140 mots), unlock au 1er achat
  - `formLore[VampireForm]` : 8 paragraphes, unlock quand forme atteinte
  - Texte écrit dans le ton dark academia premium (pas Gen Z sur ces entrées-là, celles-là sont "sérieuses")
- State : `unlockedLore: { thralls: Set<ThrallId>, forms: Set<VampireForm> }`
- Tome tab sections :
  - **Chronicle** (existant)
  - **Achievements** (existant)
  - **Bestiary** : 8 cards, locked en silhouette muette, unlocked = card avec thumb + texte ouvrant en modal
  - **Histories** : 8 cards pareil pour les formes
  - **Run log** : liste des 10 derniers runs avec { date, durée, blood max, dread gagné }
- State : `runHistory: RunEntry[]` (max 10, push au ascend, oldest drop)
- Unlock toast : "NEW ENTRY — [Thrall name] added to the Bestiary"

**Definition of done**
- 16 entrées de lore écrites
- Unlock gating marche (1er achat = entrée disponible)
- Run log se remplit au fil des ascends

### C2 — Servants modal + mass-buy + milestones visible

**Why** : l'onglet Servants duplique juste la liste Bloodline. Il doit apporter de la profondeur : détail par thrall, mass-buy, visibilité des milestones intra-run.

**Scope**
- `ServantDetailModal` : tap d'un thrall → modal avec :
  - Nom + médaillon + tier
  - Lore court (2 lignes)
  - Stats du run : total produit, rate actuel, % du rate total
  - Progress bar vers prochain milestone (10/25/50/100/200/300/400)
  - Mult actuel de ce thrall (×4, ×24, etc.)
- Mass-buy : boutons ×1 / ×10 / ×25 / MAX dans le modal ET dans chaque thrall-card de la liste
- `buyThrall(id, count)` refactor pour accepter count
- UI : le next-milestone est affiché dans la thrall-card (petit texte "10/25 for ×4")
- Trim Bloodline tab : liste réduite à 3 thralls visibles (last owned + current target + next unlock)

**Definition of done**
- Tap d'un thrall ouvre le detail
- Mass-buy fonctionne jusqu'à MAX (limite par le blood dispo)
- Milestones visibles en continu, pas cachés

---

## Phase D — Monétisation réelle

> **2026-04-24 course correction** : le contenu des packs bascule dans **L10** (ladder 7 tiers V1.2). Phase D conserve uniquement l'infra Billing (D1) qui est un pré-requis de L10. D2 (FTB popup) est remplacé par **L11** (Pack Fondateur trigger post-first-Rare). D3 (LiveOps scaffold) reste tel quel.

### D1 — Google Play Billing plumbing

**Why** : J11 de la roadmap V1 était IAP mais jamais câblé. C'est le moment. Playbook 1 : sans IAP, tu coupes 70% du revenue idle-game.

**Scope**
- Pré-requis Kenny (blocker externe) :
  - Créer compte Google Play Console (~25$ one-time)
  - Créer l'app "Vampire Maxxing" en draft
  - Merchant account
  - Créer les 3 produits IAP managed products :
    - `vm_nights_blessing` 1,49 €
    - `vm_starter_pact` 2,99 €
    - `vm_founder_pact` 9,99 €
- Code :
  - `npm install @capacitor-community/in-app-purchases` (ou plugin officiel récent)
  - `src/platform/iap.ts` : wrapper avec dynamic import (même pattern que ads.ts)
  - Types : `iapProducts()`, `iapBuy(id)`, `iapRestore()`, `onIapOwned(cb)`
  - Test avec test track Play Console + test account Kenny
- State : `ownedIAPs: Set<string>`, `iapMeta: { firstBlood: boolean, foundingElder: boolean }`
- Restore purchases button dans le menu ⚙

**Definition of done**
- Build AAB uploadé en internal test
- Purchase test sur device Kenny réussit
- Restore purchases marche après wipe

### D2 — IAP effects + FTB popup + Starter Pact trigger

**Why** : avoir la plomberie sans les contenus = zéro revenu. Le FTB popup est LE moment Playbook 1 : "show the starter pack at the first pain moment (3rd–5th session ou ~30 min de play)".

**Scope**
- Application des effets à l'achat :
  - Night's Blessing → `offlineEfficiencyBoost: { until: Date.now() + 24h }` → applique 1.0 au lieu de 0.5 pendant 24h
  - Starter Pact → +20 dread + unlock cosmetic title "First Blood" + persistent +5% thrall rate flag
  - Founder Pact → +50 dread + permanent -5% cost mult + exclusive title "Founding Elder" + portrait frame cosmetic
- FTB popup : après 3ème ascend OR 1h totalPlayTime (premier déclenché) :
  - One-shot modal "A rite awaits you..." avec offer Starter Pact 2,99 €
  - Afficher total value slashed "Total value: 8,97 € → 2,99 €"
  - Timer 72h visible mais ne reset jamais
  - Flag `firstOfferShown: true` pour ne pas réaffiche
- Shop tab : unhide "Special Offers" section avec les 3 packs
- Founder Pact : badge "LIMITED" + countdown 90 jours depuis le 1er install (stocker `installedAt` dans save)

**Definition of done**
- 3 packs achetables ET leurs effets s'appliquent
- FTB popup se déclenche une fois, au bon moment
- Founder Pact disparaît après 90j (affiche "CLAIMED" si acheté, "EXPIRED" sinon)

### D3 — LiveOps framework + Halloween event scaffold

**Why** : Playbook 3 — "90% des top-grossing runs LiveOps, ne pas le faire = -60% revenue". Ton thème gothique est PARFAIT pour Halloween (event seasonal x2-5 revenue). Scaffold = framework pour events futurs, pas le content final.

**Scope**
- `src/game/liveops.ts` : type Event { id, startAt, endAt, kind, payload }
- Source des events : fichier statique `src/game/config/events.ts` pour le MVP (plus tard : remote config Firebase)
- Types d'events supportés au MVP :
  - `double_blood_weekend` : globalMult +1 pendant N heures
  - `themed_cosmetic_pack` : offer limitée dans le shop
  - `milestone_event` : bonus si player atteint X dread pendant la fenêtre
- UI :
  - Banner en haut de Bloodline "◈ BLOOD MOON · +100% blood · 2d 14h left" quand event actif
  - Section "EVENTS" dans Shop quand un cosmetic pack event est actif
  - Tap le banner → modal explication
- **Halloween event** (scaffold seulement, pas publié) :
  - dates : 2026-10-24 → 2026-11-02
  - effet : BLOOD_MOON x1.5 globalMult + special title "Samhain Witness" si ascend pendant la fenêtre + themed portrait frame offert gratos
- Test : simuler events via cheats `vm.startEvent('blood_moon_test', 3600)` (1h)

**Definition of done**
- Framework event prêt pour de futurs events sans refactor
- Banner s'affiche + disparait correctement sur cheats test
- Halloween event configuré en `startAt: future_date` prêt à se déclencher

---

## Phase E — Release prep

### E1 — i18n FR/EN

**Why** : Kenny est français, le marché FR = +15-30% install lift (Playbook 7). Extract + traduire. Pur code.

**Scope**
- `src/i18n/en.ts` + `src/i18n/fr.ts` : objets plats { key: string }
- `src/i18n/index.ts` : `t(key, params?)`, `setLocale()`, auto-detect via `navigator.language`
- Extraire toutes les strings :
  - Component labels (tab names, button texts)
  - Achievement titles + descs (EXCEPT les meme titles qui restent EN, cf spec)
  - Form titles + flavor
  - Rite names + subs + flavors
  - Shop copy
  - Toast messages
- UI : sélecteur FR/EN dans menu ⚙
- Test : basculer en vol

**Definition of done**
- 100% des strings passent par t()
- Switch lang change toute l'UI sans reload
- Lang persistée dans save

### E2 — Audio compression + perf pass

**Why** : main-soundtrack.mp3 pèse 5,5 MB, soit 33% de l'APK. Compression → -2 MB. Plus : audit fps sur ancien device.

**Scope**
- Re-encode soundtrack : 160 kbps → 96 kbps stereo (ou mono si le mix le permet). Cible ~3 MB.
- Tester sur Samsung + 1 device mid-range (emulator si pas dispo)
- Profiler : rAF loop à 60fps stable même avec 200 particules + ad load en background
- Optimiser si drop : défer l'ad init, throttle achievement check à 2Hz
- Minifier CSS (vérifier Vite le fait déjà)
- Analyser bundle size : chunk par chunk, viser < 80 KB main

**Definition of done**
- APK < 14 MB (était 16 MB avant E2)
- 60 fps stable sur device ciblé
- Bundle main < 80 KB gzip

### E3 — ASO assets

**Why** : Playbook 7 — 70% des installs viennent du store search. Sans ASO sérieux, ton DAU organique plafonne.

**Scope**
- App icon : A/B test 2 variantes (vampire seul vs vampire + flamme) — 512×512 PNG + 512×512 round
- Feature graphic 1024×500 : portrait Lord of Night avec titre "VAMPIRE MAXXING" + tagline
- 8 screenshots 1080×1920 :
  1. Portrait Lord of Night en gros (USP gothic)
  2. Ascension cinematic frame (flash rouge + particules)
  3. Tome grille achievements (FOMO collector)
  4. Rites tab (ads framing premium)
  5. Shop avec Founder Pact badge LIMITED
  6. Big number moment "1,234,567,890 blood"
  7. Thrall detail modal (depth)
  8. Form transition avant/après (before Elder → after Methuselah)
- Chaque screenshot a un overlay tagline court (8-12 mots)
- Store listing EN (title 30c, short 80c, long 4000c)
- Store listing FR (traduction)
- Privacy policy hébergée (GitHub Pages suffit)
- Content rating Play Console (PEGI 12)

**Definition of done**
- Tous les assets prêts dans `docs/store-listing/`
- Privacy policy online avec URL
- Fiche prête à upload

### E4 — AAB signed + Internal Testing track

**Why** : J12 v1 visait "build uploadé en Internal Testing". On y est vraiment maintenant.

**Scope**
- Generate signing keystore :
  - `keytool -genkey -v -keystore vampire-maxxing.keystore -alias vampire -keyalg RSA -keysize 2048 -validity 10000`
  - Sauvegarder le keystore dans Bitwarden (Kenny) + backup local
  - `android/keystore.properties` (gitignored)
  - `android/app/build.gradle` : signingConfigs.release
- Build AAB release : `./gradlew bundleRelease`
- Play Console Internal Testing :
  - Upload AAB
  - Invite 2-3 testeurs (Kenny + amis)
  - Release notes v1.0.0
- Observer pendant 3-7 jours : crashs, latency, feedback
- Si OK → Closed Testing (50-100 testeurs via lien opt-in)
- Si OK → Production 20% → 100% staged

**Definition of done**
- AAB v1.0.0 live dans Internal Testing
- Kenny install depuis le Play Store (pas ADB) sur son Samsung
- 🧛 CHAMPAGNE

---

## Phase F — Post-launch #1 : The Black Veil (Map v1)

**Timing** : 1-2 mois après E4 (AAB stabilisé en Internal Testing ou Production soft launch)

**Why** : premier axe d'expansion horizontal post-Thirst. Résout le "what after Thirst?" en donnant un 2e système de progression parallèle au prestige. AAA visual mockup déjà fait par Kenny (texture de pierre volcanique, chemins en lave rougeoyante, château Crimson Keep). Événements narratifs à choix = signature premium qui différencie du reste du genre idle.

### F1 — Map infrastructure + The Black Veil (1ère région)

**Scope**
- `src/game/config/regions.ts` — 1 région pour démarrer : `the-black-veil`
- State étendu via `save.schemaExtensions.map` (pas de migration lourde grâce à B0b/archi-extensions) :
  ```
  map: {
    currentRegion: 'the-black-veil' | null,
    unlockedRegions: Set<regionId>,
    regionProgress: Record<regionId, { nodesCompleted: number, regionEssence: number, eventsTriggered: Set<eventId>, choicesMade: Record<eventId, choiceId> }>,
  }
  ```
- Region Essence = **currency ÉPHÉMÈRE** (clear à la sortie de la région, jamais persisté cross-run). Pas de pollution des 2 currencies existantes.
- Passive bonus de région via `ModifierRegistry` (B0a) : `register('region:the-black-veil', 'globalMult', 'mult', 1.10)` tant que complétée.
- **Cap logarithmique** sur le produit de `globalMult` de toutes sources réunies (régions + awakenings + aspects) pour éviter power creep.

**Tab bar** : ajouter un **6e tab MAP** dans la tab bar, gated après 1ère ascension (même condition que RITES). Repenser la grille flex à 6 colonnes.

**UI** :
- `src/ui/tabs/map-tab.ts` — full-screen map avec background PNG de la région
- 3 nodes intermédiaires + 1 boss node, path SVG animé (pulsation opacity 0.6 → 1.0)
- Panel bas : nom région + coût Dread d'entrée + bouton [ENTER]
- Progress bar discrète en haut : nodes débloqués / total + jauge Region Essence

**Events narratifs** :
- 5 events pour F1 : 1 entrée + 3 intermédiaires + 1 boss
- Format : `src/game/config/events.ts` avec type `NarrativeEvent { id, trigger, narrative, choices[] }`
- Modal overlay plein écran quand un event se déclenche, avec choix 2-3 options, conséquences variées (currencies, titles, lore, unlock cachés)
- Ton : Disco Elysium / Sunless Sea / Darkest Dungeon (court, littéraire, gothique)

### F2 — Régions 2-3 + content depth

**Scope**
- Ajouter `the-crimson-keep` + `nameless-crypts` avec leurs events (4-5 events chacune)
- Boss de régions offrent des **récompenses distinctes** (titre, cosmetic cadre, +1 slot Sanctum futur)
- Backgrounds PNG générés (Kenny via ChatGPT, même pipeline que portraits)

### F3 — Cosmetic region themes + event pack monetization

**Scope**
- Première vraie offre LiveOps : "Halloween Veil" — variante cosmétique de The Black Veil (palette lune de sang) à 4,99 €, fenêtre 30 jours autour du 31 octobre
- Event pack 9,99 € : "The Halloween Rite" avec région temporaire + cosmetic frame + 1 thrall unique (prep pour Phase H)
- Région permanente reste gratuite ; seul le skin est payant

**Definition of done (Phase F)**
- 3 régions permanentes jouables
- ~14 events narratifs écrits
- 1 event LiveOps Halloween qui cycle annuel

---

## Phase G — Post-launch #2 : Awakenings

**Timing** : 3-4 mois post-launch

**Why** : une fois Thirst atteint + quelques régions complétées, le joueur peut cramer ÉNORMÉMENT de Dread pour débloquer des **5 états transcendants** qui modifient visuellement le portrait Thirst existant (pas de nouveaux portraits). Endgame vertical par dépassement de la forme. Whale retention post-Thirst gold.

### G1 — VFX overlay system + 2 premiers Awakenings

**Scope**
- Utilise `portrait.addOverlay()` de B0b pour injecter les VFX layers
- `src/game/config/awakenings.ts` — 5 awakenings avec coûts (100 dread / 500 / 2000 / 8000 / 30000) + événement narratif de déblocage + effet mécanique
- State : `unlockedAwakenings: Set<awakeningId>` + `activeAwakenings: Set<awakeningId>` (le joueur peut équiper plusieurs)
- **Effets mécaniques passent PAR GATE DE CONTENT, pas raw power** (anti power-creep) :
  - **The Eternal** (halo doré) — +1 slot Sanctum (Phase H) + auto-claim Blood Altar instant
  - **The Many** (silhouettes fantômes) — +10% tous les ModifierRegistry targets, capé log
  - **The Primordial** (cosmic bg animé) — débloque Aspects (Phase I gate)
  - **The Nameless** (glitch artistique) — active dialogues évolutifs thralls uniques
  - **The Silent** (portrait vide, cadre seul) — débloque Generations (Phase J gate)
- G1 ship les 2 premiers : The Eternal + The Many

### G2 — 3 Awakenings restants + narrative cohésion

**Scope**
- Ship The Primordial + The Nameless + The Silent
- Écrire les 5 events narratifs de déblocage (type vision mystique, ton dark academia premium)
- UI : écran dédié "Transcendence" accessible depuis Tome, affiche les 5 awakenings en grille avec coûts + unlocks cascade

**Definition of done (Phase G)**
- 5 awakenings fonctionnels, chacun avec VFX distinct visible sur le portrait
- Les effets mécaniques gate du content (pas juste +%)
- `vm.gameState.unlockAwakening('the-eternal')` en console fonctionne pour test

---

## ~~Phase H — Post-launch #3 : Unique Thralls (The Sanctum)~~

**🔀 ABSORBÉ DANS PHASE L (MVP)** — 2026-04-24. Le roster Sanctum avec acquisition, étoiles, synergies ship en v1.0 via le système gacha V1.2. Les noms originaux de H (Seraphiel, Mordecai, Lysandre, Gaspard, Cendre) ne sont **pas** retenus — le roster v1.0 est défini dans `docs/10-THRALL-ROSTER-V1.md` et re-travaillé pour l'équilibrage gacha (6 Commons + 4 Rares + 2 Epics).

Les éléments originaux de H conservés pour référence future (synergies entre thralls en particulier, qui arrivent post-MVP en v1.2) :

---

**Timing** : 5-6 mois post-launch

**Why** : les 8 thralls classiques sont la workforce. Les thralls uniques sont le **roster nommé** avec identité propre, backstory, trait synergique. Cartes verticales 2:3 TikTok-ready. Collection mindset = +3-7 points D30 retention. Cosmetic skin IAP perfect fit (Playbook 5 Monet-shark).

### H1 — Sanctum infrastructure + 1er thrall (Seraphiel)

**Scope**
- `src/game/config/unique-thralls.ts` avec le registry initial (1 thrall au launch : Seraphiel la Pleureuse)
- State : `uniqueThralls: { owned: Map<id, { acquiredAt, affinity, activeSlot | null }>, encountered: Set<id>, maxActiveSlots: 3 }`
- Acquisition : déclenchée par boss battu dans région Nameless Crypts (F2) via event narratif type `offer_unique_thrall`
- Trait appliqué via `ModifierRegistry` (B0a) — source `'unique-thrall:seraphiel'` → `register('thrallRate:fledgling', 'mult', 1.15)`
- Assets : `/assets/unique-thralls/seraphiel/card.png` (800×1200 cartes 2:3)

### H2 — Sanctum UI (roster + collection grid)

**Scope**
- 7e tab bar SANCTUM (ou mini-carte compagnon actif sur Bloodline — à tester)
- Section Active Roster : 3 slots cartes 2:3 visibles côte-à-côte
- Section Collection : grille 2 colonnes de cartes miniatures (acquis = couleur, encountered = silhouette grisée, unknown = "???" carte noire)
- Écran détail thrall : carte full-screen + backstory scrollable + trait actif + citation

### H3 — 4 thralls supplémentaires + synergies MVP

**Scope**
- Mordecai aux Mille Nuits, Lysandre la Brisée, Gaspard de Vermeil, Cendre (total 5 thralls ship)
- 1 synergie test : Seraphiel + Mordecai → bonus +10% additionnel
- Skins cosmétiques pour Seraphiel à 4,99 € ("Seraphiel in Mourning Silk")

**Definition of done (Phase H)**
- 5 thralls uniques acquis via events/boss
- Sanctum UI navigable, roster de 3 slots actifs
- 1 synergie testable
- 1 skin IAP live

---

## Phase I — Post-launch #4 : Aspects of The Thirst

**Timing** : 8-10 mois post-launch

**Why** : second-layer prestige. Une fois Thirst atteint ET The Primordial awakening débloqué (G2 gate), le joueur peut re-prestige dans un **Aspect** — variante colorimétrique + build spécialisée. Rejouabilité infinie type Path of Exile. Whale-worthy ("I've maxxed all Aspects").

### I1 — Aspect infrastructure + 2 premiers Aspects

**Scope**
- `src/game/config/aspects.ts` — 5 aspects avec palette dominante + build focus
- CSS variables dynamiques pour palette portrait (utilise les overlays B0b sur `.portrait__image` via `filter: hue-rotate()` + `mix-blend-mode`) — **zéro nouveaux assets**
- State : `aspect: { current: aspectId | null, completed: Set<aspectId>, infusionBonuses: Record<aspectId, level> }`
- Re-prestige "via Aspect" : quand le joueur re-ascend en Thirst, prompt "Choose an Aspect" → palette change + modifiers build spécifique appliqués via Registry (B0a) pour le run
- Pas de currency "Infusion" nouvelle : les bonus permanents cross-aspect s'appliquent via Registry avec source `'aspect-completed:<id>'`
- I1 ship : Thirst of Blood + Thirst of Gold

### I2 — 3 Aspects restants + True Thirst

**Scope**
- Thirst of Void, Thirst of Moon, Thirst of Dawn
- "True Thirst" : unlock après 5 aspects complétés → palette combinée + title exclusif + +1 slot Sanctum
- UI : écran Aspects accessible depuis Tome avec les 5 variants en grille palette

**Definition of done (Phase I)**
- 5 aspects jouables via CSS filters (aucun nouveau portrait asset)
- True Thirst débloqué sur complétion des 5
- Infusion bonuses cross-aspect stackent via Registry

---

## Phase J — Post-launch #5 : Generations (Crimson Chronicles)

**Timing** : 12+ mois post-launch — le gros drop anniversary

**Why** : third-layer prestige. Le joueur "sire" une nouvelle lignée → redémarre à Newborn dans Gen 2 (La Lignée Pourpre, palette violet profond + argent). Garde 10% du Dread cumulé en Ancestral Blood (nouvelle currency permanente cross-gen). Silhouettes des anciens Thirst affichées en background (via `.portrait__overlay--back` de B0b). Screenshot viral ultime ("Gen 5 avec 4 silhouettes tutélaires derrière son Newborn").

### J1 — Generation infrastructure + Ancestral Blood

**Scope**
- `save.schemaExtensions.generations` :
  ```
  generations: {
    current: 1,
    completed: [{ gen: 1, peakDread: X, completedAt: ts, ancestorData: {...} }],
  }
  ancestralBlood: number,  // 3e currency, unlockée uniquement via Phase J
  ```
- Ancestral Blood = 3e currency au moment où Gen 2 unlock. Remplace Dread comme meta-currency permanente.
- "Sire" action disponible après The Silent awakening (G2 gate) + 1 Aspect complété (I1 gate).
- Ancestors system : équiper jusqu'à 3 anciens Thirst → silhouettes background via `portrait.addOverlay('ancestor-N', 'back', silhouetteEl)` (B0b), chacun apporte un bonus passif via ModifierRegistry.

### J2 — Gen 2 assets : La Lignée Pourpre

**Scope**
- 8 nouveaux portraits (Newborn → Thirst) avec palette noir + violet profond + argent + essence "vampire médiéval guerrier"
- Génération via ChatGPT (pipeline existant), WebP q90, 1024px max (même budget que Gen 1 → 1.7 MB)
- Assets organisés : `/assets/portraits/gen-2/newborn.webp` etc. Migration de `/assets/portraits/*.webp` vers `/assets/portraits/gen-1/*.webp`

### J3 — Dynastic talent tree + cross-gen thralls

**Scope**
- Arbre de talents permanent inter-générations acheté avec Ancestral Blood
- "The Veteran of the First Thirst" — thrall unique débloqué UNIQUEMENT si Gen 1 maxxed avant Gen 2 start
- Narrative : chaque gen = un siècle qui passe dans la lore, lien visible dans le Tome (timeline arbre généalogique)

**Definition of done (Phase J)**
- Gen 2 jouable (Newborn → Thirst) avec portraits distincts
- Ancestral Blood currency live
- Ancestors system : jusqu'à 3 silhouettes background
- 1 cross-gen thrall unique

---

## ⚔️ Phase HUNT — V2.0 Combat Layer (THE HUNT)

**Why** : V1.3 Soulreave fixe le treadmill mais reste dans la dimension idle.
Pour les joueurs D30+, il faut une 3ème dimension de gameplay (idle / collection
/ **combat**) qui réutilise les 15 thralls collectés et les Soul Shards. Pattern
PROVEN : AFK Arena → AFK Journey, Idle Heroes, Cookie Run Kingdom. Ouvre 50+h
de contenu progression.

**Sources de design** consolidées (aaa-ui, idle-game-expert, gacha-systems):
- Option **A — THE HUNT auto-battler / wave defense** validée (best fit
  gen-z gothic + idle DNA + 2-3wk effort solo + monétisation hooks clean).
- Vampires sont les prédateurs : mortal hunters approche le lair, les thralls
  équipés auto-defendent. Inversion thématique du tropes "tu attaques des monstres"
  → "tu DÉFENDS la nuit".
- Auto-resolve combat (pas de per-tap fatigue cohérent avec idle), mais visual
  manuel mode pour les engaged sessions.

**Scope (V2.0)**

1. **Combat engine** (`src/game/combat/engine.ts`)
   - State : `huntState: { round, hp, hunterWaveQueue, wins, losses }`
   - Resolve = deterministic deterministic loop (60fps render, 1 tick/sec
     simulation). Each tick : 1 hunter advance, 1 thrall ability fire.
   - Win condition : kill all hunters before HP reaches 0.
   - Stat sources : équiped thralls' primaryEffect.value × awakening multiplier.
   - Damage formula : `damage = thrall.primaryValue × thrall.starMult × hunter.armor_mod`
   - Hunter waves : procedural per round (density grows over rounds).

2. **Combat UI** (`src/ui/combat/hunt-screen.ts`)
   - Onglet bottom nav "CRYPT" remplace SHOP slot (Shop → sub-tab dans Settings)
   - 3 thralls équipés en bas du screen (gauche/centre/droite)
   - Hunter wave en haut (silhouettes approchent)
   - HP bar centre + round counter haut
   - Attack/defense animations : sprite atlas + 30 max particles
   - Auto-resolve mode (sweep) : instant resolve avec capped rewards
   - Manual mode : 60fps live combat avec tap-to-skip post-1s

3. **Hunter waves config** (`src/game/config/hunters.ts`)
   - Hunter types : Inquisitor (light armor), Witchhunter (medium),
     Demon Lord (heavy + ranged)
   - Wave density per round : `floor(2 + round × 0.3)` (round 1 = 2, round 10 = 5)
   - HP per round : `100 + round × 50`
   - Boss every 10 rounds

4. **Rewards** (`src/game/combat/rewards.ts`)
   - Per round : Soul Shards (1-3), Ichor (5-15), Essence drops
   - Boss kill : Cosmetic frame ornament + lore entry "Defeated [Boss name]"
   - Daily reset : 5 free rounds, then Ichor cost per additional round

5. **Live-ops integration** (gacha-systems input)
   - Monthly boss event : rotating Inquisitor / Witchhunter / Demon Lord
   - Boss event = 7-day window, leaderboard cosmetic rewards
   - Battle pass tier "Hunters Defeated" — premium track unlocks
     boss-fight Legendary skins + thrall combat animations

6. **Monétisation V2.0**
   - **Cosmetic skins** combat versions des Legendaries (Aldric battle armor,
     Cassian noble robes, Maris cathedral regalia) — 4.99-9.99€ par skin
   - **Battle Pass** "The Hunt" — 4.99€ par cycle de 4 semaines, 30 tiers
     avec rewards combat-focused (Soul Shards, Ichor, exclusive cosmetics)
   - **Revive ad placement** : "Watch ad to revive on defeat" — 1×/round
   - **Pas de pay-to-win** : aucun pack ne donne stats combat permanents

7. **Performance mobile**
   - Sprite atlas pré-rendu (max 200KB GPU)
   - 30 particles max simultanés (Galaxy A1x 60fps target)
   - Audio : 1 layer ambient + 1 layer combat (max 2 simultanés)
   - Auto-resolve mode = pas de runtime animation (instant + summary screen)

8. **Tests + balance**
   - Hunter waves tunées pour 60% win rate F2P, 95% pour whales fully-awakened
   - Soft difficulty cap : si 3 défaites consécutives, hint "increase awakening
     stars" — pas de hard wall progression
   - Tests : combat engine determinism (same seed = same result), reward
     scaling, cosmetic unlock gating

**Dépendances** :
- ✅ V1.2 Phase L (15 thralls collectés)
- ✅ V1.3 Soulreave (Soul Shards as combat currency)
- ✅ Awakening stars multiplier (already in awakening.ts)

**Risques** :
- Production heavy : sprite atlas + animations combat = 1 semaine art assets
- Performance mobile : need device testing on Galaxy A1x mid-range
- Scope creep : tentation de turner-based ou narrative en parallèle — STICK
  to auto-battler for V2.0, defer turn-based à V2.1+

**Estimation** : 2-3 semaines dev solo + 1 semaine art (sprite atlas + sound).

**Pourquoi V2.0 et pas V1.4** : need Soulreave shipped + 4-6 wks data avant
de commit le combat layer. Si Soulreave seule retient D30 à 10%+, on peut
shipper V2.0 directement. Si D30 < 5% post-Soulreave, on pivote vers content
depth (Phase F Black Veil) avant le combat.

---

## LiveOps continu (post-launch, toutes phases)

Dès la fin de Phase E, cadence ~1 event tous les 2 mois :

| Mois | Event | Contenu |
|------|-------|---------|
| Octobre | **Halloween — The Blood Moon** | Région skin "Halloween Veil" 4,99 € + event pack 9,99 € + thrall unique saisonnier "Jack O'Blood" |
| Novembre | **Black Friday — Founder's Dread** | 30% off Founder Pact, FOMO sur tous les skins de l'année |
| Décembre | **Christmas — Winter's Eternal Grasp** | Thrall "Krampus Noir" + cosmetic pack "Frozen Bloodline" |
| Février | **Valentine — La Duchesse Écarlate** | Thrall saisonnier + événement romance gothique |
| Juillet | **Summer — The Sun's Curse** | Event reverse-flavor : dawn phobia, offline penalty 50% mais embrace-dawn reward triplé |
| Anniversary | **Anniversary — The First Sired** | Thrall anniversaire unique cross-gen + retrospective lore |

Chaque event réutilise l'infra de la phase en cours : event narratif F, slot Sanctum H, Aspect variant I, etc. Le framework LiveOps scaffold posé en D3 supporte tout ça.

---

## Post-launch (hors roadmap)

Ordre décroissant d'impact selon les skills :
- **Feedback loop** : répondre aux reviews sous 48h (Google ranking factor)
- **LiveOps calendar 2026-2027** complet (Halloween / Black Friday / Christmas / Valentine / Summer)
- **Ritual Bundle 4,99 €** + **Bloodline Keeper 19,99 €** (Playbook 1 graduated starter pack pattern)
- **3 skins payants 2,99 €** chacun (Playbook 5 cosmetic IAP)
- **Second-layer prestige** ("Awakening" at dread ≥ 10k) — nouveau système qui reset dread pour une ember currency
- **Social layer** : leaderboard mondial weekly (top 100 blood produced)
- **Battle pass** (uniquement si DAU > 500 stable) — Playbook 2

## Kill-list (à NE PAS faire)

- ❌ ~~Ajouter une 3e currency au MVP~~ — **révoqué V1.2** : Ichor EST la 3e currency (plate, non-inflationniste, pull-only, cap 1000).
- ❌ **Multiplier linéaire sur prestige** — source du runaway. `globalMult = 1 + dread × 0.10` est remplacé par log ou sqrt (voir M1).
- ❌ **Kompu gacha** (2 drops combinés pour unlock un 3e) — illégal au Japon, signal rouge UE.
- ❌ **Thralls exclusifs IAP** — tout thrall est obtenable via pulls F2P. Les packs contiennent au max un Rare garanti + Ichor.
- ❌ **Dread affiché comme une currency spendable** — c'est un rank, traitement visuel distinct obligatoire.
- ❌ **Trigger Pack Fondateur post-frustration** — en V1.2 le trigger est post-succès (premier Rare obtenu), 7 jours dispo, pas 48h countdown.
- ❌ Loot boxes opaques (rates non disclosés) — disclosure légal obligatoire (loi KR 2024, best practice UE).
- ❌ Pay-to-win (les effets permanents IAP sont cosmétiques + qualité de vie, pas puissance absolue)
- ❌ Timer gates sur core progression
- ❌ Forced interstitial ads
- ❌ Notifications > 1/jour

## Ordre de priorité exécutif (V1.2 — 2026-04-24)

### Ship-to-production v1.0 (post-course-correction)

Tickets bloquants pour un AAB gacha-ready :

1. **M1** — log multiplier + Dread refactor math (ship-blocker absolu, fix le runaway découvert 04-24)
2. **M2** — form-gated Dread cap
3. **M3** — offline exclusion de totalRunBlood pour Dread
4. **L3** — Ichor currency + sources F2P de base
5. **L4** — Dread → Power Level UI refactor
6. **L5** — Banners + Pulls + Pity + FRG + 10-pull
7. **L6** — Essence + Stars (awakening)
8. **L7** — Roster v1.0 refactor (6C+4R+2E) — *bloqué sur les 8 portraits*
9. **L8** — FTUE rework avec gift Ichor + FRG
10. **L9** — Page Taux disclosure (légal)
11. **K2 (refactored)** — Play Billing infra (sans le contenu des packs)
12. **L10** — Ladder packs 7 tiers + First-Time Double
13. **L11** — Pack Fondateur trigger post-first-Rare
14. **L13** — Spending dashboard + Age gate (légal/RGPD)
15. **E4** — AAB production upload

**Tickets parallélisables** : L12 (ads), L14 (analytics), L15 (polish) peuvent avancer pendant que les portraits L7 sont générés.

### Si 3 tickets seulement

**M1 + L3 + L5** — le pivot minimum : math safe, une currency de pull, une mécanique de pull. Tout le reste peut survivre une release tardive.

### Si 7 tickets

Ajouter **M2 + L4 + L6 + L7** — le cœur de l'expérience gacha + balance fix complet.

### Priorité décroissante des phases

- **M** (balance) — ship-blocker absolu. Sans fix, les métriques de rétention sont corrompues par le runaway.
- **L** (gacha MVP) — scope du pivot V1.2.
- **K** restant (K2, K3) — K2 refactoré en "Billing only", K3 replacé par L11.
- **C** (Tome/Servants depth) — peut glisser, zéro risque sur launch.
- **F-J** (post-launch) — inchangés, H absorbée.

**Règle d'or post-launch** : jamais 2 content tracks en parallèle. Phase F stabilisée → Phase G. Phase G stabilisée → v1.1 (Legendaries + featured rerun). Cadence monogame = content soutenable sur 18 mois.

---

Dernière mise à jour : 2026-04-24 (course correction V1.2)
