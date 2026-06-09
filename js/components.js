import { dom } from './dom.js';
import { componentMapping } from './constants.js';
import { state } from './state.js';
import { addTelemetryEntry } from './telemetry.js';
import { announceComponentChange } from './jarvis.js';
import { events } from './events.js';

export function setupComponentSelection() {
  dom.componentItems.forEach(item => {
    item.addEventListener('click', () => {
      const componentType = item.dataset.component;
      const wasSelected = item.classList.contains('selected');

      if (wasSelected) {
        setSelectedComponent(null, {
          changedComponent: componentType,
          emitEvent: true,
          telemetry: true,
          announce: true
        });
      } else {
        setSelectedComponent(componentType, {
          emitEvent: true,
          telemetry: true,
          announce: true
        });
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

export function setSelectedComponent(componentType, options = {}) {
  const { changedComponent = componentType, emitEvent = false, telemetry = false, announce = false } = options;
  const item = componentType ? findComponentItem(componentType) : null;
  const selectedComponent = item ? componentType : null;
  const eventComponent = changedComponent || selectedComponent;

  dom.componentItems.forEach(comp => {
    comp.classList.remove('selected');
    if (!state.isDiagnosticsRunning) {
      const compStatus = comp.querySelector('.component-status');
      compStatus.textContent = 'OFFLINE';
      compStatus.className = 'component-status offline';
    }
  });

  dom.schematicParts.forEach(part => part.classList.remove('highlighted'));

  if (item) {
    item.classList.add('selected');

    if (!state.isDiagnosticsRunning) {
      const statusElement = item.querySelector('.component-status');
      statusElement.textContent = 'ONLINE';
      statusElement.className = 'component-status online';
    }

    const correspondingPart = document.querySelector(`[data-part="${componentMapping[selectedComponent]}"]`);
    if (correspondingPart) {
      correspondingPart.classList.add('highlighted');
    }
  }

  if (telemetry && eventComponent) {
    const eventItem = findComponentItem(eventComponent);
    const componentName = eventItem?.querySelector('.component-name')?.textContent || eventComponent;
    addTelemetryEntry(
      selectedComponent ? `${componentName} selected for configuration` : `${componentName} deselected`
    );
  }

  if (announce && eventComponent) {
    announceComponentChange(eventComponent, Boolean(selectedComponent));
  }

  if (emitEvent && eventComponent) {
    const selected = Boolean(selectedComponent);
    events.emit('component:selection', { component: eventComponent, selected });
    events.emit(selected ? 'component:selected' : 'component:deselected', { component: eventComponent });
  }

  return selectedComponent;
}

export function getSelectedComponent() {
  return document.querySelector('.component-item.selected')?.dataset.component || null;
}

function findComponentItem(componentType) {
  return Array.from(dom.componentItems).find(item => item.dataset.component === componentType) || null;
}
