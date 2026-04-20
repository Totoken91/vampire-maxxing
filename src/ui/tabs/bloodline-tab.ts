// BLOODLINE — the main game screen. Exact layout we had before tabs:
// header / divider / portrait / blood / thrall preview / actions.
// Keeps the cinematic, FTUE, and cooldown-morphing boost logic intact.

import { Header } from '../components/header';
import { Divider } from '../components/divider';
import { Portrait } from '../components/portrait';
import { BloodDisplay } from '../components/blood-display';
import { ThrallList } from '../components/thrall-list';
import { ActionButtons } from '../components/action-buttons';
import { el } from '../../utils/dom';

export class BloodlineTab {
  private readonly root: HTMLElement;
  private readonly children: Array<{ destroy(): void }> = [];

  constructor() {
    this.root = el('div', 'app-shell tab-view tab-view--bloodline');
  }

  mountTo(parent: HTMLElement): void {
    const header = new Header();
    const divider = new Divider();
    const portrait = new Portrait();
    const blood = new BloodDisplay();
    const thralls = new ThrallList();
    const actions = new ActionButtons();

    header.mountTo(this.root);
    divider.mountTo(this.root);
    portrait.mountTo(this.root);
    blood.mountTo(this.root);
    thralls.mountTo(this.root);
    actions.mountTo(this.root);

    this.children.push(header, divider, portrait, blood, thralls, actions);
    parent.appendChild(this.root);
  }

  destroy(): void {
    for (const c of this.children) c.destroy();
    this.children.length = 0;
    this.root.remove();
  }
}
