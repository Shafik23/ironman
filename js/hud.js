// HUD Overlay Mode - Main Module
// Handles toggle logic, state management, and event integration

import { dom } from './dom.js';
import { events } from './events.js';
import { addTelemetryEntry } from './telemetry.js';
import { getSuitModel, isSuitModeActive, setSuitMode, subscribeSuitModel } from './suit-model.js';
import { startCityscapeAnimation, stopCityscapeAnimation } from './effects/cityscape.js';
import {
  initializeHudElements,
  startHudSimulation,
  stopHudSimulation,
  updateHudPower,
  updateHudSystemStatus,
  resetHudSimulation
} from './effects/hud-elements.js';

export function setupHudMode() {
  // Initialize HUD elements
  initializeHudElements();

  // Setup toggle button listener
  if (dom.hudToggle) {
    dom.hudToggle.addEventListener('click', toggleHudMode);
  }

  // Setup back button listener
  if (dom.hudBackBtn) {
    dom.hudBackBtn.addEventListener('click', deactivateHudMode);
  }

  // Subscribe to canonical model changes to sync HUD gauges and subsystem states.
  subscribeSuitModel(({ state: model, changes }) => {
    if (isSuitModeActive('hud') && shouldRefreshHud(changes)) {
      updateHudFromModel(model);
    }
  });

  // Auto-disable HUD on emergency shutdown
  events.on('shutdown:start', () => {
    if (isSuitModeActive('hud')) {
      deactivateHudMode();
      addTelemetryEntry('HUD Mode auto-disabled for emergency protocols');
    }
  });

  // Sync HUD activation from the canonical suit model.
  events.on('hud:activated', () => {
    updateHudFromModel(getSuitModel());
  });
}

function toggleHudMode() {
  if (isSuitModeActive('hud')) {
    deactivateHudMode();
  } else {
    activateHudMode();
  }
}

function activateHudMode() {
  setSuitMode('hud', true, { source: 'hud' });

  // Show HUD overlay
  if (dom.hudOverlay) {
    dom.hudOverlay.classList.add('active');
  }

  // Hide main interface
  const container = document.querySelector('.container');
  if (container) {
    container.classList.add('hud-active');
  }

  // Update toggle button
  if (dom.hudToggle) {
    dom.hudToggle.textContent = 'HUD Mode: ON';
    dom.hudToggle.classList.add('active');
  }

  // Start animations
  startCityscapeAnimation();
  startHudSimulation();

  // Emit event for telemetry
  events.emit('hud:activated');
  addTelemetryEntry('HUD Overlay Mode activated - First-person view engaged');
}

function deactivateHudMode() {
  setSuitMode('hud', false, { source: 'hud' });

  // Hide HUD overlay
  if (dom.hudOverlay) {
    dom.hudOverlay.classList.remove('active');
  }

  // Show main interface
  const container = document.querySelector('.container');
  if (container) {
    container.classList.remove('hud-active');
  }

  // Update toggle button
  if (dom.hudToggle) {
    dom.hudToggle.textContent = 'HUD Mode: OFF';
    dom.hudToggle.classList.remove('active');
  }

  // Stop animations
  stopCityscapeAnimation();
  stopHudSimulation();

  // Reset simulation for next activation
  resetHudSimulation();

  // Emit event for telemetry
  events.emit('hud:deactivated');
  addTelemetryEntry('HUD Overlay Mode deactivated - Returning to schematic view');
}

// Export for keyboard shortcut
export function toggleHud() {
  if (dom.hudToggle) {
    dom.hudToggle.click();
  }
}

function shouldRefreshHud(changes) {
  return changes.some(change =>
    ['power', 'selectedModule', 'modules'].includes(change)
  );
}

function updateHudFromModel(model) {
  updateHudPower(model.power);

  ['helmet', 'chest', 'arms', 'legs'].forEach(component => {
    updateHudSystemStatus(component, Boolean(model.modules[component]?.online));
  });
}
