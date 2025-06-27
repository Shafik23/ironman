export const dom = {
  componentItems: null,
  schematicParts: null,
  tooltip: null,
  telemetryLog: null,
  musicToggle: null,
  backgroundMusic: null,
  jarvisToggle: null,
  jarvisIndicator: null,
  powerSlider: null,
  colorSlider: null,
  zoomSlider: null,
  powerValue: null,
  colorValue: null,
  zoomValue: null,
  commandButtons: null,
  progressBars: null,
  statusTexts: null,
  suitSchematic: null,
  schematicContainer: null
};

export function initializeDOMReferences() {
  dom.componentItems = document.querySelectorAll('.component-item');
  dom.schematicParts = document.querySelectorAll('.schematic-part');
  dom.tooltip = document.getElementById('tooltip');
  dom.telemetryLog = document.getElementById('telemetryLog');
  dom.musicToggle = document.getElementById('musicToggle');
  dom.backgroundMusic = document.getElementById('backgroundMusic');
  dom.jarvisToggle = document.getElementById('jarvisToggle');
  dom.jarvisIndicator = document.getElementById('jarvisIndicator');
  dom.powerSlider = document.getElementById('powerSlider');
  dom.colorSlider = document.getElementById('colorSlider');
  dom.zoomSlider = document.getElementById('zoomSlider');
  dom.powerValue = document.getElementById('powerValue');
  dom.colorValue = document.getElementById('colorValue');
  dom.zoomValue = document.getElementById('zoomValue');
  dom.commandButtons = document.querySelectorAll('.command-btn');
  dom.progressBars = document.querySelectorAll('.progress-fill');
  dom.statusTexts = document.querySelectorAll('.status-row span:last-child');
  dom.suitSchematic = document.querySelector('.suit-schematic');
  dom.schematicContainer = document.querySelector('.schematic-container');
}