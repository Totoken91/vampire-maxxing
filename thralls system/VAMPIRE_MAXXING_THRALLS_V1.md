# 🩸 Vampire Maxxing — Thralls System v1.0 (MVP Launch)

> Brief consolidé pour Claude Code. Synthèse de 3 sessions d'expertise (UX mobile, idle game design, monétisation F2P) + vision UI utilisateur.
>
> **Décision stratégique :** Launch AVEC les thralls, scope 12 unités, monétisation MVP incluse (light).

---

## 🎯 Pourquoi ce scope (décision verrouillée)

Deux pièges évités :

1. **Launch sans thralls** → pas de meta-loop, D7 retention plafonne à 5-8% (benchmark idle). Un jeu vampire sans roster à collectionner, c'est un compteur qui monte.
2. **Launch avec 20 thralls + full system** → scope creep, 3-6 mois de dev perdu, design in vitro jamais validé. Risque #1 flaggé dans le profil dev (projets parallèles : Stella, Shabero, LettreMagique).

**Le bon move : MVP 12 thralls avec monétisation light intégrée dès v1.0.**

Pourquoi monétisation dès le MVP (changement vs. plan initial) :
- La monétisation **valide la desirability du système**. Un joueur qui regarde 3 ads/jour pour un pull prouve que le système accroche. Attendre v1.3 = tester à moitié.
- Les rewarded ads + 1 pack starter sont **low-risk, high-learning**. Ça ne bouleverse pas le dev.
- **RÈGLE ABSOLUE** : zéro paywall, zéro timer gate, aucun thrall légendaire exclusif payant en v1.0. La monétisation teste la mécanique de pull, pas l'extraction.

---

## 🎨 Vision UI (basée sur le mockup fourni)

Le mockup ChatGPT capture parfaitement le mood. À conserver :

- **Palette** : noir profond, accents rouge sang, or ancien, parme pour l'épique. Pas de saturation flashy.
- **Cards verticales** en grille 5×N, bordure colorée selon rareté, liseré doré ornemental
- **Étoiles de niveau** sous le nom (système d'awakening progressif, mais pas en v1.0 — voir plus bas)
- **Barre tabs filtre** : ALL / BLOODLINE / CURSED / SUPPORT / TANK / DPS (⚠️ on simplifie en v1.0)
- **Section "ACTIVE THRALLS"** en bas avec slots visuels, dernier slot verrouillé avec condition (`Unlocks at Dread × 20`)
- **Navigation bottom** : COVEN / RITUALS / THRALLS / BLOODLINE / SHOP

### ⚠️ Simplifications MVP vs. mockup

Le mockup montre des éléments qui doivent être **coupés ou stubbed** en v1.0 :

| Élément mockup | Décision v1.0 |
|---|---|
| 56 thralls collectés | **12 max** |
| 5 slots actifs | **3 slots** (scale à 4 à Dread×10, 5 à Dread×25) |
| Tabs BLOODLINE/CURSED/SUPPORT/TANK/DPS | **Garder ALL + 3 tabs** seulement : ALL / HARVESTER / NOCTURNE / PREDATOR |
| Système d'étoiles (★★★★★) | **Supprimé en v1.0**, ajouté v1.2 avec l'awakening par doublons |
| Niveaux Lv.47, Lv.40 | **Cap Lv.20 en v1.0** (suffisant pour 30-60j de jeu) |
| Onglet BLOODLINE (synergies) | **Stubbed** — tab visible "Coming soon" pour teaser v1.3 |
| Onglet RITUALS | **Actif** — c'est le gacha léger (voir monétisation) |
| Onglet COVEN | **Stubbed** — placeholder pour guild/social v2+ |

**Loi UX n°6 (progressive disclosure)** : on révèle les features progressivement. Un joueur D1 ne doit pas voir 5 systèmes vides.

---

## 🩸 Les 12 Thralls MVP

Répartition validée : **6 Communs + 4 Rares + 2 Épiques**. Pas de légendaire au launch (on garde ça pour v1.1 en carotte rétention).

### Archétypes (3 seulement)

| Archétype | Rôle mécanique | Couleur |
|---|---|---|
| **Harvester** | Boost génération de Sang | Rouge |
| **Nocturne** | Boost gains offline | Violet |
| **Predator** | Boost gains actifs (tap/session active) | Cyan |

### Roster v1.0

#### 🔴 Communs (6) — le socle
Drop facile, pool de départ, donnent au joueur le sentiment d'avoir une "équipe".

1. **Ash the Wretched** — Harvester — +8% Blood generation
2. **Mira the Watcher** — Nocturne — +12% offline gains (cap 2h)
3. **Roderick the Tracker** — Predator — +10% active session gains
4. **Iron Maw** — Harvester — +6% Blood generation, -2% prestige cost
5. **Crypt Warden** — Nocturne — +10% offline gains, +5% cap offline time
6. **Gravebound** — Predator — +8% active gains, taps count x1.1

#### 🟣 Rares (4) — première mi-parcours
Visibles dès session 1 dans la "Crypt" avec silhouette verrouillée. Drop via milestones ou rituels. Objectif 2-8h de jeu.

7. **Nox the Hunger** — Harvester — +25% Blood generation
8. **Lilith's Whisper** — Nocturne — +30% offline gains, cap étendu à 4h
9. **Duskward** — Predator — +22% active gains + haptic spécial au tap
10. **Ashen Vale** — Hybrid — +15% toutes sources + débloque +1 slot actif

#### 🟡 Épiques (2) — objectifs long terme
Visibles dès début, inaccessibles avant prestige ~3. Crée la **Loi n°2 : tease the next unlock** de manière puissante.

11. **Mirella, Thorn of the Court** — Harvester — +60% Blood + effet visuel sur le tap (particles roses sang)
12. **Velmor the Dread** — Nocturne — +80% offline gains + cap 8h + auto-collect unlock

**Pas de Légendaire en v1.0.** Le slot "Lord of Night" du mockup reste **visible et silhouetté** ("Unknown — Locked") comme teaser pour v1.1. C'est un levier de rétention : les joueurs qui reviennent à la mise à jour se précipitent pour débloquer.

---

## 🎣 Comment on les obtient (acquisition v1.0)

4 voies, dont 3 F2P crédibles. Règle : **un joueur 100% F2P doit pouvoir compléter 10/12 du roster en ~30 jours de jeu.**

### Voie 1 — Tutorial gift (1 thrall)
- **Ash the Wretched** offert à la fin du FTUE (session 1, ~90s de jeu)
- Moment scénarisé : "Ton premier serviteur s'agenouille devant toi."
- Pose l'aesthetic, enseigne le screen Thralls, donne une victoire immédiate

### Voie 2 — Milestones de progression (5 thralls)
Drops garantis à des paliers fixes :
- **Prestige 1** → Mira the Watcher (Commun Nocturne)
- **Prestige 2** → Roderick the Tracker (Commun Predator)
- **Prestige 4** → Iron Maw (Commun Harvester)
- **Prestige 6** → Crypt Warden (Commun Nocturne)
- **Prestige 10** → Ashen Vale (Rare Hybrid, débloque slot actif 4)

Les milestones sont **visibles dans un screen "Destiny"** pour que le joueur sache où il va. Loi n°2 (tease next unlock) et Loi n°3 (always show progress).

### Voie 3 — Rituels d'Invocation (le gacha léger)
**C'est là que vit ta monétisation.**

Deux types de rituels :

#### Rituel Mineur (F2P principal)
- Coût : **500 Blood** (soft currency, se farme en ~30min de jeu)
- Pool : 70% Commun / 28% Rare / 2% Épique
- **Pity system** : Rare garanti tous les 10 pulls (compteur visible)
- **Cap** : 3 pulls gratuits max par jour (via Blood gagné), illimité en regardant rewarded ads
- **Rewarded ad placement** : "Regarder une ad → 1 Rituel Mineur gratuit" (cap 3/jour)

#### Rituel Majeur
- Coût : **50 Dread Shards** (hard currency, gagnable ET achetable)
- Pool : 30% Rare / 60% Épique / 10% Légendaire (**slot vide en v1.0, réservé v1.1**)
- **Pity system** : Épique garanti tous les 15 pulls
- Dread Shards gagnables : 5/jour via quête quotidienne + drops rares de boss prestige

### Voie 4 — Premier Pack Bienvenue (IAP soft, optionnel)
- **Pack Nocturne** à **2,99€** — apparaît **uniquement après le 5e rituel raté sans Rare**
- Contenu : 1 Rituel Majeur garanti + Nox the Hunger (Rare) garanti + 100 Dread Shards
- Valeur affichée : "Valeur totale : 24,99€ → Maintenant : 2,99€"
- Timer : **48h une fois affiché**, ne se reset jamais
- Badge : "OFFRE UNIQUE — PACTE FONDATEUR"
- **Règle stricte** : ne contient JAMAIS de thrall Épique ou Légendaire. L'épique se mérite.

---

## 💰 Architecture monétisation v1.0

### Ce qui EST dans le MVP
| Source | Prix / Fréquence | Revenu attendu |
|---|---|---|
| Rewarded ads (rituels) | Gratuit, cap 3/j | ~60% du revenu F2P |
| Rewarded ads (2x offline au retour) | Gratuit, 1x/session | ~20% du revenu F2P |
| Pack Bienvenue | 2,99€ one-shot | ~15% du revenu payant |
| Pack Dread Shards | 4,99€ (500 shards) | ~25% du revenu payant |
| Pack Dread Shards | 9,99€ (1200 shards + bonus) | ~35% du revenu payant |
| Pack Starter Coven | 9,99€ (1 Rare garanti + 500 shards) | ~25% du revenu payant |

### Ce qui N'EST PAS dans le MVP (reporté)
- ❌ Battle Pass (v1.3)
- ❌ Packs whale 19,99€+ (v1.2)
- ❌ Skins thralls (v1.2)
- ❌ Thralls exclusifs IAP (jamais direct — toujours via event/pass)
- ❌ Subscription (v2+)
- ❌ Founder Pack (v1.1)

### Placements rewarded ads (priorité)
1. **2x offline progress** au retour dans l'app (highest value)
2. **+1 Rituel Mineur gratuit** (cap 3/jour)
3. **Boost Blood ×3 pendant 10min** (cooldown 2h)
4. **Pity counter +1** après prestige (capte au peak engagement)

### Cibles monétisation soft launch
| Métrique | Minimum viable | Healthy |
|---|---|---|
| D1 retention | 35% | 42%+ |
| D7 retention | 12% | 18%+ |
| D30 retention | 4% | 8%+ |
| ARPDAU | 0,05€ | 0,10-0,15€ |
| Rewarded ad engagement | 30% DAU watch 1+/day | 50%+ |
| FTB conversion (D7) | 1% | 2-3% |

---

## 🎨 UX du Roaster screen (implémentation)

Reprise fidèle du mockup avec ajustements MVP.

### Layout (portrait mobile, thumb-zone aware)

```
┌─────────────────────────────────────┐ TOP 10% — Status
│ 🩸Vampire Maxxing  THRALLS  DREAD×12│
│                    ROASTER    🌙     │
│              Collected: X/12         │
├─────────────────────────────────────┤ 10-20% — Filtres
│ [ALL] [HARVESTER] [NOCTURNE] [PRED] │
├─────────────────────────────────────┤ 20-70% — Grille scrollable
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐            │
│  │ 🔴│ │ 🟣│ │ 🟡│ │ ? │            │  Cards 5 par ligne (mobile) OU 3 par ligne + scroll
│  │Ash│ │Nox│ │Mir│ │???│            │
│  └───┘ └───┘ └───┘ └───┘            │
│                                      │
│  ... scroll ...                      │
├─────────────────────────────────────┤ 70-85% — ACTIVE THRALLS (sticky)
│        ─── ACTIVE THRALLS ───        │
│  ┌──┐ ┌──┐ ┌──┐ ┌🔒┐                │
│  │👤│ │👤│ │+ │ │🔒│                │  3 slots débloqués + 1 locked + 1 hidden
│  └──┘ └──┘ └──┘ └──┘                │
│                                      │
├─────────────────────────────────────┤ 85-100% — Bottom nav
│ [COVEN][RITUALS][THRALLS•][BL][SHOP]│
└─────────────────────────────────────┘
```

### Règles UX critiques (non-négociables)

1. **Touch targets ≥ 48dp** — les cards thralls font au minimum 140×180dp en grille 3×N (éviter 5×N sur mobile < 400dp width)
2. **Feedback < 200ms** sur tout tap (scale bounce + haptic léger)
3. **Silhouettes pour non-possédés** — pas de slot vide. Le joueur voit ce qu'il n'a pas, loi n°2
4. **Long-press sur card** = détail thrall (lore + stats) en modal, pas de navigation full screen
5. **Drag-to-equip** : drag une card vers un slot ACTIVE = équiper. Haptic + son de confirmation.
6. **Pulsation glow rouge** sur les cards non-vues depuis leur drop (nouveauté).
7. **Badge count rouge** sur l'icône THRALLS du bottom nav quand nouveaux drops

### Juice par rareté (Playbook 3 UX)

| Rareté | Animation pull | Son | Haptic |
|---|---|---|---|
| Commun | Fade-in simple 0.5s | Click doux | Tap léger |
| Rare | Zoom + particles violet 1.5s | Cloche profonde | Double tap |
| Épique | Screen darkening + zoom + flames roses 2.5s | Chœur grave | Heavy + triple tap |
| Légendaire (v1.1) | Cinematic 4s avec flash écran | Tonnerre + chœur | Full haptic séquence |

### Narrative dans les copies (loi n°9 UX)

Pas de "Buy Gems!" ou "Pull!". Adopte le ton :
- Bouton pull → **"INVOQUER"** / **"SACRIFIER LE SANG"**
- Thrall équipé → **"Asservi à ta volonté"**
- Thrall non possédé → **"Encore libre des chaînes"**
- Prestige → **"ASCENSION"** ou **"TRANSCENDANCE"**
- Pack bienvenue → **"LE PACTE FONDATEUR"**

---

## 🗓️ Roadmap post-launch (déclenchée par métriques, pas calendaire)

### v1.0 — LAUNCH (ce brief)
12 thralls, gacha léger, rewarded ads, Pack Bienvenue

**Go/no-go pour v1.1** (attendre 2-4 semaines de data) :
- ✅ >60% DAU ouvre screen Thralls 1x/session
- ✅ >30% DAU regarde 1 rewarded ad/jour
- ✅ D7 retention >12%
- ✅ Aucune fuite majeure sur la boucle d'équipement

### v1.1 — Retention Event (2-3 semaines après launch)
- **+2 Légendaires** débloqués : Lord of Night + Blood Countess
- **Event one-shot "La Nuit du Sang"** (2 semaines) : pity boost + thrall event-exclusive récupérable F2P
- **Founder Pack** à 19,99€ (premier pack whale, one-time) : thrall Légendaire Founder + skin + bonus permanent
- Slot actif 5 débloqué à Dread ×30

### v1.2 — Dépth (1-2 mois après launch)
- **+5 thralls** (18 total) dont 1 Légendaire supplémentaire
- **Système d'awakening** (étoiles du mockup) via shards de doublons
- **Skins** pour 3 thralls populaires (2,99€ à 4,99€ unitaire)
- Tab BLOODLINE activée : 3 lignées avec bonus de synergie si 3 thralls de même lignée équipés

### v1.3 — LiveOps cadence (2-3 mois après launch)
- **Battle Pass "Pacte Nocturne"** à 4,99€ — 30 tiers sur 4 semaines, 1 Mythique au palier 30
- Rareté **Mythique** introduite (BP + events only, jamais pull)
- Cadence événements : 1 event/2 semaines
- Tab COVEN activée (optionnel : social light, amis uniquement)

---

## 🏗️ Architecture technique recommandée

### Data model extensible (dès v1.0)

```typescript
interface ThrallData {
  // v1.0 — actif
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  archetype: 'harvester' | 'nocturne' | 'predator' | 'hybrid';
  maxLevelV1: number; // cap à 20 en v1.0

  // Bonus
  primaryEffect: {
    type: 'blood_gen' | 'offline_gain' | 'active_gain' | 'prestige_cost' | 'tap_multiplier';
    value: number; // en % par ex. 0.10 = +10%
    scalesWithLevel: boolean;
  };
  secondaryEffect?: { /* même shape */ };

  // Acquisition
  acquisitionSource: 'tutorial' | 'milestone' | 'ritual_minor' | 'ritual_major' | 'pack' | 'event';
  milestoneUnlock?: { type: 'prestige', value: number };

  // Art
  portraitPath: string;

  // v1.1+ — pré-structuré mais inutilisé en v1.0
  bloodline?: string; // v1.2 (synergies)
  stars?: number; // v1.2 (awakening)
  equippableSkins?: string[]; // v1.2
  eventExclusive?: { eventId: string, validFrom: Date, validTo: Date }; // v1.1+
  set3Bonus?: string; // v1.2 (bloodline synergies)
}

interface PlayerThrallState {
  thrallId: string;
  owned: boolean;
  level: number;
  xp: number;
  stars: number; // 0 en v1.0
  firstObtainedAt: Date;
  isNew: boolean; // pour le badge "new" UX
  isEquipped: boolean;
  equippedSlot?: number; // 0, 1, 2 en v1.0
}

interface PlayerState {
  thralls: PlayerThrallState[];
  activeSlots: number; // 3 en v1.0, scale à 5
  ritualMinorCounter: number; // pity counter
  ritualMajorCounter: number; // pity counter
  lastRewardedAdWatch: { ritualMinor: Date, offlineBoost: Date, boost: Date };
  welcomePackShownAt?: Date;
  welcomePackPurchased: boolean;
  // ... reste
}
```

### Fichiers à créer

```
/src
  /features
    /thralls
      /data
        thralls-roster.ts      # Les 12 thralls v1.0
        rarity-config.ts        # Couleurs, juice specs par rareté
      /screens
        ThrallsRoasterScreen.tsx
        ThrallDetailModal.tsx
        RitualsScreen.tsx       # Pulls (Mineur + Majeur)
      /components
        ThrallCard.tsx
        ActiveSlotBar.tsx
        PullAnimation.tsx       # animations de pull selon rareté
        PityCounter.tsx
      /logic
        ritual-pull.ts          # RNG + pity system
        thrall-bonus-calc.ts    # calcul des bonus cumulés
        acquisition.ts          # gestion milestones, drops
      /store
        thralls-slice.ts        # state management (Zustand vu ton stack habituel)
  /features
    /monetization
      /data
        packs-catalog.ts        # Pack Bienvenue, Dread Shards, Starter Coven
      /components
        WelcomePackModal.tsx
        RewardedAdButton.tsx
      /logic
        welcome-pack-trigger.ts # quand afficher le pack
        rewarded-ad-placements.ts
```

### Analytics à instrumenter (critiques pour go/no-go)

```typescript
// Events à tracker (Amplitude / Mixpanel / équivalent)
analytics.track('thralls_screen_opened', { session_number });
analytics.track('thrall_equipped', { thrall_id, rarity, slot });
analytics.track('ritual_performed', { type, result_rarity, pity_counter });
analytics.track('rewarded_ad_completed', { placement, reward_type });
analytics.track('welcome_pack_shown', { trigger_context });
analytics.track('welcome_pack_purchased', { time_since_shown });
analytics.track('pack_purchased', { pack_id, price });
analytics.track('prestige_performed', { prestige_level, thralls_owned });
```

---

## ✅ Checklist launch v1.0

### Contenu
- [ ] 12 thralls designés (portraits AI via ComfyUI)
- [ ] Lore 2-3 phrases par thrall (optionnel mais fortement recommandé)
- [ ] Noms FR/EN si localization prévue

### Systèmes
- [ ] ThrallData model implémenté (extensible)
- [ ] Screen Thralls Roaster avec grille + active slots
- [ ] Screen Rituals (Mineur + Majeur) avec pity system
- [ ] Animation de pull par rareté
- [ ] Système de milestones liés aux prestiges
- [ ] Calcul des bonus cumulés équipés → core loop
- [ ] Save/load des thralls dans la persistence

### Monétisation
- [ ] Pack Bienvenue à 2,99€ avec trigger conditionnel
- [ ] 2 packs Dread Shards (4,99€ / 9,99€)
- [ ] Pack Starter Coven (9,99€)
- [ ] 3 placements rewarded ads (minor ritual / offline 2x / boost)
- [ ] Intégration SDK ads (AdMob + IronSource fallback recommandé)
- [ ] Intégration IAP (Google Play Billing + test prix EUR)

### UX / Polish
- [ ] Haptic feedback par rareté (tap thrall, pull, equip)
- [ ] Audio feedback par rareté
- [ ] Silhouettes pour thralls non-possédés
- [ ] Badge "NEW" sur drops non-vus
- [ ] Skip button sur animations de pull (pour vétérans)
- [ ] Reduced-motion respect (anim de pull raccourcie)
- [ ] Tests one-handed sur device physique (pas émulateur)

### Analytics
- [ ] SDK analytics intégré
- [ ] 10 events critiques trackés
- [ ] Dashboard de retention D1/D7/D30 en place
- [ ] ARPDAU + FTB conversion tracking

### Go/no-go
- [ ] Pas de paywall forcé
- [ ] Pas de timer gate sur core gameplay
- [ ] Pas d'ads interstitielles forcées
- [ ] Tous les thralls du Pack Bienvenue obtenables en F2P
- [ ] Offline progress généreux (2h minimum cap)
- [ ] Save versioning en place (migrations futures)

---

## 🎤 Note finale au dev

Tu es solo, avec 3 autres projets actifs. Le vrai adversaire c'est pas la complexité du feature — c'est le **scope creep**. Chaque ajout "tant qu'on y est" coûte 3 jours et retarde le learning.

Règle à graver : **ship en 4-6 semaines, observe 4 semaines, itère.** Le vrai design de Vampire Maxxing se fera avec les données des 100 premiers joueurs, pas dans la tête du dev.

Le Légendaire visible mais verrouillé ("Lord of Night" silhouetté) est ton arme secrète de rétention : il attend la v1.1. Chaque joueur qui arrive au end-game du MVP le voit et se dit "je reviens quand il sort". C'est exactement la loi n°2 de l'idle game design appliquée au méta-niveau.

**Ship it.**
