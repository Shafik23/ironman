// Visual emergency shutdown effect extracted from commands.js for modularity
// The functions here are pure DOM effects and do not manage state.

export function triggerEmergencyShutdownEffect(dom) {
  if (!dom?.suitSchematic || !dom?.schematicContainer) return;

  dom.suitSchematic.classList.add('emergency-shutdown');

  const sprayContainer = document.createElement('div');
  sprayContainer.className = 'fire-extinguisher-spray';
  dom.schematicContainer.appendChild(sprayContainer);

  createFireHose(sprayContainer);

  setTimeout(() => {
    createPressureStream(sprayContainer);
  }, 500);

  setTimeout(() => {
    createWaterDroplets(sprayContainer, 200);
  }, 700);

  setTimeout(() => {
    createWaterSplashes(sprayContainer);
  }, 900);

  setTimeout(() => {
    sprayContainer.remove();
    dom.suitSchematic.classList.remove('emergency-shutdown');
  }, 6000);
}

function createFireHose(container) {
  const hose = document.createElement('div');
  hose.className = 'fire-hose active';
  container.appendChild(hose);
}

function createPressureStream(container) {
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      const stream = document.createElement('div');
      stream.className = 'water-pressure-stream active';

      const baseX = 195;
      const baseY = 40;
      const offsetX = 0;
      const offsetY = 0;

      stream.style.left = baseX + offsetX + 'px';
      stream.style.top = baseY + offsetY + 'px';

      const baseRotation = 15;
      const angleVariation = (i - 1.5) * 8;
      stream.style.transform = `rotate(${baseRotation + angleVariation}deg)`;

      container.appendChild(stream);

      setTimeout(() => stream.remove(), 3000);
    }, i * 100);
  }
}

function createWaterDroplets(container, count) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const droplet = document.createElement('div');
      droplet.className = 'water-droplet active';

      const baseX = 195;
      const baseY = 40;
      const nozzleSpread = (Math.random() - 0.5) * 20;

      const jetAngle = 15 + (Math.random() - 0.5) * 24;
      const distance = 20 + Math.random() * 180;

      const angleRad = (jetAngle * Math.PI) / 180;
      const trajectoryX = distance * Math.cos(angleRad);
      const trajectoryY = distance * Math.sin(angleRad);

      const startX = baseX + nozzleSpread + trajectoryX;
      const startY = baseY + (Math.random() - 0.5) * 10 + trajectoryY;
      const size = 3 + Math.random() * 8;

      droplet.style.left = startX + 'px';
      droplet.style.top = startY + 'px';
      droplet.style.width = size + 'px';
      droplet.style.height = size + 'px';

      container.appendChild(droplet);

      setTimeout(() => droplet.remove(), 1800);
    }, i * 12);
  }
}

function createWaterSplashes(container) {
  const suitRegions = {
    helmet: { center: { x: 220, y: 120 }, radius: 30, density: 4 },
    upperChest: { center: { x: 220, y: 160 }, radius: 35, density: 5 },
    chest: { center: { x: 220, y: 200 }, radius: 40, density: 6 },
    leftShoulder: { center: { x: 180, y: 160 }, radius: 25, density: 3 },
    rightShoulder: { center: { x: 260, y: 160 }, radius: 25, density: 3 },
    leftArm: { center: { x: 150, y: 200 }, radius: 30, density: 3 },
    rightArm: { center: { x: 290, y: 200 }, radius: 30, density: 3 },
    waist: { center: { x: 220, y: 260 }, radius: 35, density: 5 },
    lowerTorso: { center: { x: 220, y: 290 }, radius: 30, density: 4 }
  };

  const splashPositions = generateSplashPositions(suitRegions);

  for (let wave = 0; wave < 3; wave++) {
    splashPositions.forEach((pos, index) => {
      setTimeout(() => {
        const splash = document.createElement('div');
        splash.className = 'water-splash active';

        const randomX = pos.x + (Math.random() - 0.5) * 80;
        const randomY = pos.y + (Math.random() - 0.5) * 20;

        splash.style.left = randomX - 10 + 'px';
        splash.style.top = randomY - 10 + 'px';

        container.appendChild(splash);

        setTimeout(() => splash.remove(), 800);
      }, wave * 1000 + index * 100);
    });
  }
}

function generateSplashPositions(regions) {
  const positions = [];

  Object.values(regions).forEach(region => {
    for (let i = 0; i < region.density; i++) {
      const angle = i * 2.39996323;
      const r = region.radius * Math.sqrt(Math.random());

      positions.push({
        x: region.center.x + r * Math.cos(angle),
        y: region.center.y + r * Math.sin(angle)
      });
    }

    positions.push({
      x: region.center.x + (Math.random() - 0.5) * 10,
      y: region.center.y + (Math.random() - 0.5) * 10
    });
  });

  return positions;
}
