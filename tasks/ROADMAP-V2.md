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
| **B — Meta progression** | B1, B2 | Upgrades = dread sinks, Shop a un sens |
| **C — Content depth** | C1, C2 | Tome = codex vivant, Servants = gestion réelle |
| **D — Monétisation réelle** | D1, D2, D3 | IAP Play Billing + FTB popup + LiveOps scaffold |
| **E — Release prep** | E1, E2, E3, E4 | i18n, audio compression, ASO, AAB internal track |

Ordre strict : faire A avant B avant C… Les dépendances suivent cet ordre (B utilise le gating de A, D utilise le shop de B, E dépend du tout).

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

### B1 — Upgrade system data + state

**Why** : le Shop doit avoir une fonction réelle, pas juste un layout. Les 5 upgrades proposés (Blood Altar / Servant Loyalty / Bloodline Scholar / Dread Amplifier / Offline Keeper) sont les dread sinks qui donnent un vrai endgame (30-50h de jeu). Idle-expert : "prestige currency doit avoir des sinks permanents, sinon le meta-loop est vide".

**Scope**
- `src/game/config/upgrades.ts` — 5 upgrades with levels + costs + effects
- State : `upgrades: Record<UpgradeId, { level: number }>` (persisté)
- `buyUpgrade(id)` : vérifie dread ≥ cost, décrémente, incrémente level, emit event
- Formules intégrées :
  - **Blood Altar** : background timer → auto-blood-gain. Lv 0 = OFF, lv 1 = 4h CD, lv 5 = 1h CD. Amount = rate × 60s × (1 + level × 0.2).
  - **Servant Loyalty** : applique multiplier dans `getTotalRate()` → `× (1 + level × 0.05)`
  - **Bloodline Scholar** : modifie `thrallCost` → `COST_MULTIPLIER - level × 0.01`
  - **Dread Amplifier** : `dreadGain × (1 + level × 0.1)` dans projectedDreadGain
  - **Offline Keeper** : +level heures au cap offline
- Tests : `upgrades.test.ts` pour chaque formule
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

Si tout saute sauf 3 tickets dispo, faire **A1 + B1 + D1**.
Si tout saute sauf 7 tickets, ajouter **A2, B2, D2, E4**.
Le reste = nice-to-have polish.

---

Dernière mise à jour : 2026-04-20
