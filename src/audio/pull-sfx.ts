// Pull ceremony SFX — procedural via Web Audio API.
//
// We don't ship pre-rendered audio files for the pulls because (a)
// the per-rarity variants would inflate the bundle and (b) we want
// surgical control over the ramp + impact + tail. Three sounds:
//
//   playRumble(rarity, durationMs)   — sub-bass build during the
//                                       anticipation phase.
//   playImpact(rarity)               — single percussive strike at
//                                       the moment of color tell.
//   playReveal(rarity)               — bell-like chime that lands
//                                       when the portrait + name
//                                       are settled.
//
// All three return void; misuse silently no-ops if the AudioContext
// hasn't been unlocked yet (they will work once the user has tapped
// at least once — pulls always come from a tap so context is live).

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function audioContext(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.55;
    masterGain.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

function master(): GainNode | null {
  audioContext();
  return masterGain;
}

// Per-rarity intensity multipliers. Common stays subtle so the
// build-up is felt but not announced.
const RARITY_GAIN: Record<string, number> = {
  common: 0.35,
  rare: 0.65,
  epic: 0.9,
  legendary: 1.0,
};

const RARITY_BASE_HZ: Record<string, number> = {
  // Sub-bass fundamental — rare/epic/legendary go progressively
  // lower so the room feels heavier.
  common: 110, // A2-ish
  rare: 73, // D2-ish
  epic: 55, // A1-ish
  legendary: 41, // E1-ish
};

/**
 * Sub-bass rumble that swells over `durationMs`. The pitch rises a
 * minor third over the build (creates the "something's coming" lift)
 * and the gain ramps to peak right before durationMs ends. Pair
 * with the visual anticipation phase — they end together. */
export function playPullRumble(rarity: string, durationMs: number): void {
  const c = audioContext();
  const m = master();
  if (!c || !m) return;
  const now = c.currentTime;
  const dur = durationMs / 1000;
  const baseHz = RARITY_BASE_HZ[rarity] ?? 110;
  const peakGain = (RARITY_GAIN[rarity] ?? 0.4) * 0.6;

  // Two detuned oscillators — fatter low end, slight beating.
  const o1 = c.createOscillator();
  const o2 = c.createOscillator();
  o1.type = 'sine';
  o2.type = 'triangle';
  o1.frequency.setValueAtTime(baseHz, now);
  o1.frequency.exponentialRampToValueAtTime(baseHz * 1.18, now + dur);
  o2.frequency.setValueAtTime(baseHz * 1.5, now);
  o2.frequency.exponentialRampToValueAtTime(baseHz * 1.5 * 1.18, now + dur);

  // Lowpass filter to keep the rumble warm (no harsh top end).
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 240;
  lp.Q.value = 0.9;

  // Gain envelope — slow swell, peak at 95% of duration.
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peakGain, now + dur * 0.95);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.05);

  o1.connect(lp);
  o2.connect(lp);
  lp.connect(g);
  g.connect(m);

  o1.start(now);
  o2.start(now);
  o1.stop(now + dur + 0.1);
  o2.stop(now + dur + 0.1);
}

/**
 * Bright percussive strike — the "color tell" impact. Detuned
 * cluster of mid-high tones with a fast attack + medium decay.
 */
export function playPullImpact(rarity: string): void {
  const c = audioContext();
  const m = master();
  if (!c || !m) return;
  const now = c.currentTime;
  const peakGain = RARITY_GAIN[rarity] ?? 0.4;

  // Frequency cluster picked so each rarity lands on a different
  // chord quality:
  //   common → simple major fifth (mild, no charge)
  //   rare   → perfect fifth + fourth (mystical)
  //   epic   → dim chord (ominous high stack)
  //   legend → power 5th + octave (cinematic)
  const cluster: Record<string, number[]> = {
    common: [880, 1320],
    rare: [740, 990, 1480],
    epic: [660, 880, 1100, 1760],
    legendary: [550, 825, 1100, 1650, 2200],
  };
  const freqs = cluster[rarity] ?? cluster.common;

  const masterEnv = c.createGain();
  masterEnv.gain.setValueAtTime(0, now);
  masterEnv.gain.linearRampToValueAtTime(peakGain, now + 0.012);
  masterEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  masterEnv.connect(m);

  for (const f of freqs) {
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    // Slight per-osc decay drift so the stack shimmers.
    const og = c.createGain();
    og.gain.setValueAtTime(1 / freqs.length, now);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.5 + Math.random() * 0.15);
    o.connect(og);
    og.connect(masterEnv);
    o.start(now);
    o.stop(now + 0.7);
  }

  // Add a low thud for the bottom — gives weight.
  const thud = c.createOscillator();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(80, now);
  thud.frequency.exponentialRampToValueAtTime(45, now + 0.2);
  const thudG = c.createGain();
  thudG.gain.setValueAtTime(peakGain * 0.7, now);
  thudG.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  thud.connect(thudG);
  thudG.connect(m);
  thud.start(now);
  thud.stop(now + 0.4);
}

/**
 * Bell-like chime that resolves the reveal — fired ~600ms after the
 * impact, when the player is reading the name. Higher rarity = more
 * partials = richer overtones.
 */
export function playPullReveal(rarity: string): void {
  const c = audioContext();
  const m = master();
  if (!c || !m) return;
  const now = c.currentTime;
  const peakGain = (RARITY_GAIN[rarity] ?? 0.4) * 0.6;

  const partials: Record<string, number[]> = {
    common: [1320, 1980],
    rare: [1480, 2220, 2960],
    epic: [1760, 2640, 3520, 4400],
    legendary: [2200, 3300, 4400, 5500, 6600],
  };
  const freqs = partials[rarity] ?? partials.common;

  const env = c.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(peakGain, now + 0.04);
  env.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
  env.connect(m);

  for (const f of freqs) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const og = c.createGain();
    og.gain.setValueAtTime(1 / freqs.length, now);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 1.2 + Math.random() * 0.4);
    o.connect(og);
    og.connect(env);
    o.start(now);
    o.stop(now + 1.6);
  }
}
