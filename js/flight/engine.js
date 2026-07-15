// Flight Engine - three.js orchestrator for HUD mode
// Owns the renderer, game loop, flight state, lock-on combat and wave logic.
// Emits MISSION_* events on the app bus; per-frame HUD data flows through onFrame.

import * as THREE from '../vendor/three.module.min.js';
import { events } from '../events.js';
import { EventTypes } from '../event-types.js';
import { createFlightState, stepFlight } from './physics.js';
import { attachFlightInput, getFlightInput, consumeFirePressed, releaseAllKeys, triggerFire } from './input.js';
import { createSky, HORIZON_COLOR } from './sky.js';
import { createCity, TILE_SIZE } from './city.js';
import { createDroneSystem } from './drones.js';
import { createEffects } from './effects.js';
import {
  resumeFlightAudio,
  suspendFlightAudio,
  setThrusterLevel,
  playRepulsorSound,
  playExplosionSound,
  playLockSound,
  playCrashSound
} from './audio.js';

const LOCK_CONE = THREE.MathUtils.degToRad(9);
const LOCK_RANGE = 850;
const LOCK_TIME = 0.75;
const LOCK_DECAY = 0.35;
const FIRE_COOLDOWN = 0.22;
const FIRST_WAVE_DELAY = 3;
const WAVE_BREAK = 5;
const MAX_WAVE_SIZE = 8;
const CRASH_SCORE_PENALTY = 50;

export function createFlightEngine({ canvas, onFrame }) {
  // --- Scene setup -------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(HORIZON_COLOR, 0.00125);

  const rig = new THREE.Object3D();
  rig.rotation.order = 'YXZ';
  const camera = new THREE.PerspectiveCamera(68, 1, 0.5, 5200);
  rig.add(camera);
  scene.add(rig);

  const sky = createSky();
  scene.add(sky.group);

  const city = createCity();
  scene.add(city.group);

  const droneSystem = createDroneSystem(scene);
  const effects = createEffects(scene, rig);

  attachFlightInput();
  canvas.addEventListener('pointerdown', triggerFire);

  // --- Game state ----------------------------------------------------------------
  const flight = createFlightState();
  const env = { power: 85, thrustersOnline: true, repulsorsOnline: true, helmetOnline: true };
  const lock = { target: null, progress: 0, locked: false };

  let running = false;
  let animationFrame = null;
  let elapsed = 0;
  let lastTime = 0;
  let score = 0;
  let wave = 0;
  let waveTotal = 0;
  let waveKills = 0;
  let waveActive = false;
  let waveBreakTimer = FIRST_WAVE_DELAY;
  let fireCooldown = 0;
  let nextHand = 1;
  let fireFlash = 0;
  let shake = 0;
  let crashTimer = 0;
  let repulsorDeniedTimer = 0;

  resetFlightPose();

  // --- Public API ------------------------------------------------------------------
  function start() {
    if (running) return;
    running = true;
    resumeFlightAudio();
    resize();
    window.addEventListener('resize', resize);
    lastTime = performance.now();
    animationFrame = requestAnimationFrame(tick);
  }

  function stop() {
    if (!running) return;
    running = false;
    window.removeEventListener('resize', resize);
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    releaseAllKeys();
    setThrusterLevel(0, false);
    suspendFlightAudio();
  }

  function setEnvironment(patch) {
    Object.assign(env, patch);
  }

  function resetMission() {
    droneSystem.clear();
    effects.reset();
    score = 0;
    wave = 0;
    waveActive = false;
    waveBreakTimer = FIRST_WAVE_DELAY;
    resetLock();
    resetFlightPose();
  }

  // --- Internals ---------------------------------------------------------------------
  function resetFlightPose() {
    // Spawn on approach to Stark Tower so the landmark frames the boot view
    flight.x = 420;
    flight.y = 250;
    flight.z = 940;
    flight.heading = 335;
    flight.pitch = 0;
    flight.bank = 0;
    flight.speed = 120;
  }

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function tick(now) {
    if (!running) return;
    animationFrame = requestAnimationFrame(tick);

    const dt = Math.min(0.05, Math.max(0.0001, (now - lastTime) / 1000));
    lastTime = now;
    elapsed += dt;

    const input = getFlightInput();
    stepFlight(flight, input, env, dt);
    handleCollisions();
    wrapWorld();

    rig.position.set(flight.x, flight.y, flight.z);
    rig.rotation.set(
      THREE.MathUtils.degToRad(flight.pitch),
      -THREE.MathUtils.degToRad(flight.heading),
      -THREE.MathUtils.degToRad(flight.bank)
    );
    updateCameraFeel(dt);

    sky.update(dt, rig.position);
    city.update(dt, elapsed);
    droneSystem.update(dt, elapsed, rig.position, city.sampleHeight);

    updateWaves(dt);
    updateLock(dt);
    updateFiring(dt);
    handleBoltHits(dt);
    effects.updateExplosions(dt);
    effects.updateStreaks(dt, flight.speed, flight.boosting);

    setThrusterLevel(Math.min(1, flight.speed / 380), flight.boosting);

    crashTimer = Math.max(0, crashTimer - dt);
    repulsorDeniedTimer = Math.max(0, repulsorDeniedTimer - dt);

    renderer.render(scene, camera);

    if (onFrame) {
      onFrame(buildSnapshot(dt));
      fireFlash = 0;
    }
  }

  function handleCollisions() {
    const clearance = city.sampleHeight(flight.x, flight.z);
    if (flight.y >= clearance + 2) return;

    // Bounce back out of the building and bleed speed
    const headingRad = THREE.MathUtils.degToRad(flight.heading);
    flight.x -= Math.sin(headingRad) * 30;
    flight.z += Math.cos(headingRad) * 30;
    flight.y = Math.max(flight.y, city.sampleHeight(flight.x, flight.z) + 12, clearance + 12);
    flight.speed = Math.max(26, flight.speed * 0.25);
    flight.pitch = Math.max(flight.pitch, 8);

    shake = 1;
    crashTimer = 2;
    score = Math.max(0, score - CRASH_SCORE_PENALTY);
    playCrashSound();
  }

  function wrapWorld() {
    const half = TILE_SIZE / 2;
    let dx = 0;
    let dz = 0;

    if (flight.x > half) dx = -TILE_SIZE;
    else if (flight.x < -half) dx = TILE_SIZE;
    if (flight.z > half) dz = -TILE_SIZE;
    else if (flight.z < -half) dz = TILE_SIZE;

    if (dx === 0 && dz === 0) return;

    flight.x += dx;
    flight.z += dz;
    droneSystem.shiftWorld(dx, dz);
    effects.shiftWorld(dx, dz);
  }

  function updateCameraFeel(dt) {
    const speedNorm = Math.min(1, flight.speed / 380);
    const targetFov = 68 + speedNorm * 10 + (flight.boosting ? 8 : 0);
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov += (targetFov - camera.fov) * Math.min(1, 5 * dt);
      camera.updateProjectionMatrix();
    }

    shake = Math.max(0, shake - 2.6 * dt);
    const wobble = shake * 0.9;
    camera.position.set(
      (Math.random() - 0.5) * wobble,
      (Math.random() - 0.5) * wobble,
      0
    );
  }

  function updateWaves(dt) {
    if (waveActive) return;

    waveBreakTimer -= dt;
    if (waveBreakTimer > 0) return;

    wave += 1;
    waveTotal = Math.min(2 + wave, MAX_WAVE_SIZE);
    waveKills = 0;
    waveActive = true;
    droneSystem.spawnWave(waveTotal, rig.position, city.sampleHeight);

    events.emit(EventTypes.MISSION_START, { wave, totalThreats: waveTotal });
  }

  function updateLock(dt) {
    const forward = getForward();
    let candidate = null;
    let bestAngle = LOCK_CONE;

    droneSystem.drones.forEach(drone => {
      const offset = drone.group.position.clone().sub(rig.position);
      const distance = offset.length();
      if (distance > LOCK_RANGE || distance < 4) return;

      const angle = forward.angleTo(offset.normalize());
      if (angle < bestAngle) {
        bestAngle = angle;
        candidate = drone;
      }
    });

    const wasLocked = lock.locked;

    if (candidate) {
      if (candidate !== lock.target) {
        lock.target = candidate;
        lock.progress = 0;
      }
      lock.progress = Math.min(1, lock.progress + dt / LOCK_TIME);
    } else {
      lock.progress -= dt / LOCK_DECAY;
      if (lock.progress <= 0) {
        lock.progress = 0;
        lock.target = null;
      }
    }

    lock.locked = Boolean(lock.target) && lock.progress >= 1;
    if (lock.locked && !wasLocked) {
      playLockSound();
    }

    droneSystem.drones.forEach(drone => {
      drone.locked = lock.locked && drone === lock.target;
    });
  }

  function updateFiring(dt) {
    fireCooldown = Math.max(0, fireCooldown - dt);
    if (!consumeFirePressed()) return;

    if (!env.repulsorsOnline) {
      repulsorDeniedTimer = 1.5;
      return;
    }
    if (fireCooldown > 0) return;

    fireCooldown = FIRE_COOLDOWN;
    nextHand = -nextHand;

    const origin = rig.localToWorld(new THREE.Vector3(nextHand * 1.7, -1.4, -2.5));
    const target = lock.locked ? lock.target : null;
    const direction = target
      ? target.group.position.clone().sub(origin).normalize()
      : getForward();

    effects.fireBolt(origin, direction, target);
    playRepulsorSound();
    fireFlash = nextHand > 0 ? 2 : 1; // 1 = left gauntlet, 2 = right
  }

  function handleBoltHits(dt) {
    const hits = effects.updateBolts(dt, droneSystem.drones);

    hits.forEach(({ drone }) => {
      const position = drone.group.position.clone();
      effects.spawnExplosion(position);

      const distance = position.distanceTo(rig.position);
      playExplosionSound(Math.max(0.15, 1 - distance / 500));
      shake = Math.max(shake, 0.5 * Math.max(0.2, 1 - distance / 400));

      droneSystem.remove(drone);
      if (lock.target === drone) resetLock();

      waveKills += 1;
      score += 100 + wave * 25;
      events.emit(EventTypes.MISSION_THREAT_NEUTRALIZED, {
        neutralized: waveKills,
        totalThreats: waveTotal
      });

      if (waveActive && droneSystem.drones.length === 0) {
        waveActive = false;
        waveBreakTimer = WAVE_BREAK;
        score += 250;
        events.emit(EventTypes.MISSION_SUCCESS, { wave, neutralized: waveKills, totalThreats: waveTotal });
      }
    });
  }

  function resetLock() {
    lock.target = null;
    lock.progress = 0;
    lock.locked = false;
  }

  function getForward() {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(rig.quaternion);
  }

  function buildSnapshot(dt) {
    const width = renderer.domElement.clientWidth || window.innerWidth;
    const height = renderer.domElement.clientHeight || window.innerHeight;
    const forward = getForward();

    const targets = [];
    const radar = [];
    let nearestOffscreen = null;

    droneSystem.drones.forEach(drone => {
      const offset = drone.group.position.clone().sub(rig.position);
      const distance = offset.length();
      const inFront = forward.dot(offset) > 0;
      const bearing = THREE.MathUtils.radToDeg(Math.atan2(offset.x, -offset.z));

      radar.push({ angle: normalizeAngle(bearing - flight.heading), distance });

      const projected = drone.group.position.clone().project(camera);
      const onScreen = inFront && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1;

      if (onScreen) {
        let state = 'contact';
        if (drone === lock.target) {
          state = lock.locked ? 'locked' : 'locking';
        }
        targets.push({
          x: (projected.x * 0.5 + 0.5) * width,
          y: (-projected.y * 0.5 + 0.5) * height,
          distance,
          progress: drone === lock.target ? lock.progress : 0,
          state
        });
      } else if (!nearestOffscreen || distance < nearestOffscreen.distance) {
        nearestOffscreen = {
          distance,
          angle: normalizeAngle(bearing - flight.heading)
        };
      }
    });

    // Nearest Stark Tower (one stands at the center of every city tile)
    const towerX = Math.round(flight.x / TILE_SIZE) * TILE_SIZE;
    const towerZ = Math.round(flight.z / TILE_SIZE) * TILE_SIZE;
    const towerBearing = THREE.MathUtils.radToDeg(
      Math.atan2(towerX - flight.x, -(towerZ - flight.z))
    );
    const tower = {
      angle: normalizeAngle(towerBearing - flight.heading),
      distance: Math.hypot(towerX - flight.x, towerZ - flight.z)
    };

    return {
      dt,
      heading: flight.heading,
      pitch: flight.pitch,
      bank: flight.bank,
      altitude: flight.y,
      speed: flight.speed,
      boosting: flight.boosting,
      power: env.power,
      score,
      wave,
      threatsRemaining: droneSystem.drones.length,
      waveTotal,
      waveIncoming: !waveActive && wave > 0 ? Math.ceil(waveBreakTimer) : 0,
      lock: {
        state: lock.locked ? 'locked' : lock.target ? 'locking' : 'none',
        progress: lock.progress
      },
      targets,
      radar,
      tower,
      threatArrow: targets.length === 0 ? nearestOffscreen : null,
      fireFlash,
      flags: {
        ...flight.flags,
        crashed: crashTimer > 0,
        repulsorsOffline: repulsorDeniedTimer > 0
      }
    };
  }

  return { start, stop, setEnvironment, resetMission };
}

function normalizeAngle(degrees) {
  let angle = degrees % 360;
  if (angle > 180) angle -= 360;
  if (angle < -180) angle += 360;
  return angle;
}
