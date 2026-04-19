// Ambient embers rising from the bottom. 25% gold, 75% blood red.
// Sustained ~30 concurrent via a light regen interval.

import { particleEngine, type Particle } from './particle-engine';

const REGEN_MS = 900;

export class Ember implements Particle {
  private x: number;
  private y: number;
  private vx: number;
  private vy: number;
  private life = 1;
  private readonly decay: number;
  private readonly size: number;
  private readonly color: string;

  constructor(prefill = false) {
    this.x = Math.random() * window.innerWidth;
    this.y = prefill
      ? Math.random() * window.innerHeight
      : window.innerHeight + 10;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = -0.15 - Math.random() * 0.25;
    this.decay = 0.0012 + Math.random() * 0.0018;
    this.size = 0.9 + Math.random() * 1.4;
    this.color = Math.random() < 0.3 ? '#c9a962' : '#ff3342';
  }

  update(dt: number): boolean {
    const s = dt * 60;
    this.x += this.vx * s;
    this.y += this.vy * s;
    this.vx += (Math.random() - 0.5) * 0.04 * s;
    this.life -= this.decay * s;
    return this.life > 0 && this.y > -10;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.globalAlpha = this.life * 0.75;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function startEmbers(): () => void {
  for (let i = 0; i < 20; i++) {
    particleEngine.add(new Ember(true));
  }
  const interval = window.setInterval(() => {
    particleEngine.add(new Ember());
  }, REGEN_MS);
  return () => window.clearInterval(interval);
}
