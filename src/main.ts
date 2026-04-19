// Vampire Maxxing — entry point.

import './styles/index.css';
import { mountApp } from './ui/app';
import { startLoop } from './game/loop';

const root = document.getElementById('app');
if (!root) {
  throw new Error('Missing #app root element');
}

mountApp(root);
startLoop();

if (import.meta.env.DEV) {
  void import('./dev/cheats').then((m) => {
    m.installCheats();
    // Visual dev default: start at Lord of Night so the portrait is visible.
    window.vm?.setForm('LORD_OF_NIGHT');
  });
}
