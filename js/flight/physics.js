// Flight Physics - pure flight model for HUD mode
// No DOM or three.js dependencies so it stays unit-testable.
//
// Coordinate convention (matches three.js): x = east, y = up (meters), z = south.
// Heading is a compass bearing in degrees (0 = north = -z, 90 = east = +x).

export const FLIGHT_TUNING = Object.freeze({
  minSpeed: 24,            // m/s - repulsors never let the suit fully stall out
  baseCruiseSpeed: 46,     // m/s at zero arc power
  powerCruiseBonus: 130,   // m/s added at 100% arc power
  boostMultiplier: 2.1,
  boostMinPower: 30,       // % arc power required to engage boost
  accelResponse: 0.9,      // per-second approach rate toward target speed
  diveSpeedBonus: 70,      // m/s gained in a full dive
  climbSpeedPenalty: 55,   // m/s bled in a full climb
  maxPitch: 38,            // degrees
  pitchResponse: 4.2,      // per-second approach rate toward target pitch
  baseYawRate: 55,         // deg/s at low speed
  minYawRate: 26,          // deg/s at top speed
  maxBank: 52,             // degrees of visual bank in a full turn
  bankResponse: 3.4,
  minAltitude: 4,          // meters - street deck
  maxAltitude: 1500,       // meters - service ceiling
  stallSpeed: 34,          // m/s - below this the suit sinks
  stallSinkRate: 22,       // m/s downward drift when stalled
  lowAltitudeWarning: 45   // meters
});

export function createFlightState({ x = 0, y = 220, z = 0, heading = 42 } = {}) {
  return {
    x,
    y,
    z,
    heading,          // degrees 0-360
    pitch: 0,         // degrees, positive = nose up
    bank: 0,          // degrees, positive = banking right
    speed: FLIGHT_TUNING.baseCruiseSpeed,
    boosting: false,  // boost actually engaged (input + enough power)
    flags: {
      stalling: false,
      terrain: false,
      ceiling: false,
      boostDenied: false
    }
  };
}

/**
 * Advance the flight model by dt seconds.
 * @param {object} state - mutated in place, also returned
 * @param {object} input - { pitch: -1..1, yaw: -1..1, boost: boolean }
 * @param {object} env - { power: 0..100, thrustersOnline: boolean }
 * @param {number} dt - seconds
 */
export function stepFlight(state, input, env, dt) {
  const t = FLIGHT_TUNING;
  const powerFactor = clamp((env.power ?? 100) / 100, 0, 1);
  const thrustFactor = env.thrustersOnline === false ? 0.45 : 1;

  const boostAvailable = (env.power ?? 100) >= t.boostMinPower && thrustFactor === 1;
  state.boosting = Boolean(input.boost) && boostAvailable;
  state.flags.boostDenied = Boolean(input.boost) && !boostAvailable;

  // Attitude
  const targetPitch = clamp(input.pitch ?? 0, -1, 1) * t.maxPitch;
  state.pitch = approach(state.pitch, targetPitch, t.pitchResponse * dt);

  const speedRatio = clamp(state.speed / 400, 0, 1);
  const yawRate = t.baseYawRate - (t.baseYawRate - t.minYawRate) * speedRatio;
  const yawInput = clamp(input.yaw ?? 0, -1, 1);
  state.heading = normalizeHeading(state.heading + yawInput * yawRate * dt);

  const targetBank = yawInput * t.maxBank;
  state.bank = approach(state.bank, targetBank, t.bankResponse * dt);

  // Thrust
  const pitchRad = state.pitch * DEG2RAD;
  let targetSpeed = (t.baseCruiseSpeed + powerFactor * t.powerCruiseBonus) * thrustFactor;
  if (state.boosting) {
    targetSpeed *= t.boostMultiplier;
  }
  targetSpeed += pitchRad < 0
    ? Math.abs(Math.sin(pitchRad)) * t.diveSpeedBonus
    : -Math.sin(pitchRad) * t.climbSpeedPenalty;
  targetSpeed = Math.max(t.minSpeed, targetSpeed);

  state.speed = approach(state.speed, targetSpeed, t.accelResponse * dt);
  state.flags.stalling = state.speed < t.stallSpeed;

  // Advance along the flight vector
  const headingRad = state.heading * DEG2RAD;
  const horizontal = Math.cos(pitchRad) * state.speed * dt;
  state.x += Math.sin(headingRad) * horizontal;
  state.z -= Math.cos(headingRad) * horizontal;
  state.y += Math.sin(pitchRad) * state.speed * dt;

  if (state.flags.stalling) {
    state.y -= t.stallSinkRate * dt;
  }

  // Vertical limits
  state.flags.ceiling = state.y >= t.maxAltitude;
  state.flags.terrain = state.y <= t.lowAltitudeWarning && state.pitch <= 2;
  state.y = clamp(state.y, t.minAltitude, t.maxAltitude);

  return state;
}

export function normalizeHeading(degrees) {
  return ((degrees % 360) + 360) % 360;
}

const DEG2RAD = Math.PI / 180;

function approach(current, target, amount) {
  const factor = clamp(amount, 0, 1);
  return current + (target - current) * factor;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
