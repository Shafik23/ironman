import { initializeDOMReferences } from './dom.js';
import { setupComponentSelection } from './components.js';
import { setupSchematicInteraction, hideTooltip } from './schematic.js';
import { setupConfigurationSliders } from './config.js';
import { setupCommandButtons, executeInitializeSystemsQuiet } from './commands.js';
import { setupMusicToggle } from './party.js';
import { startTelemetryUpdates, addTelemetryEntry } from './telemetry.js';
import { setupKeyboardShortcuts } from './keyboard.js';
import { initializeJarvis, toggleJarvis } from './jarvis.js';

function initializeApp() {
  initializeDOMReferences();
  
  setupComponentSelection();
  setupSchematicInteraction();
  setupConfigurationSliders();
  setupCommandButtons();
  setupMusicToggle();
  startTelemetryUpdates();
  setupKeyboardShortcuts();
  
  // Initialize J.A.R.V.I.S.
  initializeJarvis();
  setupJarvisToggle();

  executeInitializeSystemsQuiet();

  console.log('Ironman Suit Designer GUI initialized');
}

function setupJarvisToggle() {
  const jarvisToggle = document.getElementById('jarvisToggle');
  if (jarvisToggle) {
    jarvisToggle.addEventListener('click', toggleJarvis);
  }
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