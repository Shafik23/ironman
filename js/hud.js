// HUD Overlay Mode - Main Module
// Handles toggle logic, state management, and event integration

import { dom } from './dom.js';
import { state } from './state.js';
import { events } from './events.js';
import { addTelemetryEntry } from './telemetry.js';
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

  // Subscribe to power changes to sync HUD gauge
  events.on('power:changed', ({ value }) => {
    if (state.isHudMode) {
      updateHudPower(value);
    }
  });

  // Subscribe to component selection for status updates
  events.on('component:selected', ({ component }) => {
    if (state.isHudMode) {
      updateHudSystemStatus(component, true);
    }
  });

  events.on('component:deselected', ({ component }) => {
    if (state.isHudMode) {
      updateHudSystemStatus(component, false);
    }
  });

  // Auto-disable HUD on emergency shutdown
  events.on('shutdown:start', () => {
    if (state.isHudMode) {
      deactivateHudMode();
      addTelemetryEntry('HUD Mode auto-disabled for emergency protocols');
    }
  });

  // Sync power on HUD activation (get current slider value)
  events.on('hud:activated', () => {
    if (dom.powerSlider) {
      updateHudPower(dom.powerSlider.value);
    }
  });
}

function toggleHudMode() {
  if (state.isHudMode) {
    deactivateHudMode();
  } else {
    activateHudMode();
  }
}

function activateHudMode() {
  state.isHudMode = true;

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
  state.isHudMode = false;

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
