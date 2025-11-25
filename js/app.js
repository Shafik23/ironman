import { initializeDOMReferences } from './dom.js';
import { setupComponentSelection } from './components.js';
import { setupSchematicInteraction, hideTooltip } from './schematic.js';
import { setupConfigurationSliders, updateSuitZoom } from './config.js';
import { dom } from './dom.js';
import { setupCommandButtons, executeInitializeSystemsQuiet } from './commands.js';
import { setupMusicToggle } from './party.js';
import { startTelemetryUpdates, addTelemetryEntry } from './telemetry.js';
import { setupKeyboardShortcuts } from './keyboard.js';
import { initializeJarvis, toggleJarvis } from './jarvis.js';

function initializeApp() {
  initializeDOMReferences();

  // Start telemetry listeners first so we capture early events
  startTelemetryUpdates();

  setupComponentSelection();
  setupSchematicInteraction();
  setupConfigurationSliders();
  // Apply initial zoom from slider
  updateSuitZoom(dom.zoomSlider.value);
  setupCommandButtons();
  setupMusicToggle();
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

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();

  setTimeout(() => {
    addTelemetryEntry('Ironman Suit Designer GUI ready');
    addTelemetryEntry('All interface modules initialized');
    addTelemetryEntry('Ready for suit configuration');
  }, 1000);
});

window.addEventListener('resize', () => {
  hideTooltip();
});
