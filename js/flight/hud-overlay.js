// HUD Overlay - drives the DOM heads-up display from flight engine snapshots
// Compass tape, pitch ladder, target brackets, radar, gauges and warnings.

import { dom } from '../dom.js';
import { events } from '../events.js';
import { EventTypes } from '../event-types.js';
import { getSuitSystemStats } from '../systems.js';

const COMPASS_PX_PER_DEG = 4;
const COMPASS_CENTER = 150;
const COMPASS_CALIBRATION = 16;
const PITCH_PX_PER_DEG = 6.5;
const TARGET_POOL_SIZE = 8;
const RADAR_RANGE = 800;
const TEXT_REFRESH = 0.1; // seconds between numeric readout updates

const state = {
  initialized: false,
  targetBoxes: [],
  textTimer: 0,
  lastCrashed: false,
  radarSweep: 0,
  bannerTimer: null,
  power: 85
};

export function initializeHudOverlay() {
  if (state.initialized) return;
  state.initialized = true;

  buildCompassTape();
  buildPitchLadder();
  buildTargetPool();

  events.on(EventTypes.MISSION_START, ({ wave, totalThreats }) => {
    showBanner(`WAVE ${wave} — ${totalThreats} HOSTILES DETECTED`, 'incoming');
  });
  events.on(EventTypes.MISSION_SUCCESS, ({ wave }) => {
    showBanner(`WAVE ${wave} CLEARED — AIRSPACE SECURED`, 'cleared');
  });
}

/** Called by the engine every rendered frame. */
export function updateHudOverlay(snapshot) {
  updateCompass(snapshot.heading);
  updatePitchLadder(snapshot.pitch, snapshot.bank);
  updateTargets(snapshot);
  updateThreatArrow(snapshot.threatArrow);
  updateRadar(snapshot);
  updateGauntlets(snapshot.fireFlash);
  updateEffectsChrome(snapshot);

  state.textTimer -= snapshot.dt ?? 0.016;
  if (state.textTimer <= 0) {
    state.textTimer = TEXT_REFRESH;
    updateReadouts(snapshot);
    updateWarnings(snapshot);
    updateThrustGauge(snapshot);
  }
}

export function updateHudPower(value) {
  const percentage = Math.round(parseFloat(value));
  state.power = percentage;

  if (dom.hudPowerValue) {
    dom.hudPowerValue.textContent = `${percentage}%`;
  }

  if (dom.hudPowerArc) {
    // Arc path length is ~126 (half circle): 126 = empty, 0 = full
    dom.hudPowerArc.style.strokeDashoffset = 126 - (percentage / 100) * 126;
    dom.hudPowerArc.classList.remove('power-critical', 'power-low', 'power-high');
    if (percentage < 20) {
      dom.hudPowerArc.classList.add('power-critical');
    } else if (percentage < 40) {
      dom.hudPowerArc.classList.add('power-low');
    } else if (percentage > 80) {
      dom.hudPowerArc.classList.add('power-high');
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

  const element = dom[statusMap[component]];
  if (element) {
    element.classList.toggle('offline', !isOnline);
  }

  if (component === 'helmet' && dom.hudElements) {
    dom.hudElements.classList.toggle('hud-degraded', !isOnline);
  }
}

export function setRepulsorStatus(online) {
  if (dom.hudRepulsorStatus) {
    dom.hudRepulsorStatus.textContent = online ? 'READY' : 'OFFLINE';
    dom.hudRepulsorStatus.classList.toggle('offline', !online);
  }
}

// --- Compass -------------------------------------------------------------------

function buildCompassTape() {
  if (!dom.compassTrack) return;

  const cardinals = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
  const markerWidth = COMPASS_PX_PER_DEG * 5;
  const baseStyle = `display:inline-block;width:${markerWidth}px;box-sizing:border-box;text-align:left;`;
  const markers = [];

  for (let cycle = 0; cycle < 2; cycle += 1) {
    for (let deg = 0; deg < 360; deg += 5) {
      if (cardinals[deg] !== undefined) {
        markers.push(`<span class="cardinal" style="${baseStyle}">${cardinals[deg]}</span>`);
      } else if (deg % 10 === 0) {
        markers.push(`<span class="degree" style="${baseStyle}">${String(deg).padStart(3, '0')}</span>`);
      } else {
        markers.push(`<span class="tick" style="${baseStyle}">|</span>`);
      }
    }
  }

  dom.compassTrack.innerHTML = markers.join('');
}

function updateCompass(heading) {
  if (!dom.compassTrack) return;

  const normalized = ((heading % 360) + 360) % 360;
  const offset = COMPASS_CENTER - normalized * COMPASS_PX_PER_DEG - COMPASS_CALIBRATION;
  dom.compassTrack.style.transform = `translateX(${offset}px)`;

  if (dom.compassHeading) {
    dom.compassHeading.textContent = `${String(Math.round(normalized) % 360).padStart(3, '0')}°`;
  }
}

// --- Pitch ladder -----------------------------------------------------------------

function buildPitchLadder() {
  if (!dom.hudPitchLadder) return;

  const lines = [];
  for (let deg = -60; deg <= 60; deg += 10) {
    const offset = -deg * PITCH_PX_PER_DEG;
    if (deg === 0) {
      lines.push(`<div class="ladder-line horizon" style="transform:translateY(${offset}px)"><span></span><span></span></div>`);
    } else {
      const label = Math.abs(deg);
      lines.push(
        `<div class="ladder-line ${deg > 0 ? 'up' : 'down'}" style="transform:translateY(${offset}px)">` +
          `<i>${label}</i><span></span><span></span><i>${label}</i></div>`
      );
    }
  }
  dom.hudPitchLadder.innerHTML = lines.join('');
}

function updatePitchLadder(pitch, bank) {
  if (!dom.hudPitchLadder) return;
  dom.hudPitchLadder.style.transform =
    `rotate(${bank.toFixed(2)}deg) translateY(${(pitch * PITCH_PX_PER_DEG).toFixed(1)}px)`;
}

// --- Targets & threat arrow ---------------------------------------------------------

function buildTargetPool() {
  if (!dom.hudTargets) return;

  for (let i = 0; i < TARGET_POOL_SIZE; i += 1) {
    const box = document.createElement('div');
    box.className = 'target-box';
    box.innerHTML =
      '<div class="target-ring"></div>' +
      '<span class="corner tl"></span><span class="corner tr"></span>' +
      '<span class="corner bl"></span><span class="corner br"></span>' +
      '<div class="target-distance"></div>';
    box.style.display = 'none';
    dom.hudTargets.appendChild(box);
    state.targetBoxes.push(box);
  }
}

function updateTargets(snapshot) {
  state.targetBoxes.forEach((box, i) => {
    const target = snapshot.targets[i];
    if (!target) {
      box.style.display = 'none';
      return;
    }

    box.style.display = 'block';
    box.style.transform = `translate(${target.x.toFixed(0)}px, ${target.y.toFixed(0)}px)`;
    box.className = `target-box ${target.state}`;
    box.querySelector('.target-distance').textContent = `${Math.round(target.distance)}m`;
    box.querySelector('.target-ring').style.setProperty('--lock-progress', `${target.progress * 100}%`);
  });

  if (dom.targetLock) {
    dom.targetLock.classList.toggle('hidden', snapshot.lock.state !== 'locked');
  }

  const reticle = document.querySelector('.targeting-reticle');
  if (reticle) {
    reticle.classList.toggle('locked', snapshot.lock.state === 'locked');
    reticle.classList.toggle('locking', snapshot.lock.state === 'locking');
  }
}

function updateThreatArrow(threatArrow) {
  if (!dom.hudThreatArrow) return;

  if (!threatArrow) {
    dom.hudThreatArrow.style.display = 'none';
    return;
  }

  dom.hudThreatArrow.style.display = 'block';
  dom.hudThreatArrow.style.transform = `rotate(${threatArrow.angle.toFixed(1)}deg) translateY(-150px)`;
}

// --- Radar ----------------------------------------------------------------------

function updateRadar(snapshot) {
  const canvas = dom.hudRadarCanvas;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 6;

  ctx.clearRect(0, 0, size, size);

  // Rings and crosshairs
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  [radius, radius * 0.66, radius * 0.33].forEach(r => {
    ctx.beginPath();
    ctx.arc(center, center, r, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(center, center - radius);
  ctx.lineTo(center, center + radius);
  ctx.moveTo(center - radius, center);
  ctx.lineTo(center + radius, center);
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
  ctx.stroke();

  // Sweep
  state.radarSweep += 0.045;
  const sweepGradient = ctx.createConicGradient
    ? ctx.createConicGradient(state.radarSweep, center, center)
    : null;
  if (sweepGradient) {
    sweepGradient.addColorStop(0, 'rgba(0, 255, 255, 0.28)');
    sweepGradient.addColorStop(0.12, 'rgba(0, 255, 255, 0)');
    sweepGradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
    ctx.fillStyle = sweepGradient;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // North marker rotates with heading (radar is heading-up)
  const northAngle = (-snapshot.heading * Math.PI) / 180;
  ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
  ctx.font = '9px Orbitron, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    'N',
    center + Math.sin(northAngle) * (radius - 7),
    center - Math.cos(northAngle) * (radius - 7) + 3
  );

  // Stark Tower nav marker
  if (snapshot.tower) {
    const distance = Math.min(snapshot.tower.distance, RADAR_RANGE);
    const angle = (snapshot.tower.angle * Math.PI) / 180;
    const r = (distance / RADAR_RANGE) * radius;
    ctx.fillStyle = 'rgba(125, 242, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(center + Math.sin(angle) * r, center - Math.cos(angle) * r, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Drone blips
  snapshot.radar.forEach(contact => {
    if (contact.distance > RADAR_RANGE) return;
    const angle = (contact.angle * Math.PI) / 180;
    const r = (contact.distance / RADAR_RANGE) * radius;
    const x = center + Math.sin(angle) * r;
    const y = center - Math.cos(angle) * r;

    ctx.fillStyle = 'rgba(255, 70, 70, 0.95)';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 70, 70, 0.35)';
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Player marker
  ctx.fillStyle = 'rgba(0, 255, 255, 1)';
  ctx.beginPath();
  ctx.moveTo(center, center - 5);
  ctx.lineTo(center - 4, center + 4);
  ctx.lineTo(center + 4, center + 4);
  ctx.closePath();
  ctx.fill();
}

// --- Readouts, gauges, warnings ------------------------------------------------------

function updateReadouts(snapshot) {
  if (dom.hudAltitude) {
    dom.hudAltitude.textContent = Math.round(snapshot.altitude * 3.281).toLocaleString();
  }
  if (dom.hudSpeed) {
    dom.hudSpeed.textContent = Math.round(snapshot.speed * 1.944);
  }
  if (dom.hudScore) {
    dom.hudScore.textContent = snapshot.score.toLocaleString();
  }
  if (dom.hudWave) {
    dom.hudWave.textContent = snapshot.wave > 0 ? `WAVE ${snapshot.wave}` : 'PATROL';
  }
  if (dom.hudThreats) {
    dom.hudThreats.textContent = snapshot.waveIncoming > 0
      ? `NEXT +${snapshot.waveIncoming}s`
      : `HOSTILES ${snapshot.threatsRemaining}/${snapshot.waveTotal}`;
  }
}

function updateThrustGauge(snapshot) {
  if (dom.hudThrusterBar) {
    const ratio = Math.min(1, snapshot.speed / 400);
    dom.hudThrusterBar.style.width = `${Math.round(ratio * 100)}%`;
    dom.hudThrusterBar.classList.toggle('boosting', snapshot.boosting);
  }

  if (dom.hudThrusterStatus) {
    if (snapshot.boosting) {
      dom.hudThrusterStatus.textContent = 'BOOST';
    } else if (snapshot.flags.boostDenied) {
      dom.hudThrusterStatus.textContent = 'LIMITED';
    } else if (snapshot.pitch > 6) {
      dom.hudThrusterStatus.textContent = 'CLIMB';
    } else if (snapshot.pitch < -6) {
      dom.hudThrusterStatus.textContent = 'DIVE';
    } else {
      dom.hudThrusterStatus.textContent = 'CRUISE';
    }
  }
}

function updateWarnings(snapshot) {
  if (!dom.hudWarnings) return;

  const warnings = [];
  const flags = snapshot.flags;

  if (flags.crashed) warnings.push('AIRFRAME IMPACT');
  if (flags.repulsorsOffline) warnings.push('REPULSORS OFFLINE');
  if (flags.boostDenied) warnings.push('BOOST LIMITED: ARC OUTPUT BELOW 30%');
  if (flags.stalling) warnings.push('STALL WARNING: INCREASE THRUST');
  if (flags.terrain) warnings.push('TERRAIN ALERT: CLIMB');
  if (flags.ceiling) warnings.push('SERVICE CEILING REACHED');

  const stats = getSuitSystemStats();
  if (stats.warnings.length > 0) {
    warnings.push(`WARNING: ${stats.warnings.slice(0, 2).join(' / ').toUpperCase()}`);
  } else if (state.power < 20) {
    warnings.push('WARNING: CRITICAL POWER LEVEL');
  } else if (state.power < 40) {
    warnings.push('CAUTION: LOW POWER');
  }

  dom.hudWarnings.textContent = warnings.join(' | ');
  dom.hudWarnings.classList.toggle(
    'hud-warning-active',
    flags.crashed ||
      flags.stalling ||
      flags.terrain ||
      state.power < 20 ||
      stats.warnings.some(warning => /critical|overheat|integrity/i.test(warning))
  );
}

// --- Chrome flourishes ---------------------------------------------------------------

function updateGauntlets(fireFlash) {
  if (fireFlash === 1 && dom.gauntletLeft) {
    flashElement(dom.gauntletLeft, 'firing');
  } else if (fireFlash === 2 && dom.gauntletRight) {
    flashElement(dom.gauntletRight, 'firing');
  }
}

function updateEffectsChrome(snapshot) {
  if (dom.hudBoostVignette) {
    dom.hudBoostVignette.classList.toggle('active', snapshot.boosting);
  }

  if (snapshot.flags.crashed && !state.lastCrashed && dom.hudDamageFlash) {
    flashElement(dom.hudDamageFlash, 'active');
  }
  state.lastCrashed = snapshot.flags.crashed;
}

function flashElement(element, className) {
  element.classList.remove(className);
  void element.offsetWidth; // restart the CSS animation
  element.classList.add(className);
}

function showBanner(text, tone) {
  if (!dom.hudWaveBanner) return;

  dom.hudWaveBanner.textContent = text;
  dom.hudWaveBanner.className = `hud-wave-banner visible ${tone}`;

  clearTimeout(state.bannerTimer);
  state.bannerTimer = setTimeout(() => {
    dom.hudWaveBanner.classList.remove('visible');
  }, 2600);
}
