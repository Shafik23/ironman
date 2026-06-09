import { dom } from './dom.js';
import { state } from './state.js';
import { addTelemetryEntry } from './telemetry.js';
import { updateProgressBars } from './config.js';
import { jarvisAnnounce, jarvisPhrases } from './jarvis.js';
import { events } from './events.js';
import { EventTypes } from './event-types.js';
import { isSuitModeActive, setSuitColor as setSuitModelColor, setSuitMode } from './suit-model.js';

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
    if (isSuitModeActive('party')) {
      stopPartyMode();
    } else {
      startPartyMode();
    }
  });

  dom.backgroundMusic.addEventListener('ended', () => {
    if (isSuitModeActive('party')) {
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
      setSuitMode('party', true, { source: 'party' });

      dom.suitSchematic.classList.add('dancing');
      dom.suitSchematic.classList.add('party-mode');

      startColorCycling();
      startStatusFluctuations();

      events.emit(EventTypes.PARTY_STARTED);
      addTelemetryEntry('🎉 PARTY MODE ACTIVATED - MAXIMUM OVERDRIVE! 🎉');
      jarvisAnnounce(jarvisPhrases.partyMode.on, true);
    })
    .catch(error => {
      console.log('Audio autoplay prevented:', error);
      addTelemetryEntry('Audio source unavailable - check connection');
      setSuitMode('party', false, { source: 'party' });
    });
}

export function stopPartyMode(reason) {
  dom.backgroundMusic.pause();
  dom.musicToggle.textContent = 'Party Mode: OFF';
  dom.musicToggle.classList.remove('active');
  setSuitMode('party', false, { source: 'party' });

  dom.suitSchematic.classList.remove('dancing');
  dom.suitSchematic.classList.remove('party-mode');

  stopColorCycling();
  stopStatusFluctuations();

  events.emit(EventTypes.PARTY_STOPPED, { reason });
  addTelemetryEntry('Party mode disabled - Systems returning to normal');
  jarvisAnnounce(jarvisPhrases.partyMode.off);
}

function startColorCycling() {
  let colorPosition = 0;
  state.partyColorCycleInterval = setInterval(() => {
    colorPosition = (colorPosition + 0.5) % 100;
    setSuitModelColor(Math.round(colorPosition), { source: 'party' });
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
    if (!isSuitModeActive('diagnostics')) {
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
