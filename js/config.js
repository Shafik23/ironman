import { dom } from './dom.js';
import { addTelemetryEntry } from './telemetry.js';
import { announcePowerLevel } from './jarvis.js';
import { events } from './events.js';
import { debounce } from './utils/timing.js';
import { state } from './state.js';
import { SUIT_ZOOM } from './constants.js';

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
  const debouncedAnnounce = debounce(value => announcePowerLevel(parseInt(value)), 500);

  dom.zoomSlider.min = SUIT_ZOOM.MIN;
  dom.zoomSlider.max = SUIT_ZOOM.MAX;

  dom.powerSlider.addEventListener('input', e => {
    dom.powerValue.textContent = e.target.value + '%';
    updateProgressBars();
    updateArcReactor(e.target.value);
    events.emit('power:changed', { value: parseInt(e.target.value) });
    addTelemetryEntry(`Power output adjusted to ${e.target.value}%`);
    debouncedAnnounce(e.target.value);
  });

  dom.colorSlider.addEventListener('input', e => {
    dom.colorValue.textContent = e.target.value + '%';
    updateSuitColor(e.target.value);
    updateArcReactor(dom.powerSlider.value);
    events.emit('color:changed', { value: parseInt(e.target.value) });
    addTelemetryEntry(`Suit color adjusted to ${e.target.value}%`);
  });

  dom.zoomSlider.addEventListener('input', e => {
    dom.zoomValue.textContent = e.target.value + '%';
    updateSuitZoom(e.target.value);
    events.emit('zoom:changed', { value: parseInt(e.target.value) });
    addTelemetryEntry(`Suit schematic zoom adjusted to ${e.target.value}%`);
  });
}

export function updateProgressBars() {
  const powerLevel = parseInt(dom.powerSlider.value);
  const progressBars = dom.progressBars;
  const statusTexts = dom.statusTexts;

  const cpuLoad = Math.min(powerLevel + 10, 100);
  const memory = Math.min(powerLevel * 0.6, 100);
  const power = powerLevel;
  const integrity = Math.min(powerLevel + 5, 100);

  const values = [cpuLoad, memory, power, integrity];

  if (progressBars.length >= STATUS_BAR_COUNT && statusTexts.length >= STATUS_BAR_COUNT) {
    for (let i = 0; i < STATUS_BAR_COUNT; i++) {
      progressBars[i].style.width = values[i] + '%';
      statusTexts[i].textContent = Math.round(values[i]) + '%';
    }
  }
}

export function updateSuitZoom(zoomValue) {
  const suitBounds = SUIT_ZOOM.BOUNDS;
  const suitWidth = suitBounds.right - suitBounds.left;
  const suitHeight = suitBounds.bottom - suitBounds.top;
  const suitCenterX = (suitBounds.left + suitBounds.right) / 2;
  const suitCenterY = (suitBounds.top + suitBounds.bottom) / 2;

  const zoomFactor = (zoomValue / SUIT_ZOOM.DEFAULT) * SUIT_ZOOM.VIEWBOX_SCALE;

  const viewWidth = suitWidth / zoomFactor;
  const viewHeight = suitHeight / zoomFactor;

  const viewX = suitCenterX - viewWidth / 2;
  const viewY = suitCenterY - viewHeight / 2;

  dom.suitSchematic.setAttribute('viewBox', `${viewX} ${viewY} ${viewWidth} ${viewHeight}`);
}

export function updateArcReactor(powerLevel) {
  const reactor = dom.reactorCore;
  if (!reactor) return;

  const powerInt = parseInt(powerLevel);
  const colorValue = parseInt(dom.colorSlider.value);

  const { color: suitColor } = calculateFrameColor(colorValue);
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
  const [suitR, suitG, suitB] = match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 255, 255];

  const factor = powerLevel / 100;
  const r = Math.round(255 - (255 - suitR) * factor);
  const g = Math.round(255 - (255 - suitG) * factor);
  const b = Math.round(255 - (255 - suitB) * factor);

  const glowIntensity = 3 + Math.pow(factor, 1.5) * 27;

  return { color: `rgb(${r}, ${g}, ${b})`, glowIntensity };
}

export function updateSuitColor(colorValue) {
  const colorInt = parseInt(colorValue);
  const { color, glowColor } = calculateFrameColor(colorInt);

  document.documentElement.style.setProperty('--suit-cyan', color);
  document.documentElement.style.setProperty('--suit-glow', `0 0 8px ${glowColor}`);
}

function calculateFrameColor(colorValue) {
  const normalizedColorValue = Math.max(0, Math.min(100, parseInt(colorValue)));
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
