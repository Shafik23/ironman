import { dom } from './dom.js';
import { componentMapping } from './constants.js';
import { addTelemetryEntry } from './telemetry.js';
import { announceComponentChange } from './jarvis.js';
import { getSuitModel, isSuitModeActive, setSuitComponentSelection, subscribeSuitModel } from './suit-model.js';

export function setupComponentSelection() {
  subscribeSuitModel(({ state: model, changes }) => {
    if (
      changes.includes('selectedModule') ||
      changes.includes('modules') ||
      changes.includes('modes.diagnostics')
    ) {
      renderComponentsFromModel(model);
    }
  });
  renderComponentsFromModel(getSuitModel());

  dom.componentItems.forEach(item => {
    item.addEventListener('click', () => {
      const componentType = item.dataset.component;
      const componentName = item.querySelector('.component-name').textContent;
      const wasSelected = Boolean(getSuitModel().modules[componentType]?.selected);
      const isSelected = !wasSelected;

      setSuitComponentSelection(componentType, isSelected, { source: 'component-list' });

      if (wasSelected) {
        addTelemetryEntry(`${componentName} deselected`);
        announceComponentChange(componentType, false);
      } else {
        addTelemetryEntry(`${componentName} selected for configuration`);
        announceComponentChange(componentType, true);
      }
    });

    item.addEventListener('mouseenter', () => {
      const componentType = item.dataset.component;
      const correspondingPart = document.querySelector(`[data-part="${componentMapping[componentType]}"]`);
      if (correspondingPart && !correspondingPart.classList.contains('highlighted')) {
        correspondingPart.style.filter = 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))';
      }
    });

    item.addEventListener('mouseleave', () => {
      const componentType = item.dataset.component;
      const correspondingPart = document.querySelector(`[data-part="${componentMapping[componentType]}"]`);
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
}
