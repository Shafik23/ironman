import { componentMapping } from './constants.js';
import { events } from './events.js';

const MODULE_IDS = Object.freeze(Object.keys(componentMapping));
const PERCENT_MIN = 0;
const PERCENT_MAX = 100;

const subscribers = new Set();

function clampPercent(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return PERCENT_MIN;
  return Math.max(PERCENT_MIN, Math.min(PERCENT_MAX, parsed));
}

function createModuleState(selectedModule = null) {
  return MODULE_IDS.reduce((modules, moduleId) => {
    const isSelected = moduleId === selectedModule;
    modules[moduleId] = {
      selected: isSelected,
      online: isSelected
    };
    return modules;
  }, {});
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
    modules: createModuleState(),
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

  events.emit('suit-model:changed', payload);
  return payload.state;
}

function normalizeSuitModel(model) {
  const selectedModule = MODULE_IDS.includes(model.selectedModule) ? model.selectedModule : null;
  const modules = MODULE_IDS.reduce((nextModules, moduleId) => {
    const isSelected = moduleId === selectedModule;
    nextModules[moduleId] = {
      selected: isSelected,
      online: Boolean(model.modules?.[moduleId]?.online) || isSelected
    };
    return nextModules;
  }, {});

  return {
    power: clampPercent(model.power),
    color: clampPercent(model.color),
    zoom: clampPercent(model.zoom),
    cpuLoad: clampPercent(model.cpuLoad),
    memoryLoad: clampPercent(model.memoryLoad),
    integrity: clampPercent(model.integrity),
    selectedModule,
    modules,
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

  events.emit('power:changed', { value: state.power, source });
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

  events.emit('color:changed', { value: state.color, source });
  return state;
}

export function setSuitZoom(value, { source = 'config' } = {}) {
  const state = commitSuitModel(
    {
      ...suitModel,
      zoom: clampPercent(value)
    },
    { source, changes: ['zoom'] }
  );

  events.emit('zoom:changed', { value: state.zoom, source });
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

  const nextSelectedModule = selected ? component : suitModel.selectedModule === component ? null : suitModel.selectedModule;
  const nextModules = createModuleState(nextSelectedModule);

  const state = commitSuitModel(
    {
      ...suitModel,
      selectedModule: nextSelectedModule,
      modules: nextModules
    },
    { source, changes: ['selectedModule', 'modules'] }
  );

  events.emit('component:selection', { component, selected: Boolean(selected), source });
  events.emit(selected ? 'component:selected' : 'component:deselected', { component, source });
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
      'modules',
      'alerts',
      'modes.diagnostics',
      'modes.party',
      'modes.emergency'
    ]
  });

  events.emit('power:changed', { value: state.power, source });
  events.emit('color:changed', { value: state.color, source });
  events.emit('zoom:changed', { value: state.zoom, source });
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
