import assert from 'node:assert/strict';
import test from 'node:test';

import { createFlightState, stepFlight, normalizeHeading, FLIGHT_TUNING } from '../js/flight/physics.js';

const IDLE = { pitch: 0, yaw: 0, boost: false };
const FULL_POWER = { power: 100, thrustersOnline: true };

function fly(state, input, env, seconds) {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) {
    stepFlight(state, input, env, dt);
  }
  return state;
}

test('accelerates toward the power-scaled cruise speed', () => {
  const state = createFlightState();
  state.speed = FLIGHT_TUNING.minSpeed;

  fly(state, IDLE, FULL_POWER, 10);

  const expectedCruise = FLIGHT_TUNING.baseCruiseSpeed + FLIGHT_TUNING.powerCruiseBonus;
  assert.ok(Math.abs(state.speed - expectedCruise) < 2, `speed ${state.speed} near ${expectedCruise}`);
});

test('boost multiplies speed but requires minimum arc power', () => {
  const boosted = fly(createFlightState(), { ...IDLE, boost: true }, FULL_POWER, 10);
  const cruise = FLIGHT_TUNING.baseCruiseSpeed + FLIGHT_TUNING.powerCruiseBonus;
  assert.ok(boosted.speed > cruise * 1.5, `boosted speed ${boosted.speed}`);
  assert.equal(boosted.boosting, true);
  assert.equal(boosted.flags.boostDenied, false);

  const lowPower = fly(
    createFlightState(),
    { ...IDLE, boost: true },
    { power: FLIGHT_TUNING.boostMinPower - 1, thrustersOnline: true },
    2
  );
  assert.equal(lowPower.boosting, false);
  assert.equal(lowPower.flags.boostDenied, true);
});

test('yaw input turns right and heading wraps 0-360', () => {
  const state = createFlightState({ heading: 350 });

  fly(state, { ...IDLE, yaw: 1 }, FULL_POWER, 1);

  assert.ok(state.heading < 90, `heading wrapped to ${state.heading}`);
  assert.ok(state.heading >= 0);
  assert.ok(state.bank > 10, `banked into the turn: ${state.bank}`);
});

test('heading 0 flies north (negative z), heading 90 flies east (positive x)', () => {
  const north = fly(createFlightState({ heading: 0, x: 0, z: 0 }), IDLE, FULL_POWER, 1);
  assert.ok(north.z < -20, `moved north: z=${north.z}`);
  assert.ok(Math.abs(north.x) < 0.001, `no drift east: x=${north.x}`);

  const east = fly(createFlightState({ heading: 90, x: 0, z: 0 }), IDLE, FULL_POWER, 1);
  assert.ok(east.x > 20, `moved east: x=${east.x}`);
});

test('climb raises altitude and stops at the service ceiling', () => {
  const state = createFlightState({ y: 200 });

  fly(state, { ...IDLE, pitch: 1 }, FULL_POWER, 5);
  assert.ok(state.y > 300, `climbed to ${state.y}`);

  fly(state, { ...IDLE, pitch: 1 }, FULL_POWER, 120);
  assert.equal(state.y, FLIGHT_TUNING.maxAltitude);
  assert.equal(state.flags.ceiling, true);
});

test('dive is floored at minimum altitude with terrain flag', () => {
  const state = createFlightState({ y: 100 });

  fly(state, { ...IDLE, pitch: -1 }, FULL_POWER, 30);

  assert.equal(state.y, FLIGHT_TUNING.minAltitude);
  assert.equal(state.flags.terrain, true);
});

test('offline thrusters cut speed and deny boost', () => {
  const impaired = fly(
    createFlightState(),
    { ...IDLE, boost: true },
    { power: 100, thrustersOnline: false },
    10
  );
  const healthy = fly(createFlightState(), IDLE, FULL_POWER, 10);

  assert.ok(impaired.speed < healthy.speed * 0.6, `impaired ${impaired.speed} vs ${healthy.speed}`);
  assert.equal(impaired.flags.boostDenied, true);
});

test('normalizeHeading maps any angle into [0, 360)', () => {
  assert.equal(normalizeHeading(-10), 350);
  assert.equal(normalizeHeading(370), 10);
  assert.equal(normalizeHeading(720), 0);
});
