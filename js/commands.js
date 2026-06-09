import { dom } from './dom.js';
import { state } from './state.js';
import { updateProgressBars, updateArcReactor, updateSuitColor, updateSuitZoom } from './config.js';
import { stopPartyMode } from './party.js';
import { events } from './events.js';
import { triggerEmergencyShutdownEffect } from './effects/shutdown.js';
import { addTelemetryEntry } from './telemetry.js';
import { applyDiagnosticResults, clearDiagnosticFindings, runDiagnosticSweep, summarizeDiagnosticResults } from './diagnostics.js';

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
  if (state.isPartyMode) {
    stopPartyMode();
  }

  const clearedDiagnosticFindings = clearDiagnosticFindings({ resetStatuses: true });

  dom.backgroundMusic.currentTime = 0;

  dom.colorSlider.value = 0;
  dom.colorValue.textContent = '0%';
  updateSuitColor(0);

  dom.zoomSlider.value = 100;
  dom.zoomValue.textContent = '100%';
  updateSuitZoom(100);

  dom.powerSlider.value = 50;
  dom.powerValue.textContent = '50%';
  updateArcReactor(50);

  const progressBars = dom.progressBars;
  const statusTexts = dom.statusTexts;

  if (progressBars.length >= 4 && statusTexts.length >= 4) {
    progressBars[0].style.width = '20%';
    statusTexts[0].textContent = '20%';

    progressBars[1].style.width = '20%';
    statusTexts[1].textContent = '20%';

    progressBars[2].style.width = '50%';
    statusTexts[2].textContent = '50%';

    progressBars[3].style.width = '100%';
    statusTexts[3].textContent = '100%';
  }

  dom.componentItems.forEach(comp => comp.classList.remove('selected'));
  dom.schematicParts.forEach(part => part.classList.remove('highlighted'));

  if (clearedDiagnosticFindings) {
    events.emit('diagnostics:reset', { reason: 'initialization recalibration' });
  }
}

function executeRunDiagnostics() {
  if (state.isDiagnosticsRunning) {
    addTelemetryEntry('Diagnostics already running - scan request ignored');
    return;
  }

  state.isDiagnosticsRunning = true;

  events.emit('diagnostics:start');

  const progressBars = dom.progressBars;
  const statusTexts = dom.statusTexts;

  const originalCpuWidth = progressBars[0].style.width;
  const originalMemoryWidth = progressBars[1].style.width;
  const originalCpuText = statusTexts[0].textContent;
  const originalMemoryText = statusTexts[1].textContent;

  const originalStatuses = [];
  dom.componentItems.forEach(item => {
    const statusElement = item.querySelector('.component-status');
    originalStatuses.push({
      element: statusElement,
      text: statusElement.textContent,
      className: statusElement.className
    });
    statusElement.textContent = 'DIAG';
    statusElement.className = 'component-status diag';
  });

  progressBars[0].style.width = '100%';
  progressBars[1].style.width = '100%';
  statusTexts[0].textContent = '100%';
  statusTexts[1].textContent = '100%';

  dom.suitSchematic.classList.add('diagnostic-scan');

  events.emit('diagnostics:boost');

  setTimeout(() => {
    state.isDiagnosticsRunning = false;

    progressBars[0].style.width = originalCpuWidth;
    progressBars[1].style.width = originalMemoryWidth;
    statusTexts[0].textContent = originalCpuText;
    statusTexts[1].textContent = originalMemoryText;

    originalStatuses.forEach(status => {
      status.element.textContent = status.text;
      status.element.className = status.className;
    });

    dom.suitSchematic.classList.remove('diagnostic-scan');

    const results = runDiagnosticSweep();
    const summary = summarizeDiagnosticResults(results);

    applyDiagnosticResults(results);
    results.forEach(result => events.emit('diagnostics:module', result));
    events.emit('diagnostics:complete', { results, summary });
  }, 15000);
}

function executeEmergencyShutdown() {
  events.emit('shutdown:start');

  if (state.isPartyMode) {
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
    dom.powerSlider.value = 0;
    dom.powerValue.textContent = '0%';
    updateProgressBars();
    updateArcReactor(0);

    events.emit('shutdown:complete');
  }, 2000);
}
