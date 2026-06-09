import { dom, initializeDOMReferences } from './dom.js';
import { setupComponentSelection } from './components.js';
import { setupSchematicInteraction, hideTooltip } from './schematic.js';
import { setupConfigurationSliders, updateArcReactor, updateProgressBars, updateSuitZoom } from './config.js';
import { setupCommandButtons, executeInitializeSystemsQuiet } from './commands.js';
import { setupMusicToggle } from './party.js';
import { startTelemetryUpdates, addTelemetryEntry } from './telemetry.js';
import { setupKeyboardShortcuts } from './keyboard.js';
import { initializeJarvis, toggleJarvis } from './jarvis.js';
import { setupHudMode } from './hud.js';
import { startSuitSystems } from './systems.js';

function initializeApp() {
  initializeDOMReferences();

  startTelemetryUpdates();

  setupComponentSelection();
  setupSchematicInteraction();
  setupConfigurationSliders();
  updateSuitZoom(dom.zoomSlider.value);
  setupCommandButtons();
  setupMusicToggle();
  setupKeyboardShortcuts();

  if (dom.jarvisToggle) {
    initializeJarvis();
    setupJarvisToggle();
  }

  // Initialize HUD Mode
  setupHudMode();

  executeInitializeSystemsQuiet();
  startSuitSystems(stats => {
    updateProgressBars();
    updateArcReactor(stats.effectivePower);
  });
}

function setupJarvisToggle() {
  if (dom.jarvisToggle) {
    dom.jarvisToggle.addEventListener('click', toggleJarvis);
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
