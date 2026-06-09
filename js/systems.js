import { dom } from './dom.js';
import { state } from './state.js';
import { events } from './events.js';
import { EventTypes } from './event-types.js';
import { getSuitModel, isSuitModeActive, setSuitStatusLoads } from './suit-model.js';

const TICK_MS = 1000;
const DEFAULT_HEAT = 34;
const DEFAULT_CPU = 20;
const DEFAULT_MEMORY = 20;
const DEFAULT_INTEGRITY = 100;

let tickInterval = null;
let onTickCallback = null;

export function initializeSuitSystems(overrides = {}) {
  const targetPower = clamp(overrides.power ?? getSliderPower(), 0, 100);
  const heat = clamp(overrides.heat ?? DEFAULT_HEAT, 0, 100);
  const cpuLoad = clamp(overrides.cpuLoad ?? DEFAULT_CPU, 0, 100);
  const memoryUsage = clamp(overrides.memoryUsage ?? DEFAULT_MEMORY, 0, 100);
  const integrity = clamp(overrides.integrity ?? DEFAULT_INTEGRITY, 0, 100);

  state.suitSystems = {
    targetPower,
    effectivePower: targetPower,
    heat,
    cpuLoad,
    memoryUsage,
    integrity,
    thermalStressSeconds: 0,
    outputTerawatts: calculateOutputTerawatts(targetPower),
    coreTemperature: calculateCoreTemperature(heat),
    warnings: [],
    lastWarningSignature: '',
    lastIntegrityBucket: Math.floor(integrity / 5) * 5
  };

  updateWarnings({ emitChanges: false });
  notifyTick();
  return state.suitSystems;
}

export function startSuitSystems(onTick) {
  stopSuitSystems();
  onTickCallback = onTick;
  ensureSuitSystems();
  tickSuitSystems(0.5, { emitWarnings: false });

  tickInterval = setInterval(() => {
    tickSuitSystems(TICK_MS / 1000);
  }, TICK_MS);
}

export function stopSuitSystems() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

export function setSuitPowerTarget(value) {
  const systems = ensureSuitSystems();
  systems.targetPower = clamp(value, 0, 100);
  tickSuitSystems(0.25, { emitWarnings: true });
  return systems;
}

export function resetSuitSystems(overrides = {}) {
  const current = ensureSuitSystems();
  return initializeSuitSystems({
    power: overrides.power ?? current.targetPower,
    heat: overrides.heat ?? DEFAULT_HEAT,
    cpuLoad: overrides.cpuLoad ?? DEFAULT_CPU,
    memoryUsage: overrides.memoryUsage ?? DEFAULT_MEMORY,
    integrity: overrides.integrity ?? current.integrity ?? DEFAULT_INTEGRITY
  });
}

export function coolSuitSystems(amount = 18) {
  const systems = ensureSuitSystems();
  systems.heat = clamp(systems.heat - amount, 0, 100);
  systems.thermalStressSeconds = Math.max(0, systems.thermalStressSeconds - amount);
  systems.coreTemperature = calculateCoreTemperature(systems.heat);
  updateWarnings({ emitChanges: true });
  notifyTick();
  return systems;
}

export function getSuitSystemStats() {
  return ensureSuitSystems();
}

export function tickSuitSystems(elapsedSeconds = 1, options = {}) {
  const systems = ensureSuitSystems();
  const targetPower = systems.targetPower;
  const activeComponents = getActiveComponentCount();
  const diagnosticsLoad = isSuitModeActive('diagnostics') ? 28 : 0;
  const partyLoad = isSuitModeActive('party') ? 14 : 0;
  const heatStress = Math.max(0, systems.heat - 72);
  const thermalThrottle = systems.heat > 86 ? Math.min(35, (systems.heat - 86) * 1.45) : 0;
  const integrityThrottle = systems.integrity < 55 ? (55 - systems.integrity) * 0.35 : 0;
  const lowPowerConstraint = targetPower < 30 ? (30 - targetPower) * 0.5 : 0;

  const effectivePowerTarget = clamp(targetPower - thermalThrottle - integrityThrottle, 0, 100);
  const cpuTarget = clamp(
    16 + targetPower * 0.42 + activeComponents * 4 + diagnosticsLoad + partyLoad + heatStress * 0.45 + lowPowerConstraint,
    8,
    100
  );
  const memoryTarget = clamp(
    20 + activeComponents * 6 + diagnosticsLoad * 0.75 + partyLoad * 0.5 + systems.thermalStressSeconds * 0.18 + lowPowerConstraint,
    12,
    100
  );
  const coolingBias = targetPower < 35 ? -11 : targetPower < 55 ? -4 : 0;
  const heatTarget = clamp(
    26 + Math.pow(targetPower / 100, 1.65) * 60 + cpuTarget * 0.16 + activeComponents * 2.2 + partyLoad * 0.4 + coolingBias,
    18,
    100
  );

  systems.effectivePower = approach(systems.effectivePower, effectivePowerTarget, 0.48 * elapsedSeconds);
  systems.cpuLoad = approach(systems.cpuLoad, cpuTarget, 0.42 * elapsedSeconds);
  systems.memoryUsage = approach(systems.memoryUsage, memoryTarget, 0.34 * elapsedSeconds);
  systems.heat = approach(systems.heat, heatTarget, 0.18 * elapsedSeconds);

  if (systems.heat > 82) {
    systems.thermalStressSeconds += elapsedSeconds;
  } else {
    systems.thermalStressSeconds = Math.max(0, systems.thermalStressSeconds - elapsedSeconds * 1.7);
  }

  applyIntegrityEffects(systems, activeComponents, elapsedSeconds);
  systems.outputTerawatts = calculateOutputTerawatts(systems.effectivePower);
  systems.coreTemperature = calculateCoreTemperature(systems.heat);

  updateWarnings({ emitChanges: options.emitWarnings !== false });
  notifyTick();
  return systems;
}

function applyIntegrityEffects(systems, activeComponents, elapsedSeconds) {
  let integrityDelta = 0;

  if (systems.heat > 88 && systems.thermalStressSeconds > 4) {
    integrityDelta -= (systems.heat - 88) * 0.018 * elapsedSeconds;
  }

  if (systems.heat > 94) {
    integrityDelta -= 0.08 * elapsedSeconds;
  }

  if (systems.targetPower < 12 && activeComponents > 2) {
    integrityDelta -= 0.025 * elapsedSeconds;
  }

  if (systems.heat < 52 && systems.targetPower >= 35 && systems.targetPower <= 70) {
    integrityDelta += 0.015 * elapsedSeconds;
  }

  if (integrityDelta === 0) return;

  const previousIntegrity = systems.integrity;
  systems.integrity = clamp(systems.integrity + integrityDelta, 0, 100);

  const previousBucket = systems.lastIntegrityBucket;
  const currentBucket = Math.floor(systems.integrity / 5) * 5;
  if (systems.integrity < previousIntegrity && currentBucket < previousBucket) {
    systems.lastIntegrityBucket = currentBucket;
    events.emit(EventTypes.SYSTEMS_INTEGRITY_DAMAGED, {
      integrity: systems.integrity,
      heat: systems.heat,
      coreTemperature: calculateCoreTemperature(systems.heat)
    });
  }
}

function updateWarnings({ emitChanges }) {
  const systems = ensureSuitSystems();
  const warnings = [];

  if (systems.targetPower < 15) {
    warnings.push('Critical power reserve');
  } else if (systems.targetPower < 35) {
    warnings.push('Low power constraints');
  }

  if (systems.heat >= 90) {
    warnings.push('Reactor overheat');
  } else if (systems.heat >= 78) {
    warnings.push('Thermal load elevated');
  }

  if (systems.cpuLoad >= 92) {
    warnings.push('CPU saturation');
  }

  if (systems.memoryUsage >= 88) {
    warnings.push('Memory pressure');
  }

  if (systems.integrity <= 55) {
    warnings.push('Armor integrity degraded');
  }

  if (systems.targetPower - systems.effectivePower > 8) {
    warnings.push('Output throttled');
  }

  const signature = warnings.join('|');
  systems.warnings = warnings;

  if (emitChanges && signature !== systems.lastWarningSignature) {
    systems.lastWarningSignature = signature;
    events.emit(EventTypes.SYSTEMS_WARNINGS_CHANGED, {
      warnings,
      stats: { ...systems, warnings: [...warnings] }
    });
  } else if (!emitChanges) {
    systems.lastWarningSignature = signature;
  }
}

function notifyTick() {
  const systems = ensureSuitSystems();
  setSuitStatusLoads(
    {
      cpuLoad: systems.cpuLoad,
      memoryLoad: systems.memoryUsage,
      integrity: systems.integrity
    },
    { source: 'systems' }
  );

  events.emit(EventTypes.SYSTEMS_TICK, {
    stats: { ...systems, warnings: [...systems.warnings] }
  });

  if (onTickCallback) {
    onTickCallback(systems);
  }
}

function getActiveComponentCount() {
  return getSuitModel().activeModules.length;
}

function getSliderPower() {
  return dom.powerSlider ? parseInt(dom.powerSlider.value, 10) || 0 : 50;
}

function ensureSuitSystems() {
  if (!state.suitSystems) {
    initializeSuitSystems();
  }
  return state.suitSystems;
}

function calculateOutputTerawatts(powerLevel) {
  return 0.25 + powerLevel * 0.0475;
}

function calculateCoreTemperature(heat) {
  return 900 + heat * 42;
}

function approach(current, target, amount) {
  const factor = clamp(amount, 0, 1);
  return current + (target - current) * factor;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
