// Full-screen achievements grid. Locked cards show a silhouette + ???,
// unlocked cards reveal title + desc with a gold tint. Re-renders on
// achievement-unlocked so watching the panel during a big run is fun.

import { el } from '../../utils/dom';
import { ACHIEVEMENTS } from '../../game/config/achievements';
import { gameState } from '../../game/state';
import { events } from '../../game/events';

export function openAchievementsPanel(): void {
  const backdrop = el('div', 'achievements__backdrop');
  const modal = el('div', 'achievements');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-label', 'Achievements');

  const header = el('div', 'achievements__label', '— the codex —');
  const title = el('div', 'achievements__title', 'ACHIEVEMENTS');
  const summary = el('div', 'achievements__summary');

  const grid = el('div', 'achievements__grid');

  const close = el('button', 'achievements__close') as HTMLButtonElement;
  close.type = 'button';
  close.textContent = 'Close';

  modal.appendChild(header);
  modal.appendChild(title);
  modal.appendChild(summary);
  modal.appendChild(grid);
  modal.appendChild(close);

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  const render = (): void => {
    const unlocked = gameState.getUnlockedAchievements();
    summary.textContent = `${unlocked.size} / ${ACHIEVEMENTS.length} revealed`;
    grid.innerHTML = '';
    for (const def of ACHIEVEMENTS) {
      const isUnlocked = unlocked.has(def.id);
      const card = el(
        'div',
        `achievement-card achievement-card--${isUnlocked ? 'unlocked' : 'locked'}`,
      );
      const icon = el('div', 'achievement-card__icon');
      icon.textContent = isUnlocked ? '\u25C8' : '\u25C7'; // ◈ or ◇
      const name = el(
        'div',
        'achievement-card__title',
        isUnlocked ? def.title : '???',
      );
      const body = el(
        'div',
        'achievement-card__desc',
        isUnlocked ? def.desc : 'Hidden until earned.',
      );
      card.appendChild(icon);
      card.appendChild(name);
      card.appendChild(body);
      grid.appendChild(card);
    }
  };
  render();

  const unsub = events.on('achievement-unlocked', () => render());

  const dismiss = (): void => {
    unsub();
    backdrop.classList.add('achievements__backdrop--exit');
    modal.classList.add('achievements--exit');
    window.setTimeout(() => {
      backdrop.remove();
      modal.remove();
    }, 300);
  };

  backdrop.addEventListener('click', dismiss);
  close.addEventListener('click', dismiss);
}
