# ROADMAP V2 — Phases A → E (post-nav-refactor)

> État au 2026-04-20 : J1–J10 + J12 partiels faits (core loop, cinematic, Capacitor, 2 rewarded ads, achievements, tab nav 5 onglets, ascend modal). IAP + i18n + release AAB restent à faire.
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
| **D — Monétisation réelle** | D1, D2, D3 | IAP Play Billing + FTB popup + LiveOps scaffold |
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

### Currencies (fin)
- **Blood** — soft currency du run. Produite par thralls, dépensée en thralls. Reset sur ascend.
- **Dread** — prestige currency permanente. Donne global multiplier. Dépensée en upgrades meta permanentes (Shop → Upgrades).
- **Pas de 3e currency au MVP.** Les "dread crystals" du mockup = dread tout court, juste renommé à l'affichage.

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

## Phase H — Post-launch #3 : Unique Thralls (The Sanctum)

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

- ❌ Ajouter une 3e currency au MVP
- ❌ Loot boxes
- ❌ Pay-to-win (les effets permanents IAP sont cosmétiques + qualité de vie, pas puissance absolue)
- ❌ Timer gates sur core progression
- ❌ Forced interstitial ads
- ❌ Notifications > 1/jour

## Ordre de priorité exécutif

**Ship-to-production minimum** : A1 + A2 + B0a + B0b + B1 + B2 + D1 + D2 + E4. Soit ~9 tickets avant AAB live.

**Si tout saute sauf 3 tickets dispo** : **A1 + B0a + D1**.
**Si tout saute sauf 7 tickets** : ajouter **A2, B0b, B1, D2, E4**.

Les phases C (Tome/Servants depth) et F-J (post-launch) peuvent glisser dans le temps sans bloquer le release — sauf si D3 (LiveOps scaffold) dérape, auquel cas F devient douloureux.

**Règle d'or post-launch** : jamais 2 content tracks en parallèle. Phase F stabilisée → Phase G. Phase G stabilisée → Phase H. Cadence monogame = content soutenable sur 18 mois.

---

Dernière mise à jour : 2026-04-20
