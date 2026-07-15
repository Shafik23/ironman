// Flight Input - keyboard state for HUD flight mode
// Listens globally but only captures keys while HUD mode is active.

import { isSuitModeActive } from '../suit-model.js';

const keys = {
  climb: false,
  dive: false,
  left: false,
  right: false,
  boost: false
};

let firePressed = false;
let listenersAttached = false;

const KEY_MAP = {
  ArrowUp: 'climb',
  w: 'climb',
  W: 'climb',
  ArrowDown: 'dive',
  s: 'dive',
  S: 'dive',
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
  Shift: 'boost'
};

export function attachFlightInput() {
  if (listenersAttached) return;
  listenersAttached = true;

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', releaseAllKeys);
}

export function getFlightInput() {
  return {
    pitch: (keys.climb ? 1 : 0) - (keys.dive ? 1 : 0),
    yaw: (keys.right ? 1 : 0) - (keys.left ? 1 : 0),
    boost: keys.boost
  };
}

/** Returns true once per fire keypress (edge-triggered). */
export function consumeFirePressed() {
  const pressed = firePressed;
  firePressed = false;
  return pressed;
}

/** Allows mouse clicks on the canvas to fire as well. */
export function triggerFire() {
  if (!isSuitModeActive('hud')) return;
  firePressed = true;
}

export function releaseAllKeys() {
  Object.keys(keys).forEach(key => {
    keys[key] = false;
  });
  firePressed = false;
}

function handleKeyDown(event) {
  if (!isSuitModeActive('hud')) return;

  if (event.key === ' ') {
    event.preventDefault();
    firePressed = true;
    return;
  }

  const action = KEY_MAP[event.key];
  if (action) {
    event.preventDefault();
    keys[action] = true;
  }
}

function handleKeyUp(event) {
  if (event.key === ' ') return;

  const action = KEY_MAP[event.key];
  if (action) {
    keys[action] = false;
  }
}
