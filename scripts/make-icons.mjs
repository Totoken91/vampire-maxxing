// Generate Android launcher icons from the Lord of Night portrait.
// Produces legacy square + round icons and the adaptive-icon foreground
// at all 5 densities. The adaptive background is a solid color reference
// (see res/drawable/ic_launcher_background.xml + values/ic_launcher_background.xml).
//
// Run: node scripts/make-icons.mjs

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const SRC = path.join(ROOT, 'lord-of-night.png');
const RES = path.join(ROOT, 'android/app/src/main/res');

const BG_COLOR = { r: 8, g: 5, b: 10, alpha: 1 }; // matches --void

// Legacy launcher sizes (the square and round icons baked with bg).
const LEGACY = [
  { density: 'mdpi', size: 48 },
  { density: 'hdpi', size: 72 },
  { density: 'xhdpi', size: 96 },
  { density: 'xxhdpi', size: 144 },
  { density: 'xxxhdpi', size: 192 },
];

// Adaptive foreground must be 108dp (1dp=1px at mdpi) on a transparent canvas
// with the "logo" fitting within the central 66dp safe zone.
const FOREGROUND = [
  { density: 'mdpi', size: 108 },
  { density: 'hdpi', size: 162 },
  { density: 'xhdpi', size: 216 },
  { density: 'xxhdpi', size: 324 },
  { density: 'xxxhdpi', size: 432 },
];

async function prepareSquareSource(size) {
  // Trim the source (removes ChatGPT transparent padding) then fit a square
  // that frames the upper body / face. We cover+center so nothing is letterboxed.
  return sharp(SRC)
    .trim({ threshold: 15 })
    .resize(size, size, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();
}

async function makeLegacySquare(size, outPath) {
  const fg = await prepareSquareSource(size);
  // Composite on BG color, then add a subtle rounded corner (8% radius).
  const radius = Math.round(size * 0.18);
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
  );
  const composed = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG_COLOR,
    },
  })
    .composite([{ input: fg, blend: 'over' }])
    .png()
    .toBuffer();
  const rounded = await sharp(composed)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  await fs.writeFile(outPath, rounded);
}

async function makeLegacyRound(size, outPath) {
  const fg = await prepareSquareSource(size);
  const r = size / 2;
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`,
  );
  const composed = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG_COLOR,
    },
  })
    .composite([{ input: fg, blend: 'over' }])
    .png()
    .toBuffer();
  const round = await sharp(composed)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  await fs.writeFile(outPath, round);
}

async function makeAdaptiveForeground(size, outPath) {
  // Safe zone is the central 66/108 of the canvas. We render the portrait
  // at ~72% of canvas side (slightly above the strict 61%) for visual weight
  // and center it. Transparent elsewhere.
  const inner = Math.round(size * 0.72);
  const portrait = await sharp(SRC)
    .trim({ threshold: 15 })
    .resize(inner, inner, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();
  const offset = Math.floor((size - inner) / 2);
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: portrait, left: offset, top: offset }])
    .png({ compressionLevel: 9 })
    .toBuffer()
    .then((b) => fs.writeFile(outPath, b));
}

async function run() {
  // Legacy square + round
  for (const { density, size } of LEGACY) {
    const dir = path.join(RES, `mipmap-${density}`);
    await fs.mkdir(dir, { recursive: true });
    await makeLegacySquare(size, path.join(dir, 'ic_launcher.png'));
    await makeLegacyRound(size, path.join(dir, 'ic_launcher_round.png'));
    console.log(`✓ mipmap-${density}/ic_launcher[_round].png (${size}×${size})`);
  }
  // Adaptive foreground
  for (const { density, size } of FOREGROUND) {
    const dir = path.join(RES, `mipmap-${density}`);
    await fs.mkdir(dir, { recursive: true });
    await makeAdaptiveForeground(size, path.join(dir, 'ic_launcher_foreground.png'));
    console.log(`✓ mipmap-${density}/ic_launcher_foreground.png (${size}×${size})`);
  }
  console.log('\nDone. Rebuild the APK to pick up the new icons.');
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
