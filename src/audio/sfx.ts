// One-shot sound effects. Pool of clones so overlapping plays don't clip.

const BUTTON_SRC = '/assets/audio/button-sound.wav';
const POOL_SIZE = 4;
const DEFAULT_VOLUME = 0.6;

const pool: HTMLAudioElement[] = [];
let cursor = 0;

function ensurePool(): void {
  if (pool.length) return;
  for (let i = 0; i < POOL_SIZE; i++) {
    const a = new Audio(BUTTON_SRC);
    a.preload = 'auto';
    a.volume = DEFAULT_VOLUME;
    pool.push(a);
  }
}

/** Play the thrall-purchase "success" click. Safe to call rapidly. */
export function playButton(): void {
  ensurePool();
  const a = pool[cursor];
  cursor = (cursor + 1) % pool.length;
  try {
    a.currentTime = 0;
    void a.play();
  } catch {
    // Swallow — audio layer must never break gameplay.
  }
}
