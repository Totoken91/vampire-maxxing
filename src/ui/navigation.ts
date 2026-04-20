// Central tab state. Tiny pub/sub, no framework, no router library.
// Any component can call `navigateTo('shop')` to switch tabs; views
// subscribe via `onTabChange`.

export type TabId = 'bloodline' | 'servants' | 'rites' | 'tome' | 'shop';

const listeners = new Set<(tab: TabId) => void>();
let current: TabId = 'bloodline';

export function getCurrentTab(): TabId {
  return current;
}

export function navigateTo(tab: TabId): void {
  if (tab === current) return;
  current = tab;
  for (const l of listeners) l(tab);
}

export function onTabChange(cb: (tab: TabId) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
