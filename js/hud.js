// HUD Mode - first-person flight over the city (three.js)
// Handles toggle logic, lazy engine loading and suit-model integration.

import { dom } from './dom.js';
import { events } from './events.js';
import { EventTypes } from './event-types.js';
import { addTelemetryEntry } from './telemetry.js';
import {
  getSuitModel,
  isSuitModeActive,
  setSuitComponentSelection,
  setSuitMode,
  subscribeSuitModel
} from './suit-model.js';
import { getSuitSystemStats } from './systems.js';
import {
  initializeHudOverlay,
  updateHudOverlay,
  updateHudPower,
  updateHudSystemStatus,
  setRepulsorStatus
} from './flight/hud-overlay.js';

let engine = null;
let enginePromise = null;

export function setupHudMode() {
  initializeHudOverlay();

  if (dom.hudToggle) {
    dom.hudToggle.addEventListener('click', toggleHudMode);
  }

  if (dom.hudBackBtn) {
    dom.hudBackBtn.addEventListener('click', deactivateHudMode);
  }

  // Sync HUD gauges and the flight engine with the canonical suit model.
  subscribeSuitModel(({ state: model, changes }) => {
    if (isSuitModeActive('hud') && shouldRefreshHud(changes)) {
      updateHudFromModel(model);
    }
  });

  events.on(EventTypes.SYSTEMS_TICK, ({ stats }) => {
    if (isSuitModeActive('hud')) {
      updateHudPower(stats.effectivePower);
      engine?.setEnvironment({ power: stats.effectivePower });
    }
  });

  // Auto-disable HUD on emergency shutdown
  events.on(EventTypes.SHUTDOWN_START, () => {
    if (isSuitModeActive('hud')) {
      deactivateHudMode();
      addTelemetryEntry('HUD Mode auto-disabled for emergency protocols');
    }
  });

  events.on(EventTypes.HUD_ACTIVATED, () => {
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

export function activateHudMode() {
  setSuitMode('hud', true, { source: 'hud' });

  if (dom.hudOverlay) {
    dom.hudOverlay.classList.add('active');
  }

  const container = document.querySelector('.container');
  if (container) {
    container.classList.add('hud-active');
  }

  if (dom.hudToggle) {
    dom.hudToggle.textContent = 'HUD Mode: ON';
    dom.hudToggle.classList.add('active');
  }

  // Drop button focus so Space fires repulsors instead of re-clicking the toggle
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  armFlightSystems();

  ensureEngine().then(loadedEngine => {
    if (loadedEngine && isSuitModeActive('hud')) {
      loadedEngine.start();
    }
  });

  events.emit(EventTypes.HUD_ACTIVATED);
  addTelemetryEntry('HUD Mode engaged - First-person flight systems online');
}

export function deactivateHudMode() {
  setSuitMode('hud', false, { source: 'hud' });

  if (dom.hudOverlay) {
    dom.hudOverlay.classList.remove('active');
  }

  const container = document.querySelector('.container');
  if (container) {
    container.classList.remove('hud-active');
  }

  if (dom.hudToggle) {
    dom.hudToggle.textContent = 'HUD Mode: OFF';
    dom.hudToggle.classList.remove('active');
  }

  engine?.stop();

  events.emit(EventTypes.HUD_DEACTIVATED);
  addTelemetryEntry('HUD Mode disengaged - Returning to schematic view');
}

/** J.A.R.V.I.S. arms the helmet, combat and flight systems automatically on takeoff. */
function armFlightSystems() {
  const model = getSuitModel();
  const armed = [];

  ['helmet', 'repulsors', 'thrusters'].forEach(component => {
    if (!model.modules[component]?.online) {
      setSuitComponentSelection(component, true, { source: 'hud' });
      armed.push(component);
    }
  });

  if (armed.length > 0) {
    addTelemetryEntry(`Flight ops auto-armed: ${armed.join(', ')}`);
  }
}

/**
 * Lazily import three.js and build the engine the first time HUD mode is used,
 * so the schematic view never pays the 3D startup cost.
 */
function ensureEngine() {
  if (enginePromise) return enginePromise;

  enginePromise = import('./flight/engine.js')
    .then(module => {
      engine = module.createFlightEngine({
        canvas: dom.hudCanvas,
        onFrame: updateHudOverlay
      });
      updateHudFromModel(getSuitModel());
      return engine;
    })
    .catch(error => {
      console.error('Flight engine failed to start:', error);
      dom.hudRenderFallback?.classList.remove('hidden');
      addTelemetryEntry('Visor render offline - WebGL unavailable');
      return null;
    });

  return enginePromise;
}

function shouldRefreshHud(changes) {
  return changes.some(change =>
    ['power', 'selectedModule', 'activeModules', 'modules'].includes(change)
  );
}

function updateHudFromModel(model) {
  updateHudPower(getSuitSystemStats().effectivePower);

  ['helmet', 'chest', 'arms', 'legs'].forEach(component => {
    updateHudSystemStatus(component, Boolean(model.modules[component]?.online));
  });

  const repulsorsOnline = Boolean(model.modules.repulsors?.online);
  setRepulsorStatus(repulsorsOnline);

  engine?.setEnvironment({
    power: getSuitSystemStats().effectivePower,
    repulsorsOnline,
    thrustersOnline: Boolean(model.modules.thrusters?.online),
    helmetOnline: Boolean(model.modules.helmet?.online)
  });
}
