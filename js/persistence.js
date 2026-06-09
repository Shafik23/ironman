import { dom } from './dom.js';
import { events } from './events.js';
import { EventTypes } from './event-types.js';
import { DEFAULT_OPERATIONAL_STATE, componentMapping, SUIT_ZOOM } from './constants.js';
import { setSuitPowerTarget } from './systems.js';
import {
  getSuitModel,
  isSuitModeActive,
  setSuitColor,
  setSuitComponentSelection,
  setSuitPower,
  setSuitZoom,
  subscribeSuitModel
} from './suit-model.js';
import { activateHudMode, deactivateHudMode } from './hud.js';
import { addTelemetryEntry } from './telemetry.js';

const STORAGE_KEY = 'ironman.suitDesigner.v1';

const DEFAULT_STORAGE_STATE = {
  version: 1,
  operational: { ...DEFAULT_OPERATIONAL_STATE },
  preferences: {
    hudMode: false,
    jarvisEnabled: false
  },
  stats: {
    sessionCount: 0,
    initializeCount: 0,
    lastSessionAt: null,
    lastUpdatedAt: null
  }
};

let storageAvailable = false;
let restoring = false;

export function setupPersistence() {
  storageAvailable = canUseLocalStorage();
  if (!storageAvailable) {
    addTelemetryEntry('Suit memory unavailable - local persistence disabled');
    return;
  }

  const storedState = loadStoredState();
  const sessionCount = incrementSessionCounter(storedState);

  setupPersistenceListeners();
  restoreOperationalState(storedState.operational);
  restorePreferences(storedState.preferences);
  persistOperationalState();

  addTelemetryEntry(`Suit memory restored - session ${sessionCount}`);
}

function setupPersistenceListeners() {
  subscribeSuitModel(({ state: model, changes }) => {
    if (restoring) return;

    const operationalChanges = ['power', 'color', 'zoom', 'activeModules', 'modules'];
    if (changes.some(change => operationalChanges.includes(change))) {
      saveOperationalPatch(modelToOperationalState(model));
    }
  });

  events.on(EventTypes.HUD_ACTIVATED, () => {
    savePreferencePatch({ hudMode: true });
  });

  events.on(EventTypes.HUD_DEACTIVATED, () => {
    savePreferencePatch({ hudMode: false });
  });

  events.on(EventTypes.JARVIS_CHANGED, ({ enabled }) => {
    savePreferencePatch({ jarvisEnabled: Boolean(enabled) });
  });

  events.on(EventTypes.SHUTDOWN_COMPLETE, () => {
    saveOperationalPatch({ power: getSuitModel().power });
  });

  events.on(EventTypes.INITIALIZE_COMPLETE, () => {
    resetPersistedOperationalState();
  });
}

function restoreOperationalState(operational) {
  const restored = normalizeOperationalState(operational);

  restoring = true;
  setSuitColor(restored.color, { source: 'persistence' });
  setSuitZoom(restored.zoom, { source: 'persistence' });
  setSuitPowerTarget(restored.power);
  setSuitPower(restored.power, { source: 'persistence', deriveStatus: false });

  Object.keys(componentMapping).forEach(component => {
    const shouldBeActive = restored.activeModules.includes(component);
    if (getSuitModel().modules[component]?.selected !== shouldBeActive) {
      setSuitComponentSelection(component, shouldBeActive, { source: 'persistence' });
    }
  });
  restoring = false;
}

function restorePreferences(preferences) {
  const restoredPreferences = normalizePreferences(preferences);

  if (dom.hudToggle) {
    if (restoredPreferences.hudMode && !isSuitModeActive('hud')) {
      activateHudMode();
    } else if (!restoredPreferences.hudMode && isSuitModeActive('hud')) {
      deactivateHudMode();
    }
  }

  if (dom.jarvisToggle && restoredPreferences.jarvisEnabled) {
    addTelemetryEntry('J.A.R.V.I.S. preference retained - manual activation required for voice systems');
  }
}

function persistOperationalState() {
  saveOperationalPatch(modelToOperationalState(getSuitModel()));
}

function resetPersistedOperationalState() {
  const current = loadStoredState();
  const nextInitializeCount = current.stats.initializeCount + 1;

  saveStoredState({
    ...current,
    operational: { ...DEFAULT_OPERATIONAL_STATE },
    stats: {
      ...current.stats,
      initializeCount: nextInitializeCount,
      lastUpdatedAt: new Date().toISOString()
    }
  });

  addTelemetryEntry(`Suit memory reset to MK-VII defaults - initialization ${nextInitializeCount}`);
}

function incrementSessionCounter(storedState) {
  const sessionCount = storedState.stats.sessionCount + 1;

  saveStoredState({
    ...storedState,
    stats: {
      ...storedState.stats,
      sessionCount,
      lastSessionAt: new Date().toISOString()
    }
  });

  return sessionCount;
}

function saveOperationalPatch(patch) {
  const current = loadStoredState();
  saveStoredState({
    ...current,
    operational: normalizeOperationalState({
      ...current.operational,
      ...patch
    }),
    stats: {
      ...current.stats,
      lastUpdatedAt: new Date().toISOString()
    }
  });
}

function savePreferencePatch(patch) {
  const current = loadStoredState();
  saveStoredState({
    ...current,
    preferences: normalizePreferences({
      ...current.preferences,
      ...patch
    }),
    stats: {
      ...current.stats,
      lastUpdatedAt: new Date().toISOString()
    }
  });
}

function loadStoredState() {
  if (!storageAvailable) return cloneDefaultStorageState();

  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY);
    if (!rawState) return cloneDefaultStorageState();

    const parsedState = JSON.parse(rawState);
    return normalizeStoredState(parsedState);
  } catch (error) {
    console.warn('Unable to load Ironman suit memory:', error);
    return cloneDefaultStorageState();
  }
}

function saveStoredState(nextState) {
  if (!storageAvailable) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeStoredState(nextState)));
  } catch (error) {
    console.warn('Unable to save Ironman suit memory:', error);
  }
}

function normalizeStoredState(stateToNormalize) {
  return {
    version: 1,
    operational: normalizeOperationalState(stateToNormalize?.operational),
    preferences: normalizePreferences(stateToNormalize?.preferences),
    stats: normalizeStats(stateToNormalize?.stats)
  };
}

function normalizeOperationalState(operational) {
  return {
    color: clampNumber(operational?.color, 0, 100, DEFAULT_OPERATIONAL_STATE.color),
    power: clampNumber(operational?.power, 0, 100, DEFAULT_OPERATIONAL_STATE.power),
    zoom: clampNumber(operational?.zoom, SUIT_ZOOM.MIN, SUIT_ZOOM.MAX, DEFAULT_OPERATIONAL_STATE.zoom),
    activeModules: normalizeComponents(operational?.activeModules)
  };
}

function normalizePreferences(preferences) {
  return {
    hudMode: Boolean(preferences?.hudMode),
    jarvisEnabled: Boolean(preferences?.jarvisEnabled)
  };
}

function normalizeStats(stats) {
  return {
    sessionCount: clampNumber(stats?.sessionCount, 0, Number.MAX_SAFE_INTEGER, 0),
    initializeCount: clampNumber(stats?.initializeCount, 0, Number.MAX_SAFE_INTEGER, 0),
    lastSessionAt: normalizeTimestamp(stats?.lastSessionAt),
    lastUpdatedAt: normalizeTimestamp(stats?.lastUpdatedAt)
  };
}

function modelToOperationalState(model) {
  return {
    color: model.color,
    power: model.power,
    zoom: model.zoom,
    activeModules: model.activeModules
  };
}

function normalizeComponents(components) {
  if (!Array.isArray(components)) return [...DEFAULT_OPERATIONAL_STATE.activeModules];
  return components.filter(component => Object.prototype.hasOwnProperty.call(componentMapping, component));
}

function normalizeTimestamp(timestamp) {
  return typeof timestamp === 'string' ? timestamp : null;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function canUseLocalStorage() {
  try {
    const probeKey = `${STORAGE_KEY}.probe`;
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return true;
  } catch (error) {
    console.warn('Ironman suit memory unavailable:', error);
    return false;
  }
}

function cloneDefaultStorageState() {
  return {
    version: DEFAULT_STORAGE_STATE.version,
    operational: { ...DEFAULT_STORAGE_STATE.operational },
    preferences: { ...DEFAULT_STORAGE_STATE.preferences },
    stats: { ...DEFAULT_STORAGE_STATE.stats }
  };
}
