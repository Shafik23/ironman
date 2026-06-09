// Central event contract names for the MK-VII interface event bus.
//
// Main payload shapes:
// - CONFIG_*: { value: number }
// - COMPONENT_SELECTION: { component: string, selected: boolean }
// - INITIALIZE_* status events with meters: { value: number }
// - PARTY_STOPPED: { reason?: 'shutdown' | string }

export const EventTypes = Object.freeze({
  SUIT_MODEL_CHANGED: 'suit-model:changed',

  CONFIG_POWER_CHANGED: 'power:changed',
  CONFIG_COLOR_CHANGED: 'color:changed',
  CONFIG_ZOOM_CHANGED: 'zoom:changed',

  COMPONENT_SELECTION: 'component:selection',

  INITIALIZE_START: 'system:initialize:start',
  INITIALIZE_POWER: 'system:initialize:power',
  INITIALIZE_CPU: 'system:initialize:cpu',
  INITIALIZE_MEMORY: 'system:initialize:memory',
  INITIALIZE_INTEGRITY: 'system:initialize:integrity',
  INITIALIZE_COLOR: 'system:initialize:color',
  INITIALIZE_ZOOM: 'system:initialize:zoom',
  INITIALIZE_MODULES: 'system:initialize:modules',
  INITIALIZE_COMPLETE: 'system:initialize:complete',

  DIAGNOSTICS_START: 'diagnostics:start',
  DIAGNOSTICS_BOOST: 'diagnostics:boost',
  DIAGNOSTICS_COMPLETE: 'diagnostics:complete',

  SHUTDOWN_START: 'shutdown:start',
  SHUTDOWN_COMPLETE: 'shutdown:complete',

  PARTY_STARTED: 'party:started',
  PARTY_STOPPED: 'party:stopped',

  HUD_ACTIVATED: 'hud:activated',
  HUD_DEACTIVATED: 'hud:deactivated',

  SYSTEMS_TICK: 'systems:tick',
  SYSTEMS_WARNINGS_CHANGED: 'systems:warnings:changed',
  SYSTEMS_INTEGRITY_DAMAGED: 'systems:integrity:damaged'
});
