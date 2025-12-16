// HUD Elements - Animation and Data Updates
// Handles dynamic HUD element updates (altitude, speed, radar, etc.)

import { dom } from '../dom.js';

let simulationInterval = null;
let radarThreats = [];

// Simulation state
const simState = {
  altitude: 10000,
  speed: 750,
  heading: 42
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

  // Set initial heading display
  updateCompass(simState.heading);
}

export function startHudSimulation() {
  if (simulationInterval) return;

  simulationInterval = setInterval(() => {
    updateFlightData();
    updateRadarThreats();
  }, 100);
}

export function stopHudSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}

function updateFlightData() {
  // Static values for now - will be made dynamic based on user input later
  if (dom.hudAltitude) {
    dom.hudAltitude.textContent = Math.round(simState.altitude).toLocaleString();
  }
  if (dom.hudSpeed) {
    dom.hudSpeed.textContent = Math.round(simState.speed);
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

export function updateHudPower(value) {
  const percentage = parseInt(value, 10);

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

  // Update warnings based on power
  if (dom.hudWarnings) {
    if (percentage < 20) {
      dom.hudWarnings.textContent = 'WARNING: CRITICAL POWER LEVEL';
      dom.hudWarnings.classList.add('hud-warning-active');
    } else if (percentage < 40) {
      dom.hudWarnings.textContent = 'CAUTION: LOW POWER';
      dom.hudWarnings.classList.remove('hud-warning-active');
    } else {
      dom.hudWarnings.textContent = '';
      dom.hudWarnings.classList.remove('hud-warning-active');
    }
  }
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

  updateCompass(simState.heading);
  createRadarThreats();
}

// Export for future use when making heading dynamic
export { updateCompass };
