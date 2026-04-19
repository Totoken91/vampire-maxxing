// Canvas-based particle engine. Single full-screen canvas shared by all
// particle types (embers, blood bursts, future crits). rAF loop, DPR-aware,
// hard cap to keep 60fps on mid-range Android.

export interface Particle {
  /** Advance simulation by `dt` seconds. Return true if still alive. */
  update(dt: number): boolean;
  draw(ctx: CanvasRenderingContext2D): void;
}

const MAX_PARTICLES = 200;

class ParticleEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private readonly particles: Particle[] = [];
  private rafId: number | null = null;
  private lastTime = 0;
  private reducedMotion = false;

  mount(root: HTMLElement): void {
    if (this.canvas) return;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fx-canvas';
    this.ctx = this.canvas.getContext('2d');
    root.appendChild(this.canvas);

    this.resize();
    window.addEventListener('resize', this.resize);

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.start();
  }

  add(p: Particle): void {
    if (this.reducedMotion && this.particles.length >= MAX_PARTICLES / 4) return;
    this.particles.push(p);
    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
  }

  count(): number {
    return this.particles.length;
  }

  private readonly resize = (): void => {
    if (!this.canvas || !this.ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  };

  private start(): void {
    if (this.rafId !== null) return;
    this.lastTime = 0;
    const tick = (time: number): void => {
      if (this.lastTime === 0) this.lastTime = time;
      const dt = Math.min((time - this.lastTime) / 1000, 0.05);
      this.lastTime = time;
      this.step(dt);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private step(dt: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const alive = this.particles[i].update(dt);
      if (!alive) {
        this.particles.splice(i, 1);
      } else {
        this.particles[i].draw(ctx);
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}

export const particleEngine = new ParticleEngine();
