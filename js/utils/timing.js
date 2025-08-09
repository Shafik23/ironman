// Timing utilities
export function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function throttle(fn, limit = 100) {
  let inThrottle = false;
  let lastArgs;
  return (...args) => {
    lastArgs = args;
    if (!inThrottle) {
      fn(...lastArgs);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs !== args) {
          fn(...lastArgs);
        }
      }, limit);
    }
  };
}
