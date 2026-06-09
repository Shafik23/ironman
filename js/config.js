import { dom } from './dom.js';
import { addTelemetryEntry } from './telemetry.js';
import { announcePowerLevel } from './jarvis.js';
import { events } from './events.js';
import { debounce } from './utils/timing.js';
import { state } from './state.js';
import {
  calculateFrameColor,
  calculateReactorFromSuitColor,
  calculateReactorTooltip,
  calculateStatusValues,
  calculateSuitViewBox
} from './simulation.js';

const STATUS_BAR_COUNT = 4;

export function setupConfigurationSliders() {
  const debouncedAnnounce = debounce(value => announcePowerLevel(parseInt(value)), 500);

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
  const values = calculateStatusValues(powerLevel);

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

  state.reactorTooltip = calculateReactorTooltip(powerInt);
}

export function updateSuitColor(colorValue) {
  const colorInt = parseInt(colorValue);
  const { color, glowColor } = calculateFrameColor(colorInt);

  document.documentElement.style.setProperty('--suit-cyan', color);
  document.documentElement.style.setProperty('--suit-glow', `0 0 8px ${glowColor}`);
}
