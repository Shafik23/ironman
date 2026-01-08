// Cityscape Animation Control
// Manages the parallax night cityscape background and yaw perspective shifts

let cityscapeAnimating = false;
let currentYawOffset = 0;

// Configuration for yaw visual effect
const YAW_CONFIG = {
  // How much the perspective origin shifts based on world rotation
  perspectiveShiftMultiplier: 0.3, // percentage points per degree
  // How much rotation to apply for a "banking" effect (based on rotation rate)
  maxBankRotation: 2.5 // degrees
};

// Track last rotation for calculating rotation rate (for bank effect)
let lastWorldRotation = 0;

export function startCityscapeAnimation() {
  if (cityscapeAnimating) return;
  cityscapeAnimating = true;

  const layers = document.querySelectorAll('.cityscape-layer');
  layers.forEach(layer => {
    layer.style.animationPlayState = 'running';
  });
}

export function stopCityscapeAnimation() {
  cityscapeAnimating = false;

  const layers = document.querySelectorAll('.cityscape-layer');
  layers.forEach(layer => {
    layer.style.animationPlayState = 'paused';
  });
}

export function isCityscapeAnimating() {
  return cityscapeAnimating;
}

/**
 * Set the yaw offset for the cityscape perspective
 * This creates the illusion of continuous rotation while turning
 * @param {number} worldRotation - Cumulative world rotation in degrees (0 = not turning signal)
 */
export function setCityscapeYawOffset(worldRotation) {
  const container = document.querySelector('.cityscape-container');
  if (!container) return;

  // When worldRotation is 0, it's a signal that we're NOT turning
  // Reset perspective and bank but DON'T touch buildings or lastWorldRotation
  if (worldRotation === 0) {
    container.style.perspectiveOrigin = '50% 60%';
    container.style.transform = 'rotateZ(0deg)';
    // Don't reset --yaw-offset or lastWorldRotation
    // Buildings stay where they are, and we preserve state for next turn
    return;
  }

  // Calculate rotation rate for bank effect and turn direction
  const rotationDelta = worldRotation - lastWorldRotation;
  lastWorldRotation = worldRotation;

  currentYawOffset = worldRotation;

  // Perspective shift is based on DIRECTION of turn, not accumulated rotation
  // This keeps the road/perspective steady while turning
  // rotationDelta > 0 = turning right = perspective shifts right
  const turnDirection = Math.sign(rotationDelta);
  const perspectiveShift = turnDirection * 15; // Fixed offset based on turn direction
  const newPerspectiveX = 50 + perspectiveShift; // Center is 50%

  // Calculate bank rotation based on rotation rate (tilt while actively turning)
  // rotationDelta positive = turning right = bank right (negative rotateZ)
  const bankRotation = Math.max(-YAW_CONFIG.maxBankRotation,
                        Math.min(YAW_CONFIG.maxBankRotation, -rotationDelta * 3));

  // Apply the transforms
  container.style.perspectiveOrigin = `${newPerspectiveX}% 60%`;
  container.style.transform = `rotateZ(${bankRotation}deg)`;

  // Pass world rotation to CSS for continuous building movement
  document.documentElement.style.setProperty('--yaw-offset', `${worldRotation}%`);
}

/**
 * Get current yaw offset
 */
export function getCityscapeYawOffset() {
  return currentYawOffset;
}
