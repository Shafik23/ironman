// Combat Effects - repulsor bolts, drone explosions and boost streaks
// Bolts and explosions run from small pools; streaks live in rig space.

import * as THREE from '../vendor/three.module.min.js';
import { createGlowTexture } from './city.js';
import { DRONE_HIT_RADIUS } from './drones.js';

const BOLT_POOL = 10;
const BOLT_SPEED = 620;
const BOLT_LIFE = 1.5;
const BOLT_HOMING_TURN = 3.2; // rad/s of steering toward a locked target
const EXPLOSION_POOL = 6;
const EXPLOSION_LIFE = 1.0;
const EXPLOSION_PARTICLES = 26;
const STREAK_COUNT = 46;

export function createEffects(scene, rig) {
  const bolts = createBoltPool(scene);
  const explosions = createExplosionPool(scene);
  const streaks = createBoostStreaks(rig);

  // Two permanent lights shared by all bolts/explosions. Keeping the scene's
  // light count constant avoids a full shader recompile (a visible frame
  // freeze) the first time a shot or blast would otherwise add a new light.
  const boltLight = new THREE.PointLight(0x66e0ff, 0, 130, 1.8);
  const blastLight = new THREE.PointLight(0xffa040, 0, 260, 1.6);
  scene.add(boltLight, blastLight);

  function fireBolt(origin, direction, target) {
    const bolt = bolts.find(b => !b.active);
    if (!bolt) return false;

    bolt.active = true;
    bolt.life = BOLT_LIFE;
    bolt.target = target || null;
    bolt.group.position.copy(origin);
    bolt.velocity.copy(direction).normalize().multiplyScalar(BOLT_SPEED);
    orientBolt(bolt);
    bolt.group.visible = true;
    return true;
  }

  /** Advances bolts and returns [{drone}] hits; hit bolts despawn. */
  function updateBolts(dt, drones) {
    const hits = [];
    let litBolt = null;

    bolts.forEach(bolt => {
      if (!bolt.active) return;

      bolt.life -= dt;
      if (bolt.life <= 0) {
        deactivateBolt(bolt);
        return;
      }

      if (bolt.target) {
        homeToward(bolt, dt);
      }
      bolt.group.position.addScaledVector(bolt.velocity, dt);

      const hit = drones.find(
        drone => drone.group.position.distanceTo(bolt.group.position) < DRONE_HIT_RADIUS
      );
      if (hit) {
        hits.push({ drone: hit });
        deactivateBolt(bolt);
        return;
      }

      litBolt = litBolt || bolt;
    });

    // Shared light rides on the most recently fired active bolt
    if (litBolt) {
      boltLight.position.copy(litBolt.group.position);
      boltLight.intensity = 12;
    } else {
      boltLight.intensity = 0;
    }

    return hits;
  }

  function spawnExplosion(position) {
    const explosion = explosions.find(e => !e.active);
    if (!explosion) return;

    explosion.active = true;
    explosion.life = EXPLOSION_LIFE;
    explosion.group.position.copy(position);
    explosion.group.visible = true;
    blastLight.position.copy(position);
    blastLight.intensity = 60;
    explosion.flash.material.opacity = 1;
    explosion.flash.scale.setScalar(10);

    const positions = explosion.points.geometry.getAttribute('position');
    for (let i = 0; i < EXPLOSION_PARTICLES; i += 1) {
      positions.setXYZ(i, 0, 0, 0);
      const speed = 18 + Math.random() * 42;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      explosion.velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      explosion.velocities[i * 3 + 1] = Math.cos(phi) * speed;
      explosion.velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    }
    positions.needsUpdate = true;
    explosion.points.material.opacity = 1;
  }

  function updateExplosions(dt) {
    blastLight.intensity = Math.max(0, blastLight.intensity - 150 * dt);

    explosions.forEach(explosion => {
      if (!explosion.active) return;

      explosion.life -= dt;
      if (explosion.life <= 0) {
        explosion.active = false;
        explosion.group.visible = false;
        return;
      }

      const progress = 1 - explosion.life / EXPLOSION_LIFE;
      const positions = explosion.points.geometry.getAttribute('position');
      for (let i = 0; i < EXPLOSION_PARTICLES; i += 1) {
        positions.setXYZ(
          i,
          positions.getX(i) + explosion.velocities[i * 3] * dt,
          positions.getY(i) + (explosion.velocities[i * 3 + 1] - progress * 25) * dt,
          positions.getZ(i) + explosion.velocities[i * 3 + 2] * dt
        );
      }
      positions.needsUpdate = true;

      explosion.points.material.opacity = 1 - progress;
      explosion.flash.material.opacity = Math.max(0, 1 - progress * 3);
      explosion.flash.scale.setScalar(10 + progress * 45);
    });
  }

  function updateStreaks(dt, speed, boosting) {
    streaks.update(dt, speed, boosting);
  }

  function shiftWorld(dx, dz) {
    bolts.forEach(bolt => {
      if (bolt.active) {
        bolt.group.position.x += dx;
        bolt.group.position.z += dz;
      }
    });
    explosions.forEach(explosion => {
      if (explosion.active) {
        explosion.group.position.x += dx;
        explosion.group.position.z += dz;
      }
    });
  }

  function reset() {
    bolts.forEach(deactivateBolt);
    explosions.forEach(explosion => {
      explosion.active = false;
      explosion.group.visible = false;
    });
    boltLight.intensity = 0;
    blastLight.intensity = 0;
  }

  return { fireBolt, updateBolts, spawnExplosion, updateExplosions, updateStreaks, shiftWorld, reset };
}

function deactivateBolt(bolt) {
  bolt.active = false;
  bolt.group.visible = false;
  bolt.target = null;
}

function homeToward(bolt, dt) {
  if (!bolt.target.group.parent) {
    bolt.target = null; // target already destroyed
    return;
  }

  const desired = bolt.target.group.position.clone()
    .sub(bolt.group.position)
    .normalize();
  const current = bolt.velocity.clone().normalize();
  const maxStep = BOLT_HOMING_TURN * dt;
  const angle = current.angleTo(desired);

  if (angle > 0.0001) {
    const t = Math.min(1, maxStep / angle);
    current.lerp(desired, t).normalize();
    bolt.velocity.copy(current).multiplyScalar(BOLT_SPEED);
    orientBolt(bolt);
  }
}

function orientBolt(bolt) {
  const dir = bolt.velocity.clone().normalize();
  bolt.group.quaternion.setFromUnitVectors(UP, dir);
}

const UP = new THREE.Vector3(0, 1, 0);

function createBoltPool(scene) {
  const coreGeometry = new THREE.CylinderGeometry(0.35, 0.35, 12, 6);
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: 0xbdf6ff,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const glowMaterial = new THREE.SpriteMaterial({
    map: createGlowTexture('#7df2ff'),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  return Array.from({ length: BOLT_POOL }, () => {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(coreGeometry, coreMaterial));

    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.setScalar(9);
    group.add(glow);

    group.visible = false;
    scene.add(group);

    return { group, velocity: new THREE.Vector3(), life: 0, active: false, target: null };
  });
}

function createExplosionPool(scene) {
  const particleMaterialTemplate = new THREE.PointsMaterial({
    color: 0xffa040,
    size: 3,
    sizeAttenuation: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const flashMap = createGlowTexture('#ffb060');

  return Array.from({ length: EXPLOSION_POOL }, () => {
    const group = new THREE.Group();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(EXPLOSION_PARTICLES * 3), 3)
    );
    const points = new THREE.Points(geometry, particleMaterialTemplate.clone());
    group.add(points);

    const flash = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: flashMap,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    group.add(flash);

    group.visible = false;
    scene.add(group);

    return {
      group,
      points,
      flash,
      velocities: new Float32Array(EXPLOSION_PARTICLES * 3),
      life: 0,
      active: false
    };
  });
}

/** Speed streaks around the camera, visible while boosting or at high speed. */
function createBoostStreaks(rig) {
  const positions = new Float32Array(STREAK_COUNT * 6);
  const seeds = [];

  for (let i = 0; i < STREAK_COUNT; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 5 + Math.random() * 12;
    seeds.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: -Math.random() * 60
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const lines = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0x9fd8ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  lines.frustumCulled = false;
  rig.add(lines);

  let visibility = 0;

  function update(dt, speed, boosting) {
    const targetVisibility = boosting ? 0.55 : speed > 220 ? 0.2 : 0;
    visibility += (targetVisibility - visibility) * Math.min(1, 4 * dt);
    lines.material.opacity = visibility;

    if (visibility < 0.02) return;

    const length = Math.min(26, speed * 0.06);
    const attribute = geometry.getAttribute('position');

    seeds.forEach((seed, i) => {
      seed.z += speed * 1.6 * dt;
      if (seed.z > 8) seed.z -= 68;
      attribute.setXYZ(i * 2, seed.x, seed.y, seed.z);
      attribute.setXYZ(i * 2 + 1, seed.x, seed.y, seed.z - length);
    });
    attribute.needsUpdate = true;
  }

  return { update };
}
