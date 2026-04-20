// Root controller: builds the app layout and mounts components.

import { Header } from './components/header';
import { Divider } from './components/divider';
import { Portrait } from './components/portrait';
import { BloodDisplay } from './components/blood-display';
import { ThrallList } from './components/thrall-list';
import { ActionButtons } from './components/action-buttons';
import { Menu } from './components/menu';
import { el } from '../utils/dom';

export function mountApp(root: HTMLElement): void {
  root.innerHTML = '';
  const shell = el('div', 'app-shell');

  const header = new Header();
  const divider = new Divider();
  const portrait = new Portrait();
  const blood = new BloodDisplay();
  const thralls = new ThrallList();
  const actions = new ActionButtons();
  const menu = new Menu();

  header.mountTo(shell);
  divider.mountTo(shell);
  portrait.mountTo(shell);
  blood.mountTo(shell);
  thralls.mountTo(shell);
  actions.mountTo(shell);

  root.appendChild(shell);
  // Menu lives outside the shell so its overlays sit above everything.
  menu.mountTo(root);
}
