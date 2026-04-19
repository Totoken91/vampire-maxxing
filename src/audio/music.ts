// Background music player. Tries autoplay immediately on install, falls
// back to the first user gesture (any pointerdown / keydown anywhere on
// the document). Pauses when the tab/app goes to background and resumes
// when it comes back.

const TRACK_SRC = '/assets/audio/main-soundtrack.mp3';
const DEFAULT_VOLUME = 0.35;
const FADE_IN_MS = 2000;

let audio: HTMLAudioElement | null = null;
let wasPlaying = false;

function createAudio(): HTMLAudioElement {
  const a = new Audio(TRACK_SRC);
  a.loop = true;
  a.volume = 0;
  a.preload = 'auto';
  return a;
}

function fadeIn(): void {
  if (!audio) return;
  const target = DEFAULT_VOLUME;
  audio.volume = 0;
  const startTime = performance.now();
  const tick = (): void => {
    if (!audio) return;
    const t = Math.min(1, (performance.now() - startTime) / FADE_IN_MS);
    audio.volume = target * t;
    if (t < 1) window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
}

async function tryPlay(): Promise<boolean> {
  if (!audio) return false;
  try {
    await audio.play();
    wasPlaying = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Install the music system. Attempts autoplay on install, arms gesture
 * listeners as fallback (browsers gate audio on user interaction), and
 * wires pause/resume to the page visibility state.
 */
export function installMusic(): void {
  if (audio) return;
  audio = createAudio();

  // Attempt autoplay right away. On native Capacitor with
  // setMediaPlaybackRequiresUserGesture(false) this works; on the web it
  // is usually blocked and we rely on the gesture fallback.
  void (async () => {
    if (await tryPlay()) fadeIn();
  })();

  // Gesture fallback — any interaction on the document unlocks audio once.
  const unlock = (): void => {
    if (wasPlaying) return;
    void (async () => {
      if (await tryPlay()) fadeIn();
    })();
  };
  const opts = { capture: true, once: false } as const;
  ['pointerdown', 'touchstart', 'keydown'].forEach((ev) =>
    document.addEventListener(ev, unlock, opts),
  );

  // Pause when the app goes to background, resume on return.
  document.addEventListener('visibilitychange', () => {
    if (!audio) return;
    if (document.visibilityState === 'hidden') {
      audio.pause();
    } else if (wasPlaying) {
      void audio.play();
    }
  });
  window.addEventListener('pagehide', () => {
    if (audio) audio.pause();
  });
}

export function stopMusic(): void {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  wasPlaying = false;
}

export function setMusicVolume(v: number): void {
  if (audio) audio.volume = Math.max(0, Math.min(1, v));
}
