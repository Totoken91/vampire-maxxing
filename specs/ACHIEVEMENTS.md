# SPEC — Achievements

## Principe

20 achievements au MVP. Débloqués automatiquement. Chacun donne 1-10 **Gravity Wells** (currency for post-MVP upgrades, invisible au MVP hors modal dédié).

## Pattern

```ts
// src/game/config/achievements.ts

export interface AchievementDef {
  id: string;
  category: 'progression' | 'prestige' | 'meme' | 'time';
  titleKey: string;
  descKey: string;
  reward: number;  // Gravity Wells
  predicate: (state: Readonly<GameState>) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // PROGRESSION (8)
  {
    id: 'first_bite',
    category: 'progression',
    titleKey: 'achievement.first_bite.title',
    descKey: 'achievement.first_bite.desc',
    reward: 1,
    predicate: (s) => Object.values(s.thralls).some(t => t.owned > 0),
  },
  {
    id: 'stray_pack',
    category: 'progression',
    titleKey: 'achievement.stray_pack.title',
    descKey: 'achievement.stray_pack.desc',
    reward: 2,
    predicate: (s) => s.thralls.rat.owned >= 10,
  },
  {
    id: 'feral_tide',
    category: 'progression',
    titleKey: 'achievement.feral_tide.title',
    descKey: 'achievement.feral_tide.desc',
    reward: 3,
    predicate: (s) => s.thralls.ghoul.owned >= 25,
  },
  {
    id: 'first_coven',
    category: 'progression',
    titleKey: 'achievement.first_coven.title',
    descKey: 'achievement.first_coven.desc',
    reward: 3,
    predicate: (s) => s.thralls.fledgling.owned >= 10,
  },
  {
    id: 'court_assembly',
    category: 'progression',
    titleKey: 'achievement.court_assembly.title',
    descKey: 'achievement.court_assembly.desc',
    reward: 4,
    predicate: (s) => s.thralls.thrall.owned >= 10,
  },
  {
    id: 'shadow_guild',
    category: 'progression',
    titleKey: 'achievement.shadow_guild.title',
    descKey: 'achievement.shadow_guild.desc',
    reward: 5,
    predicate: (s) => s.thralls.blade.owned >= 10,
  },
  {
    id: 'grand_salon',
    category: 'progression',
    titleKey: 'achievement.grand_salon.title',
    descKey: 'achievement.grand_salon.desc',
    reward: 6,
    predicate: (s) => s.thralls.courtesan.owned >= 10,
  },
  {
    id: 'eternal_council',
    category: 'progression',
    titleKey: 'achievement.eternal_council.title',
    descKey: 'achievement.eternal_council.desc',
    reward: 7,
    predicate: (s) => s.thralls.elder.owned >= 5,
  },
  
  // PRESTIGE / NARRATIVE (6)
  {
    id: 'first_ascension',
    category: 'prestige',
    titleKey: 'achievement.first_ascension.title',
    descKey: 'achievement.first_ascension.desc',
    reward: 3,
    predicate: (s) => s.stats.totalAscends >= 1,
  },
  {
    id: 'elder_born',
    category: 'prestige',
    titleKey: 'achievement.elder_born.title',
    descKey: 'achievement.elder_born.desc',
    reward: 4,
    predicate: (s) => isFormReachedOrBeyond(s.stats.highestFormReached, 'ELDER'),
  },
  {
    id: 'lord_risen',
    category: 'prestige',
    titleKey: 'achievement.lord_risen.title',
    descKey: 'achievement.lord_risen.desc',
    reward: 5,
    predicate: (s) => isFormReachedOrBeyond(s.stats.highestFormReached, 'LORD_OF_NIGHT'),
  },
  {
    id: 'millennium',
    category: 'prestige',
    titleKey: 'achievement.millennium.title',
    descKey: 'achievement.millennium.desc',
    reward: 6,
    predicate: (s) => isFormReachedOrBeyond(s.stats.highestFormReached, 'METHUSELAH'),
  },
  {
    id: 'primordial',
    category: 'prestige',
    titleKey: 'achievement.primordial.title',
    descKey: 'achievement.primordial.desc',
    reward: 8,
    predicate: (s) => isFormReachedOrBeyond(s.stats.highestFormReached, 'PROGENITOR'),
  },
  {
    id: 'tera_overlord',
    category: 'prestige',
    titleKey: 'achievement.tera_overlord.title',
    descKey: 'achievement.tera_overlord.desc',
    reward: 10,
    predicate: (s) => isFormReachedOrBeyond(s.stats.highestFormReached, 'TERA_OVERLORD'),
  },
  
  // MÉMÉS / EXOTIQUES (4)
  {
    id: 'sigma_arc',
    category: 'meme',
    titleKey: 'achievement.sigma_arc.title',
    descKey: 'achievement.sigma_arc.desc',
    reward: 5,
    predicate: (s) => s.stats.totalAscends >= 10,
  },
  {
    id: 'based_bloodpilled',
    category: 'meme',
    titleKey: 'achievement.based_bloodpilled.title',
    descKey: 'achievement.based_bloodpilled.desc',
    reward: 6,
    predicate: (s) => s.dread >= 100,
  },
  {
    id: 'built_different',
    category: 'meme',
    titleKey: 'achievement.built_different.title',
    descKey: 'achievement.built_different.desc',
    reward: 8,
    predicate: (s) => s.stats.totalAscends >= 30,
  },
  {
    id: 'mewing_success',
    category: 'meme',
    titleKey: 'achievement.mewing_success.title',
    descKey: 'achievement.mewing_success.desc',
    reward: 10,
    predicate: (s) => isFormReachedOrBeyond(s.stats.highestFormReached, 'TERA_OVERLORD'),
  },
  
  // TIME / BONUS (2)
  {
    id: 'night_shift',
    category: 'time',
    titleKey: 'achievement.night_shift.title',
    descKey: 'achievement.night_shift.desc',
    reward: 2,
    predicate: (s) => s.stats.totalPlayTime >= 3600,  // 1h
  },
  {
    id: 'immortal_grind',
    category: 'time',
    titleKey: 'achievement.immortal_grind.title',
    descKey: 'achievement.immortal_grind.desc',
    reward: 10,
    predicate: (s) => s.stats.totalPlayTime >= 360000,  // 100h
  },
];
```

## Check loop

À chaque tick UI (10Hz) :

```ts
function checkAchievements(): void {
  const state = getState();
  for (const def of ACHIEVEMENTS) {
    if (state.unlockedAchievements.has(def.id)) continue;
    if (def.predicate(state)) {
      unlockAchievement(def.id);
    }
  }
}

function unlockAchievement(id: string): void {
  const def = ACHIEVEMENTS.find(a => a.id === id)!;
  state.unlockedAchievements.add(id);
  state.gravityWells += def.reward;
  save();
  emit({ type: 'achievement', id, reward: def.reward });
  
  // Toast 4s avec flavor text
  showAchievementToast(def);
}
```

## Toast UI

```ts
function showAchievementToast(def: AchievementDef): void {
  const toast = el('div', { class: 'achievement-toast' });
  toast.innerHTML = `
    <div class="ach-icon">◈</div>
    <div class="ach-content">
      <div class="ach-label">— ACHIEVEMENT —</div>
      <div class="ach-title">${t(def.titleKey)}</div>
      <div class="ach-desc">${t(def.descKey)}</div>
      <div class="ach-reward">+${def.reward} ⚜</div>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('fade'), 3500);
  setTimeout(() => toast.remove(), 4000);
}
```

CSS :
```css
.achievement-toast {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, rgba(26,15,20,0.97), rgba(12,8,12,0.99));
  border: 1px solid var(--gold);
  padding: 14px 22px;
  display: flex;
  align-items: center;
  gap: 14px;
  z-index: 250;
  animation: achievement-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
  box-shadow: 0 0 40px rgba(201, 169, 98, 0.2);
}
.achievement-toast.fade {
  animation: achievement-out 0.4s ease-in forwards;
}
.ach-icon {
  font-size: 32px;
  color: var(--gold);
  filter: drop-shadow(0 0 8px var(--gold));
}
.ach-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: var(--gold-dim);
  letter-spacing: 0.4em;
  margin-bottom: 3px;
}
.ach-title {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 15px;
  color: var(--ink);
  font-weight: 500;
}
.ach-desc {
  font-family: 'Cormorant Garamond', serif;
  font-size: 12px;
  color: var(--ink-dim);
  margin-top: 2px;
}
.ach-reward {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--gold);
  margin-top: 4px;
}
```

## Modal grid (post-MVP mais à prévoir)

Grid de 20 cards, chacune :
- Locked : silhouette grise, titre caché ("???"), description cachée
- Unlocked : icône or, titre révélé, description, date d'unlock

Accessible depuis settings.

## Screenshot-friendly

Les titres mémés sont **conçus pour être screenshotés et partagés sur TikTok** :

- *"YOU HAVE LOOKSMAXXED (literally)"* → banger pour screenshot
- *"sigma vampire arc"* → hashtag potentiel
- *"based and bloodpilled"* → reconnaissable Gen Z
- *"the mewing worked"* → meme peak

Ces titres ne sont **pas** traduits en FR (ils sont mémés en anglais par nature). L'index FR renvoie quand même vers la string EN pour ces achievements.

## Tests

- Check predicate de chaque achievement unitaire
- Unlock ne se re-déclenche jamais 2x
- Gravity Wells s'incrémentent correctement
- Toast s'affiche correctement (manuel)
