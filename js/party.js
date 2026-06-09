import { dom } from './dom.js';
import { state } from './state.js';
import { addTelemetryEntry } from './telemetry.js';
import { updateSuitColor, updateProgressBars } from './config.js';
import { jarvisAnnounce, jarvisPhrases } from './jarvis.js';
import { events } from './events.js';

window.addEventListener('beforeunload', () => {
  if (state.partyColorCycleInterval) {
    clearInterval(state.partyColorCycleInterval);
  }
  if (state.partyStatusInterval) {
    clearInterval(state.partyStatusInterval);
  }
});

export function setupMusicToggle() {
  dom.musicToggle.addEventListener('click', () => {
    if (state.isPartyMode) {
      stopPartyMode();
    } else {
      startPartyMode();
    }
  });

  dom.backgroundMusic.addEventListener('ended', () => {
    if (state.isPartyMode) {
      stopPartyMode();
    }
  });

  dom.backgroundMusic.addEventListener('error', e => {
    console.log('Audio error:', e);
    addTelemetryEntry('Audio playback error - check audio source');
  });
}

function startPartyMode() {
  dom.backgroundMusic
    .play()
    .then(() => {
      dom.musicToggle.textContent = 'Party Mode: ON';
      dom.musicToggle.classList.add('active');
      state.isPartyMode = true;

      dom.suitSchematic.classList.add('dancing');
      dom.suitSchematic.classList.add('party-mode');

      startColorCycling();
      startStatusFluctuations();

      events.emit('party:started');
      addTelemetryEntry('🎉 PARTY MODE ACTIVATED - MAXIMUM OVERDRIVE! 🎉');
      jarvisAnnounce(jarvisPhrases.partyMode.on, true);
    })
    .catch(error => {
      console.log('Audio autoplay prevented:', error);
      addTelemetryEntry('Audio source unavailable - check connection');
      state.isPartyMode = false;
    });
}

export function stopPartyMode(reason) {
  dom.backgroundMusic.pause();
  dom.musicToggle.textContent = 'Party Mode: OFF';
  dom.musicToggle.classList.remove('active');
  state.isPartyMode = false;

  dom.suitSchematic.classList.remove('dancing');
  dom.suitSchematic.classList.remove('party-mode');

  stopColorCycling();
  stopStatusFluctuations();

  events.emit('party:stopped', { reason });
  addTelemetryEntry('Party mode disabled - Systems returning to normal');
  jarvisAnnounce(jarvisPhrases.partyMode.off);
}

function startColorCycling() {
  let colorPosition = 0;
  state.partyColorCycleInterval = setInterval(() => {
    colorPosition = (colorPosition + 0.5) % 100;
    updateSuitColor(colorPosition);

    dom.colorSlider.value = Math.round(colorPosition);
    dom.colorValue.textContent = Math.round(colorPosition) + '%';
  }, 50);
}

function stopColorCycling() {
  if (state.partyColorCycleInterval) {
    clearInterval(state.partyColorCycleInterval);
    state.partyColorCycleInterval = null;
  }
}

function startStatusFluctuations() {
  state.partyStatusInterval = setInterval(() => {
    if (!state.isDiagnosticsRunning) {
      updateProgressBars({ jitter: true });
    }
  }, 200);
}

function stopStatusFluctuations() {
  if (state.partyStatusInterval) {
    clearInterval(state.partyStatusInterval);
    state.partyStatusInterval = null;
    updateProgressBars();
  }
}
