import { dom } from './dom.js';
import { jarvisAnnounce, isJarvisActive } from './jarvis.js';
import { events } from './events.js';
import { EventTypes } from './event-types.js';

export function addTelemetryEntry(message) {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `[${timestamp}] ${message}`;

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

let telemetryUnsubscribers = [];

export function startTelemetryUpdates() {
  stopTelemetryUpdates();

  telemetryUnsubscribers = [
    events.on(EventTypes.INITIALIZE_START, () => addTelemetryEntry('System initialization sequence started')),
    events.on(EventTypes.INITIALIZE_POWER, ({ value }) => addTelemetryEntry(`Power output initialized to ${value}%`)),
    events.on(EventTypes.INITIALIZE_CPU, ({ value }) => addTelemetryEntry(`CPU load initialized to ${value}%`)),
    events.on(EventTypes.INITIALIZE_MEMORY, ({ value }) => addTelemetryEntry(`Memory usage initialized to ${value}%`)),
    events.on(EventTypes.INITIALIZE_INTEGRITY, ({ value }) =>
      addTelemetryEntry(`System integrity initialized to ${value}%`)
    ),
    events.on(EventTypes.INITIALIZE_COLOR, () => addTelemetryEntry('Suit color reset to default')),
    events.on(EventTypes.INITIALIZE_ZOOM, ({ value }) => addTelemetryEntry(`Zoom calibration complete at ${value}%`)),
    events.on(EventTypes.INITIALIZE_MODULES, () => addTelemetryEntry('Module loadout returned to standby')),
    events.on(EventTypes.INITIALIZE_COMPLETE, () => addTelemetryEntry('All systems initialized successfully')),

    events.on(EventTypes.DIAGNOSTICS_START, () => {
      addTelemetryEntry('Comprehensive diagnostics initiated');
      addTelemetryEntry('Scanning all system components...');
    }),
    events.on(EventTypes.DIAGNOSTICS_BOOST, () => {
      addTelemetryEntry('CPU and Memory boosted for intensive scanning');
      addTelemetryEntry('All system modules entered diagnostic mode');
      addTelemetryEntry('Deep system analysis in progress...');
    }),
    events.on(EventTypes.DIAGNOSTICS_COMPLETE, () => {
      addTelemetryEntry('Diagnostic scan complete');
      addTelemetryEntry('CPU and Memory restored to normal levels');
      addTelemetryEntry('All system modules returned to normal status');
      addTelemetryEntry('All systems nominal - No issues detected');
    }),

    events.on(EventTypes.SHUTDOWN_START, () => {
      addTelemetryEntry('EMERGENCY SHUTDOWN PROTOCOL ACTIVATED');
      addTelemetryEntry('Deploying fire suppression systems...');
    }),
    events.on(EventTypes.PARTY_STOPPED, ({ reason } = {}) => {
      if (reason === 'shutdown') {
        addTelemetryEntry('Party mode emergency shutdown');
      }
    }),
    events.on(EventTypes.SHUTDOWN_COMPLETE, () => {
      addTelemetryEntry('Fire extinguisher spray deployed');
      addTelemetryEntry('Power output reduced to minimum safe levels');
      addTelemetryEntry('Non-critical systems powered down');
      addTelemetryEntry('Emergency shutdown complete - Manual restart required');
    })
  ];
}

function stopTelemetryUpdates() {
  telemetryUnsubscribers.forEach(unsub => unsub && unsub());
  telemetryUnsubscribers = [];
}
