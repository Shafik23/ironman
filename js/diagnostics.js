import { dom } from './dom.js';
import { componentMapping } from './constants.js';
import { state } from './state.js';

const SEVERITY_WEIGHT = {
  nominal: 0,
  advisory: 1,
  warning: 2,
  critical: 3
};

const SEVERITY_STATUS = {
  nominal: 'OK',
  advisory: 'NOTE',
  warning: 'WARN',
  critical: 'CRIT'
};

const DIAGNOSTIC_PROFILES = {
  helmet: [
    {
      severity: 'advisory',
      message: 'HUD ghosting detected in the left-eye threat overlay',
      action: 'Recalibrate retinal projector alignment'
    },
    {
      severity: 'warning',
      message: 'Encrypted comms antenna is reporting intermittent packet loss',
      action: 'Reseat helmet uplink bus before sortie'
    }
  ],
  chest: [
    {
      severity: 'warning',
      message: 'Arc reactor containment ring is drifting outside Stark tolerance',
      action: 'Run magnetic bottle recalibration'
    },
    {
      severity: 'advisory',
      message: 'Palladium scrubber residue is above clean-room baseline',
      action: 'Schedule micro-filter purge'
    }
  ],
  arms: [
    {
      severity: 'warning',
      message: 'Right forearm servo torque feedback is lagging by 12 milliseconds',
      action: 'Balance servo cluster C before heavy lift'
    },
    {
      severity: 'advisory',
      message: 'Gauntlet haptic mesh has two low-response zones',
      action: 'Pulse-test the tactile layer'
    }
  ],
  legs: [
    {
      severity: 'warning',
      message: 'Gait stabilizer predicts knee actuator resonance during hard landing',
      action: 'Recalibrate landing dampers'
    },
    {
      severity: 'advisory',
      message: 'Boot gyros are compensating for minor yaw drift',
      action: 'Run balance table alignment'
    }
  ],
  repulsors: [
    {
      severity: 'critical',
      message: 'Repulsor capacitor pair is charging unevenly under combat load',
      action: 'Disarm repulsor burst mode and rebalance capacitors'
    },
    {
      severity: 'warning',
      message: 'Palm emitter lens has a heat bloom in the outer focusing ring',
      action: 'Reduce output and clean emitter glass'
    }
  ],
  thrusters: [
    {
      severity: 'warning',
      message: 'Left flight thruster vector vane is outside neutral trim',
      action: 'Run flight-control vane sweep'
    },
    {
      severity: 'advisory',
      message: 'Afterburner ignition telemetry has a delayed handshake',
      action: 'Prime thrust sequencer before launch'
    }
  ]
};

export function runDiagnosticSweep() {
  state.diagnosticScanCount += 1;

  const context = getDiagnosticContext();
  const components = Object.keys(componentMapping);
  const results = components.map((componentType, index) =>
    evaluateModule(componentType, index, context, state.diagnosticScanCount)
  );

  addLatentFindings(results, context, state.diagnosticScanCount);
  state.diagnosticFindings = buildFindingsMap(results);

  return results;
}

export function applyDiagnosticResults(results) {
  clearDiagnosticVisuals();

  results.forEach(result => {
    const item = getComponentItem(result.component);
    const part = getSchematicPart(result.component);
    const statusElement = item?.querySelector('.component-status');

    if (item) {
      item.classList.add(`diagnostic-${result.severity}`);
      item.title = `${result.module}: ${result.severity.toUpperCase()} - ${result.message}. Action: ${result.action}`;
    }

    if (part) {
      part.classList.add(`diagnostic-${result.severity}`);
    }

    if (statusElement) {
      statusElement.textContent = SEVERITY_STATUS[result.severity];
      statusElement.className = `component-status ${result.severity}`;
    }
  });
}

export function clearDiagnosticFindings({ resetStatuses = false } = {}) {
  const hadFindings = Object.keys(state.diagnosticFindings).length > 0;

  state.diagnosticFindings = {};
  clearDiagnosticVisuals();

  if (resetStatuses) {
    dom.componentItems.forEach(item => {
      const statusElement = item.querySelector('.component-status');
      if (statusElement) {
        statusElement.textContent = 'OFFLINE';
        statusElement.className = 'component-status offline';
      }
      item.title = '';
    });
  }

  return hadFindings;
}

export function getDiagnosticTooltip(partType) {
  const componentType = Object.keys(componentMapping).find(component => componentMapping[component] === partType);
  const finding = state.diagnosticFindings[componentType];

  if (!finding) return '';

  return `<br><br>DIAGNOSTIC FINDING<br>• Severity: ${finding.severity.toUpperCase()}<br>• ${finding.message}<br>• Action: ${finding.action}`;
}

export function summarizeDiagnosticResults(results) {
  const counts = results.reduce(
    (summary, result) => {
      summary[result.severity] += 1;
      if (SEVERITY_WEIGHT[result.severity] > SEVERITY_WEIGHT[summary.highestSeverity]) {
        summary.highestSeverity = result.severity;
      }
      return summary;
    },
    { nominal: 0, advisory: 0, warning: 0, critical: 0, highestSeverity: 'nominal' }
  );

  return {
    ...counts,
    totalFindings: counts.advisory + counts.warning + counts.critical
  };
}

function evaluateModule(componentType, index, context, scanCount) {
  const module = getModuleName(componentType);
  const thresholdFinding = getThresholdFinding(componentType, context);

  if (thresholdFinding) {
    return createResult(componentType, module, thresholdFinding);
  }

  return createResult(componentType, module, {
    severity: 'nominal',
    message: getNominalMessage(componentType, index, scanCount),
    action: 'No immediate action required'
  });
}

function getThresholdFinding(componentType, context) {
  switch (componentType) {
    case 'helmet':
      if (context.cpu >= 90) {
        return {
          severity: 'critical',
          message: 'HUD threat parser is saturating the neural-response bus',
          action: 'Throttle combat overlay layers and reboot helmet avionics'
        };
      }
      if (context.cpu >= 70) {
        return {
          severity: 'warning',
          message: 'HUD render load is approaching visor thermal limits',
          action: 'Reduce overlay density before high-speed flight'
        };
      }
      break;
    case 'chest':
      if (context.power >= 95) {
        return {
          severity: 'critical',
          message: 'Arc reactor output is above the stable containment envelope',
          action: 'Drop power below 90% and recalibrate the magnetic bottle'
        };
      }
      if (context.power <= 25) {
        return {
          severity: 'warning',
          message: 'Arc reactor feed is too low for sustained combat systems',
          action: 'Raise power reserve before weapons activation'
        };
      }
      break;
    case 'arms':
      if (context.integrity <= 70) {
        return {
          severity: 'critical',
          message: 'Arm servo frame integrity is below safe lifting threshold',
          action: 'Lock heavy-lift mode and run actuator inspection'
        };
      }
      if (context.integrity <= 85) {
        return {
          severity: 'warning',
          message: 'Forearm servo alignment drift detected under load',
          action: 'Recalibrate gauntlet torque sensors'
        };
      }
      break;
    case 'legs':
      if (context.memory >= 80) {
        return {
          severity: 'warning',
          message: 'Gait predictor cache is close to saturation',
          action: 'Flush terrain model buffer before evasive maneuvers'
        };
      }
      break;
    case 'repulsors':
      if (context.power >= 88 && context.integrity <= 90) {
        return {
          severity: 'critical',
          message: 'Repulsor discharge profile is unstable at current armor integrity',
          action: 'Disable burst fire until armor integrity is restored'
        };
      }
      if (context.power >= 82) {
        return {
          severity: 'warning',
          message: 'Repulsor capacitors are carrying a high pre-charge',
          action: 'Limit sustained fire until output drops'
        };
      }
      break;
    case 'thrusters':
      if (context.power < 40) {
        return {
          severity: 'warning',
          message: 'Flight thrusters do not have enough reserve for controlled takeoff',
          action: 'Increase reactor output before launch'
        };
      }
      if (context.zoom >= 135) {
        return {
          severity: 'advisory',
          message: 'Flight-control camera calibration is using a tight inspection profile',
          action: 'Return schematic zoom to sortie baseline'
        };
      }
      break;
  }

  return null;
}

function addLatentFindings(results, context, scanCount) {
  const currentFindings = results.filter(result => result.severity !== 'nominal').length;
  const targetFindings = Math.min(3, 1 + ((scanCount + Math.round(context.power / 10) + context.color) % 3));
  const neededFindings = Math.max(0, targetFindings - currentFindings);
  if (neededFindings === 0) return;

  const nominalResults = results.filter(result => result.severity === 'nominal');
  const seed = scanCount + context.cpu + context.memory + context.power + context.integrity + context.color + context.zoom;

  for (let i = 0; i < neededFindings && nominalResults.length > 0; i++) {
    const resultIndex = (seed + i * 3) % nominalResults.length;
    const result = nominalResults.splice(resultIndex, 1)[0];
    const profiles = DIAGNOSTIC_PROFILES[result.component];
    const profile = profiles[(seed + i + resultIndex) % profiles.length];

    Object.assign(result, createResult(result.component, result.module, profile));
  }
}

function createResult(component, module, finding) {
  return {
    component,
    module,
    severity: finding.severity,
    message: finding.message,
    action: finding.action
  };
}

function buildFindingsMap(results) {
  return results.reduce((findings, result) => {
    if (result.severity !== 'nominal') {
      findings[result.component] = result;
    }
    return findings;
  }, {});
}

function clearDiagnosticVisuals() {
  const severityClasses = ['diagnostic-nominal', 'diagnostic-advisory', 'diagnostic-warning', 'diagnostic-critical'];

  dom.componentItems.forEach(item => {
    item.classList.remove(...severityClasses);
    item.title = '';
  });

  dom.schematicParts.forEach(part => {
    part.classList.remove(...severityClasses);
  });
}

function getDiagnosticContext() {
  const statusValues = [...dom.statusTexts].map(text => parseInt(text.textContent, 10) || 0);

  return {
    cpu: statusValues[0] || 0,
    memory: statusValues[1] || 0,
    power: parseInt(dom.powerSlider.value, 10) || statusValues[2] || 0,
    integrity: statusValues[3] || 0,
    color: parseInt(dom.colorSlider.value, 10) || 0,
    zoom: parseInt(dom.zoomSlider.value, 10) || 100
  };
}

function getNominalMessage(componentType, index, scanCount) {
  const checks = [
    'Stark bus handshake is clean',
    'thermal signature is inside mission tolerance',
    'redundant control loop is synchronized',
    'micro-actuator response is crisp',
    'firmware checksum matches the gold master',
    'battlefield telemetry feed is stable'
  ];

  return checks[(index + scanCount) % checks.length];
}

function getModuleName(componentType) {
  const item = getComponentItem(componentType);
  return item?.querySelector('.component-name')?.textContent || componentType.toUpperCase();
}

function getComponentItem(componentType) {
  return document.querySelector(`[data-component="${componentType}"]`);
}

function getSchematicPart(componentType) {
  return document.querySelector(`[data-part="${componentMapping[componentType]}"]`);
}
