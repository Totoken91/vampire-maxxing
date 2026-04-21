// One-shot sound effects. Pool of clones so overlapping plays don't clip.

const BUTTON_SRC = '/assets/audio/button-sound.wav';
const ASCENSION_SRC = '/assets/audio/ascension.mp3';
const POOL_SIZE = 4;
const DEFAULT_VOLUME = 0.6;
const ASCENSION_VOLUME = 0.72;

const pool: HTMLAudioElement[] = [];
let cursor = 0;

let ascensionAudio: HTMLAudioElement | null = null;

function ensurePool(): void {
  if (pool.length) return;
  for (let i = 0; i < POOL_SIZE; i++) {
    const a = new Audio(BUTTON_SRC);
    a.preload = 'auto';
    a.volume = DEFAULT_VOLUME;
    pool.push(a);
  }
}

function ensureAscension(): HTMLAudioElement {
  if (ascensionAudio) return ascensionAudio;
  const a = new Audio(ASCENSION_SRC);
  a.preload = 'auto';
  a.volume = ASCENSION_VOLUME;
  ascensionAudio = a;
  return a;
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

/**
 * Play the glorious ascension sting. Single-instance — restarting it
 * mid-play is the correct behaviour (next ascend always starts from 0).
 */
export function playAscensionSfx(): void {
  const a = ensureAscension();
  try {
    a.currentTime = 0;
    void a.play();
  } catch {
    // Audio may be blocked pre-gesture on web; the cinematic trigger
    // comes from a user tap so this almost always succeeds on mobile.
  }
}
