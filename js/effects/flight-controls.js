// Flight Controls - Yaw motion and heading management
// Handles arrow key inputs for turning left/right during HUD flight mode

import { isSuitModeActive } from '../suit-model.js';

// Flight state
const flightState = {
  heading: 42,           // Current heading in degrees (0-360)
  yawInput: 0,           // Current yaw input: -1 (left), 0 (none), 1 (right)
  yawRate: 35,           // Degrees per second of yaw rotation
  worldRotation: 0,      // Cumulative world rotation (scrolls continuously while turning)
  worldRotationRate: 50  // How fast the world scrolls while turning (degrees per second)
};

// Track which keys are currently pressed
const keysPressed = {
  left: false,
  right: false
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
  flightState.yawInput = 0;

  // Smoothly return offset to center (will happen on next start)
}

/**
 * Reset flight state to initial values
 */
export function resetFlightState() {
  flightState.heading = 42;
  flightState.yawInput = 0;
  flightState.worldRotation = 0;

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
  }

  updateYawInput();
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
  }

  updateYawInput();
}

/**
 * Update yaw input based on currently pressed keys
 */
function updateYawInput() {
  if (keysPressed.left && !keysPressed.right) {
    flightState.yawInput = -1; // Turning left (heading decreases)
  } else if (keysPressed.right && !keysPressed.left) {
    flightState.yawInput = 1;  // Turning right (heading increases)
  } else {
    flightState.yawInput = 0;  // No turn or both keys (cancel out)
  }
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
