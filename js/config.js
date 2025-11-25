import { dom } from './dom.js';
import { tooltipContent } from './constants.js';
import { addTelemetryEntry } from './telemetry.js';
import { announcePowerLevel } from './jarvis.js';
import { events } from './events.js';
import { debounce } from './utils/timing.js';

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

  if (progressBars.length >= 4 && statusTexts.length >= 4) {
    for (let i = 0; i < 4; i++) {
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

export function updateArcReactor(powerLevel) {
  const reactor = document.querySelector('.reactor');
  const powerInt = parseInt(powerLevel);

  reactor.classList.remove('power-max', 'power-high', 'power-medium', 'power-low', 'power-critical');

  const { color, glowIntensity } = calculateReactorColor(powerInt);

  reactor.style.fill = color;
  reactor.style.filter = `drop-shadow(0 0 ${glowIntensity}px ${color})`;

  reactor.style.animation = 'none';
  reactor.style.setProperty('--reactor-color', color);
  reactor.style.setProperty('--reactor-glow', `${glowIntensity}px`);
  reactor.style.animation = 'reactor-pulse-dynamic 1.5s ease-in-out infinite alternate';

  updateReactorTooltip(powerInt);
}

function calculateReactorColor(powerLevel) {
  let r, g, b, glowIntensity;

  if (powerLevel <= 25) {
    const factor = powerLevel / 25;
    r = Math.round(139 + 116 * factor);
    g = Math.round(0 + 68 * factor);
    b = 0;
    glowIntensity = 3 + 5 * factor;
  } else if (powerLevel <= 50) {
    const factor = (powerLevel - 25) / 25;
    r = 255;
    g = Math.round(68 + 60 * factor);
    b = 0;
    glowIntensity = 8 + 4 * factor;
  } else if (powerLevel <= 75) {
    const factor = (powerLevel - 50) / 25;
    r = 255;
    g = Math.round(128 + 87 * factor);
    b = Math.round(0 + 0 * factor);
    glowIntensity = 12 + 6 * factor;
  } else {
    const factor = (powerLevel - 75) / 25;
    r = 255;
    g = Math.round(215 + 40 * factor);
    b = Math.round(0 + 255 * factor);
    glowIntensity = 18 + 12 * factor;
  }

  const color = `rgb(${r}, ${g}, ${b})`;
  return { color, glowIntensity };
}

export function updateSuitColor(colorValue) {
  const colorInt = parseInt(colorValue);
  const { color, glowColor } = calculateFrameColor(colorInt);

  document.documentElement.style.setProperty('--suit-cyan', color);
  document.documentElement.style.setProperty('--suit-glow', `0 0 8px ${glowColor}`);
}

export function calculateFrameColor(colorValue) {
  let r, g, b;

  if (colorValue <= 14) {
    const factor = colorValue / 14;
    r = 0;
    g = Math.round(255 - 175 * factor);
    b = 255;
  } else if (colorValue <= 28) {
    const factor = (colorValue - 14) / 14;
    r = Math.round(0 + 128 * factor);
    g = Math.round(80 - 80 * factor);
    b = 255;
  } else if (colorValue <= 42) {
    const factor = (colorValue - 28) / 14;
    r = Math.round(128 + 127 * factor);
    g = 0;
    b = 255;
  } else if (colorValue <= 57) {
    const factor = (colorValue - 42) / 15;
    r = 255;
    g = 0;
    b = Math.round(255 - 255 * factor);
  } else if (colorValue <= 71) {
    const factor = (colorValue - 57) / 14;
    r = 255;
    g = Math.round(0 + 165 * factor);
    b = 0;
  } else if (colorValue <= 85) {
    const factor = (colorValue - 71) / 14;
    r = 255;
    g = Math.round(165 + 90 * factor);
    b = 0;
  } else {
    const factor = (colorValue - 85) / 15;
    r = Math.round(255 - 255 * factor);
    g = 255;
    b = Math.round(0 + 128 * factor);
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

  tooltipContent[
    'chest'
  ] = `ARC REACTOR<br>• Power Output: ${powerOutput} TW<br>• Efficiency: ${efficiency}%<br>• Core Temperature: ${temperature}°C<br>• Status: ${status}`;
}
