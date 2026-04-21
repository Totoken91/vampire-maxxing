// One-shot audio compression pass. Runs ffmpeg (bundled via ffmpeg-static)
// to slim the main soundtrack and convert the WAV SFX to mp3 so the APK
// drops from ~16 MB to ~12-13 MB.
//
// Usage: node scripts/prepare-audio.mjs

import ffmpegPath from 'ffmpeg-static';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');

const JOBS = [
  {
    source: 'main-soundtrack.mp3',
    dest: 'public/assets/audio/main-soundtrack.mp3',
    // Mono @ 96 kbps: ambient gothic loop doesn't need stereo separation
    // at that fidelity. ~40% size drop with imperceptible quality loss.
    args: ['-ac', '1', '-b:a', '96k', '-ar', '44100'],
    description: 'Main soundtrack (mono 96 kbps)',
  },
  {
    source: 'Glorious Ascencion Sound Dark Vibe.wav',
    dest: 'public/assets/audio/ascension.mp3',
    // Stereo @ 160 kbps: the ascension sting wants stereo width, but it's
    // only ever played once in a while, so 160k is plenty. Target ≤ 300 KB.
    args: ['-ac', '2', '-b:a', '160k', '-ar', '44100'],
    description: 'Ascension cinematic sting (stereo 160 kbps)',
  },
];

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function run() {
  let processed = 0;
  let skipped = 0;

  for (const job of JOBS) {
    const src = path.join(ROOT, job.source);
    const dst = path.join(ROOT, job.dest);

    if (!(await exists(src))) {
      console.warn(`· skip ${job.source} (not found at root)`);
      skipped += 1;
      continue;
    }

    await fs.mkdir(path.dirname(dst), { recursive: true });

    const ffArgs = ['-y', '-i', src, ...job.args, dst];
    const result = spawnSync(ffmpegPath, ffArgs, { stdio: 'pipe', encoding: 'utf8' });
    if (result.status !== 0) {
      console.error(`✗ ${job.description}\n${result.stderr}`);
      continue;
    }

    const stat = await fs.stat(dst);
    const kb = (stat.size / 1024).toFixed(1);
    console.log(`✓ ${job.description} → ${job.dest} (${kb} KB)`);
    processed += 1;
  }

  console.log(`\nDone. ${processed} processed, ${skipped} skipped.`);
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
