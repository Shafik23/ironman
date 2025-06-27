import { dom } from './dom.js';
import { state } from './state.js';
import { addTelemetryEntry } from './telemetry.js';
import { updateSuitColor, updateProgressBars } from './config.js';
import { jarvisAnnounce, jarvisPhrases } from './jarvis.js';

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
      state.isMusicPlaying = true;
      state.isPartyMode = true;

      dom.suitSchematic.classList.add('dancing');
      dom.suitSchematic.classList.add('party-mode');

      startColorCycling();
      startStatusFluctuations();

      addTelemetryEntry('🎉 PARTY MODE ACTIVATED - MAXIMUM OVERDRIVE! 🎉');
      jarvisAnnounce(jarvisPhrases.partyMode.on, true);
    })
    .catch(error => {
      console.log('Audio autoplay prevented:', error);
      addTelemetryEntry('Audio source unavailable - check connection');
      state.isMusicPlaying = false;
      state.isPartyMode = false;
    });
}

export function stopPartyMode() {
  dom.backgroundMusic.pause();
  dom.musicToggle.textContent = 'Party Mode: OFF';
  dom.musicToggle.classList.remove('active');
  state.isMusicPlaying = false;
  state.isPartyMode = false;

  dom.suitSchematic.classList.remove('dancing');
  dom.suitSchematic.classList.remove('party-mode');

  stopColorCycling();
  stopStatusFluctuations();

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
  const progressBars = dom.progressBars;
  const statusTexts = dom.statusTexts;

  const originalValues = [];
  for (let i = 0; i < 4; i++) {
    originalValues.push({
      width: progressBars[i].style.width,
      text: statusTexts[i].textContent
    });
  }

  state.partyStatusInterval = setInterval(() => {
    if (!state.isDiagnosticsRunning) {
      for (let i = 0; i < 4; i++) {
        const baseValue = parseInt(originalValues[i].text);
        const variation = (Math.random() - 0.5) * 30;
        const newValue = Math.max(10, Math.min(100, baseValue + variation));

        progressBars[i].style.width = newValue + '%';
        statusTexts[i].textContent = Math.round(newValue) + '%';
      }
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