import { dom, getCommandButton } from './dom.js';
import { COMMANDS } from './constants.js';
import { getSuitModel, isSuitModeActive, setSuitPower } from './suit-model.js';
import { setSuitPowerTarget } from './systems.js';
import { addTelemetryEntry } from './telemetry.js';

const POWER_STEP = 15;

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

function adjustPower(delta) {
  const next = Math.max(0, Math.min(100, getSuitModel().power + delta));
  setSuitPowerTarget(next);
  setSuitPower(next, { source: 'keyboard', deriveStatus: false });
  addTelemetryEntry(`Power output adjusted to ${next}%`);
}

export function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if (shouldIgnoreShortcut(e)) {
      return;
    }

    if (isSuitModeActive('hud') && !['Escape', 'h', 'H', 'q', 'Q', 'e', 'E'].includes(e.key)) {
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
      case 'e':
      case 'E':
        e.preventDefault();
        adjustPower(POWER_STEP);
        break;
      case 'q':
      case 'Q':
        e.preventDefault();
        adjustPower(-POWER_STEP);
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
