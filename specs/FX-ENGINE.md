# SPEC — FX Engine

> Moteur de particules et effets visuels. Canvas 2D, 60 fps, budget 200 particules simultanées max.

## Fichiers

```
src/fx/
├── particle-engine.ts       ← core engine, gère toutes les particules
├── embers.ts                ← braises ambient qui montent
├── fog.ts                   ← gradients animés (CSS pur)
├── drips.ts                 ← gouttes de sang depuis le portrait
├── bats.ts                  ← chauves-souris traversantes
├── float-number.ts          ← +N qui monte sur tap
└── ascension.ts             ← animation cinématique du changement de forme
```

## Particle Engine

Un seul canvas plein écran, z-index entre background et UI :

```ts
// src/fx/particle-engine.ts
export class ParticleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private running = false;
  
  init(container: HTMLElement): void {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fx-canvas';
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    container.appendChild(this.canvas);
    window.addEventListener('resize', () => this.resize());
    this.running = true;
    this.loop();
  }
  
  spawn(particle: Particle): void {
    if (this.particles.length < 200) this.particles.push(particle);
  }
  
  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.scale(dpr, dpr);
  }
  
  private loop(): void {
    if (!this.running) return;
    this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.isDead()) this.particles.splice(i, 1);
      else p.draw(this.ctx);
    }
    requestAnimationFrame(() => this.loop());
  }
}
```

## Blood particles (tap burst)

```ts
export class BloodParticle implements Particle {
  constructor(
    public x: number,
    public y: number,
    private isCrit: boolean
  ) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * (isCrit ? 5 : 3);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 0.8;
    this.life = 1;
    this.size = 1.5 + Math.random() * (isCrit ? 3 : 2);
    this.color = isCrit ? '#c9a962' : (Math.random() < 0.6 ? '#a51423' : '#ff3342');
  }
  
  update(): void {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.15;  // gravity
    this.vx *= 0.99;
    this.life -= 0.02 + Math.random() * 0.02;
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
  
  isDead(): boolean {
    return this.life <= 0;
  }
}
```

Usage sur tap :
```ts
function onTap(x: number, y: number, isCrit: boolean) {
  const count = isCrit ? 18 : 8;
  for (let i = 0; i < count; i++) {
    engine.spawn(new BloodParticle(x, y, isCrit));
  }
}
```

## Embers (ambient)

Montent lentement depuis le bas de l'écran. 30 max simultanées.

```ts
export class Ember implements Particle {
  constructor() {
    this.x = Math.random() * window.innerWidth;
    this.y = window.innerHeight + 10;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = -0.15 - Math.random() * 0.25;
    this.life = 1;
    this.size = 0.4 + Math.random() * 1;
    this.color = Math.random() < 0.25 ? '#c9a962' : '#a51423';
  }
  update() { /* drift upward avec léger jitter */ }
  draw(ctx) { /* alpha 0.5, shadow blur 4 */ }
  isDead() { return this.life <= 0 || this.y < -10; }
}

// Spawner
setInterval(() => {
  if (embersCount < 30) engine.spawn(new Ember());
}, 1000);
```

## Fog (CSS pur, pas Canvas)

2 gradients radiaux animés sur un div fixed overlay :

```css
.fog-layer {
  position: fixed; inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(ellipse 40% 25% at 20% 30%, rgba(60, 20, 30, 0.25), transparent),
    radial-gradient(ellipse 50% 30% at 80% 70%, rgba(40, 15, 60, 0.2), transparent);
  animation: fog-drift 30s ease-in-out infinite alternate;
  mix-blend-mode: screen;
}
@keyframes fog-drift {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(-40px, 20px) scale(1.1); }
}
```

## Drips (depuis le portrait)

3 gouttes avec délais différents. Pure CSS animation depuis le bas du portrait :

```css
.drip {
  position: absolute;
  left: 50%;
  bottom: -10px;
  width: 4px; height: 10px;
  background: linear-gradient(to bottom, var(--blood-glow), var(--blood-dark));
  border-radius: 50% 50% 50% 50% / 30% 30% 70% 70%;
  animation: drip-fall 5s ease-in infinite;
}
.drip.d2 { left: 45%; animation-delay: 2.2s; }
.drip.d3 { left: 54%; animation-delay: 3.8s; }

@keyframes drip-fall {
  0%, 60%  { opacity: 0; transform: translateY(0) scaleY(0.4); }
  65%      { opacity: 1; transform: translateY(0) scaleY(1); }
  100%     { opacity: 0; transform: translateY(30px) scaleY(2); }
}
```

## Bats

Silhouettes Phosphor `ph-fill ph-bat` qui traversent :

```css
.bat {
  position: fixed;
  top: 22%;
  left: -60px;
  color: var(--ink-faint);
  font-size: 18px;
  opacity: 0.4;
  animation: bat-fly 25s linear infinite;
  pointer-events: none;
}
@keyframes bat-fly {
  0%   { transform: translate(0, 0); opacity: 0; }
  5%   { opacity: 0.4; }
  50%  { transform: translate(50vw, -20px); }
  95%  { opacity: 0.3; }
  100% { transform: translate(calc(100vw + 80px), 0); opacity: 0; }
}
```

2 bats : un à 22% de la hauteur, un à 55% avec délai décalé.

## Float Number

Texte flottant "+10" qui apparaît au tap et monte :

```ts
export function spawnFloatNumber(x: number, y: number, value: number, isCrit: boolean): void {
  const el = document.createElement('div');
  el.className = isCrit ? 'float-num crit' : 'float-num';
  el.textContent = `+${value}`;
  el.style.left = `${x + (Math.random() - 0.5) * 30}px`;
  el.style.top = `${y - 10}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}
```

CSS :
```css
.float-num {
  position: fixed;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  font-size: 17px;
  color: var(--blood-glow);
  text-shadow: 0 0 14px var(--blood-glow);
  pointer-events: none;
  animation: float-up 1.1s ease-out forwards;
  z-index: 100;
  transform: translate(-50%, 0);
}
.float-num.crit {
  color: var(--gold);
  text-shadow: 0 0 18px var(--gold);
  font-size: 24px;
}
@keyframes float-up {
  0%   { opacity: 0; transform: translate(-50%, 0) scale(0.5); }
  12%  { opacity: 1; transform: translate(-50%, -6px) scale(1.15); }
  100% { opacity: 0; transform: translate(-50%, -70px) scale(0.9); }
}
```

## Ascension FX (LE moment fort)

Voir `PORTRAIT-SYSTEM.md` pour le détail complet. Timeline :
1. Flash rouge plein écran (400ms)
2. Portrait actuel dissolve en particules rouges (800ms)
3. Changement de source d'image
4. Nouveau portrait materialize en particules dorées (800ms)
5. Titre s'anime (600ms)
6. Toast flavor text

Total : ~2.5-3s.

## Prefers-reduced-motion

Si `prefers-reduced-motion` actif :
- Plus d'embers
- Plus de fog drift
- Plus de drips
- Plus de bats
- Dissolve/materialize remplacés par simple fade

```ts
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReduced) {
  // Skip particle effects, keep only critical feedback
}
```

## Performance targets

- 60 fps stable sur Snapdragon 665
- < 200 particules simultanées
- Canvas clear+redraw < 3ms
- Pas de memory leak après 1h de jeu

Si drop de fps détecté : reduce particle count dynamically.
