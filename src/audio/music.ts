// Background music player. Lazy-loads the track and starts it on the
// first user interaction (browsers block autoplay without a gesture).
// Looped, low volume, single instance.

const TRACK_SRC = '/assets/audio/main-soundtrack.mp3';
const DEFAULT_VOLUME = 0.35;
const FADE_IN_MS = 2000;

let audio: HTMLAudioElement | null = null;
let started = false;

function createAudio(): HTMLAudioElement {
  const a = new Audio(TRACK_SRC);
  a.loop = true;
  a.volume = 0;
  a.preload = 'auto';
  return a;
}

/** Kick the track off. Idempotent — only the first call has effect. */
export function startMusic(): void {
  if (started) return;
  started = true;
  if (!audio) audio = createAudio();
  const target = DEFAULT_VOLUME;
  audio.volume = 0;

  audio
    .play()
    .then(() => {
      // Fade in.
      const startTime = performance.now();
      const tick = (): void => {
        if (!audio) return;
        const t = Math.min(1, (performance.now() - startTime) / FADE_IN_MS);
        audio.volume = target * t;
        if (t < 1) window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    })
    .catch((err) => {
      // Still waiting on a gesture — let the caller retry on next tap.
      started = false;
      console.warn('[music] autoplay blocked:', err);
    });
}

export function stopMusic(): void {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  started = false;
}

export function setMusicVolume(v: number): void {
  if (audio) audio.volume = Math.max(0, Math.min(1, v));
}
