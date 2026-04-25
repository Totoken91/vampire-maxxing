// V1.3 SOULREAVE — Meta-tree modal.
//
// Six hexagonal nodes connected by SVG branches. Tap a node →
// detail card slides in below the tree showing name, flavour,
// effect, and a BUY button. Owned nodes show a checkmark; locked
// nodes are dim; affordable nodes breathe with a 5-layer FDP glow.
//
// Linear unlock: a node is `affordable` only if its prereq is
// owned AND the player has enough Soul Shards. Otherwise it's
// `locked`. Owned trumps everything.

import { el } from '../../utils/dom';
import { events } from '../../game/events';
import { gameState } from '../../game/state';
import {
  META_NODES,
  META_NODES_BY_ID,
  META_NODE_CONFIRM_THRESHOLD,
  type MetaNode,
  type MetaNodeId,
} from '../../game/config/meta-tree';
import {
  canPurchaseMetaNode,
  ownsMetaNode,
  purchaseMetaNode,
} from '../../game/soulreave';

type NodeStatus = 'owned' | 'affordable' | 'locked';

function statusOf(id: MetaNodeId): NodeStatus {
  if (ownsMetaNode(id)) return 'owned';
  if (canPurchaseMetaNode(id)) return 'affordable';
  return 'locked';
}

export function openMetaTreeModal(): void {
  const backdrop = el('div', 'meta-tree-modal__backdrop');
  const modal = el('div', 'meta-tree-modal');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-label', 'Soul Shards meta-tree');

  const close = el('button', 'meta-tree-modal__close', '✕') as HTMLButtonElement;
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');

  const title = el('div', 'meta-tree-modal__title', 'SOUL SHARDS');
  const subtitle = el(
    'div',
    'meta-tree-modal__subtitle',
    'Spend the residue of your Soulreaves.',
  );

  const shards = el('div', 'meta-tree-modal__shards');
  const shardsIcon = el('div', 'meta-tree-modal__shards-icon');
  const shardsCount = el(
    'span',
    'meta-tree-modal__shards-count',
    `${gameState.getSoulShards()}`,
  );
  shards.append(shardsIcon, shardsCount);

  const canvas = el('div', 'meta-tree-canvas');
  const branches = buildBranchesSvg();
  canvas.appendChild(branches);

  const nodeButtons = new Map<MetaNodeId, HTMLButtonElement>();
  for (const node of META_NODES) {
    const btn = buildNodeButton(node);
    btn.style.left = `${node.layout.x * 100}%`;
    btn.style.top = `${node.layout.y * 100}%`;
    canvas.appendChild(btn);
    nodeButtons.set(node.id, btn);
  }

  const detail = el('div', 'meta-tree-detail');
  detail.style.visibility = 'hidden';
  const detailName = el('div', 'meta-tree-detail__name');
  const detailFlavour = el('div', 'meta-tree-detail__flavour');
  const detailEffect = el('div', 'meta-tree-detail__effect');
  const detailBuy = el('button', 'meta-tree-detail__buy') as HTMLButtonElement;
  detailBuy.type = 'button';
  detail.append(detailName, detailFlavour, detailEffect, detailBuy);

  modal.append(close, title, subtitle, shards, canvas, detail);
  document.body.append(backdrop, modal);

  let selectedId: MetaNodeId | null = null;

  const refreshCounts = (): void => {
    shardsCount.textContent = `${gameState.getSoulShards()}`;
  };

  const refreshNodeStates = (): void => {
    for (const node of META_NODES) {
      const btn = nodeButtons.get(node.id)!;
      btn.classList.remove(
        'meta-tree-node--locked',
        'meta-tree-node--affordable',
        'meta-tree-node--owned',
      );
      btn.classList.add(`meta-tree-node--${statusOf(node.id)}`);
    }
    // Re-style branches: an active branch goes parent→child if the
    // child node is owned OR affordable (i.e., the path to it is
    // open).
    for (const path of branches.querySelectorAll('path')) {
      const childId = path.getAttribute('data-child') as MetaNodeId | null;
      if (!childId) continue;
      const status = statusOf(childId);
      path.classList.toggle(
        'meta-tree-branch--active',
        status === 'owned' || status === 'affordable',
      );
    }
  };

  const renderDetail = (id: MetaNodeId | null): void => {
    if (!id) {
      detail.style.visibility = 'hidden';
      return;
    }
    const node = META_NODES_BY_ID[id];
    detail.style.visibility = 'visible';
    detailName.textContent = node.name;
    detailFlavour.textContent = node.flavour;
    detailEffect.textContent = node.effect;
    const status = statusOf(id);
    if (status === 'owned') {
      detailBuy.textContent = 'OWNED';
      detailBuy.disabled = true;
    } else if (status === 'locked') {
      const prereq = node.requires
        ? META_NODES_BY_ID[node.requires].name
        : null;
      const reason =
        prereq && !ownsMetaNode(node.requires!)
          ? `REQUIRES ${prereq.toUpperCase()}`
          : `${node.cost} SHARDS NEEDED`;
      detailBuy.textContent = reason;
      detailBuy.disabled = true;
    } else {
      detailBuy.textContent = `SPEND ${node.cost} SHARDS`;
      detailBuy.disabled = false;
    }
  };

  const tryPurchase = (id: MetaNodeId): void => {
    const node = META_NODES_BY_ID[id];
    if (!canPurchaseMetaNode(id)) return;
    // Confirmation modal for high-cost purchases (≥ threshold).
    if (node.cost >= META_NODE_CONFIRM_THRESHOLD) {
      const ok = window.confirm(
        `Spend ${node.cost} Soul Shards on ${node.name}?`,
      );
      if (!ok) return;
    }
    if (purchaseMetaNode(id)) {
      refreshCounts();
      refreshNodeStates();
      renderDetail(id);
    }
  };

  for (const [id, btn] of nodeButtons) {
    btn.addEventListener('click', () => {
      selectedId = id;
      renderDetail(id);
    });
  }
  detailBuy.addEventListener('click', () => {
    if (selectedId) tryPurchase(selectedId);
  });

  // Live refresh on background events (e.g., another path mutates SS).
  const off1 = events.on('soul-shards-changed', refreshCounts);
  const off2 = events.on('meta-node-purchased', () => {
    refreshNodeStates();
    if (selectedId) renderDetail(selectedId);
  });

  const finish = (): void => {
    off1();
    off2();
    backdrop.remove();
    modal.remove();
  };
  close.addEventListener('click', finish);
  backdrop.addEventListener('click', finish);

  refreshNodeStates();
}

function buildNodeButton(node: MetaNode): HTMLButtonElement {
  const btn = el('button', 'meta-tree-node') as HTMLButtonElement;
  btn.type = 'button';
  btn.setAttribute('aria-label', node.name);
  const hex = el('div', 'meta-tree-node__hex');
  const label = el('div', 'meta-tree-node__label', node.name);
  const cost = el('div', 'meta-tree-node__cost', `${node.cost}`);
  btn.append(hex, label, cost);
  return btn;
}

function buildBranchesSvg(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('meta-tree-canvas__branches');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  for (const node of META_NODES) {
    if (!node.requires) continue;
    const parent = META_NODES_BY_ID[node.requires];
    const path = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path',
    );
    const d = `M ${parent.layout.x * 100} ${parent.layout.y * 100} L ${node.layout.x * 100} ${node.layout.y * 100}`;
    path.setAttribute('d', d);
    path.setAttribute('class', 'meta-tree-branch');
    path.setAttribute('data-parent', parent.id);
    path.setAttribute('data-child', node.id);
    svg.appendChild(path);
  }
  return svg;
}
