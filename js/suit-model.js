import { componentMapping, LOADOUT_POWER_LIMIT, modulePowerDraw, SUIT_ZOOM } from './constants.js';
import { events } from './events.js';
import { EventTypes } from './event-types.js';

const MODULE_IDS = Object.freeze(Object.keys(componentMapping));
const PERCENT_MIN = 0;
const PERCENT_MAX = 100;

const subscribers = new Set();

function clampPercent(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return PERCENT_MIN;
  return Math.max(PERCENT_MIN, Math.min(PERCENT_MAX, parsed));
}

function clampZoom(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return SUIT_ZOOM.DEFAULT;
  return Math.max(SUIT_ZOOM.MIN, Math.min(SUIT_ZOOM.MAX, parsed));
}

function createModuleState(activeModules = []) {
  const activeSet = new Set(activeModules);
  return MODULE_IDS.reduce((modules, moduleId) => {
    const isSelected = activeSet.has(moduleId);
    modules[moduleId] = {
      selected: isSelected,
      online: isSelected
    };
    return modules;
  }, {});
}

function calculateLoadout(activeModules) {
  const powerDraw = activeModules.reduce((total, moduleId) => total + (modulePowerDraw[moduleId] || 0), 0);

  return {
    activeCount: activeModules.length,
    totalModules: MODULE_IDS.length,
    powerDraw,
    powerLimit: LOADOUT_POWER_LIMIT,
    powerPercent: Math.min(powerDraw, LOADOUT_POWER_LIMIT),
    overLimit: powerDraw > LOADOUT_POWER_LIMIT
  };
}

function createDefaultSuitModel() {
  return {
    power: 50,
    color: 0,
    zoom: 100,
    cpuLoad: 20,
    memoryLoad: 20,
    integrity: 100,
    selectedModule: null,
    activeModules: [],
    modules: createModuleState(),
    loadout: calculateLoadout([]),
    alerts: [],
    modes: {
      diagnostics: false,
      party: false,
      hud: false,
      emergency: false
    }
  };
}

let suitModel = createDefaultSuitModel();

function cloneModel(model) {
  return {
    ...model,
    modules: Object.fromEntries(
      Object.entries(model.modules).map(([moduleId, moduleState]) => [moduleId, { ...moduleState }])
    ),
    activeModules: [...model.activeModules],
    loadout: { ...model.loadout },
    alerts: [...model.alerts],
    modes: { ...model.modes }
  };
}

function deriveStatusLoads(power) {
  const normalizedPower = clampPercent(power);
  return {
    cpuLoad: Math.min(normalizedPower + 10, 100),
    memoryLoad: Math.min(normalizedPower * 0.6, 100),
    power: normalizedPower,
    integrity: Math.min(normalizedPower + 5, 100)
  };
}

function commitSuitModel(nextModel, { source = 'suit-model', changes = [] } = {}) {
  const previous = suitModel;
  suitModel = normalizeSuitModel(nextModel);

  const payload = {
    state: getSuitModel(),
    previous: cloneModel(previous),
    changes,
    source
  };

  subscribers.forEach(handler => {
    try {
      handler(payload);
    } catch (error) {
      console.error('Error in suit model subscriber:', error);
    }
  });

  events.emit(EventTypes.SUIT_MODEL_CHANGED, payload);
  return payload.state;
}

function normalizeSuitModel(model) {
  const activeSet = new Set(
    Array.isArray(model.activeModules)
      ? model.activeModules.filter(moduleId => MODULE_IDS.includes(moduleId))
      : []
  );

  MODULE_IDS.forEach(moduleId => {
    if (model.modules?.[moduleId]?.selected || model.modules?.[moduleId]?.online) {
      activeSet.add(moduleId);
    }
  });

  const activeModules = MODULE_IDS.filter(moduleId => activeSet.has(moduleId));
  const selectedModule = activeModules.includes(model.selectedModule) ? model.selectedModule : activeModules[0] || null;
  const modules = createModuleState(activeModules);

  return {
    power: clampPercent(model.power),
    color: clampPercent(model.color),
    zoom: clampZoom(model.zoom),
    cpuLoad: clampPercent(model.cpuLoad),
    memoryLoad: clampPercent(model.memoryLoad),
    integrity: clampPercent(model.integrity),
    selectedModule,
    activeModules,
    modules,
    loadout: calculateLoadout(activeModules),
    alerts: Array.isArray(model.alerts) ? [...model.alerts] : [],
    modes: {
      diagnostics: Boolean(model.modes?.diagnostics),
      party: Boolean(model.modes?.party),
      hud: Boolean(model.modes?.hud),
      emergency: Boolean(model.modes?.emergency)
    }
  };
}

export function getSuitModel() {
  return cloneModel(suitModel);
}

export function subscribeSuitModel(handler) {
  subscribers.add(handler);
  return () => subscribers.delete(handler);
}

export function setSuitPower(value, { source = 'config', deriveStatus = true } = {}) {
  const power = clampPercent(value);
  const derivedLoads = deriveStatus ? deriveStatusLoads(power) : {};

  const nextModel = {
    ...suitModel,
    ...derivedLoads,
    power
  };

  const state = commitSuitModel(nextModel, {
    source,
    changes: deriveStatus ? ['power', 'cpuLoad', 'memoryLoad', 'integrity'] : ['power']
  });

  events.emit(EventTypes.CONFIG_POWER_CHANGED, { value: state.power, source });
  return state;
}

export function setSuitColor(value, { source = 'config' } = {}) {
  const state = commitSuitModel(
    {
      ...suitModel,
      color: clampPercent(value)
    },
    { source, changes: ['color'] }
  );

  events.emit(EventTypes.CONFIG_COLOR_CHANGED, { value: state.color, source });
  return state;
}

export function setSuitZoom(value, { source = 'config' } = {}) {
  const state = commitSuitModel(
    {
      ...suitModel,
      zoom: clampZoom(value)
    },
    { source, changes: ['zoom'] }
  );

  events.emit(EventTypes.CONFIG_ZOOM_CHANGED, { value: state.zoom, source });
  return state;
}

export function setSuitStatusLoads(loads, { source = 'status' } = {}) {
  const nextModel = {
    ...suitModel,
    cpuLoad: loads.cpuLoad ?? suitModel.cpuLoad,
    memoryLoad: loads.memoryLoad ?? suitModel.memoryLoad,
    power: loads.power ?? suitModel.power,
    integrity: loads.integrity ?? suitModel.integrity
  };

  return commitSuitModel(nextModel, {
    source,
    changes: ['cpuLoad', 'memoryLoad', 'power', 'integrity']
  });
}

export function setSuitComponentSelection(component, selected, { source = 'component' } = {}) {
  if (!MODULE_IDS.includes(component)) {
    return getSuitModel();
  }

  const activeSet = new Set(suitModel.activeModules);
  if (selected) {
    activeSet.add(component);
  } else {
    activeSet.delete(component);
  }

  const activeModules = MODULE_IDS.filter(moduleId => activeSet.has(moduleId));
  const nextSelectedModule = selected
    ? component
    : suitModel.selectedModule === component
      ? activeModules[0] || null
      : suitModel.selectedModule;
  const nextModules = createModuleState(activeModules);

  const state = commitSuitModel(
    {
      ...suitModel,
      selectedModule: nextSelectedModule,
      activeModules,
      modules: nextModules
    },
    { source, changes: ['selectedModule', 'activeModules', 'modules', 'loadout'] }
  );

  events.emit(EventTypes.COMPONENT_SELECTION, {
    component,
    selected: Boolean(selected),
    activeModules: state.activeModules,
    powerDraw: state.loadout.powerDraw,
    powerLimit: state.loadout.powerLimit,
    overLimit: state.loadout.overLimit,
    source
  });
  return state;
}

export function resetSuitSystems({ source = 'initialize' } = {}) {
  const nextModel = createDefaultSuitModel();
  nextModel.modes.hud = suitModel.modes.hud;

  const state = commitSuitModel(nextModel, {
    source,
    changes: [
      'power',
      'color',
      'zoom',
      'cpuLoad',
      'memoryLoad',
      'integrity',
      'selectedModule',
      'activeModules',
      'modules',
      'loadout',
      'alerts',
      'modes.diagnostics',
      'modes.party',
      'modes.emergency'
    ]
  });

  events.emit(EventTypes.CONFIG_POWER_CHANGED, { value: state.power, source });
  events.emit(EventTypes.CONFIG_COLOR_CHANGED, { value: state.color, source });
  events.emit(EventTypes.CONFIG_ZOOM_CHANGED, { value: state.zoom, source });
  return state;
}

export function setSuitMode(mode, active, { source = 'mode' } = {}) {
  if (!Object.prototype.hasOwnProperty.call(suitModel.modes, mode)) {
    return getSuitModel();
  }

  return commitSuitModel(
    {
      ...suitModel,
      modes: {
        ...suitModel.modes,
        [mode]: Boolean(active)
      }
    },
    { source, changes: [`modes.${mode}`] }
  );
}

export function isSuitModeActive(mode) {
  return Boolean(suitModel.modes[mode]);
}

export function setSuitAlerts(alerts, { source = 'alerts' } = {}) {
  return commitSuitModel(
    {
      ...suitModel,
      alerts: Array.isArray(alerts) ? alerts : []
    },
    { source, changes: ['alerts'] }
  );
}

export function addSuitAlert(alert, { source = 'alerts' } = {}) {
  return setSuitAlerts([...suitModel.alerts, alert], { source });
}

export function clearSuitAlerts({ source = 'alerts' } = {}) {
  return setSuitAlerts([], { source });
}
