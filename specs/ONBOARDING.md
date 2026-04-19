# SPEC — Onboarding / FTUE & Permissions

> La FTUE (First Time User Experience) est le moment le plus critique du jeu. 70% de la D1 retention se joue dans les 60 premières secondes. **Zéro texte inutile, zéro popup, tout est implicite**.

## 1. FTUE 0-60 secondes

### Seconds 0-3 : App Launch
- Splash screen ≤ 2s (background `#08050a`, lune or animée)
- **Pas de logo statique** ≥ 2s — ennuyeux
- Pas de chargement bloquant : portraits lazy-loadés, on lance sur Newborn immédiatement
- Statusbar Android en overlay transparent (safe area gérée)

### Seconds 3-10 : First Orientation
État initial :
- Portrait NEWBORN visible dans son cadre baroque
- Blood counter à `0`
- Thrall list : Stray Rat visible mais dimmé (cost 10, pas encore affordable)
- Boutons BOOST et ASCEND présents mais disabled

**Attention drivers (automatiques si pas de tap après 2s)** :
- Le portrait reçoit un **pulse doré** (box-shadow gold `0 0 20px` → `0 0 40px`, 1.2s ease-in-out, 2 répétitions)
- Le label "— THE BLOODLINE —" au-dessus reçoit un glow subtil
- **AUCUN texte de tutoriel**. Le pulse dit "tape-moi".

### Seconds 10-15 : First Tap
Au premier tap sur le portrait :
- Juice stack complet (particules rouges burst, float-number +1, haptic 4ms, sine wave 220Hz)
- Blood passe de 0 à 1 avec bump animation
- Le pulse doré du portrait **s'arrête** (il a fait son job)
- Après 3 taps : **toast AWAKENED** apparaît (non-bloquant) :
  ```
  — AWAKENED —
  Your bloodline stirs once more.
  ```
- Durée toast : 2.6s (déjà dans prototype.html)

### Seconds 15-30 : First Purchase Trigger
Dès que `blood >= 10` (aux alentours du 10e tap) :
- **Stray Rat card reçoit un glow doré** pulsant
- Le label "claim" passe en or vif et pulse (opacity 0.7 → 1 sur 0.8s)
- Shimmer animation sur la card devient plus rapide (0.6s vs 2s de base)
- **AUCUN arrow ni texte**. L'affordance visuelle suffit.

### Seconds 30-60 : First Spark (Micro-Win)
Au premier achat de thrall (Stray Rat) :
- Particules pourpres burst sur la card
- Blood descend, rate/s passe de 0 à 0.5
- **Trigger l'achievement `first_bite`** → toast :
  ```
  — FIRST SPARK —
  The vermin know your name.
  ```
- Le Feral Ghoul card devient visible (passait de "hidden" à "locked" dimmé)
- Le compteur "+0.5 / per second" s'anime en fade-in sous le blood counter

### Seconds 60+ : Autonomous Play
À ce stade le joueur :
- A compris : tap → blood, blood → thrall, thrall → passive rate
- Voit les 2-3 premiers tiers de thralls avec leur cost visible
- Peut explorer librement. **Aucune arrow, aucun highlight persistant**.

### Code locations
- `src/game/state.ts` : expose `isFirstSession()` → détecte via `stats.totalTaps === 0 && stats.totalAscends === 0`
- `src/ui/components/portrait.ts` : applique classe `.portrait-pulse-onboarding` si `isFirstSession()` et 2s sans tap
- `src/ui/components/thrall-card.ts` : applique classe `.card-affordance-highlight` sur la première card abordable en first session
- Les classes retirent les traitements après le premier tap / achat

### Règles strictes
- ❌ **Pas de "SKIP TUTORIAL"** button — il n'y a pas de tutoriel à skip, juste des hints visuels
- ❌ **Pas d'overlay bloquant**, pas de modal, pas de dimming de l'UI
- ❌ **Pas de demande de permission** dans les 60 premières secondes
- ❌ **Pas de store, pas d'offer** visible en first session
- ✅ Les hints visuels s'**auto-désactivent** après la première action
- ✅ Si le joueur tap avant que le pulse démarre (early), le pulse ne se déclenche pas du tout

## 2. Notifications

### Quand demander la permission
**Pas à l'install.** Pas en first session.

**Trigger** : juste après le premier Ascend réussi (moment d'émotion haute, le joueur vient de voir la transition NEWBORN → ELDER).

### Modal de demande
Apparaît 3 secondes après le toast "— ELDER BORN —" :
```
━━━━━━━━━━━━━━━━━━━━━━━
     — BE CALLED BACK —

  Your thralls will whisper
   when the Hunger returns.

  [  ALLOW  ]   [  REFUSE  ]
━━━━━━━━━━━━━━━━━━━━━━━
```

- Boutons équivalents visuellement (pas de dark pattern sur "ALLOW")
- Si REFUSE : `state.settings.notifEnabled = false`, on ne redemande **jamais** (pas de nag).
- Si ALLOW : demande native OS, puis `notifEnabled = true`.

### Contenu des notifs
Schedule 1 notif/24h max, à l'heure de la dernière session.

Templates (rotation) :
```
"Your Nightblades have collected {X} blood."
"The Dread Court hungers. Return to rule."
"Your bloodline grows restless. {X} blood awaits."
"Dawn broke, but your thralls fed. Come claim what is yours."
"A new Century has begun. Your throne waits."
```

### Frequency cap
- Si le joueur **n'ouvre pas** après 2 notifs consécutives → stop notifs pendant 7 jours
- Jamais entre 23h et 8h local
- Jamais 2 notifs dans la même journée

## 3. Autres permissions

### Haptic
Pas de permission requise. Check `navigator.vibrate` availability. Default ON.

### Audio
Pas de permission requise. Default **OFF** (le joueur active via settings si il veut). Le jeu est silencieux par défaut pour respecter le contexte (métro, bureau).

### Adverts (UMP Consent)
**Au premier lancement en EU uniquement**. Via AdMob UMP flow. Une fois accepté/refusé, stocké pour toujours. Détection via IP géolocation au niveau d'AdMob.

### Storage
Capacitor Preferences = pas de permission Android.

## 4. Accessibility & First-Launch Defaults

### Auto-detect `prefers-reduced-motion`
Au premier launch :
- Si `window.matchMedia('(prefers-reduced-motion: reduce)').matches` → active `reducedMotion: true` par défaut (désactive screen shake, fog anim, bats, divise embers par 2).

### Defaults settings sur first launch
```ts
const FIRST_LAUNCH_DEFAULTS = {
  soundEnabled: false,
  hapticsEnabled: true,
  ambienceEnabled: false,  // seulement si sound on
  reducedMotion: autoDetectReducedMotion(),
  notifEnabled: false,     // demandé post-1st-ascend
  lang: detectBrowserLang(), // 'fr' ou 'en'
};
```

## 5. Timing du first monetization signal

**JAMAIS en first session.**

- Session 1 : zéro monétisation. Zéro store visible.
- Session 2 : icône store (❦ Apothecary) apparaît discrètement dans le header (top-right corner, en plus de la lune).
- Session 3-5 : **Starter Pack "FIRST BLOOD OFFERING"** apparaît en modal à l'ouverture de la session (voir `docs/05-MONETIZATION.md`).

### Trigger du Starter Pack
Conditions (tous réunis) :
- `stats.firstLaunch` + > 48h
- `stats.totalAscends >= 1`
- Session en cours ≥ 3ème
- Pas encore d'achat IAP

Une seule chance d'affichage. Si ferme sans acheter, disponible dans Apothecary avec timer 72h.

## 6. Tests à faire manuellement avant release

- [ ] First launch : pulse apparaît après 2s si pas de tap
- [ ] First launch : pulse stoppe au 1er tap
- [ ] First launch : Stray Rat highlight apparaît à blood >= 10
- [ ] First launch : toast AWAKENED affiche à 3 taps
- [ ] First launch : toast FIRST SPARK affiche au 1er achat
- [ ] `reduce-motion` OS → embers réduits, screen shake off
- [ ] Permission notif demandée **seulement post-1st-ascend**
- [ ] Permission refusée → pas de nag (toast silencieux)
- [ ] Starter Pack n'apparaît **pas** en session 1 ou 2
- [ ] Starter Pack apparaît en session 3+ si 1st ascend done
