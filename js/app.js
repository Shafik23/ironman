import { initializeDOMReferences } from './dom.js';
import { setupComponentSelection } from './components.js';
import { setupSchematicInteraction, hideTooltip } from './schematic.js';
import { setupConfigurationSliders } from './config.js';
import { setupCommandButtons, executeInitializeSystemsQuiet } from './commands.js';
import { setupMusicToggle } from './party.js';
import { startTelemetryUpdates, addTelemetryEntry } from './telemetry.js';
import { setupKeyboardShortcuts } from './keyboard.js';

function initializeApp() {
  initializeDOMReferences();
  
  setupComponentSelection();
  setupSchematicInteraction();
  setupConfigurationSliders();
  setupCommandButtons();
  setupMusicToggle();
  startTelemetryUpdates();
  setupKeyboardShortcuts();

  executeInitializeSystemsQuiet();

  console.log('Ironman Suit Designer GUI initialized');
}

document.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener('resize', () => {
  hideTooltip();
});

setTimeout(() => {
  addTelemetryEntry('Ironman Suit Designer GUI ready');
  addTelemetryEntry('All interface modules initialized');
  addTelemetryEntry('Ready for suit configuration');
}, 1000);