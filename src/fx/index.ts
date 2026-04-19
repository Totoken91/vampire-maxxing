// Fx init — mounts canvas, spawns ambient embers, wires event-driven effects.

import { BloodParticle } from './blood-particle';
import { startEmbers } from './embers';
import { spawnFloatNumber } from './float-number';
import { particleEngine } from './particle-engine';
import { events } from '../game/events';
import { fmt } from '../utils/format';

export function installFx(root: HTMLElement): void {
  // Fog layer (CSS only).
  const fog = document.createElement('div');
  fog.className = 'fog';
  root.appendChild(fog);

  // Particle canvas.
  particleEngine.mount(root);

  // Ambient embers rising from the bottom.
  startEmbers();

  // Tap → burst + float-number + haptic.
  events.on('tapped', ({ x, y, crit, gain }) => {
    const count = crit ? 18 : 8;
    for (let i = 0; i < count; i++) {
      particleEngine.add(new BloodParticle(x, y, crit));
    }
    spawnFloatNumber(x, y, `+${fmt(Math.round(gain))}`, crit);

    if (navigator.vibrate) navigator.vibrate(crit ? 20 : 4);
  });
}
