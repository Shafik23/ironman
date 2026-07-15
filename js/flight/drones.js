// Hostile Drones - wave spawning, patrol/evade AI and shared-geometry visuals
// Pure entity management; wave orchestration and scoring live in the engine.

import * as THREE from '../vendor/three.module.min.js';
import { createGlowTexture } from './city.js';

const CRUISE_SPEED_MIN = 26;
const CRUISE_SPEED_MAX = 42;
const EVADE_MULTIPLIER = 1.7;
const PATROL_RADIUS = 380;
const SPAWN_DISTANCE_MIN = 350;
const SPAWN_DISTANCE_MAX = 550;
export const DRONE_HIT_RADIUS = 7;

let sharedAssets = null;

export function createDroneSystem(scene) {
  const drones = [];

  function spawnWave(count, playerPos, sampleHeight) {
    for (let i = 0; i < count; i += 1) {
      const bearing = Math.random() * Math.PI * 2;
      const distance = SPAWN_DISTANCE_MIN + Math.random() * (SPAWN_DISTANCE_MAX - SPAWN_DISTANCE_MIN);
      const x = playerPos.x + Math.sin(bearing) * distance;
      const z = playerPos.z + Math.cos(bearing) * distance;
      const clearance = sampleHeight(x, z);
      const y = Math.max(clearance + 30, 50 + Math.random() * 220);

      const drone = createDrone(x, y, z);
      drones.push(drone);
      scene.add(drone.group);
    }
  }

  function update(dt, elapsed, playerPos, sampleHeight) {
    drones.forEach(drone => {
      drone.retargetTimer -= dt;
      if (drone.retargetTimer <= 0 || drone.group.position.distanceTo(drone.target) < 30) {
        pickPatrolTarget(drone, playerPos, sampleHeight);
      }

      if (drone.evadeTimer > 0) {
        drone.evadeTimer -= dt;
      } else if (drone.locked && drone.evadeCooldown <= 0) {
        startEvade(drone);
      }
      drone.evadeCooldown = Math.max(0, drone.evadeCooldown - dt);

      steer(drone, dt);

      // Never sink into a rooftop
      const minY = sampleHeight(drone.group.position.x, drone.group.position.z) + 12;
      if (drone.group.position.y < minY) {
        drone.group.position.y = minY;
        drone.velocity.y = Math.abs(drone.velocity.y) * 0.5;
      }

      animate(drone, dt, elapsed);
    });
  }

  function remove(drone) {
    const index = drones.indexOf(drone);
    if (index !== -1) drones.splice(index, 1);
    scene.remove(drone.group);
  }

  function clear() {
    drones.slice().forEach(remove);
  }

  function shiftWorld(dx, dz) {
    drones.forEach(drone => {
      drone.group.position.x += dx;
      drone.group.position.z += dz;
      drone.target.x += dx;
      drone.target.z += dz;
    });
  }

  return { drones, spawnWave, update, remove, clear, shiftWorld };
}

function pickPatrolTarget(drone, playerPos, sampleHeight) {
  const angle = Math.random() * Math.PI * 2;
  const radius = 80 + Math.random() * PATROL_RADIUS;
  const x = playerPos.x + Math.sin(angle) * radius;
  const z = playerPos.z + Math.cos(angle) * radius;
  const clearance = sampleHeight(x, z);

  drone.target.set(x, Math.max(clearance + 25, 45 + Math.random() * 230), z);
  drone.retargetTimer = 5 + Math.random() * 5;
}

function startEvade(drone) {
  // Dash sideways relative to current velocity to break the player's lock
  const side = new THREE.Vector3(-drone.velocity.z, 0, drone.velocity.x)
    .normalize()
    .multiplyScalar(Math.random() < 0.5 ? 1 : -1);
  drone.target.copy(drone.group.position)
    .addScaledVector(side, 120 + Math.random() * 80);
  drone.target.y += (Math.random() - 0.5) * 60;
  drone.evadeTimer = 1.4;
  drone.evadeCooldown = 3.5;
  drone.retargetTimer = Math.max(drone.retargetTimer, 2);
}

function steer(drone, dt) {
  const speed = drone.cruiseSpeed * (drone.evadeTimer > 0 ? EVADE_MULTIPLIER : 1);
  const desired = drone.target.clone()
    .sub(drone.group.position)
    .normalize()
    .multiplyScalar(speed);

  drone.velocity.lerp(desired, Math.min(1, 1.6 * dt));
  drone.group.position.addScaledVector(drone.velocity, dt);

  if (drone.velocity.lengthSq() > 0.01) {
    const lookTarget = drone.group.position.clone().add(drone.velocity);
    drone.group.lookAt(lookTarget);
  }
}

function animate(drone, dt, elapsed) {
  drone.group.position.y += Math.sin(elapsed * 2.4 + drone.phase) * 1.6 * dt;
  drone.rotor.rotation.y += 18 * dt;
  drone.blinker.material.opacity = 0.3 + 0.7 * Math.abs(Math.sin(elapsed * 3 + drone.phase));
}

function createDrone(x, y, z) {
  const assets = getSharedAssets();
  const group = new THREE.Group();

  const body = new THREE.Mesh(assets.bodyGeometry, assets.bodyMaterial);
  body.scale.y = 0.55;
  group.add(body);

  const rotor = new THREE.Mesh(assets.rotorGeometry, assets.rotorMaterial);
  rotor.position.y = 1.8;
  group.add(rotor);

  const eye = new THREE.Mesh(assets.eyeGeometry, assets.eyeMaterial);
  eye.position.set(0, 0, 2.4);
  group.add(eye);

  const eyeGlow = new THREE.Sprite(assets.glowMaterial);
  eyeGlow.position.set(0, 0, 2.6);
  eyeGlow.scale.setScalar(6);
  group.add(eyeGlow);

  // Blinker material is per-drone so each can pulse on its own phase
  const blinker = new THREE.Sprite(assets.glowMaterial.clone());
  blinker.position.set(0, 2.6, -1.5);
  blinker.scale.setScalar(3);
  group.add(blinker);

  group.position.set(x, y, z);

  return {
    group,
    rotor,
    blinker,
    velocity: new THREE.Vector3(0, 0, 0),
    target: new THREE.Vector3(x, y, z),
    cruiseSpeed: CRUISE_SPEED_MIN + Math.random() * (CRUISE_SPEED_MAX - CRUISE_SPEED_MIN),
    retargetTimer: 0,
    evadeTimer: 0,
    evadeCooldown: 0,
    locked: false,
    phase: Math.random() * Math.PI * 2
  };
}

function getSharedAssets() {
  if (sharedAssets) return sharedAssets;

  sharedAssets = {
    bodyGeometry: new THREE.SphereGeometry(2.6, 14, 10),
    bodyMaterial: new THREE.MeshLambertMaterial({ color: 0x353c4c }),
    rotorGeometry: new THREE.TorusGeometry(3.6, 0.4, 8, 24),
    rotorMaterial: new THREE.MeshLambertMaterial({ color: 0x20242e }),
    eyeGeometry: new THREE.SphereGeometry(0.7, 8, 6),
    eyeMaterial: new THREE.MeshBasicMaterial({ color: 0xff4040 }),
    glowMaterial: new THREE.SpriteMaterial({
      map: createGlowTexture('#ff4040'),
      color: 0xff6060,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  };

  // Rotor ring lies flat above the body
  sharedAssets.rotorGeometry.rotateX(Math.PI / 2);

  return sharedAssets;
}
