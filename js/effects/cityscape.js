// Cityscape Animation Control
// Manages the parallax night cityscape background

let cityscapeAnimating = false;

export function startCityscapeAnimation() {
  if (cityscapeAnimating) return;
  cityscapeAnimating = true;

  const layers = document.querySelectorAll('.cityscape-layer');
  layers.forEach(layer => {
    layer.style.animationPlayState = 'running';
  });
}

export function stopCityscapeAnimation() {
  cityscapeAnimating = false;

  const layers = document.querySelectorAll('.cityscape-layer');
  layers.forEach(layer => {
    layer.style.animationPlayState = 'paused';
  });
}

export function isCityscapeAnimating() {
  return cityscapeAnimating;
}
