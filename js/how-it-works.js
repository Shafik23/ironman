import { createFlightState, stepFlight } from './flight/physics.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

setupLayerControls();
setupWorldCutaway();
setupWorldWrapDemo();
setupFlightLab();
setupTargetingLab();

function setupLayerControls() {
  const layers = {
    world: document.querySelector('#cutawayWorld'),
    hud: document.querySelector('#cutawayHud')
  };

  document.querySelectorAll('.layer-toggle').forEach(button => {
    button.addEventListener('click', () => {
      const layer = layers[button.dataset.layer];
      const enabled = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(enabled));
      layer?.classList.toggle('layer-off', !enabled);
    });
  });
}

function setupWorldCutaway() {
  const canvas = document.querySelector('#cutawayWorld');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let start = performance.now();
  let animationFrame = null;

  function resize() {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw(performance.now());
  }

  function draw(now) {
    const elapsed = (now - start) / 1000;
    const horizon = height * 0.46;

    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#02040a');
    sky.addColorStop(0.72, '#0b2030');
    sky.addColorStop(1, '#164151');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, horizon);

    ctx.fillStyle = '#04070b';
    ctx.fillRect(0, horizon, width, height - horizon);

    drawStars(ctx, width, horizon);
    drawCity(ctx, width, height, horizon, elapsed);
    drawPerspectiveGrid(ctx, width, height, horizon, elapsed);
    drawDrone(ctx, width * 0.69 + Math.sin(elapsed * 0.6) * 13, height * 0.39, width);

    if (!prefersReducedMotion.matches && !document.hidden) {
      animationFrame = requestAnimationFrame(draw);
    }
  }

  function restart() {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    start = performance.now();
    draw(start);
  }

  new ResizeObserver(resize).observe(canvas);
  prefersReducedMotion.addEventListener('change', restart);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !prefersReducedMotion.matches) restart();
  });
}

function drawStars(ctx, width, horizon) {
  ctx.fillStyle = 'rgba(210, 233, 255, 0.68)';
  for (let i = 0; i < 48; i += 1) {
    const x = pseudoRandom(i * 17 + 3) * width;
    const y = pseudoRandom(i * 31 + 9) * horizon * 0.8;
    const size = i % 7 === 0 ? 1.4 : 0.7;
    ctx.fillRect(x, y, size, size);
  }
}

function drawCity(ctx, width, height, horizon, elapsed) {
  const baseline = height * 0.82;
  for (let i = 0; i < 28; i += 1) {
    const normalized = i / 27;
    const buildingWidth = width * (0.025 + pseudoRandom(i + 4) * 0.045);
    const buildingHeight = height * (0.08 + pseudoRandom(i * 13) * 0.3);
    const x = normalized * width - buildingWidth / 2;
    const y = baseline - buildingHeight;

    ctx.fillStyle = i % 3 === 0 ? '#101b28' : '#0b141f';
    ctx.fillRect(x, y, buildingWidth, buildingHeight);

    const windowWidth = Math.max(1, buildingWidth / 8);
    const windowHeight = 2;
    for (let wy = y + 7; wy < baseline - 5; wy += 8) {
      for (let wx = x + 4; wx < x + buildingWidth - 3; wx += windowWidth + 4) {
        const lit = pseudoRandom(Math.floor(wx * 7 + wy * 3 + i)) > 0.56;
        if (!lit) continue;
        ctx.fillStyle = i % 4 === 0 ? 'rgba(105, 244, 255, 0.58)' : 'rgba(255, 198, 104, 0.62)';
        ctx.fillRect(wx, wy, windowWidth, windowHeight);
      }
    }
  }

  const towerX = width * 0.47;
  const towerHeight = height * 0.48;
  ctx.fillStyle = '#111e2c';
  ctx.beginPath();
  ctx.moveTo(towerX - width * 0.035, baseline);
  ctx.lineTo(towerX - width * 0.02, baseline - towerHeight * 0.72);
  ctx.lineTo(towerX, baseline - towerHeight);
  ctx.lineTo(towerX + width * 0.022, baseline - towerHeight * 0.72);
  ctx.lineTo(towerX + width * 0.04, baseline);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgba(105, 244, 255, ${0.65 + Math.sin(elapsed * 2) * 0.2})`;
  ctx.fillRect(towerX - 1, baseline - towerHeight - 12, 2, 12);
}

function drawPerspectiveGrid(ctx, width, height, horizon, elapsed) {
  const vanishingX = width * 0.5;
  const vanishingY = horizon * 1.04;
  ctx.strokeStyle = 'rgba(66, 190, 211, 0.16)';
  ctx.lineWidth = 1;

  for (let i = -10; i <= 10; i += 1) {
    ctx.beginPath();
    ctx.moveTo(vanishingX, vanishingY);
    ctx.lineTo(vanishingX + i * width * 0.11, height);
    ctx.stroke();
  }

  const phase = (elapsed * 0.35) % 1;
  for (let i = 0; i < 14; i += 1) {
    const t = (i + phase) / 14;
    const eased = t * t;
    const y = vanishingY + eased * (height - vanishingY);
    ctx.globalAlpha = 0.25 + t * 0.55;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawDrone(ctx, x, y, width) {
  const size = Math.max(5, width * 0.012);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#323e4b';
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 1.3, size * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#697886';
  ctx.beginPath();
  ctx.ellipse(0, -size * 0.45, size * 1.9, size * 0.35, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ff4e48';
  ctx.shadowColor = '#ff4e48';
  ctx.shadowBlur = 10;
  ctx.fillRect(-1.5, -1, 3, 3);
  ctx.restore();
}

function pseudoRandom(seed) {
  const value = Math.sin(seed * 999) * 43758.5453;
  return value - Math.floor(value);
}

function setupWorldWrapDemo() {
  const button = document.querySelector('#runWorldWrap');
  const pilot = document.querySelector('#tilePilot');
  const output = document.querySelector('#worldCoordinate');
  if (!button || !pilot || !output) return;

  button.addEventListener('click', () => {
    if (button.disabled) return;
    button.disabled = true;
    pilot.classList.remove('crossing');
    void pilot.offsetWidth;
    pilot.classList.add('crossing');

    const duration = prefersReducedMotion.matches ? 50 : 2500;
    const start = performance.now();

    function update(now) {
      const progress = Math.min(1, (now - start) / duration);
      const rawX = 840 + progress * 320;
      const wrappedX = wrapCoordinate(rawX, 2200);
      output.value = `${wrappedX >= 0 ? '+' : '−'}${String(Math.abs(Math.round(wrappedX))).padStart(4, '0')} m`;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        button.disabled = false;
      }
    }

    requestAnimationFrame(update);
  });
}

function wrapCoordinate(value, size) {
  const half = size / 2;
  if (value > half) return value - size;
  if (value < -half) return value + size;
  return value;
}

function setupFlightLab() {
  const controls = {
    power: document.querySelector('#powerControl'),
    pitch: document.querySelector('#pitchControl'),
    thrusters: document.querySelector('#thrusterControl'),
    boost: document.querySelector('#boostControl')
  };
  if (Object.values(controls).some(control => !control)) return;

  const outputs = {
    power: document.querySelector('#powerControlValue'),
    pitchControl: document.querySelector('#pitchControlValue'),
    speed: document.querySelector('#labSpeed'),
    pitch: document.querySelector('#labPitch'),
    altitude: document.querySelector('#labAltitude'),
    warning: document.querySelector('#labWarning'),
    horizon: document.querySelector('#labHorizon')
  };

  const state = createFlightState({ y: 300 });
  state.speed = 120;
  let previousTime = performance.now();

  controls.power.addEventListener('input', syncLabels);
  controls.pitch.addEventListener('input', syncLabels);
  syncLabels();

  function syncLabels() {
    const pitch = Number(controls.pitch.value);
    outputs.power.value = `${controls.power.value}%`;
    outputs.pitchControl.value = pitch > 5 ? 'CLIMB' : pitch < -5 ? 'DIVE' : 'LEVEL';
  }

  function update(now) {
    const dt = Math.min(0.05, Math.max(0.0001, (now - previousTime) / 1000));
    previousTime = now;
    const input = {
      pitch: Number(controls.pitch.value) / 100,
      yaw: 0,
      boost: controls.boost.checked
    };
    const env = {
      power: Number(controls.power.value),
      thrustersOnline: controls.thrusters.checked
    };

    stepFlight(state, input, env, dt);

    outputs.speed.value = String(Math.round(state.speed));
    outputs.pitch.value = state.pitch.toFixed(1);
    outputs.altitude.value = String(Math.round(state.y));
    outputs.horizon.style.transform = `translateY(${(state.pitch * 5).toFixed(1)}px) rotate(${(-state.bank).toFixed(1)}deg)`;

    const warning = state.flags.boostDenied
      ? 'BOOST UNAVAILABLE'
      : state.flags.ceiling
        ? 'SERVICE CEILING'
        : state.flags.stalling
          ? 'STALL'
          : state.flags.terrain
            ? 'TERRAIN'
            : state.boosting
              ? 'BOOST ACTIVE'
              : 'NOMINAL';
    outputs.warning.textContent = warning;
    outputs.warning.classList.toggle('alert', !['NOMINAL', 'BOOST ACTIVE'].includes(warning));

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

function setupTargetingLab() {
  const bearing = document.querySelector('#bearingControl');
  const distance = document.querySelector('#distanceControl');
  const bearingOutput = document.querySelector('#bearingValue');
  const distanceOutput = document.querySelector('#distanceValue');
  const contact = document.querySelector('#scopeContact');
  const ring = document.querySelector('#scopeLockRing');
  const stateOutput = document.querySelector('#lockState');
  if (!bearing || !distance || !contact || !ring || !stateOutput) return;

  let progress = 0;
  let previousTime = performance.now();

  function update(now) {
    const dt = Math.min(0.05, Math.max(0.0001, (now - previousTime) / 1000));
    previousTime = now;
    const angle = Number(bearing.value);
    const meters = Number(distance.value);
    const candidate = Math.abs(angle) < 9 && meters <= 850;

    progress = candidate
      ? Math.min(1, progress + dt / 0.75)
      : Math.max(0, progress - dt / 0.35);

    const locked = candidate && progress >= 1;
    const contactX = 50 + (angle / 24) * 42;
    const contactY = 30 + (meters / 1100) * 34;
    contact.style.left = `${contactX}%`;
    contact.style.top = `${contactY}%`;
    contact.classList.toggle('candidate', candidate && !locked);
    contact.classList.toggle('locked', locked);
    ring.style.setProperty('--progress', `${(progress * 100).toFixed(1)}%`);

    bearingOutput.value = `${angle > 0 ? '+' : ''}${angle}°`;
    distanceOutput.value = `${meters} m`;
    stateOutput.value = locked ? 'TARGET LOCKED' : candidate ? 'ACQUIRING' : 'NO LOCK';
    stateOutput.style.borderColor = locked ? 'var(--forge)' : candidate ? 'var(--gold)' : 'var(--forge)';
    stateOutput.style.color = locked ? 'var(--forge)' : candidate ? 'var(--gold)' : 'var(--forge)';

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}
