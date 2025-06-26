import { dom } from './dom.js';

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
}

export function startTelemetryUpdates() {
  // Removed random telemetry messages - telemetry now only shows user-triggered events
}