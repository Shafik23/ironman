// Night Sky - gradient dome, stars, moon and drifting cloud sprites
// The dome and stars follow the player horizontally so they read as infinitely far.

import * as THREE from '../vendor/three.module.min.js';

const SKY_RADIUS = 3600;
const STAR_COUNT = 1400;
const CLOUD_COUNT = 14;
const CLOUD_WRAP = 1600; // clouds wrap within this range around the player

export const HORIZON_COLOR = 0x0b1226;

export function createSky() {
  const group = new THREE.Group();
  const anchored = new THREE.Group(); // follows the player (dome, stars, moon)
  group.add(anchored);

  anchored.add(createDome());
  anchored.add(createStars());
  anchored.add(createMoon());

  const clouds = createClouds();
  clouds.forEach(cloud => group.add(cloud.sprite));

  const lights = createLights();
  lights.forEach(light => group.add(light));

  function update(dt, playerPosition) {
    anchored.position.set(playerPosition.x, 0, playerPosition.z);

    clouds.forEach(cloud => {
      cloud.sprite.position.x += cloud.driftX * dt;
      cloud.sprite.position.z += cloud.driftZ * dt;
      wrapAround(cloud.sprite.position, playerPosition);
    });
  }

  return { group, update };
}

function createDome() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0.0, '#01020a');   // zenith
  gradient.addColorStop(0.45, '#050a1c');
  gradient.addColorStop(0.72, '#0b1226');  // horizon band, matches fog
  gradient.addColorStop(0.78, '#1a1f38');  // city light pollution glow
  gradient.addColorStop(1.0, '#0b1226');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(SKY_RADIUS, 24, 16),
    new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false
    })
  );
  dome.renderOrder = -3;
  return dome;
}

function createStars() {
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const color = new THREE.Color();

  for (let i = 0; i < STAR_COUNT; i += 1) {
    // Random point on the upper hemisphere, biased away from the horizon haze
    const azimuth = Math.random() * Math.PI * 2;
    const elevation = Math.asin(0.08 + Math.random() * 0.9);
    const radius = SKY_RADIUS * 0.96;

    positions[i * 3] = Math.cos(azimuth) * Math.cos(elevation) * radius;
    positions[i * 3 + 1] = Math.sin(elevation) * radius;
    positions[i * 3 + 2] = Math.sin(azimuth) * Math.cos(elevation) * radius;

    const warmth = Math.random();
    color.setHSL(warmth < 0.15 ? 0.08 : 0.6, 0.25, 0.55 + Math.random() * 0.45);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 2.2,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      fog: false,
      depthWrite: false
    })
  );
  stars.renderOrder = -2;
  return stars;
}

function createMoon() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  glow.addColorStop(0, 'rgba(235, 240, 255, 1)');
  glow.addColorStop(0.25, 'rgba(210, 220, 250, 0.9)');
  glow.addColorStop(0.45, 'rgba(150, 170, 220, 0.25)');
  glow.addColorStop(1, 'rgba(150, 170, 220, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const moon = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      fog: false,
      depthWrite: false
    })
  );
  moon.position.set(-SKY_RADIUS * 0.5, SKY_RADIUS * 0.55, -SKY_RADIUS * 0.62);
  moon.scale.setScalar(520);
  moon.renderOrder = -1;
  return moon;
}

function createClouds() {
  const texture = createCloudTexture();
  const clouds = [];

  for (let i = 0; i < CLOUD_COUNT; i += 1) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.05 + Math.random() * 0.09,
        depthWrite: false,
        rotation: Math.random() * Math.PI
      })
    );
    sprite.position.set(
      (Math.random() - 0.5) * CLOUD_WRAP * 2,
      420 + Math.random() * 380,
      (Math.random() - 0.5) * CLOUD_WRAP * 2
    );
    const width = 500 + Math.random() * 700;
    sprite.scale.set(width, width * 0.35, 1);

    clouds.push({
      sprite,
      driftX: (Math.random() - 0.5) * 6,
      driftZ: (Math.random() - 0.5) * 6
    });
  }

  return clouds;
}

function createCloudTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Layered soft blobs make a passable wispy cloud
  for (let i = 0; i < 26; i += 1) {
    const x = 40 + Math.random() * 176;
    const y = 34 + Math.random() * 60;
    const r = 14 + Math.random() * 34;
    const blob = ctx.createRadialGradient(x, y, 1, x, y, r);
    blob.addColorStop(0, 'rgba(170, 185, 215, 0.16)');
    blob.addColorStop(1, 'rgba(170, 185, 215, 0)');
    ctx.fillStyle = blob;
    ctx.fillRect(0, 0, 256, 128);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createLights() {
  const ambient = new THREE.AmbientLight(0x27314f, 0.85);
  const moonlight = new THREE.DirectionalLight(0x9db4e8, 0.55);
  moonlight.position.set(-0.5, 0.8, -0.6);
  const cityGlow = new THREE.HemisphereLight(0x121b33, 0x2a1e08, 0.5);
  return [ambient, moonlight, cityGlow];
}

function wrapAround(position, center) {
  if (position.x - center.x > CLOUD_WRAP) position.x -= CLOUD_WRAP * 2;
  if (position.x - center.x < -CLOUD_WRAP) position.x += CLOUD_WRAP * 2;
  if (position.z - center.z > CLOUD_WRAP) position.z -= CLOUD_WRAP * 2;
  if (position.z - center.z < -CLOUD_WRAP) position.z += CLOUD_WRAP * 2;
}
