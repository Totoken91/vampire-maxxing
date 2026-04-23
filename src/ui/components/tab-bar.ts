// Bottom navigation — 5 tabs, sticky to the bottom edge.
// Locked tabs are hidden entirely until the player meets their unlock
// condition (see gameState.isTabUnlocked). When a tab transitions from
// locked → unlocked, we animate it in with a brief gold glow.
// Icons are Unicode placeholders until Kenny provides PNG assets.

import { Component } from './base';
import { el } from '../../utils/dom';
import { getCurrentTab, navigateTo, onTabChange, type TabId } from '../navigation';
import { gameState } from '../../game/state';
import { events } from '../../game/events';
import { anyRiteUsable } from '../../game/rites';

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: readonly TabDef[] = [
  { id: 'bloodline', label: 'BLOODLINE', icon: '/assets/ornaments/tab-bloodline.webp' },
  { id: 'servants', label: 'SERVANTS', icon: '/assets/ornaments/tab-servants.webp' },
  { id: 'rites', label: 'RITES', icon: '/assets/ornaments/tab-rites.webp' },
  { id: 'tome', label: 'TOME', icon: '/assets/ornaments/tab-tome.webp' },
  { id: 'shop', label: 'SHOP', icon: '/assets/ornaments/tab-shop.webp' },
];

export class TabBar extends Component<HTMLElement> {
  private readonly buttons = new Map<TabId, HTMLButtonElement>();
  private readonly unlockedState = new Map<TabId, boolean>();

  constructor() {
    const root = el('nav', 'tab-bar');
    for (const def of TABS) {
      const btn = el('button', 'tab-bar__btn') as HTMLButtonElement;
      btn.type = 'button';
      btn.setAttribute('data-tab', def.id);
      btn.setAttribute('aria-label', def.label.toLowerCase());

      const icon = el('img', 'tab-bar__icon') as HTMLImageElement;
      icon.src = def.icon;
      icon.alt = '';
      icon.decoding = 'async';
      const label = el('span', 'tab-bar__label', def.label);
      // Notification dot. Hidden by default; toggled via CSS class on the
      // button when it should be visible.
      const dot = el('span', 'tab-bar__dot');

      btn.appendChild(icon);
      btn.appendChild(label);
      btn.appendChild(dot);
      root.appendChild(btn);
    }
    super(root);
    for (const def of TABS) {
      const btn = root.querySelector(
        `[data-tab="${def.id}"]`,
      ) as HTMLButtonElement;
      this.buttons.set(def.id, btn);
      btn.addEventListener('click', () => {
        if (!gameState.isTabUnlocked(def.id)) return;
        if (navigator.vibrate) navigator.vibrate(4);
        navigateTo(def.id);
      });
    }
  }

  protected override onMount(): void {
    this.setActive(getCurrentTab());
    this.refreshLocks({ announce: false });
    this.refreshDots();
    this.addTeardown(
      onTabChange((tab) => {
        this.setActive(tab);
        this.refreshDots();
      }),
    );

    // Any of these events can flip a tab from locked → unlocked, or toggle
    // its notification dot.
    this.addTeardown(
      events.on('servant-bought', () => {
        this.refreshLocks();
        this.refreshDots();
      }),
    );
    this.addTeardown(
      events.on('form-changed', () => {
        this.refreshLocks();
        this.refreshDots();
      }),
    );
    this.addTeardown(
      events.on('achievement-unlocked', () => {
        this.refreshLocks();
        this.refreshDots();
      }),
    );
    // playtime-based unlock (shop) + rite cooldown ticking both need a
    // low-frequency recheck.
    let tickAccum = 0;
    this.addTeardown(
      events.on('tick', ({ dt }) => {
        tickAccum += dt;
        if (tickAccum >= 2) {
          tickAccum = 0;
          this.refreshLocks();
          this.refreshDots();
        }
      }),
    );
  }

  private refreshDots(): void {
    const current = getCurrentTab();
    const dots: Record<TabId, boolean> = {
      bloodline: false,
      servants: false,
      // Rites dot: at least one usable rite while the player is somewhere
      // else. Clears when they actually open the tab.
      rites: current !== 'rites' && gameState.isTabUnlocked('rites') && anyRiteUsable(),
      // Tome dot: any achievement unlocked that hasn't been seen yet.
      tome:
        current !== 'tome' &&
        gameState.isTabUnlocked('tome') &&
        gameState.hasUnseenAchievements(),
      shop: false, // wired up in D2 when real offers exist
    };
    for (const [id, btn] of this.buttons) {
      btn.classList.toggle('tab-bar__btn--dot', dots[id]);
    }
  }

  private refreshLocks(opts: { announce?: boolean } = { announce: true }): void {
    for (const def of TABS) {
      const unlocked = gameState.isTabUnlocked(def.id);
      const btn = this.buttons.get(def.id);
      if (!btn) continue;
      const previous = this.unlockedState.get(def.id);
      btn.classList.toggle('tab-bar__btn--locked', !unlocked);
      btn.disabled = !unlocked;
      if (previous === false && unlocked && opts.announce) {
        btn.classList.remove('tab-bar__btn--reveal');
        void btn.offsetWidth;
        btn.classList.add('tab-bar__btn--reveal');
        events.emit('tab-unlocked', { tab: def.id });
      }
      this.unlockedState.set(def.id, unlocked);
    }
    // Kick the user back to Bloodline if their current tab just re-locked
    // (happens after a wipe).
    if (!gameState.isTabUnlocked(getCurrentTab())) {
      navigateTo('bloodline');
    }
  }

  private setActive(active: TabId): void {
    for (const [id, btn] of this.buttons) {
      btn.classList.toggle('tab-bar__btn--active', id === active);
    }
  }
}
