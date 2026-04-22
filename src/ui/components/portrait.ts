// Portrait with baroque frame overlay. Loads the real PNG when available,
// falls back to a subtitle placeholder otherwise.
// Taps go through gameState.tap() which handles crit/rate/events.
//
// B0b: the body is now a 4-layer stack so post-launch features can inject
// VFX without touching this component. Layers, bottom → top:
//   1. .portrait__overlay--back   — ancestors silhouettes (Phase J)
//   2. .portrait__image           — the main portrait (existing)
//   3. .portrait__overlay--front  — awakening halos / glitch (Phase G)
//   4. .portrait__frame           — baroque frame (existing, always on top)
// Injection via the singleton portraitOverlays API at the bottom of this
// file. Callers never touch the DOM directly.

import { Component } from './base';
import { el } from '../../utils/dom';
import { events } from '../../game/events';
import { gameState } from '../../game/state';
import { getCurrentFormDefinition, getCenturyInForm } from '../../game/forms';
import { toRoman } from '../../utils/roman';
import { triggerCenturyUpgrade } from '../../fx/century-upgrade';
import { installBloodTick } from '../../fx/blood-tick';

const FRAME_SRC = '/assets/ornaments/portrait-frame-baroque.png';

export type OverlayLayer = 'front' | 'back';

/** Current mount point for each layer. Set when a Portrait instance mounts;
 * cleared on destroy. Null when no Portrait is live (other tabs). */
let activeOverlayFront: HTMLElement | null = null;
let activeOverlayBack: HTMLElement | null = null;
/** Pending overlays queued while no Portrait is mounted, so callers don't
 * have to care about lifecycle timing. Keyed by id for idempotent add/remove. */
const pending = new Map<string, { layer: OverlayLayer; element: HTMLElement }>();

function flushPending(): void {
  for (const [id, { layer, element }] of pending) {
    const target = layer === 'front' ? activeOverlayFront : activeOverlayBack;
    if (!target) continue;
    element.dataset.overlayId = id;
    target.appendChild(element);
  }
  pending.clear();
}

export const portraitOverlays = {
  /**
   * Mount an element on one of the portrait's overlay layers. Safe to call
   * before the Portrait exists (queued and flushed on next mount).
   */
  add(id: string, layer: OverlayLayer, element: HTMLElement): void {
    // Replace any existing overlay with the same id.
    this.remove(id);
    element.dataset.overlayId = id;
    const target = layer === 'front' ? activeOverlayFront : activeOverlayBack;
    if (target) {
      target.appendChild(element);
    } else {
      pending.set(id, { layer, element });
    }
  },

  /** Remove the overlay with this id from whichever layer it lives on. */
  remove(id: string): void {
    pending.delete(id);
    for (const root of [activeOverlayFront, activeOverlayBack]) {
      if (!root) continue;
      const found = root.querySelector<HTMLElement>(`[data-overlay-id="${id}"]`);
      if (found) found.remove();
    }
  },
};

export class Portrait extends Component<HTMLElement> {
  private readonly body: HTMLElement;
  private readonly image: HTMLImageElement;
  private readonly placeholder: HTMLElement;
  private readonly title: HTMLElement;
  private readonly overlayFront: HTMLElement;
  private readonly overlayBack: HTMLElement;
  /** Last century rendered. null before first render so we don't fire
   * the upgrade impact on component mount. */
  private lastCentury: number | null = null;

  constructor() {
    const root = el('div', 'portrait');

    const label = el('div', 'portrait__label', '— the bloodline —');
    const body = el('div', 'portrait__body');
    body.setAttribute('role', 'button');
    body.setAttribute('aria-label', 'Feed the hunger');

    // Back overlay — sits BEHIND the image (ancestors silhouettes, cosmic
    // aura). Pointer-events none so it doesn't steal taps.
    const overlayBack = el('div', 'portrait__overlay portrait__overlay--back');
    overlayBack.setAttribute('aria-hidden', 'true');

    const image = el('img', 'portrait__image') as HTMLImageElement;
    image.alt = '';
    image.decoding = 'async';

    // Front overlay — sits OVER the image, UNDER the frame (halos, glitch).
    const overlayFront = el('div', 'portrait__overlay portrait__overlay--front');
    overlayFront.setAttribute('aria-hidden', 'true');

    const frame = el('img', 'portrait__frame') as HTMLImageElement;
    frame.alt = '';
    frame.src = FRAME_SRC;
    frame.decoding = 'async';

    // K1 — Century corruption layers. All three are always in the DOM,
    // default to opacity 0, react to [data-century="N"] on the body.
    //   backAura    : paints BEHIND everything (z:0)
    //   frameTint   : paints ON TOP of the frame (z:3) via PNG mask,
    //                 tint + tick flash
    //   frameReflect: paints ON TOP of the frame-tint (z:3, appended
    //                 after) via the same PNG mask, sweeps a highlight
    //                 gradient across the ornaments — the "reflective
    //                 flash" specced for C3+
    const backAura = el('div', 'portrait__back-aura');
    backAura.setAttribute('aria-hidden', 'true');
    const frameTint = el('div', 'portrait__frame-tint');
    frameTint.setAttribute('aria-hidden', 'true');
    const frameReflect = el('div', 'portrait__frame-reflect');
    frameReflect.setAttribute('aria-hidden', 'true');

    const placeholder = el('div', 'portrait__placeholder');
    const title = el('div', 'portrait__title');

    body.appendChild(backAura);
    body.appendChild(overlayBack);
    body.appendChild(image);
    body.appendChild(placeholder);
    body.appendChild(overlayFront);
    body.appendChild(frame);
    body.appendChild(frameTint);
    body.appendChild(frameReflect);
    body.appendChild(title);

    root.appendChild(label);
    root.appendChild(body);

    super(root);
    this.body = body;
    this.image = image;
    this.placeholder = placeholder;
    this.title = title;
    this.overlayFront = overlayFront;
    this.overlayBack = overlayBack;
  }

  protected override onMount(): void {
    this.render();
    this.body.addEventListener('pointerdown', this.handleTap);
    this.addTeardown(() => this.body.removeEventListener('pointerdown', this.handleTap));
    this.addTeardown(events.on('form-changed', () => this.render()));
    // Century bumps happen on every ascend, not just threshold-crossing ones.
    // Listen to 'ascended' so the title refreshes from "Century I" to II, etc.
    this.addTeardown(events.on('ascended', () => this.render()));

    // Register this instance as the overlay mount point, flush anything
    // that was queued while no Portrait existed, clear on teardown.
    activeOverlayFront = this.overlayFront;
    activeOverlayBack = this.overlayBack;
    flushPending();
    this.addTeardown(() => {
      if (activeOverlayFront === this.overlayFront) activeOverlayFront = null;
      if (activeOverlayBack === this.overlayBack) activeOverlayBack = null;
    });

    // Blood-tick VFX — event-driven pulse per integer blood increment.
    // Silent on Century I, active from Century II onward.
    this.addTeardown(installBloodTick(this.body));

    // Aspect-ratio is hardcoded in CSS to match the frame PNG's natural shape.
    // If the frame asset is regenerated at a different aspect, update both.
  }

  private handleTap = (event: PointerEvent): void => {
    if (document.body.classList.contains('is-ascending')) return;
    gameState.tap(event.clientX, event.clientY);
    // Micro feedback (scale handled in CSS via :active; juice stack comes J4).
  };

  private render(): void {
    const prestige = gameState.getPrestigeCount();
    const form = getCurrentFormDefinition(prestige);
    const centuryNum = getCenturyInForm(prestige);
    this.title.textContent = `${form.subtitle} · Century ${toRoman(centuryNum)}`;
    this.placeholder.textContent = form.subtitle;

    this.image.onload = () => {
      this.body.classList.add('portrait__body--has-image');
    };
    this.image.onerror = () => {
      this.body.classList.remove('portrait__body--has-image');
    };
    this.image.src = form.portraitPath;

    // data-century drives all corruption VFX via CSS. Century I = idle
    // (no animation); II+ each add their own layers. Transitions between
    // centuries fade in AFTER the upgrade flash (CSS transition-delay).
    this.body.setAttribute('data-century', String(centuryNum));

    // Fire the upgrade impact when the century actually changes. First
    // render (lastCentury === null) is skipped — we don't want a flash
    // on page load.
    if (this.lastCentury !== null && this.lastCentury !== centuryNum) {
      triggerCenturyUpgrade(this.body);
    }
    this.lastCentury = centuryNum;
  }
}
