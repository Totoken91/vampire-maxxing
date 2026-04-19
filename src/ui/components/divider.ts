// Horizontal divider — uses the pre-rendered divider.png (gold ornament).
// Centerpiece glyph fallback via CSS if the image fails to load.

import { Component } from './base';
import { el } from '../../utils/dom';

export class Divider extends Component<HTMLElement> {
  constructor() {
    const root = el('div', 'divider');
    root.setAttribute('role', 'separator');
    super(root);
  }
}
