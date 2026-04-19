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
