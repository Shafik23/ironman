// Simple pub/sub event bus to decouple modules
const listeners = new Map();

function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, []);
  listeners.get(event).push(handler);
  return () => off(event, handler);
}

function off(event, handler) {
  const arr = listeners.get(event);
  if (!arr) return;
  const idx = arr.indexOf(handler);
  if (idx !== -1) arr.splice(idx, 1);
}

function emit(event, payload) {
  const arr = listeners.get(event);
  if (!arr || arr.length === 0) return;
  // Clone to avoid issues if handlers mutate the array
  [...arr].forEach(h => {
    try {
      h(payload);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`Error in event handler for ${event}:`, e);
    }
  });
}

export const events = { on, off, emit };
