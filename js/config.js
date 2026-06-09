import { dom } from './dom.js';
import { addTelemetryEntry } from './telemetry.js';
import { announcePowerLevel } from './jarvis.js';
import { debounce } from './utils/timing.js';
import { state } from './state.js';
import { SUIT_ZOOM } from './constants.js';
import {
  calculateFrameColor,
  calculateReactorFromSuitColor,
  calculateReactorTooltip,
  calculateSuitViewBox
} from './simulation.js';
import {
  getSuitModel,
  setSuitColor as setSuitModelColor,
  setSuitPower,
  setSuitZoom as setSuitModelZoom,
  subscribeSuitModel
} from './suit-model.js';

const STATUS_BAR_COUNT = 4;

export function setupConfigurationSliders() {
  const debouncedAnnounce = debounce(value => announcePowerLevel(parseInt(value, 10)), 500);

  subscribeSuitModel(({ state: model, changes }) => {
    renderConfigurationFromModel(model, changes);
  });
  renderConfigurationFromModel(getSuitModel());

  dom.zoomSlider.min = SUIT_ZOOM.MIN;
  dom.zoomSlider.max = SUIT_ZOOM.MAX;

  dom.powerSlider.addEventListener('input', e => {
    const model = setSuitPower(e.target.value, { source: 'power-slider' });
    addTelemetryEntry(`Power output adjusted to ${model.power}%`);
    debouncedAnnounce(model.power);
  });

  dom.colorSlider.addEventListener('input', e => {
    const model = setSuitModelColor(e.target.value, { source: 'color-slider' });
    addTelemetryEntry(`Suit color adjusted to ${model.color}%`);
  });

  dom.zoomSlider.addEventListener('input', e => {
    const model = setSuitModelZoom(e.target.value, { source: 'zoom-slider' });
    addTelemetryEntry(`Suit schematic zoom adjusted to ${model.zoom}%`);
  });
}

function renderConfigurationFromModel(model = getSuitModel(), changes = []) {
  const changed = changes.length ? new Set(changes) : null;

  syncSlider(dom.powerSlider, dom.powerValue, model.power);
  syncSlider(dom.colorSlider, dom.colorValue, model.color);
  syncSlider(dom.zoomSlider, dom.zoomValue, model.zoom);

  if (!changed || changed.has('color')) {
    updateSuitColor(model.color);
  }

  if (!changed || changed.has('power') || changed.has('color')) {
    updateArcReactor(model.power, model.color);
  }

  if (!changed || changed.has('zoom')) {
    updateSuitZoom(model.zoom);
  }

  if (
    !changed ||
    changed.has('power') ||
    changed.has('cpuLoad') ||
    changed.has('memoryLoad') ||
    changed.has('integrity')
  ) {
    updateProgressBars(model);
  }
}

function syncSlider(slider, valueElement, value) {
  if (slider && parseInt(slider.value, 10) !== value) {
    slider.value = value;
  }

  if (valueElement) {
    valueElement.textContent = value + '%';
  }
}

export function updateProgressBars(model = getSuitModel()) {
  const progressBars = dom.progressBars;
  const statusTexts = dom.statusTexts;
  const values = [model.cpuLoad, model.memoryLoad, model.power, model.integrity];

  if (progressBars.length >= STATUS_BAR_COUNT && statusTexts.length >= STATUS_BAR_COUNT) {
    for (let i = 0; i < STATUS_BAR_COUNT; i++) {
      progressBars[i].style.width = values[i] + '%';
      statusTexts[i].textContent = Math.round(values[i]) + '%';
    }
  }
}

export function updateSuitZoom(zoomValue) {
  const { viewX, viewY, viewWidth, viewHeight } = calculateSuitViewBox(zoomValue);

  dom.suitSchematic.setAttribute('viewBox', `${viewX} ${viewY} ${viewWidth} ${viewHeight}`);
}

export function updateArcReactor(powerLevel = getSuitModel().power, colorValue = getSuitModel().color) {
  const reactor = dom.reactorCore;
  if (!reactor) return;

  const powerInt = parseInt(powerLevel, 10);
  const colorInt = parseInt(colorValue, 10);

  const { color: suitColor } = calculateFrameColor(colorInt);
  const { color, glowIntensity } = calculateReactorFromSuitColor(suitColor, powerInt);

  reactor.style.fill = color;
  reactor.style.filter = `drop-shadow(0 0 ${glowIntensity}px ${color})`;

  reactor.style.animation = 'none';
  reactor.style.setProperty('--reactor-color', color);
  reactor.style.setProperty('--reactor-glow', `${glowIntensity}px`);
  reactor.style.animation = 'reactor-pulse-dynamic 1.5s ease-in-out infinite alternate';

  state.reactorTooltip = calculateReactorTooltip(powerInt);
}

export function updateSuitColor(colorValue) {
  const colorInt = parseInt(colorValue, 10);
  const { color, glowColor } = calculateFrameColor(colorInt);

  document.documentElement.style.setProperty('--suit-cyan', color);
  document.documentElement.style.setProperty('--suit-glow', `0 0 8px ${glowColor}`);
}
