// Vampire Maxxing — entry point.

import './styles/index.css';
import { mountApp } from './ui/app';
import { startLoop } from './game/loop';
import { installFx } from './fx';
import { installFtue } from './ftue';
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

// Default toast on every first-of-tier purchase. FTUE registers AFTER this
// and overrides with "FIRST SPARK" when applicable (showToast replaces the
// existing toast element).
events.on('thrall-bought', ({ id, owned }) => {
  if (owned !== 1) return;
  const name = THRALLS_BY_ID[id].name;
  showToast('CLAIMED', `A new ${name.toLowerCase()} kneels before you.`);
});

installFtue();

if (import.meta.env.DEV) {
  void import('./dev/cheats').then((m) => {
    m.installCheats();
    // Visual dev default: start at Lord of Night so the portrait is visible.
    // NOTE: setting a form flips totalAscends so FTUE won't trigger. Use
    // vm.reset() in the console to exercise the onboarding flow.
    window.vm?.setForm('LORD_OF_NIGHT');
  });
}
