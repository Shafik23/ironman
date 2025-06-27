import { dom } from './dom.js';
import { jarvisAnnounce, isJarvisActive } from './jarvis.js';

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
  // Removed random telemetry messages - telemetry now only shows user-triggered events
}