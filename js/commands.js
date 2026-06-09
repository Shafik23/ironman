import { dom } from './dom.js';
import { stopPartyMode } from './party.js';
import { events } from './events.js';
import { EventTypes } from './event-types.js';
import { triggerEmergencyShutdownEffect } from './effects/shutdown.js';
import { addTelemetryEntry } from './telemetry.js';
import { COMMANDS, SUIT_ZOOM } from './constants.js';
import { coolSuitSystems, resetSuitSystems as resetThermalSystems, setSuitPowerTarget } from './systems.js';
import {
  getSuitModel,
  isSuitModeActive,
  resetSuitSystems,
  setSuitMode,
  setSuitPower,
  setSuitStatusLoads
} from './suit-model.js';

let hoseAudio = null;
function getHoseAudio() {
  if (!hoseAudio) {
    hoseAudio = new Audio('hose.mp3');
  }
  return hoseAudio;
}

export function setupCommandButtons() {
  dom.commandButtons.forEach(button => {
    button.addEventListener('click', e => {
      const command = e.currentTarget.dataset.command;

      e.currentTarget.style.transform = 'scale(0.95)';
      setTimeout(() => {
        e.currentTarget.style.transform = '';
      }, 150);

      executeCommand(command);
    });
  });
}

export function executeCommand(command) {
  switch (command) {
    case COMMANDS.INITIALIZE:
      executeInitializeSystems();
      break;
    case COMMANDS.DIAGNOSTICS:
      executeRunDiagnostics();
      break;
    case COMMANDS.SHUTDOWN:
      executeEmergencyShutdown();
      break;
    default:
      console.warn(`Unknown suit command: ${command}`);
  }
}

export function executeInitializeSystems() {
  events.emit(EventTypes.INITIALIZE_START);

  performSystemInitialization();

  setTimeout(() => {
    events.emit(EventTypes.INITIALIZE_POWER, { value: 50 });
    events.emit(EventTypes.INITIALIZE_CPU, { value: 20 });
    events.emit(EventTypes.INITIALIZE_MEMORY, { value: 20 });
    events.emit(EventTypes.INITIALIZE_INTEGRITY, { value: 100 });
    events.emit(EventTypes.INITIALIZE_COLOR);
    events.emit(EventTypes.INITIALIZE_ZOOM, { value: SUIT_ZOOM.DEFAULT });
    events.emit(EventTypes.INITIALIZE_MODULES);
    events.emit(EventTypes.INITIALIZE_COMPLETE);
  }, 2000);
}

export function executeInitializeSystemsQuiet() {
  performSystemInitialization();
}

function performSystemInitialization() {
  if (isSuitModeActive('party')) {
    stopPartyMode();
  }

  dom.backgroundMusic.currentTime = 0;
  resetSuitSystems({ source: 'initialize' });
  resetThermalSystems({ power: 50, heat: 34, cpuLoad: 20, memoryUsage: 20, integrity: 100 });
}

function executeRunDiagnostics() {
  if (isSuitModeActive('diagnostics')) {
    addTelemetryEntry('Diagnostics already running - scan request ignored');
    return;
  }

  const originalModel = getSuitModel();
  setSuitMode('diagnostics', true, { source: 'diagnostics' });
  events.emit(EventTypes.DIAGNOSTICS_START);

  dom.componentItems.forEach(item => {
    const statusElement = item.querySelector('.component-status');
    statusElement.textContent = 'DIAG';
    statusElement.className = 'component-status diag';
  });

  setSuitStatusLoads(
    {
      cpuLoad: 100,
      memoryLoad: 100
    },
    { source: 'diagnostics' }
  );

  dom.suitSchematic.classList.add('diagnostic-scan');

  events.emit(EventTypes.DIAGNOSTICS_BOOST);

  setTimeout(() => {
    setSuitStatusLoads(
      {
        cpuLoad: originalModel.cpuLoad,
        memoryLoad: originalModel.memoryLoad,
        integrity: originalModel.integrity
      },
      { source: 'diagnostics' }
    );
    setSuitMode('diagnostics', false, { source: 'diagnostics' });

    dom.suitSchematic.classList.remove('diagnostic-scan');

    events.emit(EventTypes.DIAGNOSTICS_COMPLETE);
  }, 15000);
}

function executeEmergencyShutdown() {
  setSuitMode('emergency', true, { source: 'shutdown' });
  events.emit(EventTypes.SHUTDOWN_START);

  if (isSuitModeActive('party')) {
    stopPartyMode('shutdown');
  }

  try {
    const audio = getHoseAudio();
    audio.currentTime = 0;
    audio.play().catch(err => {
      console.warn('Emergency audio playback failed:', err);
      addTelemetryEntry('Warning: Emergency audio unavailable');
    });
  } catch (e) {
    console.warn('Emergency audio initialization failed:', e);
    addTelemetryEntry('Warning: Emergency audio unavailable');
  }

  triggerEmergencyShutdownEffect(dom);
  coolSuitSystems(24);

  setTimeout(() => {
    setSuitPowerTarget(0);
    setSuitPower(0, { source: 'shutdown', deriveStatus: false });

    events.emit(EventTypes.SHUTDOWN_COMPLETE);
  }, 2000);
}
