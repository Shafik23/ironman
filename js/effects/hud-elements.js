// HUD Elements - Animation and Data Updates
// Handles dynamic HUD element updates (altitude, speed, radar, etc.)

import { dom } from '../dom.js';

let simulationInterval = null;
let radarThreats = [];

// Simulation state
const simState = {
  altitude: 15420,
  speed: 847,
  heading: 45,
  lat: 40.7128,
  lon: -74.006
};

export function initializeHudElements() {
  // Initialize radar threats
  createRadarThreats();
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
  // Gentle drift for altitude (flying sensation)
  simState.altitude += (Math.random() - 0.48) * 50;
  simState.altitude = Math.max(5000, Math.min(35000, simState.altitude));

  // Speed fluctuation
  simState.speed += (Math.random() - 0.5) * 20;
  simState.speed = Math.max(200, Math.min(1500, simState.speed));

  // Heading drift
  simState.heading += (Math.random() - 0.5) * 2;
  if (simState.heading > 360) simState.heading -= 360;
  if (simState.heading < 0) simState.heading += 360;

  // Coordinate drift (very subtle)
  simState.lat += (Math.random() - 0.5) * 0.0001;
  simState.lon += (Math.random() - 0.5) * 0.0001;

  // Update DOM elements
  if (dom.hudAltitude) {
    dom.hudAltitude.textContent = Math.round(simState.altitude).toLocaleString();
  }
  if (dom.hudSpeed) {
    dom.hudSpeed.textContent = Math.round(simState.speed);
  }
  if (dom.hudLat) {
    dom.hudLat.textContent = `${simState.lat.toFixed(4)} N`;
  }
  if (dom.hudLon) {
    dom.hudLon.textContent = `${Math.abs(simState.lon).toFixed(4)} W`;
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
  simState.altitude = 15420;
  simState.speed = 847;
  simState.heading = 45;
  simState.lat = 40.7128;
  simState.lon = -74.006;

  createRadarThreats();
}
