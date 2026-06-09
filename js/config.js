import { dom } from './dom.js';
import { addTelemetryEntry } from './telemetry.js';
import { announcePowerLevel } from './jarvis.js';
import { events } from './events.js';
import { debounce } from './utils/timing.js';
import { state } from './state.js';
import { getSuitSystemStats, setSuitPowerTarget } from './systems.js';

const COLOR_STOPS = [
  { max: 14, from: [0, 255, 255], to: [0, 80, 255] },
  { max: 28, from: [0, 80, 255], to: [128, 0, 255] },
  { max: 42, from: [128, 0, 255], to: [255, 0, 255] },
  { max: 57, from: [255, 0, 255], to: [255, 0, 0] },
  { max: 71, from: [255, 0, 0], to: [255, 165, 0] },
  { max: 85, from: [255, 165, 0], to: [255, 255, 0] },
  { max: 100, from: [255, 255, 0], to: [0, 255, 128] }
];

const STATUS_BAR_COUNT = 5;

export function setupConfigurationSliders() {
  const debouncedAnnounce = debounce(value => announcePowerLevel(parseInt(value)), 500);

  dom.powerSlider.addEventListener('input', e => {
    const requestedPower = parseInt(e.target.value, 10);
    setSuitPowerTarget(requestedPower);
    dom.powerValue.textContent = e.target.value + '%';
    updateProgressBars();
    updateArcReactor(getSuitSystemStats().effectivePower);
    events.emit('power:changed', { value: requestedPower });
    addTelemetryEntry(`Power output adjusted to ${e.target.value}%`);
    debouncedAnnounce(e.target.value);
  });

  dom.colorSlider.addEventListener('input', e => {
    dom.colorValue.textContent = e.target.value + '%';
    updateSuitColor(e.target.value);
    updateArcReactor(getSuitSystemStats().effectivePower);
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
  const stats = getSuitSystemStats();
  const requestedPower = Math.round(stats.targetPower);
  const effectivePower = Math.round(stats.effectivePower || powerInt);
  const powerOutput = stats.outputTerawatts.toFixed(1);
  const heatPenalty = Math.max(0, stats.heat - 70) * 0.85;
  const integrityPenalty = Math.max(0, 100 - stats.integrity) * 0.25;
  const efficiency = clamp(99.7 - heatPenalty - integrityPenalty, 38, 99.7).toFixed(1);
  const temperature = Math.round(stats.coreTemperature);

  let status = 'NOMINAL';
  if (stats.warnings.includes('Reactor overheat')) status = 'OVERHEAT';
  else if (stats.warnings.includes('Output throttled')) status = 'THROTTLED';
  else if (stats.warnings.includes('Low power constraints')) status = 'LOW POWER';
  else if (requestedPower >= 90) status = 'MAXIMUM POWER';
  else if (requestedPower >= 70) status = 'HIGH OUTPUT';

  state.reactorTooltip = `ARC REACTOR<br>• Requested Power: ${requestedPower}%<br>• Effective Output: ${effectivePower}% / ${powerOutput} TW<br>• Efficiency: ${efficiency}%<br>• Core Temperature: ${temperature}°C<br>• Status: ${status}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
