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
  schematicContainer: null,
  reactorCore: null,
  loadoutActiveCount: null,
  loadoutPowerDraw: null,
  loadoutPowerFill: null,
  loadoutStatus: null,
  hudToggle: null,
  hudOverlay: null,
  hudBackBtn: null,
  hudAltitude: null,
  hudSpeed: null,
  hudPowerValue: null,
  hudPowerArc: null,
  hudWarnings: null,
  hudLat: null,
  hudLon: null,
  hudHelmetStatus: null,
  hudChestStatus: null,
  hudArmsStatus: null,
  hudLegsStatus: null,
  commandButtonsByCommand: null,
  componentItemsByType: null,
  schematicPartsByType: null
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
  dom.commandButtonsByCommand = mapElementsByDataset(dom.commandButtons, 'command');
  dom.progressBars = document.querySelectorAll('.progress-fill');
  dom.statusTexts = document.querySelectorAll('.status-row span:last-child');
  dom.suitSchematic = document.querySelector('.suit-schematic');
  dom.schematicContainer = document.querySelector('.schematic-container');
  dom.reactorCore = document.querySelector('.reactor-core');
  dom.loadoutActiveCount = document.getElementById('loadoutActiveCount');
  dom.loadoutPowerDraw = document.getElementById('loadoutPowerDraw');
  dom.loadoutPowerFill = document.getElementById('loadoutPowerFill');
  dom.loadoutStatus = document.getElementById('loadoutStatus');
  dom.hudToggle = document.getElementById('hudToggle');
  dom.hudOverlay = document.getElementById('hudOverlay');
  dom.hudBackBtn = document.getElementById('hudBackBtn');
  dom.hudAltitude = document.getElementById('hudAltitude');
  dom.hudSpeed = document.getElementById('hudSpeed');
  dom.hudPowerValue = document.getElementById('hudPowerValue');
  dom.hudPowerArc = document.getElementById('hudPowerArc');
  dom.hudWarnings = document.getElementById('hudWarnings');
  dom.hudLat = document.getElementById('hudLat');
  dom.hudLon = document.getElementById('hudLon');
  dom.hudHelmetStatus = document.getElementById('hudHelmetStatus');
  dom.hudChestStatus = document.getElementById('hudChestStatus');
  dom.hudArmsStatus = document.getElementById('hudArmsStatus');
  dom.hudLegsStatus = document.getElementById('hudLegsStatus');

  dom.componentItemsByType = mapElementsByDataset(dom.componentItems, 'component');
  dom.schematicPartsByType = mapElementsByDataset(dom.schematicParts, 'part');
}

function mapElementsByDataset(elements, key) {
  return new Map([...elements].filter(element => element.dataset[key]).map(element => [element.dataset[key], element]));
}

export function getCommandButton(command) {
  return dom.commandButtonsByCommand?.get(command) || null;
}

export function getComponentItem(component) {
  return dom.componentItemsByType?.get(component) || null;
}

export function getSchematicPart(part) {
  return dom.schematicPartsByType?.get(part) || null;
}
