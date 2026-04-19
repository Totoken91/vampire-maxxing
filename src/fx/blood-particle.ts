// Burst particles on tap — red by default, gold on crits.
// Timing multiplier assumes 60fps reference; we scale by dt*60 to stay stable.

import type { Particle } from './particle-engine';

const GRAVITY = 0.15;
const FRICTION = 0.99;

export class BloodParticle implements Particle {
  private x: number;
  private y: number;
  private vx: number;
  private vy: number;
  private life = 1;
  private readonly decay: number;
  private readonly size: number;
  private readonly color: string;

  constructor(x: number, y: number, crit: boolean) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * (crit ? 5 : 3);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 0.8;
    this.decay = 0.015 + Math.random() * 0.02;
    this.size = 1.5 + Math.random() * (crit ? 3 : 2);
    this.color = crit
      ? '#c9a962'
      : Math.random() < 0.6
        ? '#a51423'
        : '#ff3342';
  }

  update(dt: number): boolean {
    const s = dt * 60;
    this.x += this.vx * s;
    this.y += this.vy * s;
    this.vy += GRAVITY * s;
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

/** Spawn a burst at a screen position. 8 particles for normal, 18 for crit. */
export function spawnBloodBurst(
  add: (p: Particle) => void,
  x: number,
  y: number,
  crit: boolean,
): void {
  const count = crit ? 18 : 8;
  for (let i = 0; i < count; i++) {
    add(new BloodParticle(x, y, crit));
  }
}
