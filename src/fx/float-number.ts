// Floating "+N" text that rises from the tap point and fades.
// Cheap DOM node with a CSS animation; auto-cleaned after 1.1s.

const LIFETIME_MS = 1100;

export function spawnFloatNumber(
  x: number,
  y: number,
  text: string,
  crit: boolean,
): void {
  const node = document.createElement('div');
  node.className = crit ? 'float-num float-num--crit' : 'float-num';
  node.textContent = text;
  node.style.left = `${x + (Math.random() - 0.5) * 30}px`;
  node.style.top = `${y - 10}px`;
  document.body.appendChild(node);
  window.setTimeout(() => node.remove(), LIFETIME_MS);
}
