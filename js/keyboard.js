import { dom, getCommandButton } from './dom.js';
import { COMMANDS } from './constants.js';
import { isSuitModeActive } from './suit-model.js';

function shouldIgnoreShortcut(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return true;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest('input, textarea, select, button, [contenteditable="true"], [role="textbox"]'));
}

export function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if (shouldIgnoreShortcut(e)) {
      return;
    }

    if (isSuitModeActive('hud') && !['Escape', 'h', 'H'].includes(e.key)) {
      return;
    }

    switch (e.key) {
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (dom.componentItems[index]) {
          dom.componentItems[index].click();
        }
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        dom.musicToggle.click();
        break;
      case 'j':
      case 'J':
        e.preventDefault();
        dom.jarvisToggle?.click();
        break;
      case 'h':
      case 'H':
        e.preventDefault();
        dom.hudToggle?.click();
        break;
      case 'i':
      case 'I':
        e.preventDefault();
        getCommandButton(COMMANDS.INITIALIZE)?.click();
        break;
      case 'd':
      case 'D':
        e.preventDefault();
        getCommandButton(COMMANDS.DIAGNOSTICS)?.click();
        break;
      case 'Escape':
        e.preventDefault();
        getCommandButton(COMMANDS.SHUTDOWN)?.click();
        break;
    }
  });
}
