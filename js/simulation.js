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

function clampPercent(value) {
  return Math.max(0, Math.min(100, parseInt(value)));
}

export function calculateFrameColor(colorValue) {
  const normalizedColorValue = clampPercent(colorValue);
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

export function calculateReactorFromSuitColor(suitColor, powerLevel) {
  const match = suitColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  const [suitR, suitG, suitB] = match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 255, 255];

  const factor = clampPercent(powerLevel) / 100;
  const r = Math.round(255 - (255 - suitR) * factor);
  const g = Math.round(255 - (255 - suitG) * factor);
  const b = Math.round(255 - (255 - suitB) * factor);

  const glowIntensity = 3 + Math.pow(factor, 1.5) * 27;

  return { color: `rgb(${r}, ${g}, ${b})`, glowIntensity };
}

export function calculateStatusValues(powerLevel) {
  const power = clampPercent(powerLevel);

  return [
    Math.min(power + 10, 100),
    Math.min(power * 0.6, 100),
    power,
    Math.min(power + 5, 100)
  ];
}

export function calculateSuitViewBox(zoomValue) {
  const suitBounds = SUIT_ZOOM.BOUNDS;
  const suitWidth = suitBounds.right - suitBounds.left;
  const suitHeight = suitBounds.bottom - suitBounds.top;
  const suitCenterX = (suitBounds.left + suitBounds.right) / 2;
  const suitCenterY = (suitBounds.top + suitBounds.bottom) / 2;

  const zoomFactor = (parseInt(zoomValue) / SUIT_ZOOM.DEFAULT) * SUIT_ZOOM.VIEWBOX_SCALE;
  const viewWidth = suitWidth / zoomFactor;
  const viewHeight = suitHeight / zoomFactor;
  const viewX = suitCenterX - viewWidth / 2;
  const viewY = suitCenterY - viewHeight / 2;

  return { viewX, viewY, viewWidth, viewHeight };
}

export function calculateReactorTooltip(powerLevel) {
  const power = clampPercent(powerLevel);
  const powerOutput = (0.25 + power * 0.0475).toFixed(1);
  const efficiency = Math.max(40, Math.min(99.9, 40 + power * 0.599)).toFixed(1);
  const temperature = Math.max(1000, Math.min(5000, 1000 + power * 40)).toFixed(0);

  let status = 'NOMINAL';
  if (power >= 90) status = 'MAXIMUM POWER';
  else if (power >= 70) status = 'HIGH OUTPUT';
  else if (power < 30) status = 'CRITICAL LOW';

  return `ARC REACTOR<br>• Power Output: ${powerOutput} TW<br>• Efficiency: ${efficiency}%<br>• Core Temperature: ${temperature}°C<br>• Status: ${status}`;
}
