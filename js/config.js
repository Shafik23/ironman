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
import { getSuitSystemStats, setSuitPowerTarget } from './systems.js';
import {
  getSuitModel,
  setSuitColor as setSuitModelColor,
  setSuitPower,
  setSuitZoom as setSuitModelZoom,
  subscribeSuitModel
} from './suit-model.js';

const STATUS_BAR_COUNT = 5;

export function setupConfigurationSliders() {
  const debouncedAnnounce = debounce(value => announcePowerLevel(parseInt(value, 10)), 500);

  subscribeSuitModel(({ state: model, changes }) => {
    renderConfigurationFromModel(model, changes);
  });
  renderConfigurationFromModel(getSuitModel());

  dom.zoomSlider.min = SUIT_ZOOM.MIN;
  dom.zoomSlider.max = SUIT_ZOOM.MAX;

  dom.powerSlider.addEventListener('input', e => {
    const requestedPower = parseInt(e.target.value, 10);
    setSuitPowerTarget(requestedPower);
    const model = setSuitPower(requestedPower, { source: 'power-slider', deriveStatus: false });
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
    updateArcReactor(getSuitSystemStats().effectivePower, model.color);
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
    updateProgressBars();
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

export function updateProgressBars(options = {}) {
  const progressBars = dom.progressBars;
  const statusTexts = dom.statusTexts;
  const rows = getStatusRows(options);

  if (progressBars.length >= STATUS_BAR_COUNT && statusTexts.length >= STATUS_BAR_COUNT) {
    for (let i = 0; i < STATUS_BAR_COUNT; i++) {
      progressBars[i].style.width = rows[i].barValue + '%';
      progressBars[i].classList.remove('status-warning', 'status-danger', 'status-low');
      if (rows[i].severity) {
        progressBars[i].classList.add(rows[i].severity);
      }
      statusTexts[i].textContent = rows[i].text;
    }
  }
}

function getStatusRows({ jitter = false } = {}) {
  const stats = getSuitSystemStats();
  const randomJitter = () => (jitter ? (Math.random() - 0.5) * 14 : 0);
  const cpuLoad = clamp(stats.cpuLoad + randomJitter(), 0, 100);
  const memoryUsage = clamp(stats.memoryUsage + randomJitter(), 0, 100);
  const effectivePower = clamp(stats.effectivePower + randomJitter(), 0, 100);
  const integrity = clamp(stats.integrity + (jitter ? randomJitter() * 0.3 : 0), 0, 100);
  const heat = clamp(stats.heat + (jitter ? randomJitter() * 0.7 : 0), 0, 100);
  const temperature = 900 + heat * 42;

  return [
    {
      barValue: cpuLoad,
      text: `${Math.round(cpuLoad)}%`,
      severity: cpuLoad >= 92 ? 'status-danger' : cpuLoad >= 80 ? 'status-warning' : ''
    },
    {
      barValue: memoryUsage,
      text: `${Math.round(memoryUsage)}%`,
      severity: memoryUsage >= 88 ? 'status-danger' : memoryUsage >= 76 ? 'status-warning' : ''
    },
    {
      barValue: effectivePower,
      text: `${Math.round(effectivePower)}%`,
      severity: stats.targetPower < 15 ? 'status-danger' : stats.targetPower < 35 ? 'status-low' : ''
    },
    {
      barValue: integrity,
      text: `${Math.round(integrity)}%`,
      severity: integrity <= 55 ? 'status-danger' : integrity <= 75 ? 'status-warning' : ''
    },
    {
      barValue: heat,
      text: `${Math.round(temperature)}C`,
      severity: heat >= 90 ? 'status-danger' : heat >= 78 ? 'status-warning' : ''
    }
  ];
}

export function updateSuitZoom(zoomValue) {
  const { viewX, viewY, viewWidth, viewHeight } = calculateSuitViewBox(zoomValue);

  dom.suitSchematic.setAttribute('viewBox', `${viewX} ${viewY} ${viewWidth} ${viewHeight}`);
}

export function updateArcReactor(powerLevel = getSuitSystemStats().effectivePower, colorValue = getSuitModel().color) {
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

  state.reactorTooltip = buildReactorTooltip(powerInt);
}

export function updateSuitColor(colorValue) {
  const colorInt = parseInt(colorValue, 10);
  const { color, glowColor } = calculateFrameColor(colorInt);

  document.documentElement.style.setProperty('--suit-cyan', color);
  document.documentElement.style.setProperty('--suit-glow', `0 0 8px ${glowColor}`);
}

function buildReactorTooltip(powerInt) {
  const stats = getSuitSystemStats();
  let tooltip = calculateReactorTooltip(powerInt);
  tooltip = tooltip.replace(/Core Temperature: [^<]+/, `Core Temperature: ${Math.round(stats.coreTemperature)}C`);

  let status = 'NOMINAL';
  if (stats.warnings.includes('Reactor overheat')) status = 'OVERHEAT';
  else if (stats.warnings.includes('Output throttled')) status = 'THROTTLED';
  else if (stats.warnings.includes('Thermal load elevated')) status = 'THERMAL LOAD';
  else if (powerInt >= 90) status = 'MAXIMUM POWER';
  else if (powerInt >= 70) status = 'HIGH OUTPUT';
  else if (stats.targetPower < 35) status = 'LOW POWER';

  return tooltip.replace(/Status: [^<]+/, `Status: ${status}`);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
