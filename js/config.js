import { dom } from './dom.js';
import { addTelemetryEntry } from './telemetry.js';
import { announcePowerLevel } from './jarvis.js';
import { debounce } from './utils/timing.js';
import { state } from './state.js';
import {
  getSuitModel,
  setSuitColor as setSuitModelColor,
  setSuitPower,
  setSuitZoom as setSuitModelZoom,
  subscribeSuitModel
} from './suit-model.js';

const COLOR_STOPS = [
  { max: 14, from: [0, 255, 255], to: [0, 80, 255] },
  { max: 28, from: [0, 80, 255], to: [128, 0, 255] },
  { max: 42, from: [128, 0, 255], to: [255, 0, 255] },
  { max: 57, from: [255, 0, 255], to: [255, 0, 0] },
  { max: 71, from: [255, 0, 0], to: [255, 165, 0] },
  { max: 85, from: [255, 165, 0], to: [255, 255, 0] },
  { max: 100, from: [255, 255, 0], to: [0, 255, 128] }
];

const STATUS_BAR_COUNT = 4;

export function setupConfigurationSliders() {
  const debouncedAnnounce = debounce(value => announcePowerLevel(parseInt(value, 10)), 500);

  subscribeSuitModel(({ state: model, changes }) => {
    renderConfigurationFromModel(model, changes);
  });
  renderConfigurationFromModel(getSuitModel());

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
  const suitBounds = {
    left: 95,
    right: 305,
    top: 25,
    bottom: 485
  };

  const suitWidth = suitBounds.right - suitBounds.left;
  const suitHeight = suitBounds.bottom - suitBounds.top;
  const suitCenterX = (suitBounds.left + suitBounds.right) / 2;
  const suitCenterY = (suitBounds.top + suitBounds.bottom) / 2;

  const zoomFactor = (zoomValue / 100) * 0.8;

  const viewWidth = suitWidth / zoomFactor;
  const viewHeight = suitHeight / zoomFactor;

  const viewX = suitCenterX - viewWidth / 2;
  const viewY = suitCenterY - viewHeight / 2;

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

  updateReactorTooltip(powerInt);
}

function calculateReactorFromSuitColor(suitColor, powerLevel) {
  const match = suitColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  const [suitR, suitG, suitB] = match
    ? [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)]
    : [0, 255, 255];

  const factor = powerLevel / 100;
  const r = Math.round(255 - (255 - suitR) * factor);
  const g = Math.round(255 - (255 - suitG) * factor);
  const b = Math.round(255 - (255 - suitB) * factor);

  const glowIntensity = 3 + Math.pow(factor, 1.5) * 27;

  return { color: `rgb(${r}, ${g}, ${b})`, glowIntensity };
}

export function updateSuitColor(colorValue) {
  const colorInt = parseInt(colorValue, 10);
  const { color, glowColor } = calculateFrameColor(colorInt);

  document.documentElement.style.setProperty('--suit-cyan', color);
  document.documentElement.style.setProperty('--suit-glow', `0 0 8px ${glowColor}`);
}

function calculateFrameColor(colorValue) {
  const normalizedColorValue = Math.max(0, Math.min(100, parseInt(colorValue, 10)));
  let r, g, b;
  let prevMax = 0;

  for (const stop of COLOR_STOPS) {
    if (normalizedColorValue <= stop.max) {
      const range = stop.max - prevMax;
      const factor = (normalizedColorValue - prevMax) / range;
      r = Math.round(stop.from[0] + (stop.to[0] - stop.from[0]) * factor);
      g = Math.round(stop.from[1] + (stop.to[1] - stop.from[1]) * factor);
      b = Math.round(stop.from[2] + (stop.to[2] - stop.from[2]) * factor);
      break;
    }
    prevMax = stop.max;
  }

  const color = `rgb(${r}, ${g}, ${b})`;
  const glowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;

  return { color, glowColor };
}

function updateReactorTooltip(powerInt) {
  const powerOutput = (0.25 + powerInt * 0.0475).toFixed(1);
  const efficiency = Math.max(40, Math.min(99.9, 40 + powerInt * 0.599)).toFixed(1);
  const temperature = Math.max(1000, Math.min(5000, 1000 + powerInt * 40)).toFixed(0);

  let status = 'NOMINAL';
  if (powerInt >= 90) status = 'MAXIMUM POWER';
  else if (powerInt >= 70) status = 'HIGH OUTPUT';
  else if (powerInt < 30) status = 'CRITICAL LOW';

  state.reactorTooltip = `ARC REACTOR<br>• Power Output: ${powerOutput} TW<br>• Efficiency: ${efficiency}%<br>• Core Temperature: ${temperature}°C<br>• Status: ${status}`;
}
