import { dom } from './dom.js';
import { state } from './state.js';

export function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if (state.isHudMode && e.key !== 'Escape' && e.key !== 'h' && e.key !== 'H') {
      return;
    }

    switch (e.key) {
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
        const index = parseInt(e.key) - 1;
        if (dom.componentItems[index]) {
          dom.componentItems[index].click();
        }
        break;
      case 'm':
      case 'M':
        dom.musicToggle.click();
        break;
      case 'j':
      case 'J':
        dom.jarvisToggle?.click();
        break;
      case 'h':
      case 'H':
        dom.hudToggle?.click();
        break;
      case 'i':
      case 'I':
        dom.commandButtons[0].click(); // Initialize
        break;
      case 'd':
      case 'D':
        dom.commandButtons[1].click(); // Diagnostics
        break;
      case 'Escape':
        dom.commandButtons[2].click(); // Emergency shutdown
        break;
    }
  });
}
