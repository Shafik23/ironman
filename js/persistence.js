import { dom } from './dom.js';
import { events } from './events.js';
import { DEFAULT_OPERATIONAL_STATE, componentMapping } from './constants.js';
import { setPowerLevel, setSuitColorLevel, setSuitZoomLevel } from './config.js';
import { getSelectedComponent, setSelectedComponent } from './components.js';
import { activateHudMode, deactivateHudMode } from './hud.js';
import { state } from './state.js';
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

export function setupPersistence() {
  storageAvailable = canUseLocalStorage();
  if (!storageAvailable) {
    addTelemetryEntry('Suit memory unavailable - local persistence disabled');
    return;
  }

  const storedState = loadStoredState();
  const sessionCount = incrementSessionCounter(storedState);

  restoreOperationalState(storedState.operational);
  restorePreferences(storedState.preferences);
  persistOperationalState();
  setupPersistenceListeners();

  addTelemetryEntry(`Suit memory restored - session ${sessionCount}`);
}

function setupPersistenceListeners() {
  events.on('power:changed', ({ value }) => {
    saveOperationalPatch({ power: value });
  });

  events.on('color:changed', ({ value }) => {
    saveOperationalPatch({ color: value });
  });

  events.on('zoom:changed', ({ value }) => {
    saveOperationalPatch({ zoom: value });
  });

  events.on('component:selection', ({ component, selected }) => {
    saveOperationalPatch({ selectedComponent: selected ? component : null });
  });

  events.on('hud:activated', () => {
    savePreferencePatch({ hudMode: true });
  });

  events.on('hud:deactivated', () => {
    savePreferencePatch({ hudMode: false });
  });

  events.on('jarvis:changed', ({ enabled }) => {
    savePreferencePatch({ jarvisEnabled: Boolean(enabled) });
  });

  events.on('shutdown:complete', () => {
    saveOperationalPatch({ power: readCurrentPower() });
  });

  events.on('system:initialize:reset-persistence', () => {
    resetPersistedOperationalState();
  });
}

function restoreOperationalState(operational) {
  const restored = normalizeOperationalState(operational);

  setSuitColorLevel(restored.color);
  setSuitZoomLevel(restored.zoom);
  setPowerLevel(restored.power);
  setSelectedComponent(restored.selectedComponent);
}

function restorePreferences(preferences) {
  const restoredPreferences = normalizePreferences(preferences);

  if (dom.hudToggle) {
    if (restoredPreferences.hudMode) {
      activateHudMode();
    } else if (state.isHudMode) {
      deactivateHudMode();
    }
  }

  if (dom.jarvisToggle && restoredPreferences.jarvisEnabled) {
    addTelemetryEntry('J.A.R.V.I.S. preference retained - manual activation required for voice systems');
  }
}

function persistOperationalState() {
  saveOperationalPatch({
    color: readCurrentColor(),
    power: readCurrentPower(),
    zoom: readCurrentZoom(),
    selectedComponent: getSelectedComponent()
  });
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
    zoom: clampNumber(operational?.zoom, 25, 200, DEFAULT_OPERATIONAL_STATE.zoom),
    selectedComponent: normalizeComponent(operational?.selectedComponent)
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

function normalizeComponent(component) {
  return Object.prototype.hasOwnProperty.call(componentMapping, component) ? component : null;
}

function normalizeTimestamp(timestamp) {
  return typeof timestamp === 'string' ? timestamp : null;
}

function readCurrentColor() {
  return clampNumber(dom.colorSlider?.value, 0, 100, DEFAULT_OPERATIONAL_STATE.color);
}

function readCurrentPower() {
  return clampNumber(dom.powerSlider?.value, 0, 100, DEFAULT_OPERATIONAL_STATE.power);
}

function readCurrentZoom() {
  return clampNumber(dom.zoomSlider?.value, 25, 200, DEFAULT_OPERATIONAL_STATE.zoom);
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
