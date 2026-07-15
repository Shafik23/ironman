// Procedural Night City - instanced buildings, street grid, traffic and Stark Tower
// One deterministic 2.2km tile is generated, then rendered as a 3x3 grid of clones
// sharing geometry. The flight engine wraps the player across tile boundaries so
// the city reads as infinite. sampleHeight() gives building collision heights.

import * as THREE from '../vendor/three.module.min.js';

export const TILE_SIZE = 2200;
const BLOCK_SIZE = 110;          // street-to-street spacing
const STREET_WIDTH = 24;
const BLOCKS = TILE_SIZE / BLOCK_SIZE; // 20 blocks per axis
const DOWNTOWN_RADIUS = 520;
const TRAFFIC_CARS = 260;
const CITY_SEED = 20260714;

export function createCity() {
  const random = mulberry32(CITY_SEED);
  const collisionGrid = createCollisionGrid();

  const tile = new THREE.Group();
  tile.add(createGround());
  createBuildings(random, collisionGrid).forEach(mesh => tile.add(mesh));
  tile.add(createStreetLights());

  const traffic = createTraffic(random);
  tile.add(traffic.points);

  const tower = createStarkTower(collisionGrid);
  tile.add(tower.group);

  // 3x3 grid of the same tile; clones share geometry so cost stays low and
  // the shared traffic buffer animates every copy at once.
  const group = new THREE.Group();
  for (let gx = -1; gx <= 1; gx += 1) {
    for (let gz = -1; gz <= 1; gz += 1) {
      const copy = gx === 0 && gz === 0 ? tile : tile.clone();
      copy.position.set(gx * TILE_SIZE, 0, gz * TILE_SIZE);
      group.add(copy);
    }
  }

  function update(dt, elapsed) {
    traffic.update(dt);
    tower.update(elapsed);
  }

  /** Height of whatever stands at world (x, z); 0 for open street. */
  function sampleHeight(x, z) {
    const lx = wrapLocal(x);
    const lz = wrapLocal(z);
    const bx = Math.min(BLOCKS - 1, Math.floor(lx / BLOCK_SIZE));
    const bz = Math.min(BLOCKS - 1, Math.floor(lz / BLOCK_SIZE));
    const cell = collisionGrid[bx * BLOCKS + bz];

    for (let i = 0; i < cell.length; i += 1) {
      const b = cell[i];
      if (lx >= b.x0 && lx <= b.x1 && lz >= b.z0 && lz <= b.z1) {
        return b.height;
      }
    }
    return 0;
  }

  return { group, update, sampleHeight, tileSize: TILE_SIZE };
}

function createCollisionGrid() {
  return Array.from({ length: BLOCKS * BLOCKS }, () => []);
}

function registerCollision(grid, x0, x1, z0, z1, height) {
  const bx0 = clampIndex(Math.floor(x0 / BLOCK_SIZE));
  const bx1 = clampIndex(Math.floor(x1 / BLOCK_SIZE));
  const bz0 = clampIndex(Math.floor(z0 / BLOCK_SIZE));
  const bz1 = clampIndex(Math.floor(z1 / BLOCK_SIZE));

  for (let bx = bx0; bx <= bx1; bx += 1) {
    for (let bz = bz0; bz <= bz1; bz += 1) {
      grid[bx * BLOCKS + bz].push({ x0, x1, z0, z1, height });
    }
  }
}

function clampIndex(index) {
  return Math.max(0, Math.min(BLOCKS - 1, index));
}

/** Tile-local coordinate in [0, TILE_SIZE). Tile center sits at world origin. */
function wrapLocal(worldCoord) {
  return ((worldCoord + TILE_SIZE / 2) % TILE_SIZE + TILE_SIZE) % TILE_SIZE;
}

// --- Buildings ---------------------------------------------------------------

function createBuildings(random, collisionGrid) {
  const variants = [
    createWindowTexture(random, { litChance: 0.42, hue: 'warm' }),
    createWindowTexture(random, { litChance: 0.3, hue: 'cool' }),
    createWindowTexture(random, { litChance: 0.55, hue: 'mixed' })
  ];

  const placements = [[], [], []];
  const center = TILE_SIZE / 2;

  for (let bx = 0; bx < BLOCKS; bx += 1) {
    for (let bz = 0; bz < BLOCKS; bz += 1) {
      const blockX = bx * BLOCK_SIZE + STREET_WIDTH / 2;
      const blockZ = bz * BLOCK_SIZE + STREET_WIDTH / 2;
      const plot = BLOCK_SIZE - STREET_WIDTH;

      // Keep the central plaza clear for Stark Tower
      const blockCenterX = blockX + plot / 2;
      const blockCenterZ = blockZ + plot / 2;
      const distFromCenter = Math.hypot(blockCenterX - center, blockCenterZ - center);
      if (distFromCenter < 90) continue;

      const count = random() < 0.28 ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const width = 26 + random() * (count === 1 ? plot - 30 : plot / 2 - 16);
        const depth = 26 + random() * (count === 1 ? plot - 30 : plot / 2 - 16);
        const x0 = blockX + random() * (plot - width);
        const z0 = blockZ + random() * (plot - depth);

        const downtownBoost = Math.max(0, 1 - distFromCenter / DOWNTOWN_RADIUS);
        const height = 24 + random() * 70 + downtownBoost * (90 + random() * 220);

        registerCollision(collisionGrid, x0, x0 + width, z0, z0 + depth, height);
        placements[Math.floor(random() * 3)].push({
          x: x0 + width / 2 - center,
          z: z0 + depth / 2 - center,
          width,
          depth,
          height,
          tint: 0.72 + random() * 0.38
        });
      }
    }
  }

  return placements.map((list, index) => buildInstancedMesh(list, variants[index]));
}

function buildInstancedMesh(placements, texture) {
  const geometry = createBuildingGeometry();
  const material = new THREE.MeshLambertMaterial({
    map: texture,
    emissiveMap: texture,
    emissive: 0xffffff,
    emissiveIntensity: 0.9,
    color: 0x8890a8
  });

  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();

  placements.forEach((p, i) => {
    matrix.makeScale(p.width, p.height, p.depth);
    matrix.setPosition(p.x, 0, p.z);
    mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, color.setScalar(p.tint));
  });

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/** Unit box sitting on the ground with roof/floor UVs pinned to the dark plinth strip. */
function createBuildingGeometry() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  geometry.translate(0, 0.5, 0);

  // BoxGeometry face order: +x, -x, +y (roof), -y (floor), +z, -z; 4 verts each.
  const uv = geometry.getAttribute('uv');
  for (let vertex = 8; vertex < 16; vertex += 1) {
    uv.setXY(vertex, 0.5, 0.01); // bottom strip of the texture is windowless
  }
  uv.needsUpdate = true;
  return geometry;
}

function createWindowTexture(random, { litChance, hue }) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#10141f'; // unlit facade
  ctx.fillRect(0, 0, 128, 256);

  const litPalettes = {
    warm: ['#ffd9a0', '#ffc478', '#fff3d6', '#e8b46a'],
    cool: ['#a8d8ff', '#d6ecff', '#7fb8e8', '#eaf6ff'],
    mixed: ['#ffd9a0', '#a8d8ff', '#fff3d6', '#d6ecff', '#ffc478']
  };
  const palette = litPalettes[hue];

  const cell = 8;
  for (let y = cell; y < 256 - cell; y += cell) {
    for (let x = 2; x < 128 - 2; x += cell) {
      if (random() < litChance) {
        ctx.fillStyle = palette[Math.floor(random() * palette.length)];
        ctx.globalAlpha = 0.35 + random() * 0.65;
      } else {
        ctx.fillStyle = '#161c2c';
        ctx.globalAlpha = 1;
      }
      ctx.fillRect(x, y, cell - 3, cell - 3);
    }
  }
  ctx.globalAlpha = 1;

  // Dark plinth strip at the bottom; roof UVs point here too
  ctx.fillStyle = '#0a0d15';
  ctx.fillRect(0, 256 - 10, 128, 10);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// --- Ground ------------------------------------------------------------------

function createGround() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const scale = 1024 / TILE_SIZE;

  ctx.fillStyle = '#04060c'; // city block interiors
  ctx.fillRect(0, 0, 1024, 1024);

  // Streets as faintly glowing corridors
  const streetPx = STREET_WIDTH * scale;
  ctx.fillStyle = '#101624';
  for (let i = 0; i <= BLOCKS; i += 1) {
    const p = (i * BLOCK_SIZE - STREET_WIDTH / 2) * scale;
    ctx.fillRect(p, 0, streetPx, 1024);
    ctx.fillRect(0, p, 1024, streetPx);
  }

  // Center lane markings
  ctx.strokeStyle = 'rgba(255, 180, 92, 0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 9]);
  for (let i = 0; i <= BLOCKS; i += 1) {
    const p = i * BLOCK_SIZE * scale;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(1024, p);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE),
    new THREE.MeshBasicMaterial({ map: texture })
  );
  ground.rotation.x = -Math.PI / 2;
  return ground;
}

// --- Street lights and traffic ------------------------------------------------

function createStreetLights() {
  const count = (BLOCKS + 1) * (BLOCKS + 1);
  const positions = new Float32Array(count * 3);
  let i = 0;

  for (let ix = 0; ix <= BLOCKS; ix += 1) {
    for (let iz = 0; iz <= BLOCKS; iz += 1) {
      positions[i * 3] = ix * BLOCK_SIZE - TILE_SIZE / 2;
      positions[i * 3 + 1] = 9;
      positions[i * 3 + 2] = iz * BLOCK_SIZE - TILE_SIZE / 2;
      i += 1;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xffb45c,
      size: 3,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
}

function createTraffic(random) {
  const positions = new Float32Array(TRAFFIC_CARS * 3);
  const colors = new Float32Array(TRAFFIC_CARS * 3);
  const cars = [];
  const carColors = [0xfff2d0, 0xfff2d0, 0xff5040, 0xffb45c];
  const color = new THREE.Color();

  for (let i = 0; i < TRAFFIC_CARS; i += 1) {
    const car = {
      axis: random() < 0.5 ? 'x' : 'z',
      line: Math.floor(random() * (BLOCKS + 1)) * BLOCK_SIZE - TILE_SIZE / 2,
      lane: random() < 0.5 ? -4 : 4,
      offset: random() * TILE_SIZE,
      speed: (9 + random() * 12) * (random() < 0.5 ? 1 : -1)
    };
    cars.push(car);

    color.setHex(carColors[Math.floor(random() * carColors.length)]);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 3.2,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );

  function update(dt) {
    const attribute = geometry.getAttribute('position');
    for (let i = 0; i < TRAFFIC_CARS; i += 1) {
      const car = cars[i];
      car.offset = ((car.offset + car.speed * dt) % TILE_SIZE + TILE_SIZE) % TILE_SIZE;
      const along = car.offset - TILE_SIZE / 2;

      if (car.axis === 'x') {
        attribute.setXYZ(i, along, 1.4, car.line + car.lane);
      } else {
        attribute.setXYZ(i, car.line + car.lane, 1.4, along);
      }
    }
    attribute.needsUpdate = true;
  }

  return { points, update };
}

// --- Stark Tower ---------------------------------------------------------------

function createStarkTower(collisionGrid) {
  const group = new THREE.Group();
  const center = TILE_SIZE / 2;

  const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x39415c });
  const tiers = [
    { width: 52, height: 190 },
    { width: 38, height: 110 },
    { width: 24, height: 70 }
  ];

  let baseY = 0;
  tiers.forEach(tier => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(tier.width, tier.height, tier.width), bodyMaterial);
    mesh.position.y = baseY + tier.height / 2;
    group.add(mesh);
    baseY += tier.height;
  });
  const towerHeight = baseY; // 370

  // Glowing arc ring near the crown
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(20, 1.6, 10, 40),
    new THREE.MeshBasicMaterial({ color: 0x66f6ff })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = towerHeight - 40;
  group.add(ring);

  const ringLight = new THREE.PointLight(0x44d8ff, 2.2, 420, 1.6);
  ringLight.position.y = towerHeight - 40;
  group.add(ringLight);

  // Spire and pulsing beacon
  const spire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 2.4, 46, 6),
    bodyMaterial
  );
  spire.position.y = towerHeight + 23;
  group.add(spire);

  const beacon = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlowTexture('#7df2ff'),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  beacon.position.y = towerHeight + 46;
  beacon.scale.setScalar(26);
  group.add(beacon);

  registerCollision(
    collisionGrid,
    center - 26, center + 26,
    center - 26, center + 26,
    towerHeight + 46
  );

  function update(elapsed) {
    // Material is shared by every tile clone, so all beacons pulse in sync
    const pulse = 0.55 + 0.45 * Math.sin(elapsed * 2.2);
    beacon.material.opacity = 0.35 + pulse * 0.65;
  }

  return { group, update };
}

export function createGlowTexture(cssColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.25, cssColor);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Deterministic PRNG so every clone and the collision grid agree run-to-run.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
