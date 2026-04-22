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
  ...[
    'newborn',
    'elder',
    'lord-of-night',
    'methuselah',
    'progenitor',
    'tera-overlord',
    'horror-incarnate',
    'thirst',
  ].map((id) => ({
    source: `${id}.png`,
    dest: `public/assets/portraits/${id}.webp`,
    maxWidth: 1024,
    trim: { threshold: 15 },
    preserveAspect: true,
    format: 'webp',
    webpQuality: 90,
    description: `Portrait ${id} (natural aspect, trimmed, webp q90)`,
  })),
  {
    source: 'cadre-portrait.png',
    dest: 'public/assets/ornaments/portrait-frame-baroque.png',
    maxWidth: 960,
    trim: true,
    preserveAspect: true,
    description: 'Portrait frame (natural aspect — source should be square)',
  },
  {
    source: 'cadre-portrait.png',
    dest: 'public/assets/ornaments/portrait-frame-mask.png',
    maxWidth: 960,
    trim: true,
    preserveAspect: true,
    invertAlpha: true,
    description: 'Portrait frame mask (alpha inverted: interior opaque, ornaments transparent)',
  },
  // Century-specific portrait frames — K1 corruption system. Kenny drops
  // frame-century-{1..5}.png at the project root; pipeline shrinks them
  // to WebP q90. Any missing century falls back at runtime to the base
  // baroque frame, so partial asset drops still render cleanly.
  ...[1, 2, 3, 4, 5].map((n) => ({
    source: `frame-century-${n}.png`,
    dest: `public/assets/ornaments/frame-century-${n}.webp`,
    maxWidth: 960,
    trim: true,
    preserveAspect: true,
    format: 'webp',
    webpQuality: 90,
    description: `Portrait frame — Century ${n}`,
  })),
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
  {
    source: 'ascend-symbol.png',
    dest: 'public/assets/ornaments/ascend-symbol.webp',
    maxWidth: 640,
    trim: true,
    preserveAspect: true,
    format: 'webp',
    webpQuality: 92,
    description: 'Ascension winged seal (centerpiece of the confirm modal)',
  },
  {
    source: 'menu-panel.png',
    dest: 'public/assets/ornaments/menu-panel.webp',
    maxWidth: 720,
    preserveAspect: true,
    format: 'webp',
    webpQuality: 92,
    description: 'Tall gothic modal backdrop (used by Ascension modal)',
  },
  {
    source: 'rewards-display.png',
    dest: 'public/assets/ornaments/rewards-display.webp',
    maxWidth: 720,
    trim: true,
    preserveAspect: true,
    format: 'webp',
    webpQuality: 92,
    description: 'Rewards cartouche (inset panel of the Ascension modal)',
  },
  ...[
    'bloodline',
    'servants',
    'rites',
    'tome',
    'shop',
  ].map((id) => ({
    source: `${id}-logo.png`,
    dest: `public/assets/ornaments/tab-${id}.webp`,
    maxWidth: 160,
    trim: true,
    preserveAspect: true,
    format: 'webp',
    webpQuality: 92,
    description: `Tab bar icon — ${id}`,
  })),
  {
    source: 'upgrade-card-bg.png',
    dest: 'public/assets/ornaments/upgrade-card-bg.webp',
    maxWidth: 900,
    trim: true,
    preserveAspect: true,
    format: 'webp',
    webpQuality: 92,
    description: 'Shop upgrade card background (wide burgundy cartouche)',
  },
  {
    source: 'achievement-card.png',
    dest: 'public/assets/ornaments/achievement-card.webp',
    maxWidth: 520,
    trim: true,
    preserveAspect: true,
    format: 'webp',
    webpQuality: 92,
    description: 'Achievement plaque (tall baroque card with central sigil)',
  },
  {
    source: 'normal-panel.png',
    dest: 'public/assets/ornaments/normal-panel.webp',
    maxWidth: 900,
    trim: true,
    preserveAspect: true,
    format: 'webp',
    webpQuality: 92,
    description: 'Normal horizontal panel (darker utility row)',
  },
  {
    source: 'dread-icon.png',
    dest: 'public/assets/ornaments/dread-icon.webp',
    maxWidth: 256,
    trim: true,
    preserveAspect: true,
    format: 'webp',
    webpQuality: 92,
    description: 'Dread currency icon (purple diamond gem)',
  },
  // Thrall illustrations — 8 medallion portraits. Kenny provided them as
  // stray-rat.png / feral-ghoul.png / fledgling.png / thrall.png /
  // nightblade.png / blood-courtesan.png / eelder.png (doubled "e" to
  // avoid collision with the Elder vampire-form portrait) / cardinal of
  // the night.png (with spaces). Output as compact WebP q90 centered
  // square — used as the left medallion of each thrall-card.
  ...[
    { id: 'rat', source: 'stray-rat.png' },
    { id: 'ghoul', source: 'feral-ghoul.png' },
    { id: 'fledgling', source: 'fledgling.png' },
    { id: 'thrall', source: 'thrall.png' },
    { id: 'blade', source: 'nightblade.png' },
    { id: 'courtesan', source: 'blood-courtesan.png' },
    { id: 'elder', source: 'eelder.png' },
    { id: 'cardinal', source: 'cardinal of the night.png' },
  ].map(({ id, source }) => ({
    source,
    dest: `public/assets/thralls/${id}.webp`,
    maxWidth: 256,
    trim: true,
    preserveAspect: true,
    format: 'webp',
    webpQuality: 90,
    description: `Thrall medallion — ${id}`,
  })),
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

    let outBuffer =
      job.format === 'webp'
        ? await pipeline.webp({ quality: job.webpQuality ?? 90, effort: 6 }).toBuffer()
        : await pipeline.png({ quality: 90, compressionLevel: 9 }).toBuffer();

    if (job.invertAlpha) {
      // Flip the alpha channel so opaque ↔ transparent. Used to build the
      // CSS mask that keeps only the frame's interior picture area.
      const raw = await sharp(outBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const { data, info: rawInfo } = raw;
      for (let i = 3; i < data.length; i += 4) {
        data[i] = 255 - data[i];
      }
      outBuffer = await sharp(data, {
        raw: { width: rawInfo.width, height: rawInfo.height, channels: 4 },
      })
        .png({ compressionLevel: 9 })
        .toBuffer();
    }

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
