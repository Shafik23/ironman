import { dom, getSchematicPart } from './dom.js';
import { componentMapping } from './constants.js';
import { addTelemetryEntry } from './telemetry.js';
import { announceComponentChange } from './jarvis.js';
import { events } from './events.js';
import { EventTypes } from './event-types.js';
import { clearDiagnosticFindings } from './diagnostics.js';
import { getSuitModel, isSuitModeActive, setSuitComponentSelection, subscribeSuitModel } from './suit-model.js';

export function setupComponentSelection() {
  subscribeSuitModel(({ state: model, changes }) => {
    if (
      changes.includes('selectedModule') ||
      changes.includes('activeModules') ||
      changes.includes('modules') ||
      changes.includes('loadout') ||
      changes.includes('modes.diagnostics')
    ) {
      renderComponentsFromModel(model);
    }
  });
  renderComponentsFromModel(getSuitModel());

  dom.componentItems.forEach(item => {
    item.addEventListener('click', () => {
      if (clearDiagnosticFindings({ resetStatuses: true })) {
        events.emit(EventTypes.DIAGNOSTICS_RESET, { reason: 'module reconfiguration' });
      }

      const componentType = item.dataset.component;
      const componentName = item.querySelector('.component-name').textContent;
      const wasSelected = Boolean(getSuitModel().modules[componentType]?.selected);
      const isSelected = !wasSelected;
      const model = setSuitComponentSelection(componentType, isSelected, { source: 'component-list' });
      const summary = model.loadout;
      const statusText = isSelected ? 'online' : 'offline';

      addTelemetryEntry(`${componentName} ${statusText} - Loadout ${summary.activeCount}/${summary.totalModules}`);
      if (summary.overLimit) {
        addTelemetryEntry(`Warning: loadout arc draw ${summary.powerDraw}% exceeds stable budget`);
      }
      announceComponentChange(componentType, isSelected);
    });

    item.addEventListener('mouseenter', () => {
      const componentType = item.dataset.component;
      const correspondingPart = getSchematicPart(componentMapping[componentType]);
      if (correspondingPart && !correspondingPart.classList.contains('highlighted')) {
        correspondingPart.style.filter = 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))';
      }
    });

    item.addEventListener('mouseleave', () => {
      const componentType = item.dataset.component;
      const correspondingPart = getSchematicPart(componentMapping[componentType]);
      if (correspondingPart && !correspondingPart.classList.contains('highlighted')) {
        correspondingPart.style.filter = '';
      }
    });
  });
}

function renderComponentsFromModel(model) {
  const diagnosticsRunning = isSuitModeActive('diagnostics');

  dom.componentItems.forEach(item => {
    const componentType = item.dataset.component;
    const moduleState = model.modules[componentType];
    const isSelected = Boolean(moduleState?.selected);
    const isOnline = Boolean(moduleState?.online);

    item.classList.toggle('selected', isSelected);

    if (!diagnosticsRunning) {
      const statusElement = item.querySelector('.component-status');
      statusElement.textContent = isOnline ? 'ONLINE' : 'OFFLINE';
      statusElement.className = `component-status ${isOnline ? 'online' : 'offline'}`;
    }
  });

  dom.schematicParts.forEach(part => {
    const componentType = Object.keys(componentMapping).find(key => componentMapping[key] === part.dataset.part);
    const moduleState = componentType ? model.modules[componentType] : null;
    part.classList.toggle('highlighted', Boolean(moduleState?.selected));
  });

  updateLoadoutSummary(model.loadout);
}

function updateLoadoutSummary(summary) {
  if (!summary) return;

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
