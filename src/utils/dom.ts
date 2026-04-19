// Thin DOM helpers. Keep this file small — no framework.

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function q<T extends HTMLElement>(parent: ParentNode, selector: string): T {
  const node = parent.querySelector<T>(selector);
  if (!node) throw new Error(`dom.q: "${selector}" not found`);
  return node;
}
