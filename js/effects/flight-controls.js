// Flight Controls - HUD flight input and heading management
// Handles flight keys during HUD mode only.

import { isSuitModeActive } from '../suit-model.js';

// Flight state
const flightState = {
  heading: 42,           // Current heading in degrees (0-360)
  yawInput: 0,           // Current yaw input: -1 (left), 0 (none), 1 (right)
  pitchInput: 0,         // Current pitch input: -1 (dive), 0 (level), 1 (climb)
  isBoosting: false,     // Boost thrusters engaged
  yawRate: 35,           // Degrees per second of yaw rotation
  worldRotation: 0,      // Cumulative world rotation (scrolls continuously while turning)
  worldRotationRate: 50  // How fast the world scrolls while turning (degrees per second)
};

// Track which keys are currently pressed
const keysPressed = {
  left: false,
  right: false,
  climb: false,
  dive: false,
  boost: false
};

// Callbacks for external updates
let onHeadingChange = null;
let onYawOffsetChange = null;

// Update interval handle
let updateInterval = null;
const UPDATE_RATE = 16; // ~60fps

/**
 * Initialize flight controls
 * @param {Function} headingCallback - Called when heading changes (heading) => void
 * @param {Function} yawOffsetCallback - Called when yaw offset changes (offset) => void
 */
export function initFlightControls(headingCallback, yawOffsetCallback) {
  onHeadingChange = headingCallback;
  onYawOffsetChange = yawOffsetCallback;

  // Set up keyboard listeners
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
}

/**
 * Start the flight control update loop
 */
export function startFlightControls() {
  if (updateInterval) return;

  updateInterval = setInterval(updateFlight, UPDATE_RATE);
}

/**
 * Stop the flight control update loop
 */
export function stopFlightControls() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  // Reset yaw input and offset when stopping
  keysPressed.left = false;
  keysPressed.right = false;
  keysPressed.climb = false;
  keysPressed.dive = false;
  keysPressed.boost = false;
  flightState.yawInput = 0;
  flightState.pitchInput = 0;
  flightState.isBoosting = false;

  // Smoothly return offset to center (will happen on next start)
}

/**
 * Reset flight state to initial values
 */
export function resetFlightState() {
  flightState.heading = 42;
  flightState.yawInput = 0;
  flightState.pitchInput = 0;
  flightState.isBoosting = false;
  flightState.worldRotation = 0;
  keysPressed.left = false;
  keysPressed.right = false;
  keysPressed.climb = false;
  keysPressed.dive = false;
  keysPressed.boost = false;

  if (onHeadingChange) onHeadingChange(flightState.heading);
  if (onYawOffsetChange) onYawOffsetChange(0);
}

/**
 * Get current heading
 */
export function getHeading() {
  return flightState.heading;
}

/**
 * Get active flight input for the HUD simulation.
 */
export function getFlightInput() {
  return {
    yawInput: flightState.yawInput,
    pitchInput: flightState.pitchInput,
    isBoosting: flightState.isBoosting
  };
}

/**
 * Handle keydown events for flight controls
 */
function handleKeyDown(e) {
  // Only process in HUD mode
  if (!isSuitModeActive('hud')) return;

  switch (e.key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      e.preventDefault();
      keysPressed.left = true;
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      e.preventDefault();
      keysPressed.right = true;
      break;
    case 'ArrowUp':
    case 'w':
    case 'W':
      e.preventDefault();
      keysPressed.climb = true;
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      e.preventDefault();
      keysPressed.dive = true;
      break;
    case 'Shift':
    case ' ':
      e.preventDefault();
      keysPressed.boost = true;
      break;
  }

  updateFlightInput();
}

/**
 * Handle keyup events for flight controls
 */
function handleKeyUp(e) {
  switch (e.key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      keysPressed.left = false;
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      keysPressed.right = false;
      break;
    case 'ArrowUp':
    case 'w':
    case 'W':
      keysPressed.climb = false;
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      keysPressed.dive = false;
      break;
    case 'Shift':
    case ' ':
      keysPressed.boost = false;
      break;
  }

  updateFlightInput();
}

/**
 * Update flight input based on currently pressed keys
 */
function updateFlightInput() {
  if (keysPressed.left && !keysPressed.right) {
    flightState.yawInput = -1; // Turning left (heading decreases)
  } else if (keysPressed.right && !keysPressed.left) {
    flightState.yawInput = 1;  // Turning right (heading increases)
  } else {
    flightState.yawInput = 0;  // No turn or both keys (cancel out)
  }

  if (keysPressed.climb && !keysPressed.dive) {
    flightState.pitchInput = 1;
  } else if (keysPressed.dive && !keysPressed.climb) {
    flightState.pitchInput = -1;
  } else {
    flightState.pitchInput = 0;
  }

  flightState.isBoosting = keysPressed.boost;
}

/**
 * Main flight update loop - called at ~60fps
 */
function updateFlight() {
  if (!isSuitModeActive('hud')) return;

  const deltaTime = UPDATE_RATE / 1000; // Convert to seconds

  // Update heading based on yaw input
  if (flightState.yawInput !== 0) {
    const headingDelta = flightState.yawInput * flightState.yawRate * deltaTime;
    flightState.heading += headingDelta;

    // Normalize heading to 0-360
    flightState.heading = ((flightState.heading % 360) + 360) % 360;

    // Notify compass to update
    if (onHeadingChange) {
      onHeadingChange(flightState.heading);
    }

    // Continuously accumulate world rotation while turning
    // Turn right (yawInput=1) = world scrolls left = positive rotation value
    const rotationDelta = flightState.yawInput * flightState.worldRotationRate * deltaTime;
    flightState.worldRotation += rotationDelta;

    // Send continuous rotation update
    if (onYawOffsetChange) {
      onYawOffsetChange(flightState.worldRotation);
    }
  } else {
    // Not turning - notify cityscape to reset perspective/bank only (not buildings)
    // Keep worldRotation at its current value so buildings don't snap back
    if (onYawOffsetChange) {
      onYawOffsetChange(0); // Signal "not turning" - cityscape will only reset perspective/bank
    }
  }
}

/**
 * Clean up event listeners
 */
export function destroyFlightControls() {
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('keyup', handleKeyUp);
  stopFlightControls();
}
