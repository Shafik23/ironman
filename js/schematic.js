import { dom } from './dom.js';
import { componentMapping, tooltipContent } from './constants.js';

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
        const correspondingComponent = document.querySelector(`[data-component="${componentType}"]`);
        if (correspondingComponent) {
          correspondingComponent.click();
        }
      }
    });
  });
}

function showTooltip(event, partType) {
  dom.tooltip.innerHTML = tooltipContent[partType] || 'Unknown Component';
  dom.tooltip.classList.add('visible');
  updateTooltipPosition(event);
}

function updateTooltipPosition(event) {
  const rect = event.currentTarget.closest('.schematic-container').getBoundingClientRect();
  dom.tooltip.style.left = event.clientX - rect.left + 10 + 'px';
  dom.tooltip.style.top = event.clientY - rect.top - 10 + 'px';
}

export function hideTooltip() {
  dom.tooltip.classList.remove('visible');
}