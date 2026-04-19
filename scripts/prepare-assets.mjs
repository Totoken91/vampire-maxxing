// One-shot script: auto-trim ChatGPT padding + resize + move to assets/.
// Usage: node scripts/prepare-assets.mjs
// Sources are read from project root, written to /assets/.

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');

const JOBS = [
  {
    source: 'portrait-vampire-lord.png',
    dest: 'public/assets/portraits/lord-of-night.png',
    maxWidth: 1024,
    trim: { threshold: 15 },
    preserveAspect: true,
    description: 'Lord of Night portrait (natural aspect, trimmed)',
  },
  {
    source: 'cadre-portrait.png',
    dest: 'public/assets/ornaments/portrait-frame-baroque.png',
    maxWidth: 960,
    trim: true,
    preserveAspect: true,
    description: 'Portrait frame (natural aspect — source should be square)',
  },
  {
    source: 'minion-banner.png',
    dest: 'public/assets/ornaments/thrall-card-bg.png',
    maxWidth: 900,
    trim: true,
    vCropTop: 0.1,
    vCropBottom: 0.06,
    preserveAspect: true,
    description: 'Thrall card banner (natural aspect, top stripped)',
  },
  {
    source: 'minion-portrait.png',
    dest: 'public/assets/ornaments/thrall-medallion.png',
    maxWidth: 256,
    trim: true,
    preserveAspect: true,
    description: 'Thrall medallion frame (natural aspect, transparent)',
  },
  {
    source: 'vampire-maxxing-logo.png',
    dest: 'public/assets/ornaments/logo.png',
    width: 220,
    height: 220,
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
    trim: true,
    description: 'Vampire Maxxing logo (220×220 transparent)',
  },
  {
    source: 'header-ornament.png',
    dest: 'public/assets/ornaments/divider.png',
    maxWidth: 600,
    trim: true,
    preserveAspect: true,
    description: 'Header divider with heart centerpiece (transparent)',
  },
  {
    source: 'bg.png',
    dest: 'public/assets/ornaments/bg.png',
    maxWidth: 1200,
    preserveAspect: true,
    description: 'Ambient background with moon and vignette',
  },
  {
    source: 'boost-button.png',
    dest: 'public/assets/ornaments/btn-boost.png',
    maxWidth: 600,
    trim: true,
    preserveAspect: true,
    description: 'Boost button cartouche (natural aspect)',
  },
  {
    source: 'ascend-button.png',
    dest: 'public/assets/ornaments/btn-ascend.png',
    maxWidth: 600,
    trim: true,
    preserveAspect: true,
    description: 'Ascend button cartouche (natural aspect)',
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

    let pipeline = sharp(src);
    if (job.trim) {
      pipeline = pipeline.trim(typeof job.trim === 'object' ? job.trim : undefined);
    }

    if (job.vCrop || job.vCropTop || job.vCropBottom) {
      // Materialize to read dims, then extract a specific vertical band.
      const buf = await pipeline.toBuffer();
      const meta = await sharp(buf).metadata();
      const h = meta.height ?? 0;
      const w = meta.width ?? 0;
      const topPct = job.vCropTop ?? job.vCrop ?? 0;
      const bottomPct = job.vCropBottom ?? job.vCrop ?? 0;
      const topPx = Math.floor(h * topPct);
      const bottomPx = Math.floor(h * bottomPct);
      pipeline = sharp(buf).extract({
        left: 0,
        top: topPx,
        width: w,
        height: Math.max(1, h - topPx - bottomPx),
      });
    }

    if (job.preserveAspect) {
      pipeline = pipeline.resize({ width: job.maxWidth, withoutEnlargement: true });
    } else {
      pipeline = pipeline.resize(job.width, job.height, {
        fit: job.fit,
        background: job.background ?? { r: 0, g: 0, b: 0, alpha: 0 },
      });
    }

    const outBuffer = await pipeline.png({ quality: 90, compressionLevel: 9 }).toBuffer();
    const meta = await sharp(outBuffer).metadata();
    await fs.writeFile(dst, outBuffer);

    const sizeKb = (outBuffer.length / 1024).toFixed(1);
    console.log(
      `✓ ${job.description} → ${job.dest} (${meta.width}×${meta.height}, ${sizeKb} KB)`,
    );
    processed += 1;
  }

  console.log(`\nDone. ${processed} processed, ${skipped} skipped.`);
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
