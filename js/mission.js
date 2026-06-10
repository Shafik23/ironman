import { dom } from './dom.js';
import { state } from './state.js';
import { events } from './events.js';
import { EventTypes } from './event-types.js';
import { isSuitModeActive } from './suit-model.js';
import {
  suspendRadarThreatSimulation,
  resumeRadarThreatSimulation
} from './effects/hud-elements.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MISSION_DURATION = 45;
const THREAT_TOTAL = 6;
const RADAR_CENTER = 60;
const RADAR_RADIUS = 52;
const BREACH_RADIUS = 7;
const LOCK_RADIUS = 18;

let threatSequence = 0;

export function setupMissionLoop() {
  dom.hudMissionAction?.addEventListener('click', handleMissionAction);

  document.addEventListener('keydown', event => {
    if (event.code !== 'Space' || state.mission.status !== 'active') return;

    event.preventDefault();
    fireAtLockedThreat();
  });

  events.on(EventTypes.HUD_DEACTIVATED, () => {
    if (state.mission.status === 'active') {
      failMission('HUD link lost');
    }
  });

  events.on(EventTypes.SHUTDOWN_START, () => {
    if (state.mission.status === 'active') {
      failMission('Emergency shutdown');
    }
  });

  updateMissionUI();
}

function handleMissionAction() {
  if (state.mission.status === 'active') {
    fireAtLockedThreat();
    return;
  }

  startMission();
}

function startMission() {
  if (state.mission.status === 'active') return;

  if (!isSuitModeActive('hud')) {
    dom.hudToggle?.click();
  }

  resetMissionState('active');
  state.mission.totalThreats = THREAT_TOTAL;
  state.mission.timeRemaining = MISSION_DURATION;

  suspendRadarThreatSimulation();
  createMissionThreats();
  startMissionTimer();
  startThreatMotion();
  updateMissionUI();

  events.emit(EventTypes.MISSION_START, {
    totalThreats: state.mission.totalThreats,
    duration: MISSION_DURATION
  });
}

function resetMissionState(status = 'idle') {
  stopMissionClock();
  stopThreatMotion();
  clearMissionThreats();

  state.mission.status = status;
  state.mission.neutralized = 0;
  state.mission.totalThreats = 0;
  state.mission.timeRemaining = MISSION_DURATION;
  state.mission.lockedThreatId = null;
}

function createMissionThreats() {
  if (!dom.radarThreats) return;

  const threats = [];

  for (let index = 0; index < THREAT_TOTAL; index += 1) {
    const angle = (Math.PI * 2 * index) / THREAT_TOTAL + Math.random() * 0.45;
    const distance = 34 + Math.random() * 15;
    const x = RADAR_CENTER + Math.cos(angle) * distance;
    const y = RADAR_CENTER + Math.sin(angle) * distance;
    const threat = {
      id: `drone-${++threatSequence}`,
      x,
      y,
      speed: 0.018 + Math.random() * 0.016,
      drift: (Math.random() - 0.5) * 0.32,
      angle,
      element: createThreatElement(x, y)
    };

    threat.element.dataset.threatId = threat.id;
    threat.element.addEventListener('click', event => {
      event.stopPropagation();
      neutralizeThreat(threat.id);
    });

    threats.push(threat);
    dom.radarThreats.appendChild(threat.element);
  }

  state.mission.threats = threats;
}

function createThreatElement(x, y) {
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'mission-threat');
  group.setAttribute('transform', `translate(${x} ${y})`);

  const ring = document.createElementNS(SVG_NS, 'circle');
  ring.setAttribute('class', 'mission-threat-ring');
  ring.setAttribute('r', '6');

  const core = document.createElementNS(SVG_NS, 'circle');
  core.setAttribute('class', 'mission-threat-core');
  core.setAttribute('r', '3.5');

  group.append(ring, core);
  return group;
}

function startMissionTimer() {
  stopMissionClock();

  state.mission.timerId = setInterval(() => {
    if (state.mission.status !== 'active') return;

    state.mission.timeRemaining -= 1;

    if (state.mission.timeRemaining <= 0) {
      failMission('Mission timer expired');
      return;
    }

    updateMissionUI();
  }, 1000);
}

function startThreatMotion() {
  stopThreatMotion();

  const update = () => {
    if (state.mission.status !== 'active') return;

    let closestThreat = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    state.mission.threats.forEach(threat => {
      threat.angle += threat.drift * 0.02;

      const dx = RADAR_CENTER - threat.x;
      const dy = RADAR_CENTER - threat.y;
      const distance = Math.max(1, Math.hypot(dx, dy));

      threat.x += (dx / distance) * threat.speed;
      threat.y += (dy / distance) * threat.speed;
      threat.x += Math.cos(threat.angle + Math.PI / 2) * threat.drift * 0.018;
      threat.y += Math.sin(threat.angle + Math.PI / 2) * threat.drift * 0.018;

      const nextDistance = Math.hypot(RADAR_CENTER - threat.x, RADAR_CENTER - threat.y);

      if (nextDistance > RADAR_RADIUS) {
        const clampRatio = RADAR_RADIUS / nextDistance;
        threat.x = RADAR_CENTER + (threat.x - RADAR_CENTER) * clampRatio;
        threat.y = RADAR_CENTER + (threat.y - RADAR_CENTER) * clampRatio;
      }

      threat.element.setAttribute('transform', `translate(${threat.x} ${threat.y})`);

      if (nextDistance < closestDistance) {
        closestThreat = threat;
        closestDistance = nextDistance;
      }
    });

    if (closestDistance <= BREACH_RADIUS) {
      failMission('Drone perimeter breached');
      return;
    }

    updateTargetLock(closestThreat, closestDistance);
    state.mission.motionFrame = requestAnimationFrame(update);
  };

  state.mission.motionFrame = requestAnimationFrame(update);
}

function updateTargetLock(threat, distance) {
  const lockedThreatId = threat && distance <= LOCK_RADIUS ? threat.id : null;
  state.mission.lockedThreatId = lockedThreatId;

  state.mission.threats.forEach(candidate => {
    candidate.element.classList.toggle('locked', candidate.id === lockedThreatId);
  });

  dom.targetLock?.classList.toggle('hidden', !lockedThreatId);
}

function fireAtLockedThreat() {
  if (!state.mission.lockedThreatId) {
    pulseMissionState('NO LOCK');
    return;
  }

  neutralizeThreat(state.mission.lockedThreatId);
}

function neutralizeThreat(threatId) {
  if (state.mission.status !== 'active') return;

  const threat = state.mission.threats.find(candidate => candidate.id === threatId);
  if (!threat) return;

  threat.element.remove();
  state.mission.threats = state.mission.threats.filter(candidate => candidate.id !== threatId);
  state.mission.neutralized += 1;

  events.emit(EventTypes.MISSION_THREAT_NEUTRALIZED, {
    neutralized: state.mission.neutralized,
    totalThreats: state.mission.totalThreats
  });

  if (state.mission.neutralized >= state.mission.totalThreats) {
    completeMission();
    return;
  }

  updateMissionUI();
}

function completeMission() {
  stopMissionClock();
  stopThreatMotion();
  clearMissionThreats();
  resumeRadarThreatSimulation();

  state.mission.status = 'success';
  state.mission.lockedThreatId = null;
  dom.targetLock?.classList.add('hidden');
  updateMissionUI();

  events.emit(EventTypes.MISSION_SUCCESS, {
    neutralized: state.mission.neutralized,
    totalThreats: state.mission.totalThreats
  });
}

function failMission(reason) {
  stopMissionClock();
  stopThreatMotion();
  clearMissionThreats();
  resumeRadarThreatSimulation();

  state.mission.status = 'failed';
  state.mission.lockedThreatId = null;
  dom.targetLock?.classList.add('hidden');
  updateMissionUI(reason);

  events.emit(EventTypes.MISSION_FAILURE, { reason });
}

function clearMissionThreats() {
  state.mission.threats.forEach(threat => threat.element.remove());
  state.mission.threats = [];
}

function stopMissionClock() {
  if (!state.mission.timerId) return;

  clearInterval(state.mission.timerId);
  state.mission.timerId = null;
}

function stopThreatMotion() {
  if (!state.mission.motionFrame) return;

  cancelAnimationFrame(state.mission.motionFrame);
  state.mission.motionFrame = null;
}

function updateMissionUI(reason = '') {
  const mission = state.mission;
  const total = mission.totalThreats || THREAT_TOTAL;
  const progress = total > 0 ? (mission.neutralized / total) * 100 : 0;

  if (dom.hudMissionState) {
    dom.hudMissionState.textContent = getMissionStateLabel(mission.status, reason);
  }

  if (dom.hudMissionTimer) {
    dom.hudMissionTimer.textContent = formatMissionTime(mission.timeRemaining || MISSION_DURATION);
  }

  if (dom.hudMissionCount) {
    dom.hudMissionCount.textContent = `${mission.neutralized}/${total}`;
  }

  if (dom.hudMissionProgress) {
    dom.hudMissionProgress.style.width = `${progress}%`;
  }

  if (dom.hudMissionAction) {
    dom.hudMissionAction.textContent = mission.status === 'active' ? 'REPULSOR FIRE' : 'ENGAGE';
  }

  if (dom.hudMissionPanel) {
    dom.hudMissionPanel.classList.toggle('mission-active', mission.status === 'active');
    dom.hudMissionPanel.classList.toggle('mission-success', mission.status === 'success');
    dom.hudMissionPanel.classList.toggle('mission-failed', mission.status === 'failed');
  }
}

function pulseMissionState(label) {
  if (!dom.hudMissionState) return;

  const currentLabel = dom.hudMissionState.textContent;
  dom.hudMissionState.textContent = label;

  setTimeout(() => {
    if (state.mission.status === 'active') {
      dom.hudMissionState.textContent = currentLabel;
    }
  }, 500);
}

function getMissionStateLabel(status, reason) {
  switch (status) {
    case 'active':
      return 'INTERCEPT';
    case 'success':
      return 'SECURED';
    case 'failed':
      return reason ? reason.toUpperCase() : 'FAILED';
    default:
      return 'STANDBY';
  }
}

function formatMissionTime(seconds) {
  const clamped = Math.max(0, seconds);
  return `00:${clamped.toString().padStart(2, '0')}`;
}
