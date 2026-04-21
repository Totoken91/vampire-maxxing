// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Portrait, portraitOverlays } from '../src/ui/components/portrait';

let current: Portrait | null = null;

function mountPortrait(): Portrait {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const p = new Portrait();
  p.mountTo(host);
  current = p;
  return p;
}

describe('Portrait overlay stack (B0b)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (current) {
      current.destroy();
      current = null;
    }
  });

  it('attaches an overlay to the front layer', () => {
    mountPortrait();
    const node = document.createElement('div');
    node.textContent = 'halo';
    portraitOverlays.add('test-front', 'front', node);

    const front = document.querySelector('.portrait__overlay--front');
    expect(front?.querySelector('[data-overlay-id="test-front"]')).toBeTruthy();
  });

  it('attaches an overlay to the back layer', () => {
    mountPortrait();
    const node = document.createElement('div');
    portraitOverlays.add('ancestor-1', 'back', node);

    const back = document.querySelector('.portrait__overlay--back');
    expect(back?.querySelector('[data-overlay-id="ancestor-1"]')).toBeTruthy();
  });

  it('removes an overlay by id regardless of layer', () => {
    mountPortrait();
    portraitOverlays.add('x', 'front', document.createElement('div'));
    expect(document.querySelector('[data-overlay-id="x"]')).toBeTruthy();

    portraitOverlays.remove('x');
    expect(document.querySelector('[data-overlay-id="x"]')).toBeNull();
  });

  it('queues overlays added before mount and flushes on mount', () => {
    const queued = document.createElement('div');
    portraitOverlays.add('queued', 'front', queued);
    // Nothing in the DOM yet — no Portrait is mounted.
    expect(document.querySelector('[data-overlay-id="queued"]')).toBeNull();

    mountPortrait();
    // Now the queued overlay should be on the front layer.
    const front = document.querySelector('.portrait__overlay--front');
    expect(front?.querySelector('[data-overlay-id="queued"]')).toBeTruthy();
  });

  it('re-adding the same id replaces the previous overlay', () => {
    mountPortrait();
    const first = document.createElement('div');
    first.dataset.mark = 'first';
    portraitOverlays.add('repl', 'front', first);

    const second = document.createElement('div');
    second.dataset.mark = 'second';
    portraitOverlays.add('repl', 'front', second);

    const front = document.querySelector('.portrait__overlay--front');
    const matches = front?.querySelectorAll('[data-overlay-id="repl"]');
    expect(matches?.length).toBe(1);
    expect((matches?.[0] as HTMLElement).dataset.mark).toBe('second');
  });
});
