// V1.3 SOULREAVE — Cinematic FX (~5s total).
//
// Phase 1 — Anticipation (3s):
//   Screen darken to void, crimson lightning crackles, portrait
//   dissolves, sub-bass rumble building.
// Phase 2 — Release (2s):
//   White flash, "SOULREAVE" title slam (5-layer FDP glow), 40
//   crimson + gold particles, reset to NEWBORN.
//
// Skip is available after 1.5s — players who've seen it once don't
// owe the game another 5 seconds. Honors prefers-reduced-motion by
// shortening to a single fade + title (no shake, no particles).

import { el } from '../utils/dom';

const SKIP_AVAILABLE_AFTER_MS = 1500;
const TOTAL_MS = 5000;

export function playSoulreaveCinematic(
  index: number,
  onPhase2: () => void,
): Promise<void> {
  return new Promise((resolve) => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Backdrop — full-screen, layered above everything
    const root = el('div', 'soulreave-cinematic');
    if (reduce) root.classList.add('soulreave-cinematic--reduce');
    root.setAttribute('role', 'alertdialog');
    root.setAttribute('aria-label', 'Soulreave in progress');

    // Phase 1 layers
    const veil = el('div', 'soulreave-cinematic__veil');
    const portraitMask = el('div', 'soulreave-cinematic__portrait-mask');
    const lightningSvg = buildLightningSvg();
    lightningSvg.classList.add('soulreave-cinematic__lightning');

    // Phase 2 layers (hidden until release)
    const flash = el('div', 'soulreave-cinematic__flash');
    const titleWrap = el('div', 'soulreave-cinematic__title-wrap');
    const title = el('div', 'soulreave-cinematic__title', 'SOULREAVE');
    const subtitle = el(
      'div',
      'soulreave-cinematic__subtitle',
      romanize(index),
    );
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);

    // Particle canvas — 40 burst on release
    const particles = el('canvas', 'soulreave-cinematic__particles') as HTMLCanvasElement;
    particles.width = window.innerWidth;
    particles.height = window.innerHeight;

    // Skip button — appears at 1500ms
    const skip = el('button', 'soulreave-cinematic__skip', 'SKIP') as HTMLButtonElement;
    skip.type = 'button';
    skip.setAttribute('aria-label', 'Skip cinematic');
    skip.style.opacity = '0';
    skip.style.pointerEvents = 'none';

    root.append(veil, portraitMask, lightningSvg, flash, particles, titleWrap, skip);
    document.body.appendChild(root);

    // Defensive: Reduced-motion path is short-circuited.
    const effectiveTotalMs = reduce ? 1200 : TOTAL_MS;
    const phase2DelayMs = reduce ? 600 : 3000;

    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      root.classList.add('soulreave-cinematic--exit');
      window.setTimeout(() => {
        root.remove();
        resolve();
      }, 320);
    };

    // Skip wiring
    window.setTimeout(() => {
      if (settled) return;
      skip.style.opacity = '1';
      skip.style.pointerEvents = 'auto';
    }, SKIP_AVAILABLE_AFTER_MS);
    skip.addEventListener('click', () => {
      // Player tapped skip — fast-forward to phase 2 reset, but
      // still play the title slam & particles so the moment lands.
      // If we're already past phase 2, just finish.
      if (!phase2Started) startPhase2();
      window.setTimeout(finish, 800);
    });

    // Phase 1 anticipation animation: lightning strokes pulse via
    // CSS keyframes on the SVG paths (see soulreave.css). The rumble
    // would be a real audio asset; for v1 we just rely on visuals.
    requestAnimationFrame(() => {
      root.classList.add('soulreave-cinematic--phase1');
    });

    // Phase 2 release: flash + title slam + particles + state apply.
    let phase2Started = false;
    const startPhase2 = (): void => {
      if (phase2Started) return;
      phase2Started = true;
      root.classList.add('soulreave-cinematic--phase2');
      // Apply game-state side-effects RIGHT before the title slam
      // — so the post-cinematic screen reflects the reset state.
      try {
        onPhase2();
      } catch (err) {
        // Soulreave should not crash the cinematic. Log + move on.
        console.error('Soulreave onPhase2 threw', err);
      }
      if (!reduce) burstParticles(particles);
    };
    window.setTimeout(startPhase2, phase2DelayMs);
    window.setTimeout(finish, effectiveTotalMs);
  });
}

function romanize(n: number): string {
  // 1 → "I", 2 → "II", ... — Soulreaves are rare enough that a
  // simple table covers everyone for years. Fall back to numeric
  // for absurd indexes.
  const numerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  if (n >= 1 && n < numerals.length) return numerals[n];
  return `№${n}`;
}

function buildLightningSvg(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  // Three crimson bolts at offsets — stagger via CSS animation-delay.
  for (let i = 0; i < 3; i += 1) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', randomBoltPath());
    path.setAttribute('class', `soulreave-bolt soulreave-bolt--${i}`);
    svg.appendChild(path);
  }
  return svg;
}

function randomBoltPath(): string {
  // Synthesise a jagged top→bottom polyline. Coords in the 0-100
  // viewBox; preserveAspectRatio=none stretches to fill screen.
  const x0 = 20 + Math.random() * 60;
  let d = `M ${x0.toFixed(1)} 0`;
  let x = x0;
  let y = 0;
  while (y < 100) {
    y += 8 + Math.random() * 10;
    x += (Math.random() - 0.5) * 18;
    d += ` L ${x.toFixed(1)} ${Math.min(y, 100).toFixed(1)}`;
  }
  return d;
}

function burstParticles(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const COUNT = 40;
  type P = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
  };
  const ps: P[] = [];
  for (let i = 0; i < COUNT; i += 1) {
    const angle = (i / COUNT) * Math.PI * 2;
    const speed = 4 + Math.random() * 6;
    ps.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color: i % 2 === 0 ? '#c52727' : '#e6b450',
      size: 3 + Math.random() * 4,
    });
  }
  let frame = 0;
  const tick = (): void => {
    frame += 1;
    if (frame > 90) return; // ~1.5s at 60fps
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of ps) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vy += 0.08; // gravity
      p.life -= 0.012;
      if (p.life <= 0) continue;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
