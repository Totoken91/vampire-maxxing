// Cloud-vs-local conflict resolution.
//
// Surfaced when the player signs in on a device that already has a save
// AND the cloud row also has progress AND the two snapshots differ. The
// player explicitly picks which side wins — there's no auto-merge for
// MVP because game state is wide (servants, thralls, ichor, dread,
// quests, ritualState, soulreave) and a partial merge would leak
// inconsistent invariants downstream.
//
// Returns:
//   'cloud'  — overwrite local with cloud
//   'local'  — overwrite cloud with local
//   'cancel' — abort sign-in (caller signs out, no data touched)
//
// Style matches offline-modal / daily-modal: baroque card, gold accents,
// italic serif body, two summary columns, three CTAs in a row.

import { el } from '../../utils/dom';
import { fmt } from '../../utils/format';
import type { SaveV5 } from '../../game/save';
import { FORMS_BY_ID } from '../../game/config/forms';

interface SaveSummary {
  formLabel: string;
  ascends: number;
  dread: number;
  ichor: number;
  thralls: number;
  ts: number;
}

function summarise(save: SaveV5): SaveSummary {
  const formId = save.stats.highestFormReached;
  const formLabel = FORMS_BY_ID[formId]?.title ?? formId;
  const thralls = save.playerThralls
    ? Object.values(save.playerThralls).filter(
        (t) => (t as { state?: string }).state === 'owned',
      ).length
    : 0;
  return {
    formLabel,
    ascends: save.stats.totalAscends,
    dread: save.dread,
    ichor: save.ichor ?? 0,
    thralls,
    ts: save.ts,
  };
}

function formatTimestamp(ts: number): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = Date.now();
  const minutesAgo = Math.floor((now - ts) / 60000);
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 30) return `${daysAgo}d ago`;
  return d.toLocaleDateString();
}

export function showCloudConflictModal(
  local: SaveV5,
  cloud: SaveV5,
): Promise<'cloud' | 'local' | 'cancel'> {
  return new Promise((resolve) => {
    const localSum = summarise(local);
    const cloudSum = summarise(cloud);

    const backdrop = el('div', 'cloud-conflict__backdrop');
    const modal = el('div', 'cloud-conflict');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Cloud sync conflict');

    const eyebrow = el(
      'div',
      'cloud-conflict__eyebrow',
      '— TWO BLOODLINES —',
    );
    const title = el(
      'div',
      'cloud-conflict__title',
      'A SAVE ALREADY AWAITS',
    );
    const flavor = el(
      'div',
      'cloud-conflict__flavor',
      'Your account holds a bloodline from another night. Choose which one survives — the other will be unmade.',
    );

    const grid = el('div', 'cloud-conflict__grid');
    grid.appendChild(buildColumn('THIS DEVICE', localSum));
    grid.appendChild(buildColumn('CLOUD', cloudSum));

    const actions = el('div', 'cloud-conflict__actions');
    const keepLocalBtn = buildBtn(
      'KEEP THIS DEVICE',
      'cloud-conflict__btn--primary',
    );
    const keepCloudBtn = buildBtn(
      'KEEP CLOUD',
      'cloud-conflict__btn--primary',
    );
    const cancelBtn = buildBtn('CANCEL SIGN-IN', 'cloud-conflict__btn--ghost');

    actions.appendChild(keepLocalBtn);
    actions.appendChild(keepCloudBtn);
    actions.appendChild(cancelBtn);

    modal.appendChild(eyebrow);
    modal.appendChild(title);
    modal.appendChild(flavor);
    modal.appendChild(grid);
    modal.appendChild(actions);

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    const close = (choice: 'cloud' | 'local' | 'cancel'): void => {
      backdrop.classList.add('cloud-conflict__backdrop--exit');
      modal.classList.add('cloud-conflict--exit');
      window.setTimeout(() => {
        backdrop.remove();
        modal.remove();
      }, 240);
      resolve(choice);
    };

    keepLocalBtn.addEventListener('click', () => close('local'));
    keepCloudBtn.addEventListener('click', () => close('cloud'));
    cancelBtn.addEventListener('click', () => close('cancel'));
    // Backdrop tap = cancel (least destructive default).
    backdrop.addEventListener('click', () => close('cancel'));
  });
}

function buildColumn(label: string, s: SaveSummary): HTMLElement {
  const col = el('div', 'cloud-conflict__col');
  col.appendChild(el('div', 'cloud-conflict__col-label', label));
  col.appendChild(buildRow('Form', s.formLabel));
  col.appendChild(buildRow('Ascends', String(s.ascends)));
  col.appendChild(buildRow('Dread', String(s.dread)));
  col.appendChild(buildRow('Ichor', fmt(s.ichor)));
  col.appendChild(buildRow('Thralls', String(s.thralls)));
  col.appendChild(buildRow('Saved', formatTimestamp(s.ts)));
  return col;
}

function buildRow(k: string, v: string): HTMLElement {
  const row = el('div', 'cloud-conflict__row');
  row.appendChild(el('span', 'cloud-conflict__row-key', k));
  row.appendChild(el('span', 'cloud-conflict__row-val', v));
  return row;
}

function buildBtn(label: string, modifier: string): HTMLButtonElement {
  const btn = el('button', `cloud-conflict__btn ${modifier}`) as HTMLButtonElement;
  btn.type = 'button';
  btn.textContent = label;
  return btn;
}
