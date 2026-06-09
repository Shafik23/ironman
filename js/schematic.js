import { dom, getComponentItem } from './dom.js';
import { componentMapping, tooltipContent } from './constants.js';
import { state } from './state.js';
import { getDiagnosticTooltip } from './diagnostics.js';

export function setupSchematicInteraction() {
  dom.schematicParts.forEach(part => {
    part.addEventListener('mouseenter', e => {
      showTooltip(e, part.dataset.part);
    });

    part.addEventListener('mousemove', e => {
      updateTooltipPosition(e);
    });

    part.addEventListener('mouseleave', () => {
      hideTooltip();
    });

    part.addEventListener('click', () => {
      const partType = part.dataset.part;
      const componentType = Object.keys(componentMapping).find(key => componentMapping[key] === partType);
      if (componentType) {
        const correspondingComponent = getComponentItem(componentType);
        if (correspondingComponent) {
          correspondingComponent.click();
        }
      }
    });
  });
}

function showTooltip(event, partType) {
  const baseContent =
    partType === 'chest' && state.reactorTooltip ? state.reactorTooltip : tooltipContent[partType] || 'Unknown Component';
  const content = baseContent + getDiagnosticTooltip(partType);
  dom.tooltip.innerHTML = content;
  dom.tooltip.classList.add('visible');
  updateTooltipPosition(event);
}

function updateTooltipPosition(event) {
  const container = event.currentTarget.closest('.schematic-container');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  dom.tooltip.style.left = event.clientX - rect.left + 10 + 'px';
  dom.tooltip.style.top = event.clientY - rect.top - 10 + 'px';
}

export function hideTooltip() {
  dom.tooltip.classList.remove('visible');
}
