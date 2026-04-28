// Settings menu — panel + backdrop only. The gear trigger itself
// lives inside the Header's pill row (v5.4) so it stays visually
// stuck to the wallet pills. Menu exposes open()/close() through a
// singleton reference that the Header wires to its inline button.

import { Component } from './base';
import { el } from '../../utils/dom';
import { wipeSave } from '../../game/save';
import { gameState } from '../../game/state';
import { events } from '../../game/events';
import { globalMult } from '../../game/math';
import { hasUnlock } from '../../game/config/prestige-unlocks';
import { track } from '../../analytics/events';
import { getSettings, setSetting, type Settings } from '../../game/settings';
import { showDisclosureScreen } from './disclosure-screen';
import {
  authAvailable,
  getCurrentUser,
  signInWithGoogle,
  signOut,
} from '../../game/auth';

/** V1.2-HF1 — Auto-ascend toggle row. Hidden below Methuselah
 *  Century III (totalAscends < 250). Once unlocked, the row sits
 *  alongside Sound / Haptic toggles. Build a function returning an
 *  always-present element that's hidden when locked rather than
 *  null-skipping so the row's append spot stays stable across panel
 *  open cycles (avoids layout jank). */
function buildAutoAscendRow(): HTMLElement {
  const wrap = el('div', 'menu__toggle-row-wrap');
  const row = buildToggleRow('Auto-ascend', 'autoAscend');
  wrap.appendChild(row);
  // Visibility refresh whenever the panel opens — the Menu's setOpen
  // path calls refreshStats which re-walks this element. We use a
  // closure so the menu can ping us without a ref.
  const refresh = (): void => {
    const ascends =
      (gameState.get() as unknown as { stats: { totalAscends: number } }).stats
        .totalAscends;
    // Methuselah Century III = totalAscends 9 (Methuselah threshold 7
    // + 2 within-form ascends). The form max overall is 100 (THIRST),
    // so the unlock sits at ~9% of the long-game progression.
    wrap.hidden = ascends < 9;
  };
  refresh();
  // Subscribe to ascended events so the row reveals the moment the
  // unlock threshold is crossed (in case the panel was already open).
  events.on('ascended', refresh);
  return wrap;
}

/** Inline toggle factory — used in the Menu constructor where
 *  `this.buildToggle()` would fire before super() runs. Reads the
 *  current setting on mount, persists on tap. The display label is
 *  rendered above the toggle bar; tap-area is the whole row (≥ 48px). */
function buildToggleRow(label: string, key: keyof Settings): HTMLElement {
  const row = el(
    'button',
    'menu__toggle-row',
  ) as HTMLButtonElement;
  row.type = 'button';
  const labelEl = el('span', 'menu__toggle-label', label);
  const switchEl = el('span', 'menu__toggle-switch');
  const dot = el('span', 'menu__toggle-dot');
  switchEl.appendChild(dot);
  row.appendChild(labelEl);
  row.appendChild(switchEl);

  const refresh = (): void => {
    const settings = getSettings();
    const value = settings[key];
    const enabled = typeof value === 'boolean' ? value : false;
    row.classList.toggle('menu__toggle-row--on', enabled);
    row.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  };

  row.addEventListener('click', () => {
    const settings = getSettings();
    const cur = settings[key];
    if (typeof cur !== 'boolean') return;
    setSetting(key, !cur as Settings[typeof key]);
    refresh();
  });

  refresh();
  return row;
}

/** Singleton reference, set on Menu construction. Null until the
 * Menu mounts (once at app boot). Header consumes this to wire its
 * inline gear button without passing refs through component trees. */
export let menuInstance: Menu | null = null;

type MenuTabId = 'account' | 'game' | 'spending' | 'info';

const TAB_DEFS: ReadonlyArray<{ id: MenuTabId; label: string }> = [
  { id: 'account', label: 'Account' },
  { id: 'game', label: 'Game' },
  { id: 'spending', label: 'Spending' },
  { id: 'info', label: 'Info' },
];

export class Menu extends Component<HTMLElement> {
  private readonly panel: HTMLElement;
  private readonly backdrop: HTMLElement;
  private readonly multValue: HTMLElement;
  private readonly spendRows: HTMLElement;
  private readonly capRow: HTMLElement;
  private readonly ageRow: HTMLElement;
  private readonly accountBody: HTMLElement;
  private readonly tabButtons = new Map<MenuTabId, HTMLButtonElement>();
  private readonly panes = new Map<MenuTabId, HTMLElement>();
  private activeTab: MenuTabId = 'account';
  private accountBusy = false;
  private isOpen = false;

  constructor() {
    const root = el('div', 'menu');

    const backdrop = el('div', 'menu__backdrop');
    const panel = el('div', 'menu__panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Menu');

    const header = el('div', 'menu__label', '— the rite —');
    const title = el('div', 'menu__title', 'SETTINGS');

    // ── Tabs strip — categorises the panel content so it fits within
    //    one viewport on small phones (was overflowing pre-1.3.1 with
    //    auth + spending + accessibility + info all stacked vertically).
    //    Buttons are built here as locals; their `this`-bound listeners
    //    are wired below after the super() call (TS17009: can't touch
    //    `this` in a derived constructor before super).
    const tabs = el('div', 'menu__tabs');
    tabs.setAttribute('role', 'tablist');
    const tabButtonsLocal: Array<[MenuTabId, HTMLButtonElement]> = [];
    for (const def of TAB_DEFS) {
      const btn = el(
        'button',
        'menu__tab',
        def.label,
      ) as HTMLButtonElement;
      btn.type = 'button';
      btn.dataset.tab = def.id;
      btn.setAttribute('role', 'tab');
      tabs.appendChild(btn);
      tabButtonsLocal.push([def.id, btn]);
    }

    // ── ACCOUNT pane — Supabase Auth via Google Sign-In. Body rebuilt on
    //    every open + on 'auth-changed' so the row reflects the latest
    //    state. When auth isn't configured, the tab itself is hidden.
    const accountPane = el('div', 'menu__pane');
    accountPane.dataset.pane = 'account';
    const accountBody = el('div', 'menu__account-body');
    accountPane.appendChild(accountBody);

    // ── GAME pane — Blood multiplier readout + accessibility toggles.
    const gamePane = el('div', 'menu__pane');
    gamePane.dataset.pane = 'game';
    const multRow = el('div', 'menu__stat');
    multRow.appendChild(el('span', 'menu__stat-label', 'Blood multiplier'));
    const multValue = el('span', 'menu__stat-value', '×1.00');
    multRow.appendChild(multValue);
    gamePane.appendChild(multRow);
    const togglesGroup = el('div', 'menu__group');
    togglesGroup.appendChild(buildToggleRow('Sound', 'soundEnabled'));
    togglesGroup.appendChild(buildToggleRow('Haptic feedback', 'hapticsEnabled'));
    // V1.2-HF1 — Auto-ascend toggle, gated behind Methuselah Century III.
    togglesGroup.appendChild(buildAutoAscendRow());
    gamePane.appendChild(togglesGroup);

    // ── SPENDING pane — L13 Privacy & Spending dashboard.
    const spendingPane = el('div', 'menu__pane');
    spendingPane.dataset.pane = 'spending';
    const spendRows = el('div', 'menu__spend-rows');
    spendingPane.appendChild(spendRows);
    const capRow = el('div', 'menu__spend-cap');
    spendingPane.appendChild(capRow);
    const ageRow = el('div', 'menu__spend-age');
    spendingPane.appendChild(ageRow);

    // ── INFO pane — Pull rates link + Wipe progress (danger zone).
    const infoPane = el('div', 'menu__pane');
    infoPane.dataset.pane = 'info';
    const disclosureLink = el(
      'button',
      'menu__action menu__action--neutral',
    ) as HTMLButtonElement;
    disclosureLink.type = 'button';
    disclosureLink.innerHTML =
      '<span class="menu__action-label">PULL RATES</span>' +
      '<span class="menu__action-sub">Disclosed odds, pity, and guarantees.</span>';
    disclosureLink.addEventListener('click', () => {
      this.setOpen(false);
      showDisclosureScreen();
    });
    const wipeBtn = el(
      'button',
      'menu__action menu__action--danger',
    ) as HTMLButtonElement;
    wipeBtn.type = 'button';
    wipeBtn.innerHTML =
      '<span class="menu__action-label">WIPE PROGRESS</span>' +
      '<span class="menu__action-sub">Erase the bloodline. No return.</span>';
    infoPane.appendChild(disclosureLink);
    infoPane.appendChild(wipeBtn);

    const content = el('div', 'menu__content');
    content.appendChild(accountPane);
    content.appendChild(gamePane);
    content.appendChild(spendingPane);
    content.appendChild(infoPane);

    const closeBtn = el('button', 'menu__close') as HTMLButtonElement;
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';

    panel.appendChild(header);
    panel.appendChild(title);
    panel.appendChild(tabs);
    panel.appendChild(content);
    panel.appendChild(closeBtn);

    root.appendChild(backdrop);
    root.appendChild(panel);

    super(root);
    this.panel = panel;
    this.backdrop = backdrop;
    this.multValue = multValue;
    this.spendRows = spendRows;
    this.capRow = capRow;
    this.ageRow = ageRow;
    this.accountBody = accountBody;
    this.panes.set('account', accountPane);
    this.panes.set('game', gamePane);
    this.panes.set('spending', spendingPane);
    this.panes.set('info', infoPane);

    for (const [id, btn] of tabButtonsLocal) {
      this.tabButtons.set(id, btn);
      btn.addEventListener('click', () => this.switchTab(id));
    }

    backdrop.addEventListener('click', () => this.setOpen(false));
    closeBtn.addEventListener('click', () => this.setOpen(false));
    wipeBtn.addEventListener('click', () => {
      void this.confirmWipe();
    });

    // Hide the Account tab on builds where auth isn't configured.
    // Drop-in with the legacy behaviour: the section just disappears
    // and the default tab falls back to "game" so opening Settings
    // doesn't surface a hidden tab.
    if (!authAvailable()) {
      const accountTab = this.tabButtons.get('account');
      if (accountTab) accountTab.hidden = true;
      accountPane.hidden = true;
      this.activeTab = 'game';
    } else {
      this.refreshAccountRow();
      events.on('auth-changed', () => this.refreshAccountRow());
    }

    this.switchTab(this.activeTab);

    menuInstance = this;
  }

  /** Show one pane and update the active tab style. Idempotent — safe
   *  to call with the currently-active tab id (used to mount the
   *  initial state in the constructor). */
  private switchTab(id: MenuTabId): void {
    this.activeTab = id;
    for (const [tabId, btn] of this.tabButtons) {
      btn.classList.toggle('menu__tab--active', tabId === id);
      btn.setAttribute(
        'aria-selected',
        tabId === id ? 'true' : 'false',
      );
    }
    for (const [paneId, pane] of this.panes) {
      pane.hidden = paneId !== id;
    }
  }

  /** Public API so external buttons (Header's inline gear) can
   * request the panel to open. Also refreshes the mult readout. */
  open(): void {
    this.setOpen(true);
  }

  close(): void {
    this.setOpen(false);
  }

  private setOpen(open: boolean): void {
    this.isOpen = open;
    this.panel.classList.toggle('menu__panel--open', open);
    this.backdrop.classList.toggle('menu__backdrop--open', open);
    if (open) {
      this.refreshStats();
      this.refreshAccountRow();
    }
  }

  private refreshStats(): void {
    const hasProgenitor = hasUnlock(
      gameState.getPrestigeCount(),
      'globalMultBonus',
    );
    const mult = globalMult(gameState.getDread(), hasProgenitor);
    this.multValue.textContent = `×${mult.toFixed(2)}`;
    this.refreshSpendingDashboard();
  }

  /** L13 — Re-render the spending rows + cap status + age line. */
  private refreshSpendingDashboard(): void {
    // Spend totals.
    this.spendRows.textContent = '';
    this.spendRows.appendChild(
      this.makeSpendRow('Today', gameState.getTodaySpent()),
    );
    this.spendRows.appendChild(
      this.makeSpendRow('Last 30 days', gameState.getLast30DaysSpent()),
    );
    this.spendRows.appendChild(
      this.makeSpendRow('Lifetime', gameState.getLifetimeSpent()),
    );

    // Daily cap row.
    this.capRow.textContent = '';
    const cap = gameState.getDailySpendCap();
    if (cap === null) {
      const setBtn = el(
        'button',
        'menu__spend-cap-action',
      ) as HTMLButtonElement;
      setBtn.type = 'button';
      setBtn.textContent = 'Set a daily spending cap';
      setBtn.addEventListener('click', () => {
        const input = window.prompt(
          'Daily spending cap in euros (e.g. 5, 10, 20). Leave blank to skip.',
          '',
        );
        if (input === null) return;
        const trimmed = input.trim();
        if (trimmed === '') return;
        const value = Number(trimmed);
        if (!Number.isFinite(value) || value <= 0) {
          window.alert('Enter a positive number.');
          return;
        }
        gameState.setDailySpendCap(value);
        track('spending_cap_set', { value });
        void gameState.saveToStorage();
        this.refreshSpendingDashboard();
      });
      this.capRow.appendChild(setBtn);
    } else {
      const wrap = el('div', 'menu__spend-cap-current');
      wrap.innerHTML =
        '<span class="menu__spend-row-label">Daily cap</span>' +
        `<span class="menu__spend-row-value">${cap.toFixed(2)} €</span>`;
      const removeBtn = el(
        'button',
        'menu__spend-cap-remove',
      ) as HTMLButtonElement;
      removeBtn.type = 'button';
      removeBtn.textContent = 'Remove cap';
      removeBtn.addEventListener('click', () => {
        gameState.setDailySpendCap(null);
        track('spending_cap_set', { value: null });
        void gameState.saveToStorage();
        this.refreshSpendingDashboard();
      });
      this.capRow.appendChild(wrap);
      this.capRow.appendChild(removeBtn);
    }

    // Age confirmation row.
    this.ageRow.textContent = '';
    const age = gameState.getAgeConfirmation();
    let line: string;
    if (age === 'unconfirmed') {
      line = 'Age status: not yet confirmed';
    } else if (age === 'over13') {
      line = 'Age status: 13 or older — purchases enabled';
    } else {
      line = 'Age status: under 13 — purchases disabled';
    }
    this.ageRow.appendChild(el('div', 'menu__spend-age-line', line));
  }

  private makeSpendRow(label: string, amountEur: number): HTMLElement {
    const row = el('div', 'menu__spend-row');
    row.appendChild(el('span', 'menu__spend-row-label', label));
    row.appendChild(
      el(
        'span',
        'menu__spend-row-value',
        amountEur > 0 ? `${amountEur.toFixed(2)} €` : '0 €',
      ),
    );
    return row;
  }

  /** Re-render the Account section based on the current auth state.
   *  Called on every panel open and on every 'auth-changed' event so the
   *  row stays in sync even if the panel is open during sign-in/out. */
  private refreshAccountRow(): void {
    if (!authAvailable()) return;
    this.accountBody.textContent = '';
    const user = getCurrentUser();
    if (user) {
      const identity = el(
        'div',
        'menu__account-identity',
        user.email ?? user.displayName ?? 'Signed in',
      );
      const sub = el(
        'div',
        'menu__account-sub',
        'Cloud sync ready. Your bloodline travels with you.',
      );
      const signOutBtn = el(
        'button',
        'menu__action menu__action--neutral',
      ) as HTMLButtonElement;
      signOutBtn.type = 'button';
      signOutBtn.innerHTML =
        '<span class="menu__action-label">SIGN OUT</span>' +
        '<span class="menu__action-sub">Lock the rite. Local play continues.</span>';
      signOutBtn.addEventListener('click', () => {
        if (this.accountBusy) return;
        this.accountBusy = true;
        signOutBtn.disabled = true;
        void signOut().finally(() => {
          this.accountBusy = false;
          signOutBtn.disabled = false;
        });
      });
      this.accountBody.appendChild(identity);
      this.accountBody.appendChild(sub);
      this.accountBody.appendChild(signOutBtn);
      return;
    }

    const sub = el(
      'div',
      'menu__account-sub',
      'Bind your bloodline to a Google account to keep it across devices.',
    );
    const signInBtn = el(
      'button',
      'menu__action menu__action--neutral',
    ) as HTMLButtonElement;
    signInBtn.type = 'button';
    signInBtn.innerHTML =
      '<span class="menu__action-label">SIGN IN WITH GOOGLE</span>' +
      '<span class="menu__action-sub">Cloud sync. No password. No spam.</span>';
    signInBtn.addEventListener('click', () => {
      if (this.accountBusy) return;
      this.accountBusy = true;
      signInBtn.disabled = true;
      void signInWithGoogle()
        .then((ok) => {
          if (!ok) {
            // Surface a tiny inline hint; toast system would also work
            // but the row already gives the user visual feedback when
            // it stays in "signed out" state.
            sub.textContent =
              'Sign-in was cancelled or unavailable. Try again later.';
          }
        })
        .finally(() => {
          this.accountBusy = false;
          signInBtn.disabled = false;
        });
    });
    this.accountBody.appendChild(sub);
    this.accountBody.appendChild(signInBtn);
  }

  private async confirmWipe(): Promise<void> {
    const ok = await showConfirm(
      'WIPE THE BLOODLINE?',
      'Every thrall, every drop of blood, every century undone. This cannot be reversed.',
      'WIPE',
      'Keep playing',
    );
    if (!ok) return;

    await wipeSave();
    gameState.reset();
    events.emit('blood-changed', { blood: 0, delta: 0 });
    events.emit('rate-changed', { totalRate: 0 });
    events.emit('form-changed', { form: 'NEWBORN' });
    this.setOpen(false);
  }

  isPanelOpen(): boolean {
    return this.isOpen;
  }
}

/** Minimal modal confirmation. Resolves true on the primary action. */
function showConfirm(
  title: string,
  body: string,
  primaryLabel: string,
  cancelLabel: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const backdrop = el('div', 'confirm__backdrop');
    const modal = el('div', 'confirm');
    modal.setAttribute('role', 'alertdialog');

    const titleEl = el('div', 'confirm__title', title);
    const bodyEl = el('div', 'confirm__body', body);
    const actions = el('div', 'confirm__actions');

    const cancel = el('button', 'confirm__btn confirm__btn--cancel', cancelLabel) as HTMLButtonElement;
    cancel.type = 'button';
    const primary = el('button', 'confirm__btn confirm__btn--danger', primaryLabel) as HTMLButtonElement;
    primary.type = 'button';

    actions.appendChild(cancel);
    actions.appendChild(primary);
    modal.appendChild(titleEl);
    modal.appendChild(bodyEl);
    modal.appendChild(actions);

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    const close = (result: boolean): void => {
      backdrop.remove();
      modal.remove();
      resolve(result);
    };

    cancel.addEventListener('click', () => close(false));
    backdrop.addEventListener('click', () => close(false));
    primary.addEventListener('click', () => close(true));
  });
}
