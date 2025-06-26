import { dom } from './dom.js';
import { state } from './state.js';
import { addTelemetryEntry } from './telemetry.js';
import { updateProgressBars, updateArcReactor, updateSuitColor, updateSuitZoom } from './config.js';
import { stopPartyMode } from './party.js';

export function setupCommandButtons() {
  dom.commandButtons.forEach(button => {
    button.addEventListener('click', e => {
      const buttonText = e.target.textContent;

      e.target.style.transform = 'scale(0.95)';
      setTimeout(() => {
        e.target.style.transform = '';
      }, 150);

      switch (buttonText) {
        case 'INITIALIZE SYSTEMS':
          executeInitializeSystems();
          break;
        case 'RUN DIAGNOSTICS':
          executeRunDiagnostics();
          break;
        case 'EMERGENCY SHUTDOWN':
          executeEmergencyShutdown();
          break;
      }
    });
  });
}

export function executeInitializeSystems() {
  addTelemetryEntry('System initialization sequence started');
  addTelemetryEntry('Resetting all systems to default state...');

  performSystemInitialization();

  setTimeout(() => {
    addTelemetryEntry('Power output initialized to 50%');
    addTelemetryEntry('CPU load initialized to 20%');
    addTelemetryEntry('Memory usage initialized to 20%');
    addTelemetryEntry('System integrity initialized to 100%');
    addTelemetryEntry('Suit color reset to default');
    addTelemetryEntry('Zoom calibration complete at 100%');
    addTelemetryEntry('All system modules deselected');
    addTelemetryEntry('All systems initialized successfully');
  }, 2000);
}

export function executeInitializeSystemsQuiet() {
  performSystemInitialization();
}

function performSystemInitialization() {
  if (state.isPartyMode) {
    stopPartyMode();
  }

  dom.colorSlider.value = 0;
  dom.colorValue.textContent = '0%';
  updateSuitColor(0);

  dom.zoomSlider.value = 100;
  dom.zoomValue.textContent = '100%';
  updateSuitZoom(100);

  dom.powerSlider.value = 50;
  dom.powerValue.textContent = '50%';
  updateArcReactor(50);

  const progressBars = dom.progressBars;
  const statusTexts = dom.statusTexts;

  if (progressBars.length >= 4 && statusTexts.length >= 4) {
    progressBars[0].style.width = '20%';
    statusTexts[0].textContent = '20%';

    progressBars[1].style.width = '20%';
    statusTexts[1].textContent = '20%';

    progressBars[2].style.width = '50%';
    statusTexts[2].textContent = '50%';

    progressBars[3].style.width = '100%';
    statusTexts[3].textContent = '100%';
  }

  dom.componentItems.forEach(comp => comp.classList.remove('selected'));
  dom.schematicParts.forEach(part => part.classList.remove('highlighted'));
}

function executeRunDiagnostics() {
  state.isDiagnosticsRunning = true;

  addTelemetryEntry('Comprehensive diagnostics initiated');
  addTelemetryEntry('Scanning all system components...');

  const progressBars = dom.progressBars;
  const statusTexts = dom.statusTexts;

  const originalCpuWidth = progressBars[0].style.width;
  const originalMemoryWidth = progressBars[1].style.width;
  const originalCpuText = statusTexts[0].textContent;
  const originalMemoryText = statusTexts[1].textContent;

  const originalStatuses = [];
  dom.componentItems.forEach(item => {
    const statusElement = item.querySelector('.component-status');
    originalStatuses.push({
      element: statusElement,
      text: statusElement.textContent,
      className: statusElement.className
    });
    statusElement.textContent = 'DIAG';
    statusElement.className = 'component-status diag';
  });

  progressBars[0].style.width = '100%';
  progressBars[1].style.width = '100%';
  statusTexts[0].textContent = '100%';
  statusTexts[1].textContent = '100%';

  dom.suitSchematic.classList.add('diagnostic-scan');

  addTelemetryEntry('CPU and Memory boosted for intensive scanning');
  addTelemetryEntry('All system modules entered diagnostic mode');
  addTelemetryEntry('Deep system analysis in progress...');

  setTimeout(() => {
    state.isDiagnosticsRunning = false;

    progressBars[0].style.width = originalCpuWidth;
    progressBars[1].style.width = originalMemoryWidth;
    statusTexts[0].textContent = originalCpuText;
    statusTexts[1].textContent = originalMemoryText;

    originalStatuses.forEach(status => {
      status.element.textContent = status.text;
      status.element.className = status.className;
    });

    dom.suitSchematic.classList.remove('diagnostic-scan');

    addTelemetryEntry('Diagnostic scan complete');
    addTelemetryEntry('CPU and Memory restored to normal levels');
    addTelemetryEntry('All system modules returned to normal status');
    addTelemetryEntry('All systems nominal - No issues detected');
  }, 15000);
}

function executeEmergencyShutdown() {
  addTelemetryEntry('EMERGENCY SHUTDOWN PROTOCOL ACTIVATED');

  if (state.isPartyMode) {
    stopPartyMode();
    addTelemetryEntry('Party mode emergency shutdown');
  }

  addTelemetryEntry('Deploying fire suppression systems...');

  const hoseAudio = new Audio('hose.mp3');
  hoseAudio.play().catch(error => {
    console.log('Hose audio playback failed:', error);
  });

  createFireExtinguisherSpray();

  setTimeout(() => {
    addTelemetryEntry('Fire extinguisher spray deployed');

    dom.powerSlider.value = 0;
    dom.powerValue.textContent = '0%';
    updateProgressBars();
    updateArcReactor(0);

    addTelemetryEntry('Power output reduced to minimum safe levels');
    addTelemetryEntry('Non-critical systems powered down');
    addTelemetryEntry('Emergency shutdown complete - Manual restart required');
  }, 2000);
}

function createFireExtinguisherSpray() {
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