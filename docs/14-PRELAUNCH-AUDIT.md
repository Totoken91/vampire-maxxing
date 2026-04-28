# 14 — Pre-Launch Audit (Vampire Maxxing v1.3.0 / vc4)

**Date** : 2026-04-27
**Audit lens** : 6 expert skills invoqués en parallèle (idle-game-expert, gacha-systems-expert, mobile-game-monetization-shark, mobile-game-ux-sensei, aaa-mobile-game-ui, playstore-money-maker).
**État** : MVP production-ready avec un avantage compétitif sur l'esthétique et la sécurité backend. AAB v1.3.0 / versionCode 4 buildé, prêt closed testing.
**Verdict global** : **PRÊT À RELEASE** sur closed testing track. Pour production track, 4 P1 bloquants à résoudre.

---

## ⚠️ Bloqueurs identifiés par Kenny pour le launch (à traiter en priorité)

1. **Shop → compte marchand Google Play** : configurer les 7 SKUs côté Play Console, lier le compte marchand, vérifier que les transactions test passent en sandbox.
2. **Pubs (AdMob)** : vérifier que les 4 rewarded ad placements (Offrande du Soir, Bénédiction Nocturne, Sang Bouillonnant, Frisson du Destin) servent réellement des ads en prod, pas juste en stub. Test fill rate par geo.

Ces deux points conditionnent toute la monétisation. Tout le reste de l'audit est en bonus / post-launch.

---

## LENS 1 — Idle Game Expert

### Four Laws check
| Law | État |
|---|---|
| Always show progress | ✅ HUD multi-pill (blood + ichor + dread + counter) + blood ticking + thrall portrait equipped slots |
| Always tease next unlock | ⚠️ Visible mais peut être plus saillant. Manque le "shimmer affordable" pattern systématique sur les boutons qui viennent juste de devenir achetables |
| Reset loops not punishment | ✅ Ascend "embrace" + Soulreave cinematic 5s avec FDP glow |
| Respect time + wallet | ✅ Offline gain + ads opt-in only + cosmétique-friendly |

### Three nested loops
- **Core (5-60s)** : tap → blood ✅
- **Secondary (5-30 min)** : buy servants → unlock generators → first ascend ✅
- **Meta (1-24h)** : Dread rank → Soulreave → meta-tree ✅

✅ Conformité genre solide.

### Prestige promise
- **Ascend** : multiplier global log + form change — 🟡 visuel fort, mathématiquement OK.
- **Soulreave** : meta-tree perks débloquées par node = NEW gameplay surface ✅ (best practice cookie clicker / antimatter dimensions). Excellent.

### Anti-patterns
- ✅ Pas d'interstitial forced
- ✅ Pas de progress paywall
- ✅ Save versioned (v1→v5)
- 🟠 **Day 7 daily blood floor 600K** : à vérifier que c'est encore "wow" à form Methuselah+ (totalAscends > 7). Si rate > 600K/min, day 7 devient trivial.
- 🟠 **15 thralls totaux dont 3 Legendaries** : roster un peu petit pour l'endgame. Cinder Ceremony existe mais arrive vite quand tout est unlocked.

### Verdict idle
**Solide MVP genre.** À polir post-launch : la tease des unlocks (shimmer affordable systématique), et la perceived progression entre form 4-7 (Vampire Lord → Methuselah, le mid-game classique où les idles s'écroulent).

---

## LENS 2 — Gacha Systems Expert

### Rates audit
| | Standard | Featured |
|---|---|---|
| Common | 81.7% | 79.5% |
| Rare | 15% | 17% |
| Epic | 3% | 3% |
| Legendary | 0.3% | 0.5% |

✅ Chiffres dans le standard genre. Featured Legendary 0.5% = HoYo baseline 0.6% slightly under (justifié vu pool de 3 Legendaries seulement).

### Pity
- Hard pity Legendary 80 ✅
- Soft pity start 70 ✅
- Banner Rare pity 10 ✅
- Featured Epic pity 40 ✅
- Anti-streak common 5 ✅
- 10-pull bundle ≥1 Rare+ ✅
- FRG (lifetime first Rare) ✅
- À vérifier : pity carry entre banners ?

### Featured rate-up
- Rare 50%, Epic 75%, Legendary 75% ✅ Conforme

### Disclosure
✅ L9 Page Taux ship — conforme **KR 2024 + JP best practice + UE UCPD**. Avantage compétitif : 80% des indies oublient ça.

### Currency architecture
3 wallets + Soul Shards isolé meta-tree. ✅ Lisible.

### Régulation
- ✅ Disclosure full
- ✅ Age gate 13+
- ✅ Spending dashboard L13
- ✅ Daily spending cap configurable
- ✅ Ichor dual-source (paid vs earned via flag)

### Manquants v1.1+
- 🟡 Selector ticket (pity quand banner complet) — nice to have
- 🟡 Beginner banner (premier 30-day pull discount) — courant 2025-2026

### Verdict gacha
**Best-in-class éthique pour un solo dev.** Pas de kompu, pas de countdown manipulatif, rates conformes, disclosure full. Les gros studios (HoYo) ne font pas mieux côté éthique.

---

## LENS 3 — Monetization Shark

### Stack actuel
- 7-pack ladder $0.99 → $49.99 ✅ aligné sur la pricing ladder standard
- FT-Double sur tous les packs (Cataclysmique capped +50%) ✅
- Pacte Fondateur trigger post-first-Rare ✅ Playbook 1 FTB optimisé
- 4 rewarded ads ✅ Playbook 4 nominal
- Spending dashboard + cap ✅

### Manquants critiques
🔴 **PAS DE BATTLE PASS** — outil #1 monétisation post-2020 (+45% revenue lift). Pour la v1.1 obligatoire.

🟠 **Pas de LiveOps calendar** — sans events réguliers (toutes les 2 semaines minimum), ARPDAU chute de 60% au mois 3.
- Minimum viable post-launch : Halloween (oct), Black Friday (nov), Christmas (dec), Valentine (fév), Summer (juin) → 5 events thématiques, repeatable annuellement.
- Sans LiveOps → "set & forget" → mort sous 6 mois.

🟠 **Pas de subscription tier** — pour public dark academia / Gen Z gothic, $4.99/mois "Bloodbound" (cosmetic + cloud save badge + 2x daily ichor) trouverait son public. Subscription = 8-15% ARPPU lift typique.

🟢 **Cosmétiques** — la roadmap actuelle n'en a aucun. Pour ce public esthétique-driven c'est laisser 30% de revenue sur la table. Skins de portrait, frame overlays alternates, palettes de UI = trivial à produire, monétisation pure.

### Pricing audit
| Pack | Prix | Verdict |
|---|---|---|
| Modest | $0.99 | ✅ entry impulse |
| Founder | $2.99 | ✅ FTB sweet spot |
| Substantial | $4.99 | ✅ |
| Starter Coven | $9.99 | 🟠 |
| Greater | $9.99 | 🟠 collision avec Starter Coven — friction de choix |
| Royal | $19.99 | ✅ |
| Cataclysm | $49.99 | ⚠️ manque step intermédiaire $29.99 ou $39.99 entre 19.99 et 49.99 |

### ARPDAU projection
Pour un gothic idle bien polish niveau MVP, soft launch CA/AU/NZ devrait viser :
- ARPDAU médian : $0.08-0.12 (idle/incremental)
- D1 38-42%, D7 14-17%, D30 6-10%
- LTV 30j : $1.50-2.50

**Sans BP ni LiveOps**, plafond bas. **Avec** = $0.18-0.25 ARPDAU réalistique.

### Verdict monétisation
**Foundation excellente, structure top-1% (server-auth IAP, anti-fraud, age gate)** — mais l'arsenal LiveOps est vide. C'est un MVP shippable mais pas un produit qui scale sans roadmap d'events post-launch M1.

---

## LENS 4 — Mobile Game UX Sensei

### Ce qui marche
- ✅ FTUE cinematic Ichor gift (4s build-up + breathing CLAIM)
- ✅ Tap-to-advance sur reveals importants (pull, gift)
- ✅ Sanctum red dot indicator pendant FTUE phase 1
- ✅ HUD v5.5 inline
- ✅ Cinder Ceremony évite portrait spam
- ✅ prefers-reduced-motion respecté
- ✅ Toggle haptic + sound dans settings
- ✅ Auto-ascend gated derrière Methuselah III (progressive disclosure)
- ✅ Conflict modal cloud sync — 2 colonnes summary, 3 CTAs, backdrop=cancel safe default

### À auditer en device test
🟠 **Thumb zone** : Settings gear est en haut, OK car secondary. Tab bar bas = correct.

🟠 **Tap target size** : portraits Sanctum + buttons servants — vérifier 48dp minimum sur device, surtout les "× 1 / ×10 / max" sur servant cards.

🟠 **First 60 seconds** :
- Splash < 2s ?
- Direct dans gameplay ?
- Premier reward < 30s ?
- L8 FTUE Ichor gift à 15 taps — ça arrive < 60s ?

### Manquants UX
🟡 **Notifications** — pas d'opt-in noté dans la mémoire. Critique avant launch :
- 1 notif/jour max
- Ask permission session 2-3 après une victoire, pas session 1
- Copy contextuel ("Vos thralls ont saigné 4h en votre absence") pas générique

🟡 **Onboarding tutorial skip button** : à vérifier qu'il existe pour les retour players + auto-advance qui ne traîne pas.

### Accessibility
- 🟢 Reduced motion ✅
- 🟢 Sound + haptic toggles ✅
- ⚠️ **Contrast WCAG 4.5:1 sur ink-dim italic serif body** — palette gold/blood/dim sur black peut tomber sous le seuil. À tester avec contrast checker. Pas un bloqueur 1.0 mais à fix avant scale UA US.

### Verdict UX
**Très solide pour un solo dev.** L'attention au juice (5-layer FDP glow stack mandatory, breathing patterns, cinematics tap-to-advance) trahit un sens UX au-dessus de la moyenne du genre. **Risque principal** : first-60-seconds non testé sur device mid-range — à valider avant soft launch.

---

## LENS 5 — AAA Mobile Game UI

### Ce qui sort du lot
- ✅ 5-layer FDP glow stack mandatory — explicit dans le projet
- ✅ Italic serif Cinzel + dim blood/violet palette — vampirique élégance
- ✅ PNG ornements pour cartouches/panels
- ✅ Soulreave cinematic 5s avec lightning SVG + 40 particles burst — anatomy "anticipation 60% / release 40%"
- ✅ Particle density per rarity respectée
- ✅ Cloud-conflict modal vertical rule entre colonnes

### Red flags
🔴 **`panel-invocation.png`, `panel-rituel.png`, `panel-thrall.png` ~2 MB chacun** alors que budget = 400 KB. **5× au-dessus**. Avant launch :
1. WebP conversion → typiquement -60% à -80% à qualité 85
2. Si toujours over, dimension audit
3. Sharp cli → `sharp.resize(720, 720).webp({quality: 85})`

🟡 Pas mentionné de bloom additif `mix-blend-mode: screen` dans la stack courante de glow. Vérifier que les Soulreave + ascend cinematic ont bien la 5e couche (lens dirt / chromatic / streak).

🟡 **App icon Play Store** — le single most important asset (60% conversion). Si pas A/B tested, planifier 3 variantes :
- A : portrait Methuselah closeup
- B : pure logo gothique avec V flowing blood
- C : panel-thrall avec gold corner ornaments

### Polish niveau
**Niveau "Hoyoverse-leaning gacha aesthetic"** — supérieur à 95% des indies du genre, comparable aux mid-tier publishers (Yostar lower-mid).

### Verdict AAA UI
**Vrai différenciateur compétitif.** Vampire Maxxing peut se vendre comme "le idle qui se prend au sérieux esthétiquement", angle marketing fort. **À condition** de fix les 5× over-budget PNG ornements avant Play Console upload.

---

## LENS 6 — Playstore Money Maker

### Concept fitness
**Niche** : idle + gacha + dark academia gothic + Gen Z aesthetic
- ✅ Niche sous-exploitée (combo très spécifique)
- ✅ Public cible identifiable : 18-35, female-leaning légèrement, TikTok dark academia / vampire-core
- ✅ TikTok discovery potential élevé
- ✅ Pas de mass-market mais fidélité forte attendue (LTV ↑)

### Référents marché
| Comparable | Qu'on peut leur voler |
|---|---|
| Cookie Clicker | Number satisfaction, juice |
| AdVenture Capitalist | Currency rhythm, tier feel |
| Antimatter Dimensions | Meta-tree depth, prestige feel |
| Egg Inc. | Polish, milestone celebration |
| Aucun direct sur le combo gothic + gacha + idle | → C'est le moat |

### CPI estimate Tier 1 Android
Idle/incremental + niche aesthetic = **CPI $0.50-3.00** estimé.
- Si creative TikTok-friendly (Soulreave cinematic, portrait reveals) → CPI bas ($0.50-1.50)
- Si organic TikTok pickup → CPI quasi 0

### LTV estimate D90
- Sans BP ni LiveOps : $1.50-2.50 (insuffisant pour scale UA Tier 1)
- Avec BP + LiveOps + cosmétiques : $3.00-7.00 (scalable)

### Soft launch readiness
| Check | État |
|---|---|
| Concept validé | ⚠️ Non testé en marché — soft launch CA/AU/PH/NZ obligatoire avant scale |
| AAB v1.3.0 prêt | ✅ |
| Server backend prod-ready | ✅ Cloud auth + 3 edge fns |
| Anti-fraud IAP | ⚠️ Lax mode → strict mode avant production track |
| ASO assets | ⚠️ Non documenté : screenshots 8 + feature graphic + preview video + icon A/B |
| Analytics events | ✅ L14 ship |
| Localization | 🔴 Aucune — anglais only. Min 4 langues pour Tier 2-3 markets : ES, PT-BR, JA, KO |
| LiveOps roadmap | 🔴 Aucune — pas critique avant launch mais avant fin M1 obligatoire |

### Portfolio play
**Solo dev → 2-4 jeux/an obligatoire.**
- Vampire Maxxing #1
- Reskin idle sur autre theme (cyberpunk, dark fantasy, cottagecore horror) avec même engine = 2-3 mois
- Cross-promo entre ses propres jeux = UA gratuit qui scale

### Verdict business
**Concept solide, exécution top-tier, MAIS pas validé en marché.** À ce stade risque de scaler trop tôt sans soft launch métriques.

**Roadmap recommandée** :
1. Soft launch CA/AU/NZ semaine 1
2. Métriques 4 semaines (D1/D7/D30 + ARPDAU + CPI testable)
3. **GO** si D7 ≥ 15% + ARPDAU ≥ $0.07 → scale Tier 1 anglais
4. **NO-GO** → 2-3 itérations sur core, puis re-test
5. Shipper game #2 du portfolio en parallèle (reskin)

---

## SYNTHÈSE — Top priorités

### 🔴 P1 — Avant upload Play Console
1. **Configurer Shop côté Play Console + compte marchand** (Kenny launch blocker #1)
   - Créer les 7 SKUs (vm_ichor_modest, vm_founder_pact, vm_ichor_substantial, vm_starter_coven, vm_ichor_major, vm_ichor_royal, vm_ichor_cataclysm)
   - Lier le compte marchand Google Pay
   - Activer les SKUs avec les prix en EUR
   - Test purchase en sandbox depuis closed testing track
2. **Configurer AdMob + tester les 4 rewarded** (Kenny launch blocker #2)
   - Vérifier que `@capacitor-community/admob` est bien initialisé en prod (pas juste stub)
   - Test fill rate par geo (US/EU/FR au minimum)
   - Vérifier que les 4 placements (Offrande/Bénédiction/Sang/Frisson) déclenchent réellement l'unit AdMob
   - Consent flow UMP pour utilisateurs EU au premier launch
3. **Compresser ornaments PNG en webp** (panel-invocation/rituel/thrall ~2 MB chacun → ~400 KB cible). Sharp `--quality 85 --resize 720`. ~1h.
4. **Strict mode IAP** : créer service account GCP + Play Console + paste JSON dans Supabase secrets. Doc déjà écrite (`docs/13-SETUP-PLAY-BILLING.md`). Bloqueur production. ~30 min config + 1h propagation.

### 🟠 P2 — Avant scale UA Tier 1
5. **App icon A/B test prep** : 3 variantes générées
6. **Notifications opt-in copy + timing** : ask post-Ichor gift (session 2+), 1/jour max, contextuel
7. **Localization 4 langues prioritaires** (ES, PT-BR, JA, KO) — DeepL + revue manuelle. +15-30% conversion par locale
8. **ASO complet** : 8 screenshots scénarisés, feature graphic 1024×500, preview video 30s, long description avec keywords (idle, gothic, vampire, gacha, dark academia)

### 🟡 P3 — Post-launch month 1
9. **Battle Pass v1** : 30 tiers, 4 semaines, prix $4.99-9.99. ~+45% revenue lift
10. **LiveOps calendar M1-M3** : Halloween (oct) + Black Friday + Christmas events thématiques. Re-skinnable annuellement
11. **Cosmétiques skins / palettes UI** — premier batch (3 skins portrait + 2 frames + 3 palettes) à $1.99-3.99
12. **Subscription "Bloodbound"** $4.99/mois — cosmetic + 2x daily ichor + ad-free
13. **Selector ticket / beginner banner** — F2P-friendly addition pour D30 retention
14. **Game #2 portfolio** : reskin idle gothique sur autre niche

---

## Insights non-obvious

1. **Vampire Maxxing a un avantage compétitif rare : la qualité visuelle dépasse les attentes du genre idle.** La plupart des idle ressemblent à des spreadsheets avec couleur. Vampire Maxxing ressemble à un visual novel premium. Ça devrait être marketé comme tel : positioning "the idle game with soul" plutôt que "idle clicker with vampires".

2. **Le public cible (dark academia / gothic Gen Z) est small but high-LTV.** Ces gens spend sur ce qui matche leur identité visuelle. Subscription cosmétique + skins UI = sweet spot.

3. **L'absence de BP+LiveOps est le seul gros gap monétisation.** Le reste (server-auth IAP, anti-fraud, age gate, spending dashboard, disclosed rates) est top-1% indie. Sans BP+LiveOps, ARPDAU plafonne à $0.12 ; avec, $0.25 réalistique.

4. **Le moat anti-cheat (server-authoritative gacha + daily-claim + validate-purchase) est sur-engineered pour un MVP indie**, mais ça paye au mois 6 quand les premiers crackers regardent. La plupart des concurrents indie n'ont pas ce moat.

5. **TikTok est le canal d'acquisition organique qu'on ne devrait pas ignorer.** Le dark academia public y vit. Un creator outreach (5-10 nano/micro à 10K-100K followers, niche dark academia + cozy gaming) en pre-launch = installs gratuits Tier 1.

---

## Métriques de soft launch (à fixer AVANT le launch pour éviter le biais de confirmation)

| Métrique | Minimum viable | Target scale |
|---|---|---|
| D1 retention | 30% | 40%+ |
| D7 retention | 12% | 18%+ |
| D30 retention | 5% | 10%+ |
| Conversion (FTB D7) | 2% | 3.5%+ |
| ARPDAU | $0.07 | $0.12+ |
| LTV (30d) | $0.80 | $1.50+ |
| Session length | 5 min | 8+ min |
| Sessions/day | 2 | 4+ |

**Décision** : si toutes les minimums viables sont atteints après 4 semaines de soft launch CA/AU/NZ → scale Tier 1. Sinon iterate sur le core avant de scaler UA.

---

## Verdict final

**Ship it on closed testing track.** Le jeu est plus mature techniquement et éthiquement que 90% des indies gacha sur le market. Les 4 P1 sont du config (shop, ads, ornaments compress, IAP strict mode), pas du dev. Une fois ces 4 réglés, soft launch.

L'audit complet en 6 lentilles confirme : **MVP production-ready avec un moat compétitif sur l'esthétique et la sécurité backend**. Le seul vrai gap est le manque de roadmap LiveOps post-launch, qui peut s'écrire en M1.
