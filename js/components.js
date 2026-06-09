import { dom } from './dom.js';
import { componentMapping, LOADOUT_POWER_LIMIT, modulePowerDraw } from './constants.js';
import { state } from './state.js';
import { addTelemetryEntry } from './telemetry.js';
import { announceComponentChange } from './jarvis.js';
import { events } from './events.js';

export function setupComponentSelection() {
  dom.componentItems.forEach(item => {
    item.addEventListener('click', () => {
      toggleModule(item.dataset.component);
    });

    item.addEventListener('mouseenter', () => {
      const correspondingPart = getCorrespondingPart(item.dataset.component);
      if (correspondingPart && !correspondingPart.classList.contains('highlighted')) {
        correspondingPart.style.filter = 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))';
      }
    });

    item.addEventListener('mouseleave', () => {
      const correspondingPart = getCorrespondingPart(item.dataset.component);
      if (correspondingPart && !correspondingPart.classList.contains('highlighted')) {
        correspondingPart.style.filter = '';
      }
    });
  });

  syncLoadoutFromState();
}

export function toggleModule(componentType) {
  const item = getComponentItem(componentType);
  if (!item) return;

  const shouldActivate = !state.activeModules.has(componentType);
  setModuleActive(componentType, shouldActivate);
}

export function resetModuleLoadout({ emitEvents = false } = {}) {
  const previouslyActive = [...state.activeModules];

  state.activeModules.clear();
  syncLoadoutFromState();

  if (emitEvents) {
    previouslyActive.forEach(componentType => {
      events.emit('component:deselected', { component: componentType });
    });

    emitLoadoutEvent({
      componentType: null,
      isActive: false,
      summary: getLoadoutSummary()
    });
  }
}

export function syncModuleLoadout() {
  syncLoadoutFromState();
}

function setModuleActive(componentType, isActive) {
  const item = getComponentItem(componentType);
  const correspondingPart = getCorrespondingPart(componentType);
  if (!item) return;

  if (isActive) {
    state.activeModules.add(componentType);
  } else {
    state.activeModules.delete(componentType);
  }

  item.classList.toggle('selected', isActive);

  if (correspondingPart) {
    correspondingPart.classList.toggle('highlighted', isActive);
    if (!isActive) {
      correspondingPart.style.filter = '';
    }
  }

  if (!state.isDiagnosticsRunning) {
    updateComponentStatus(item, isActive);
  }

  const componentName = item.querySelector('.component-name').textContent;
  const summary = getLoadoutSummary();
  const statusText = isActive ? 'online' : 'offline';

  addTelemetryEntry(`${componentName} ${statusText} - Loadout ${summary.activeCount}/${summary.totalModules}`);
  if (summary.overLimit) {
    addTelemetryEntry(`Warning: loadout arc draw ${summary.powerDraw}% exceeds stable budget`);
  }
  announceComponentChange(componentType, isActive);
  emitLoadoutEvent({ componentType, isActive, summary });
  events.emit(isActive ? 'component:selected' : 'component:deselected', { component: componentType });

  updateLoadoutSummary(summary);
}

function syncLoadoutFromState() {
  dom.componentItems.forEach(item => {
    const componentType = item.dataset.component;
    const isActive = state.activeModules.has(componentType);
    const correspondingPart = getCorrespondingPart(componentType);

    item.classList.toggle('selected', isActive);
    if (!state.isDiagnosticsRunning) {
      updateComponentStatus(item, isActive);
    }

    if (correspondingPart) {
      correspondingPart.classList.toggle('highlighted', isActive);
      if (!isActive) {
        correspondingPart.style.filter = '';
      }
    }
  });

  updateLoadoutSummary();
}

function updateComponentStatus(item, isActive) {
  const statusElement = item.querySelector('.component-status');
  statusElement.textContent = isActive ? 'ONLINE' : 'OFFLINE';
  statusElement.className = `component-status ${isActive ? 'online' : 'offline'}`;
}

function updateLoadoutSummary(summary = getLoadoutSummary()) {
  if (dom.loadoutActiveCount) {
    dom.loadoutActiveCount.textContent = `${summary.activeCount}/${summary.totalModules}`;
  }

  if (dom.loadoutPowerDraw) {
    dom.loadoutPowerDraw.textContent = `${summary.powerDraw}%`;
  }

  if (dom.loadoutPowerFill) {
    dom.loadoutPowerFill.style.width = `${summary.powerPercent}%`;
    dom.loadoutPowerFill.classList.toggle('overdraw', summary.overLimit);
  }

  if (dom.loadoutStatus) {
    dom.loadoutStatus.textContent = summary.overLimit ? 'ARC OVERDRAW' : 'STABLE';
    dom.loadoutStatus.classList.toggle('overdraw', summary.overLimit);
  }
}

function emitLoadoutEvent({ componentType, isActive, summary }) {
  events.emit('component:selection', {
    component: componentType,
    selected: isActive,
    activeModules: [...state.activeModules],
    powerDraw: summary.powerDraw,
    powerLimit: LOADOUT_POWER_LIMIT,
    overLimit: summary.overLimit
  });
}

function getLoadoutSummary() {
  const activeModules = [...state.activeModules];
  const powerDraw = activeModules.reduce((total, componentType) => total + (modulePowerDraw[componentType] || 0), 0);

  return {
    activeCount: activeModules.length,
    totalModules: dom.componentItems.length,
    powerDraw,
    powerPercent: Math.min(powerDraw, LOADOUT_POWER_LIMIT),
    overLimit: powerDraw > LOADOUT_POWER_LIMIT
  };
}

function getComponentItem(componentType) {
  return document.querySelector(`[data-component="${componentType}"]`);
}

function getCorrespondingPart(componentType) {
  return document.querySelector(`[data-part="${componentMapping[componentType]}"]`);
}
