// Ascension particles — drift upward from the portrait bounds.
// Red variant plays during dissolve, gold during materialize.

import type { Particle } from './particle-engine';

const DRIFT_UP = -0.04;
const FRICTION = 0.985;

export class DissolveParticle implements Particle {
  private x: number;
  private y: number;
  private vx: number;
  private vy: number;
  private life = 1;
  private readonly decay: number;
  private readonly size: number;
  private readonly color: string;

  constructor(x: number, y: number, gold: boolean) {
    this.x = x;
    this.y = y;
    // Mostly-upward spray with a wide cone.
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
    const speed = 0.5 + Math.random() * 1.8;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.decay = 0.008 + Math.random() * 0.01;
    this.size = 1 + Math.random() * 2.2;
    this.color = gold
      ? Math.random() < 0.5
        ? '#c9a962'
        : '#f0d891'
      : Math.random() < 0.6
        ? '#a51423'
        : '#ff3342';
  }

  update(dt: number): boolean {
    const s = dt * 60;
    this.x += this.vx * s;
    this.y += this.vy * s;
    this.vy += DRIFT_UP * s;
    this.vx *= Math.pow(FRICTION, s);
    this.life -= this.decay * s;
    return this.life > 0;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Scatter `count` particles across the given rect. */
export function spawnDissolveBurst(
  add: (p: Particle) => void,
  rect: DOMRect,
  count: number,
  gold: boolean,
): void {
  for (let i = 0; i < count; i++) {
    const x = rect.left + Math.random() * rect.width;
    const y = rect.top + Math.random() * rect.height;
    add(new DissolveParticle(x, y, gold));
  }
}
