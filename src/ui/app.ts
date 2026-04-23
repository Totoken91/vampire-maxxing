// Root controller: builds the tab shell, mounts whichever tab is active,
// swaps it on navigation. Each tab owns its own layout and teardown;
// switching tabs unmounts the previous view so we never pile up stale
// event subscriptions.

import { BloodlineTab } from './tabs/bloodline-tab';
import { SanctumTab } from './tabs/sanctum-tab';
import { RitesTab } from './tabs/rites-tab';
import { TomeTab } from './tabs/tome-tab';
import { ShopTab } from './tabs/shop-tab';
import { TabBar } from './components/tab-bar';
import { Menu } from './components/menu';
import { el } from '../utils/dom';
import { getCurrentTab, onTabChange, type TabId } from './navigation';

interface TabView {
  mountTo(parent: HTMLElement): void;
  destroy(): void;
}

function createTabView(tab: TabId): TabView {
  switch (tab) {
    case 'bloodline':
      return new BloodlineTab();
    case 'sanctum':
      return new SanctumTab();
    case 'rites':
      return new RitesTab();
    case 'tome':
      return new TomeTab();
    case 'shop':
      return new ShopTab();
  }
}

export function mountApp(root: HTMLElement): void {
  root.innerHTML = '';

  const app = el('div', 'app');
  const viewport = el('main', 'app-viewport');
  const tabBar = new TabBar();

  app.appendChild(viewport);
  tabBar.mountTo(app);

  root.appendChild(app);

  const menu = new Menu();
  menu.mountTo(root);

  let current: TabView | null = null;
  const render = (tab: TabId): void => {
    if (current) current.destroy();
    current = createTabView(tab);
    current.mountTo(viewport);
  };

  onTabChange(render);
  render(getCurrentTab());
}
