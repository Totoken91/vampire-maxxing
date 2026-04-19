// Horizontal divider with a centerpiece glyph.
// Kept inline at J2; SVG version arrives in J7 ornaments pass.

import { Component } from './base';
import { el } from '../../utils/dom';

export class Divider extends Component<HTMLElement> {
  constructor(centerpiece: string = '❦') {
    const root = el('div', 'divider');
    const span = el('span', 'divider__centerpiece', centerpiece);
    root.appendChild(span);
    super(root);
  }
}
