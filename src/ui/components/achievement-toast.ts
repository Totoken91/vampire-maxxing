// Dedicated achievement toast. Gold-accented, slides down from the top.
// Queued so rapid unlocks don't stack visually.

import type { AchievementDef } from '../../game/config/achievements';

const LIFETIME_MS = 3600;
const EXIT_MS = 400;
const QUEUE_GAP_MS = 250;

const queue: AchievementDef[] = [];
let running = false;

export function showAchievementToast(def: AchievementDef): void {
  queue.push(def);
  if (!running) void drain();
}

async function drain(): Promise<void> {
  running = true;
  while (queue.length) {
    const def = queue.shift();
    if (!def) break;
    await present(def);
    await sleep(QUEUE_GAP_MS);
  }
  running = false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function present(def: AchievementDef): Promise<void> {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'achievement-toast';

    const icon = document.createElement('div');
    icon.className = 'achievement-toast__icon';
    icon.textContent = '\u25C8'; // ◈

    const content = document.createElement('div');
    content.className = 'achievement-toast__content';

    const label = document.createElement('div');
    label.className = 'achievement-toast__label';
    label.textContent = '— ACHIEVEMENT —';

    const title = document.createElement('div');
    title.className = 'achievement-toast__title';
    title.textContent = def.title;

    const desc = document.createElement('div');
    desc.className = 'achievement-toast__desc';
    desc.textContent = def.desc;

    content.appendChild(label);
    content.appendChild(title);
    content.appendChild(desc);

    root.appendChild(icon);
    root.appendChild(content);
    document.body.appendChild(root);

    if (navigator.vibrate) navigator.vibrate(12);

    window.setTimeout(() => {
      root.classList.add('achievement-toast--exit');
      window.setTimeout(() => {
        root.remove();
        resolve();
      }, EXIT_MS);
    }, LIFETIME_MS);
  });
}
