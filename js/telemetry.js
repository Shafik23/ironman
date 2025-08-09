import { dom } from './dom.js';
import { jarvisAnnounce, isJarvisActive } from './jarvis.js';
import { events } from './events.js';

export function addTelemetryEntry(message) {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `[${timestamp}] ${message}`;

  dom.telemetryLog.insertBefore(entry, dom.telemetryLog.firstChild);

  const entries = dom.telemetryLog.querySelectorAll('.log-entry');
  if (entries.length > 20) {
    entries[entries.length - 1].remove();
  }

  setTimeout(() => {
    entry.style.opacity = '1';
  }, 50);

  // Have J.A.R.V.I.S. announce important telemetry entries
  if (isJarvisActive() && shouldAnnounce(message)) {
    jarvisAnnounce(message);
  }
}

function shouldAnnounce(message) {
  // Only announce important system messages, not every single telemetry entry
  const importantKeywords = [
    'initialized',
    'activated',
    'deactivated',
    'emergency',
    'warning',
    'critical',
    'diagnostic',
    'complete',
    'online',
    'offline',
    'ready'
  ];

  const messageLower = message.toLowerCase();
  return importantKeywords.some(keyword => messageLower.includes(keyword));
}

export function startTelemetryUpdates() {
  // Subscribe to events to build telemetry log centrally
  events.on('system:initialize:start', () => addTelemetryEntry('System initialization sequence started'));
  events.on('system:initialize:power', ({ value }) => addTelemetryEntry(`Power output initialized to ${value}%`));
  events.on('system:initialize:cpu', ({ value }) => addTelemetryEntry(`CPU load initialized to ${value}%`));
  events.on('system:initialize:memory', ({ value }) => addTelemetryEntry(`Memory usage initialized to ${value}%`));
  events.on('system:initialize:integrity', ({ value }) =>
    addTelemetryEntry(`System integrity initialized to ${value}%`)
  );
  events.on('system:initialize:color', () => addTelemetryEntry('Suit color reset to default'));
  events.on('system:initialize:zoom', ({ value }) => addTelemetryEntry(`Zoom calibration complete at ${value}%`));
  events.on('system:initialize:modules', () => addTelemetryEntry('All system modules deselected'));
  events.on('system:initialize:complete', () => addTelemetryEntry('All systems initialized successfully'));

  events.on('diagnostics:start', () => {
    addTelemetryEntry('Comprehensive diagnostics initiated');
    addTelemetryEntry('Scanning all system components...');
  });
  events.on('diagnostics:boost', () => {
    addTelemetryEntry('CPU and Memory boosted for intensive scanning');
    addTelemetryEntry('All system modules entered diagnostic mode');
    addTelemetryEntry('Deep system analysis in progress...');
  });
  events.on('diagnostics:complete', () => {
    addTelemetryEntry('Diagnostic scan complete');
    addTelemetryEntry('CPU and Memory restored to normal levels');
    addTelemetryEntry('All system modules returned to normal status');
    addTelemetryEntry('All systems nominal - No issues detected');
  });

  events.on('shutdown:start', () => {
    addTelemetryEntry('EMERGENCY SHUTDOWN PROTOCOL ACTIVATED');
    addTelemetryEntry('Deploying fire suppression systems...');
  });
  events.on('party:stopped', ({ reason }) => {
    if (reason === 'shutdown') {
      addTelemetryEntry('Party mode emergency shutdown');
    }
  });
  events.on('shutdown:complete', () => {
    addTelemetryEntry('Fire extinguisher spray deployed');
    addTelemetryEntry('Power output reduced to minimum safe levels');
    addTelemetryEntry('Non-critical systems powered down');
    addTelemetryEntry('Emergency shutdown complete - Manual restart required');
  });
}
