import { dom } from './dom.js';
import { stopPartyMode } from './party.js';
import { events } from './events.js';
import { triggerEmergencyShutdownEffect } from './effects/shutdown.js';
import { addTelemetryEntry } from './telemetry.js';
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
      const buttonText = e.target.textContent;

      e.target.style.transform = 'scale(0.95)';
      setTimeout(() => {
        e.target.style.transform = '';
      }, 150);

      switch (buttonText) {
        case 'INITIALIZE SYSTEMS':
          executeInitializeSystems();
          break;
        case 'RUN DIAGNOSTICS':
          executeRunDiagnostics();
          break;
        case 'EMERGENCY SHUTDOWN':
          executeEmergencyShutdown();
          break;
      }
    });
  });
}

export function executeInitializeSystems() {
  events.emit('system:initialize:start');

  performSystemInitialization();

  setTimeout(() => {
    events.emit('system:initialize:power', { value: 50 });
    events.emit('system:initialize:cpu', { value: 20 });
    events.emit('system:initialize:memory', { value: 20 });
    events.emit('system:initialize:integrity', { value: 100 });
    events.emit('system:initialize:color');
    events.emit('system:initialize:zoom', { value: 100 });
    events.emit('system:initialize:modules');
    events.emit('system:initialize:complete');
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
}

function executeRunDiagnostics() {
  if (isSuitModeActive('diagnostics')) {
    addTelemetryEntry('Diagnostics already running - scan request ignored');
    return;
  }

  const originalModel = getSuitModel();
  setSuitMode('diagnostics', true, { source: 'diagnostics' });
  events.emit('diagnostics:start');

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

  events.emit('diagnostics:boost');

  setTimeout(() => {
    setSuitStatusLoads(
      {
        cpuLoad: originalModel.cpuLoad,
        memoryLoad: originalModel.memoryLoad,
        power: originalModel.power,
        integrity: originalModel.integrity
      },
      { source: 'diagnostics' }
    );
    setSuitMode('diagnostics', false, { source: 'diagnostics' });

    dom.suitSchematic.classList.remove('diagnostic-scan');

    events.emit('diagnostics:complete');
  }, 15000);
}

function executeEmergencyShutdown() {
  setSuitMode('emergency', true, { source: 'shutdown' });
  events.emit('shutdown:start');

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

  setTimeout(() => {
    setSuitPower(0, { source: 'shutdown' });

    events.emit('shutdown:complete');
  }, 2000);
}
