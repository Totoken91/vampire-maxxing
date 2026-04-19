# SPEC — Offline Progress Modal

> Le modal de retour est le **moment #1 de retention D1** selon les skills idle-expert et ux-sensei. 90% des joueurs qui voient un modal offline bien fait reviennent le lendemain. Doit être cinématique, pas un simple toast.

## Quand il apparaît

Conditions :
- L'app reprend focus après `visibilitychange` → `visible`
- `elapsed = (now - lastSaveTime) >= 60 secondes`
- Jeu déjà lancé au moins une fois (pas en first session)

**Ne s'affiche pas** si :
- C'est la première session (on veut garder le first-launch clean)
- `elapsed < 60s` (juste un switch rapide d'app)
- Un autre modal est déjà ouvert

## Composition visuelle (top → bottom)

```
┌──────────────────────────────────┐
│   [close ×, top-right, 24×24]    │
│                                  │
│      ― YOU SLEPT THROUGH ―       │
│           the dawn               │
│                                  │
│   Your thralls fed without you.  │
│                                  │
│                                  │
│          +12,847,303             │
│              blood               │
│                                  │
│      ₂h 30min offline · 50%      │
│                                  │
│                                  │
│  ┌──────────────┐ ┌────────────┐ │
│  │   ◈ CLAIM    │ │ ▶  EMBRACE │ │
│  │              │ │  THE DAWN  │ │
│  │              │ │  +2h, 100% │ │
│  └──────────────┘ └────────────┘ │
│                                  │
│   Watch a short rite for bonus   │
│                                  │
└──────────────────────────────────┘
```

## Styling (cohérent avec la DA)

- **Backdrop** : noir 80% (scrim), fade-in 300ms
- **Modal panel** : `ornaments/modal-panel-bg.png` (optionnel, peut rester CSS au MVP) ou simplement background `--paper` avec corners SVG or
- **Titre** "YOU SLEPT THROUGH the dawn" : Cormorant Garamond italic + tiret mono "―" gold autour
- **Chiffre blood** : JetBrains Mono 48px, `--blood` avec glow rouge, tabular-nums, animation count-up de 0 → final sur 900ms ease-out-cubic
- **Meta info** "2h 30min offline · 50%" : mono 12px `--ink-faint`
- **Bouton CLAIM** : même style cartouche que BOOST (gold)
- **Bouton EMBRACE THE DAWN** : cartouche red + glow, label "▶" devant indique rewarded
- Sous EMBRACE : sub-text italique `"Watch a short rite for bonus"` en `--ink-faint` pour que ce soit clair que c'est une pub

## Animation d'entrée (dramatique mais rapide)

- Backdrop fade 0 → 0.8 sur 300ms
- Modal scale 0.95 → 1 + translateY +20px → 0 sur 400ms ease-out-back
- Titre fade-in staggered (titre à 100ms, sub à 250ms)
- **Chiffre blood count-up** de 0 au total sur 900ms ease-out-cubic (effet jackpot)
- Boutons fade-in à 500ms
- Total duration : 1s, non-bloquant pendant l'anim (clic pendant count-up → snap au final)

## Règles anti-dark-pattern

### ✅ À respecter
- Les deux boutons ont **poids visuel équivalent** (mêmes dimensions, mêmes hauteurs)
- CLAIM est **à gauche** (action par défaut, le joueur lit LTR)
- EMBRACE THE DAWN est **à droite** avec icône ▶ claire
- Le sub-text indique explicitement "Watch a short rite" = pub
- Close button ×  accessible top-right
- **Tap hors modal ne valide pas** (évite faux-click à l'ouverture)

### ❌ À ne pas faire
- ❌ Bouton CLAIM plus petit que EMBRACE (dark pattern)
- ❌ CLAIM en couleur dim et EMBRACE en couleur vif (dark pattern)
- ❌ Countdown sur le bouton EMBRACE (fausse urgence)
- ❌ Auto-play de la pub (violation playbook shark)
- ❌ Close × caché après 3s

## Copy variants (rotation aléatoire parmi)

Titres :
```
"YOU SLEPT THROUGH THE DAWN"
"A CENTURY PASSED"
"YOUR HUNGER GREW"
"THE NIGHT WAS LONG"
"DARKNESS FAVORED YOU"
```

Sub-texts :
```
"Your thralls fed without you."
"The vermin served their master."
"The Court kept its silence."
"Blood flowed in your absence."
"Eternity passed, your power grew."
```

## Efficacité / cap

- `OFFLINE_EFFICIENCY = 0.5` (50%) standard
- `OFFLINE_CAP_HOURS = 4` standard (défini dans `BALANCE` config)

### Via rewarded ad (EMBRACE THE DAWN)
Si le joueur clique EMBRACE et la pub se termine :
- `efficiency = 1.0` (100%) rétroactivement
- `cap += 2h` (donc 6h total)
- Recalcule le gain, anime le chiffre de `currentDisplay → newTotal` sur 600ms
- Nouveau toast "— THE DAWN IS EMBRACED — Blood redoubled."
- Flash doré subtle

Si la pub fail (`showRewardedAd` returns false) :
- Toast silencieux "THE RITE FAILED · Try again later"
- Le bouton reste cliquable (pas de nag, pas de cooldown imposé)

## State management

```ts
// src/ui/components/offline-modal.ts
interface OfflineModalProps {
  blood: number;           // gain de base (50% cap 4h)
  bloodWithRewarded: number; // projected gain si rewarded (100% cap 6h)
  secondsOffline: number;
  efficiency: number;      // 0.5 par default, 1.0 si rewarded
  capHours: number;        // 4 default, 6 si rewarded
}

// Flow
async function show(props: OfflineModalProps) {
  renderModal(props);
  const result = await waitForUserChoice(); // 'claim' | 'embrace' | 'close'
  
  if (result === 'embrace') {
    const watched = await showRewardedAd('embrace-dawn');
    if (watched) {
      applyOfflineGain(props.bloodWithRewarded);
      animateClaimedBump();
    } else {
      applyOfflineGain(props.blood);
      showToast('THE RITE FAILED', 'No response from the void.');
    }
  } else {
    applyOfflineGain(props.blood);
  }
  
  closeModal();
}
```

## Edge cases

- **0 thrall owned** : modal ne s'affiche pas (blood gain = 0)
- **< 60s offline** : pas de modal
- **> 24h offline** : modal montre "A LONG SILENCE" comme variant titre, et affiche le cap en petit "Capped at 4h"
- **Rewarded déjà utilisé dans les dernières 10 min** : bouton EMBRACE dimmé "Recently rewarded · Try later" (évite spam ads)
- **App crashée** : offline gain depuis `lastSaveTime`, pas depuis `now - elapsed` (robustness save)

## Tests manuels

- [ ] Modal apparaît après ≥ 60s background
- [ ] Count-up du chiffre = smooth, pas de jump
- [ ] Close × ferme sans appliquer (blood reste à current)
- [ ] Tap hors modal ne ferme **pas** (safety)
- [ ] CLAIM applique le gain 50%
- [ ] EMBRACE → pub → applique gain 100% + 2h
- [ ] EMBRACE → pub fail → applique gain 50%, toast rite failed
- [ ] Variants titre/sub changent à chaque ouverture
- [ ] En first session, pas de modal
- [ ] Tests sur 15s, 2h, 5h, 24h offline

## KPI à tracker

- `offline_modal_shown`
- `offline_claim_clicked`
- `offline_embrace_clicked`
- `offline_embrace_completed` (pub vue jusqu'au bout)
- `offline_close_clicked` (close × sans action)
- Ratio embrace/claim attendu : **40-60%** si le modal est bien designé
