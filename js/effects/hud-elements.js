// HUD Elements - Animation and Data Updates
// Handles dynamic HUD element updates (altitude, speed, radar, etc.)

import { dom } from '../dom.js';
import { getSuitSystemStats } from '../systems.js';
import {
  initFlightControls,
  startFlightControls,
  stopFlightControls,
  resetFlightState,
  getFlightInput
} from './flight-controls.js';
import { setCityscapeYawOffset } from './cityscape.js';

let simulationInterval = null;
let radarThreats = [];
let flightControlsInitialized = false;

// Simulation state
const simState = {
  altitude: 10000,
  speed: 750,
  heading: 42,
  power: 85,
  flightWarning: ''
};

const FLIGHT_CONFIG = {
  minAltitude: 250,
  maxAltitude: 50000,
  minSpeed: 120,
  stallSpeed: 220,
  accelerationResponse: 0.12,
  baseClimbFpm: 4600,
  baseDiveFpm: 6200,
  lowAltitudeWarning: 1200
};

// Compass configuration
const COMPASS_CONFIG = {
  pixelsPerDegree: 4,  // How many pixels per degree of heading
  visibleDegrees: 75   // How many degrees visible in the compass window
};

export function initializeHudElements() {
  // Initialize compass tape
  initializeCompass();

  // Initialize radar threats
  createRadarThreats();

  // Initialize flight controls (only once)
  if (!flightControlsInitialized) {
    initFlightControls(
      // Heading change callback - update compass
      (heading) => {
        simState.heading = heading;
        updateCompass(heading);
      },
      // Yaw offset callback - shift cityscape perspective
      (offset) => {
        setCityscapeYawOffset(offset);
      }
    );
    flightControlsInitialized = true;
  }

  // Set initial heading display
  updateCompass(simState.heading);
}

export function startHudSimulation() {
  if (simulationInterval) return;

  // Start flight controls for yaw motion
  startFlightControls();

  simulationInterval = setInterval(() => {
    updateFlightData(0.1);
    updateRadarThreats();
  }, 100);
}

export function stopHudSimulation() {
  // Stop flight controls
  stopFlightControls();

  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}

function updateFlightData(deltaTime) {
  const controls = getFlightInput();
  const powerFactor = Math.max(0, Math.min(1, simState.power / 100));
  const boostAvailable = controls.isBoosting && powerFactor >= 0.3;
  const climbCapability = Math.max(0.25, powerFactor);
  const maxCruiseSpeed = 260 + powerFactor * 650;
  const boostBonus = boostAvailable ? 260 * powerFactor : 0;
  const pitchSpeedEffect = controls.pitchInput > 0
    ? -95 * controls.pitchInput
    : 85 * Math.abs(controls.pitchInput);
  const targetSpeed = clamp(
    maxCruiseSpeed + boostBonus + pitchSpeedEffect,
    FLIGHT_CONFIG.minSpeed,
    1250
  );

  simState.speed += (targetSpeed - simState.speed) * FLIGHT_CONFIG.accelerationResponse;
  simState.speed = clamp(simState.speed, FLIGHT_CONFIG.minSpeed, 1250);

  const climbFpm = FLIGHT_CONFIG.baseClimbFpm * climbCapability * (boostAvailable ? 1.35 : 1);
  const diveFpm = FLIGHT_CONFIG.baseDiveFpm * (0.75 + powerFactor * 0.25);
  let verticalFpm = 0;

  if (controls.pitchInput > 0) {
    verticalFpm = climbFpm;
  } else if (controls.pitchInput < 0) {
    verticalFpm = -diveFpm;
  }

  if (simState.speed < FLIGHT_CONFIG.stallSpeed) {
    verticalFpm -= (FLIGHT_CONFIG.stallSpeed - simState.speed) * 7;
  }

  simState.altitude = clamp(
    simState.altitude + (verticalFpm / 60) * deltaTime,
    FLIGHT_CONFIG.minAltitude,
    FLIGHT_CONFIG.maxAltitude
  );

  updateFlightWarning(controls, boostAvailable);
  updateThrusterReadouts(controls, boostAvailable, targetSpeed);
  renderFlightReadouts();
}

function renderFlightReadouts() {
  if (dom.hudAltitude) {
    dom.hudAltitude.textContent = Math.round(simState.altitude).toLocaleString();
  }
  if (dom.hudSpeed) {
    dom.hudSpeed.textContent = Math.round(simState.speed);
  }
}

function updateFlightWarning(controls, boostAvailable) {
  if (controls.isBoosting && !boostAvailable) {
    simState.flightWarning = 'BOOST LIMITED: ARC OUTPUT BELOW 30%';
  } else if (simState.speed < FLIGHT_CONFIG.stallSpeed) {
    simState.flightWarning = 'STALL WARNING: INCREASE THRUST';
  } else if (simState.altitude <= FLIGHT_CONFIG.lowAltitudeWarning && controls.pitchInput <= 0) {
    simState.flightWarning = 'TERRAIN ALERT: CLIMB';
  } else {
    simState.flightWarning = '';
  }

  renderHudWarnings();
}

function updateThrusterReadouts(controls, boostAvailable, targetSpeed) {
  const thrusterBar = document.getElementById('hudThrusterBar');
  const repulsorBar = document.getElementById('hudRepulsorBar');
  const thrusterStatus = document.getElementById('hudThrusterStatus');
  const targetRatio = clamp(targetSpeed / 1250, 0, 1);
  const repulsorRatio = boostAvailable ? 1 : clamp(0.35 + simState.power / 180, 0.35, 0.9);

  if (thrusterBar) {
    thrusterBar.style.width = `${Math.round(targetRatio * 100)}%`;
  }

  if (repulsorBar) {
    repulsorBar.style.width = `${Math.round(repulsorRatio * 100)}%`;
  }

  if (thrusterStatus) {
    if (boostAvailable) {
      thrusterStatus.textContent = 'BOOST';
    } else if (controls.isBoosting) {
      thrusterStatus.textContent = 'LIMITED';
    } else if (controls.pitchInput > 0) {
      thrusterStatus.textContent = 'CLIMB';
    } else if (controls.pitchInput < 0) {
      thrusterStatus.textContent = 'DIVE';
    } else {
      thrusterStatus.textContent = 'ONLINE';
    }
  }
}

// Compass tape system
function initializeCompass() {
  const compassTrack = document.getElementById('compassTrack');
  if (!compassTrack) return;

  // Generate compass tape: we need enough degrees to cover the visible window
  // plus buffer on each side for smooth scrolling
  // Generate 0-360 twice for seamless wrapping
  const markers = [];

  for (let cycle = 0; cycle < 2; cycle++) {
    for (let deg = 0; deg < 360; deg += 5) {
      const marker = createCompassMarker(deg);
      markers.push(marker);
    }
  }

  compassTrack.innerHTML = markers.join('');
}

function createCompassMarker(degree) {
  const cardinals = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
  const { pixelsPerDegree } = COMPASS_CONFIG;
  const markerWidth = pixelsPerDegree * 5;
  // Use border-box so padding doesn't increase total width
  // Left-align text so the start of the marker = exact degree position
  const baseStyle = `display:inline-block;width:${markerWidth}px;box-sizing:border-box;text-align:left;`;

  // Cardinal directions
  if (cardinals[degree]) {
    return `<span class="cardinal" style="${baseStyle}">${cardinals[degree]}</span>`;
  }

  // Every 10 degrees show the number
  if (degree % 10 === 0) {
    const displayDeg = degree.toString().padStart(3, '0');
    return `<span class="degree" style="${baseStyle}">${displayDeg}</span>`;
  }

  // Every 5 degrees show a tick
  return `<span class="tick" style="${baseStyle}">|</span>`;
}

function updateCompass(heading) {
  const compassTrack = document.getElementById('compassTrack');
  const compassHeading = document.getElementById('compassHeading');
  if (!compassTrack) return;

  // Normalize heading to 0-360
  heading = ((heading % 360) + 360) % 360;

  const { pixelsPerDegree } = COMPASS_CONFIG;

  // Calculate offset to center the heading under the indicator
  // The compass window is 300px wide, so center is at 150px
  // With left-aligned text, marker start = exact degree position
  // Calibration accounts for indicator width and visual alignment
  const centerOffset = 150;
  const indicatorCalibration = 16; // Fine-tune to align indicator tip with exact degree
  const headingPixels = heading * pixelsPerDegree;
  const offset = centerOffset - headingPixels - indicatorCalibration;

  compassTrack.style.transform = `translateX(${offset}px)`;

  // Update heading display
  if (compassHeading) {
    compassHeading.textContent = `${Math.round(heading).toString().padStart(3, '0')}°`;
  }
}

function createRadarThreats() {
  const radarThreatsGroup = document.getElementById('radarThreats');
  if (!radarThreatsGroup) return;

  // Clear existing threats
  radarThreatsGroup.innerHTML = '';
  radarThreats = [];

  // Create 3-5 random threat blips
  const numThreats = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < numThreats; i++) {
    const threat = createThreatBlip();
    radarThreats.push(threat);
    radarThreatsGroup.appendChild(threat.element);
  }
}

function createThreatBlip() {
  const angle = Math.random() * Math.PI * 2;
  const distance = 15 + Math.random() * 35; // Distance from center
  const x = 60 + Math.cos(angle) * distance;
  const y = 60 + Math.sin(angle) * distance;

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', x);
  circle.setAttribute('cy', y);
  circle.setAttribute('r', 3);
  circle.setAttribute('class', 'radar-threat');

  return {
    element: circle,
    angle: angle,
    distance: distance,
    speed: 0.002 + Math.random() * 0.005, // Movement speed
    direction: Math.random() > 0.5 ? 1 : -1
  };
}

function updateRadarThreats() {
  radarThreats.forEach(threat => {
    // Move threat in circular pattern
    threat.angle += threat.speed * threat.direction;

    // Occasionally change distance
    if (Math.random() < 0.01) {
      threat.distance += (Math.random() - 0.5) * 5;
      threat.distance = Math.max(15, Math.min(50, threat.distance));
    }

    const x = 60 + Math.cos(threat.angle) * threat.distance;
    const y = 60 + Math.sin(threat.angle) * threat.distance;

    threat.element.setAttribute('cx', x);
    threat.element.setAttribute('cy', y);
  });
}

export function suspendRadarThreatSimulation() {
  const radarThreatsGroup = document.getElementById('radarThreats');
  radarThreats = [];

  if (radarThreatsGroup) {
    radarThreatsGroup.innerHTML = '';
  }
}

export function resumeRadarThreatSimulation() {
  createRadarThreats();
}

export function updateHudPower(value) {
  const stats = getSuitSystemStats();
  const percentage = Math.round(parseFloat(value));
  simState.power = percentage;

  // Update power value display
  if (dom.hudPowerValue) {
    dom.hudPowerValue.textContent = `${percentage}%`;
  }

  // Update arc gauge
  // The arc path has a full length of ~126 (half circle)
  // strokeDashoffset: 126 = 0%, 0 = 100%
  if (dom.hudPowerArc) {
    const offset = 126 - (percentage / 100) * 126;
    dom.hudPowerArc.style.strokeDashoffset = offset;

    // Update color based on power level
    dom.hudPowerArc.classList.remove('power-critical', 'power-low', 'power-high');
    if (percentage < 20) {
      dom.hudPowerArc.classList.add('power-critical');
    } else if (percentage < 40) {
      dom.hudPowerArc.classList.add('power-low');
    } else if (percentage > 80) {
      dom.hudPowerArc.classList.add('power-high');
    }
  }

  renderHudWarnings();
}

function renderHudWarnings() {
  if (!dom.hudWarnings) return;

  const stats = getSuitSystemStats();
  const systemWarning = stats.warnings.length > 0
    ? `WARNING: ${stats.warnings.slice(0, 2).join(' / ').toUpperCase()}`
    : '';
  const powerWarning = !systemWarning && simState.power < 20
    ? 'WARNING: CRITICAL POWER LEVEL'
    : !systemWarning && simState.power < 40
      ? 'CAUTION: LOW POWER'
      : '';
  const warnings = [systemWarning, powerWarning, simState.flightWarning].filter(Boolean);

  dom.hudWarnings.textContent = warnings.join(' | ');
  dom.hudWarnings.classList.toggle(
    'hud-warning-active',
    Boolean(simState.flightWarning) ||
      simState.power < 20 ||
      stats.warnings.some(warning => /critical|overheat|integrity/i.test(warning))
  );
}

export function updateHudSystemStatus(component, isOnline) {
  const statusMap = {
    helmet: 'hudHelmetStatus',
    chest: 'hudChestStatus',
    arms: 'hudArmsStatus',
    legs: 'hudLegsStatus'
  };

  const domKey = statusMap[component];
  if (domKey && dom[domKey]) {
    if (isOnline) {
      dom[domKey].classList.remove('offline');
    } else {
      dom[domKey].classList.add('offline');
    }
  }
}

// Reset simulation to initial state
export function resetHudSimulation() {
  simState.altitude = 10000;
  simState.speed = 750;
  simState.heading = 42;
  simState.flightWarning = '';
  if (dom.powerSlider) {
    simState.power = parseInt(dom.powerSlider.value, 10);
  }

  // Reset flight controls state
  resetFlightState();

  updateCompass(simState.heading);
  createRadarThreats();

  // Reset cityscape yaw offset
  setCityscapeYawOffset(0);

  const powerFactor = Math.max(0, Math.min(1, simState.power / 100));
  updateThrusterReadouts(getFlightInput(), false, 260 + powerFactor * 650);
  renderFlightReadouts();
  renderHudWarnings();
}

// Export for future use when making heading dynamic
export { updateCompass };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
