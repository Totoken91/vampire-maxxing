// Tiny component base. No framework, just structured mount / update / destroy.

export abstract class Component<Root extends HTMLElement = HTMLElement> {
  protected readonly root: Root;
  private readonly teardowns: Array<() => void> = [];

  constructor(root: Root) {
    this.root = root;
  }

  el(): Root {
    return this.root;
  }

  mountTo(parent: HTMLElement): void {
    parent.appendChild(this.root);
    this.onMount();
  }

  destroy(): void {
    for (const cleanup of this.teardowns) cleanup();
    this.teardowns.length = 0;
    this.root.remove();
  }

  /** Override to wire listeners. Use `addTeardown` for cleanup. */
  protected onMount(): void {
    // no-op by default
  }

  protected addTeardown(cleanup: () => void): void {
    this.teardowns.push(cleanup);
  }
}
