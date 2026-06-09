import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateFrameColor,
  calculateReactorFromSuitColor,
  calculateReactorTooltip,
  calculateStatusValues,
  calculateSuitViewBox
} from '../js/simulation.js';

test('frame color follows the suit color ramp and clamps to valid bounds', () => {
  assert.deepEqual(calculateFrameColor(0), {
    color: 'rgb(0, 255, 255)',
    glowColor: 'rgba(0, 255, 255, 0.5)'
  });
  assert.deepEqual(calculateFrameColor(100), {
    color: 'rgb(0, 255, 128)',
    glowColor: 'rgba(0, 255, 128, 0.5)'
  });
  assert.equal(calculateFrameColor(-10).color, calculateFrameColor(0).color);
  assert.equal(calculateFrameColor(140).color, calculateFrameColor(100).color);
});

test('reactor color blends from white idle to selected suit color at full power', () => {
  assert.deepEqual(calculateReactorFromSuitColor('rgb(0, 80, 255)', 0), {
    color: 'rgb(255, 255, 255)',
    glowIntensity: 3
  });

  assert.deepEqual(calculateReactorFromSuitColor('rgb(0, 80, 255)', 100), {
    color: 'rgb(0, 80, 255)',
    glowIntensity: 30
  });
});

test('reactor color falls back to arc cyan when suit color cannot be parsed', () => {
  assert.equal(calculateReactorFromSuitColor('invalid', 100).color, 'rgb(0, 255, 255)');
});

test('status values derive system load from power level', () => {
  assert.deepEqual(calculateStatusValues(50), [60, 30, 50, 55]);
  assert.deepEqual(calculateStatusValues(98), [100, 58.8, 98, 100]);
});

test('suit zoom derives a centered schematic viewBox', () => {
  assert.deepEqual(calculateSuitViewBox(100), {
    viewX: 68.75,
    viewY: -32.5,
    viewWidth: 262.5,
    viewHeight: 575
  });
});

test('reactor tooltip reports power bands and derived telemetry', () => {
  assert.match(calculateReactorTooltip(20), /Status: CRITICAL LOW/);
  assert.match(calculateReactorTooltip(75), /Status: HIGH OUTPUT/);
  assert.match(calculateReactorTooltip(95), /Power Output: 4\.8 TW/);
  assert.match(calculateReactorTooltip(95), /Status: MAXIMUM POWER/);
});
