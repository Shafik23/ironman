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
      const correspondingPart = document.querySelector(`[data-part="${componentMapping[componentType]}"]`);
      const componentName = item.querySelector('.component-name').textContent;

      const wasSelected = item.classList.contains('selected');

      if (wasSelected) {
        item.classList.remove('selected');
        if (correspondingPart) {
          correspondingPart.classList.remove('highlighted');
        }

        if (!state.isDiagnosticsRunning) {
          const statusElement = item.querySelector('.component-status');
          statusElement.textContent = 'OFFLINE';
          statusElement.className = 'component-status offline';
        }

        addTelemetryEntry(`${componentName} deselected`);
        announceComponentChange(componentType, false);
        events.emit('component:selection', { component: componentType, selected: false });
      } else {
        dom.componentItems.forEach(comp => {
          comp.classList.remove('selected');
          if (!state.isDiagnosticsRunning) {
            const compStatus = comp.querySelector('.component-status');
            compStatus.textContent = 'OFFLINE';
            compStatus.className = 'component-status offline';
          }
        });
        dom.schematicParts.forEach(part => part.classList.remove('highlighted'));

        item.classList.add('selected');

        if (!state.isDiagnosticsRunning) {
          const statusElement = item.querySelector('.component-status');
          statusElement.textContent = 'ONLINE';
          statusElement.className = 'component-status online';
        }

        if (correspondingPart) {
          correspondingPart.classList.add('highlighted');
        }

        addTelemetryEntry(`${componentName} selected for configuration`);
        announceComponentChange(componentType, true);
        events.emit('component:selection', { component: componentType, selected: true });
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
