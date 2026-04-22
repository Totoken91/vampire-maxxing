// Dedicated Play Store 512×512 icon generator with aggressive lift so
// the vampire face reads at 48px thumbnail size.
//
// Pipeline:
//   1. Trim source, pick a face-forward crop centered slightly above middle
//   2. Brightness + gamma + linear contrast bump to lift midtones
//   3. Composite on a radial red-to-black backdrop so the silhouette pops
//   4. Round corners at 16% radius (Play Store convention)

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const SRC = path.join(ROOT, 'lord-of-night.png');
const OUT = path.join(ROOT, 'docs/store-listing/play-icon-512.png');

const SIZE = 512;

async function run() {
  // 1. Trim + face-centered crop. position: 'top' pulls the crop to the
  // head region (the face is in the upper half of the portrait).
  const portrait = await sharp(SRC)
    .trim({ threshold: 15 })
    .resize(SIZE, SIZE, { fit: 'cover', position: 'top' })
    // 2. Lift midtones while keeping the gothic feel.
    //    - brightness 1.18 → +18%
    //    - saturation 1.1 → slight punch (red lips, eye glow)
    //    - gamma 1.15 → shadows stay, midtones lift
    //    - linear(1.18, -10) → +18% contrast, −10 black point
    .modulate({ brightness: 1.18, saturation: 1.1 })
    .gamma(1.15)
    .linear(1.18, -10)
    .sharpen({ sigma: 0.6, m1: 0.4, m2: 2.5 })
    .png()
    .toBuffer();

  // 3. Red-to-black radial backdrop so the silhouette pops on white
  // Play Store lists. SVG gradient rendered once then used as compositing
  // bottom layer.
  const backdropSvg = Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="50%" cy="42%" r="72%">
          <stop offset="0%" stop-color="#5a0a14" stop-opacity="1"/>
          <stop offset="42%" stop-color="#2a060d" stop-opacity="1"/>
          <stop offset="100%" stop-color="#08050a" stop-opacity="1"/>
        </radialGradient>
      </defs>
      <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
    </svg>`,
  );

  const composed = await sharp(backdropSvg)
    .composite([{ input: portrait, blend: 'over' }])
    .png()
    .toBuffer();

  // 4. Rounded corners (Play Store auto-rounds but a soft 16% radius
  // looks cleaner in the pre-upload preview).
  const radius = Math.round(SIZE * 0.16);
  const mask = Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}"><rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
  );
  const rounded = await sharp(composed)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, rounded);
  const stat = await fs.stat(OUT);
  console.log(`✓ Play Store icon → ${OUT} (${(stat.size / 1024).toFixed(1)} KB)`);
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
