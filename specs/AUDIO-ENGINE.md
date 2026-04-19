# SPEC — Audio Engine

## Principe

- Audio **désactivé par défaut**.
- Activable via settings ("AMBIENCE").
- 100% généré via **Tone.js** — pas de fichier audio.
- Lazy loaded (import dynamique au premier enable).

## Pourquoi Tone.js

- Bundle ~100 KB gzip mais chargé uniquement si l'user active le son
- Génération paramétrique → tons gothiques custom
- Compatible mobile (Web Audio API)
- Gère latence, polyphonie, buffer

## Structure

```
src/audio/
├── engine.ts          ← API publique, lazy init
├── ambient.ts         ← drone de fond
├── sfx.ts             ← tap, crit, purchase, ascend
└── instruments.ts     ← synth patches gothiques
```

## API

```ts
// src/audio/engine.ts
let ctx: AudioContext | null = null;
let ambientLoop: any = null;
let enabled = false;
let loaded = false;

export async function enableAudio(): Promise<void> {
  if (enabled) return;
  
  if (!loaded) {
    const Tone = await import('tone');
    // Init instruments, loops, etc.
    loaded = true;
  }
  
  await Tone.start();
  enabled = true;
  startAmbient();
}

export function disableAudio(): void {
  if (!enabled) return;
  stopAmbient();
  enabled = false;
}

export function playTap(isCrit: boolean): void {
  if (!enabled) return;
  // Tap : sine 220Hz, 50ms, low attack
  // Crit : triangle 440Hz, 300ms decay, subtle reverb
}

export function playPurchase(): void {
  if (!enabled) return;
  // Cloche grave 150Hz + harmoniques
}

export function playAscend(): void {
  if (!enabled) return;
  // Accord montant mineur sur 3s
  // F minor chord : F, Ab, C played arpeggiated then sustained
}

export function playMilestone(): void {
  if (!enabled) return;
  // Petit glockenspiel note + delay
}
```

## Ambient drone

Une loop continue qui tourne tant que l'audio est enabled.

```ts
// src/audio/ambient.ts
function startAmbient(): void {
  const pad = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 1.5,
    modulationIndex: 2,
    oscillator: { type: 'sine' },
    envelope: { attack: 3, decay: 1, sustain: 0.8, release: 5 },
  }).toDestination();
  
  pad.volume.value = -24;
  
  // Gothic minor chord progression, very slow
  const chords = [
    ['C2', 'Eb3', 'G3'],     // C minor
    ['Ab2', 'C3', 'Eb3'],    // Ab major
    ['F2', 'Ab2', 'C3'],     // F minor
    ['G2', 'Bb2', 'D3'],     // G minor
  ];
  
  let i = 0;
  const loop = new Tone.Loop((time) => {
    pad.triggerAttackRelease(chords[i], '8s', time);
    i = (i + 1) % chords.length;
  }, '8s').start(0);
  
  Tone.Transport.start();
  
  // Vent (filtered noise)
  const noise = new Tone.Noise('pink').start();
  const filter = new Tone.Filter(80, 'lowpass').toDestination();
  noise.connect(filter);
  noise.volume.value = -35;
  
  // Subtle LFO on filter for "wind" effect
  const lfo = new Tone.LFO('0.1hz', 50, 150).start();
  lfo.connect(filter.frequency);
}
```

## Instruments gothiques

```ts
// src/audio/instruments.ts

// Tap : subtile, pas distrayant
export const tapSynth = new Tone.Synth({
  oscillator: { type: 'sine' },
  envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 },
  volume: -18,
}).toDestination();

// Crit : un peu plus riche
export const critSynth = new Tone.Synth({
  oscillator: { type: 'triangle' },
  envelope: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 0.5 },
  volume: -12,
}).connect(new Tone.Reverb({ decay: 2, wet: 0.3 }).toDestination());

// Purchase : cloche grave
export const bellSynth = new Tone.MetalSynth({
  frequency: 150,
  envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
  harmonicity: 3.1,
  modulationIndex: 16,
  resonance: 4000,
  octaves: 1.5,
  volume: -20,
}).toDestination();

// Ascend : accord riche
export const ascendSynth = new Tone.PolySynth(Tone.AMSynth, {
  harmonicity: 2,
  envelope: { attack: 0.5, decay: 1, sustain: 0.4, release: 3 },
  modulation: { type: 'square' },
  modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 },
  volume: -15,
}).toDestination();
```

## Volumes

Calibrer pour que :
- L'ambient drone soit **audible mais pas distrayant** (-24 dB)
- Les taps **clairs mais légers** (-18 dB)
- Les crits **satisfiants** (-12 dB)
- L'ascend **majestueux** (-15 dB avec reverb)

## Mute au background

Quand l'app passe en background (`visibilitychange`) :
- Pause toute l'audio
- Resume à la reprise

```ts
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseAudio();
  else if (enabled) resumeAudio();
});
```

## Haptique

Pas audio mais lié. Via `@capacitor/haptics` :

```ts
// src/platform/haptics.ts
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export async function hapticTap(): Promise<void> {
  if (!state.settings.hapticsEnabled) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {}
}

export async function hapticCrit(): Promise<void> {
  if (!state.settings.hapticsEnabled) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {}
}

export async function hapticAscend(): Promise<void> {
  if (!state.settings.hapticsEnabled) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {}
}
```

## Tests

Audio est notoriously hard to test unitaire. On teste à l'oreille :
- Toggle on/off marche
- Ambient ne désynchronise pas sur 30 min
- Pas de clic audio au passage background → foreground
- Pas de conflit avec la musique native du téléphone (ducking correct)

## Budget mémoire

- Audio context active : ~50 KB RAM
- Tone.js loaded : ~2-3 MB RAM
- Aucun fichier téléchargé (tout généré)
