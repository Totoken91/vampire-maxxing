// Vampire Maxxing — entry point.

import './styles/index.css';
import { mountApp } from './ui/app';
import { startLoop } from './game/loop';
import { installFx } from './fx';
import { showToast } from './ui/components/toast';
import { events } from './game/events';
import { THRALLS_BY_ID } from './game/config/thralls';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Missing #app root element');
}

installFx(document.body);
mountApp(root);
startLoop();

events.on('thrall-bought', ({ id, owned }) => {
  if (owned !== 1) return; // toast only on the first purchase of a tier
  const name = THRALLS_BY_ID[id].name;
  showToast('CLAIMED', `A new ${name.toLowerCase()} kneels before you.`);
});

window.setTimeout(() => {
  showToast('AWAKENED', 'Your bloodline stirs once more.');
}, 800);

if (import.meta.env.DEV) {
  void import('./dev/cheats').then((m) => {
    m.installCheats();
    // Visual dev default: start at Lord of Night so the portrait is visible.
    window.vm?.setForm('LORD_OF_NIGHT');
  });
}
