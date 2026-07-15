// Flight Audio - synthesized suit sounds via WebAudio (no audio assets needed)
// Thruster hum, repulsor fire, explosions, target lock and impact effects.

let ctx = null;
let master = null;
let thruster = null;
let available = true;

function initFlightAudio() {
  if (ctx || !available) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioContextClass();
    master = ctx.createGain();
    master.gain.value = 0.275;
    master.connect(ctx.destination);
    createThruster();
  } catch (error) {
    console.warn('Flight audio unavailable:', error);
    available = false;
    ctx = null;
  }
}

export function resumeFlightAudio() {
  initFlightAudio();
  if (ctx?.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

export function suspendFlightAudio() {
  if (ctx?.state === 'running') {
    ctx.suspend().catch(() => {});
  }
}

/** Continuous thruster bed: filtered noise whose pitch/level follows speed. */
function createThruster() {
  const noiseBuffer = createNoiseBuffer(2);
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 220;
  filter.Q.value = 0.8;

  const gain = ctx.createGain();
  gain.gain.value = 0;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start();

  thruster = { filter, gain };
}

/**
 * @param {number} intensity 0..1 normalized speed
 * @param {boolean} boosting
 */
export function setThrusterLevel(intensity, boosting) {
  if (!thruster || !ctx) return;

  const now = ctx.currentTime;
  const level = 0.10 + intensity * 0.28 + (boosting ? 0.22 : 0);
  const freq = 180 + intensity * 520 + (boosting ? 420 : 0);
  thruster.gain.gain.setTargetAtTime(level, now, 0.12);
  thruster.filter.frequency.setTargetAtTime(freq, now, 0.15);
}

/** Classic repulsor discharge: descending whine plus a high-passed noise crack. */
export function playRepulsorSound() {
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(1400, now);
  osc.frequency.exponentialRampToValueAtTime(240, now + 0.22);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.5, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

  osc.connect(oscGain);
  oscGain.connect(master);
  osc.start(now);
  osc.stop(now + 0.26);

  playNoiseBurst({ duration: 0.12, filterType: 'highpass', frequency: 1800, peak: 0.3 });
}

/** @param {number} proximity 0..1, 1 = right next to the player */
export function playExplosionSound(proximity = 0.6) {
  if (!ctx) return;
  const now = ctx.currentTime;
  const level = 0.25 + proximity * 0.5;

  playNoiseBurst({ duration: 0.7, filterType: 'lowpass', frequency: 420, peak: level });

  const thump = ctx.createOscillator();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(90, now);
  thump.frequency.exponentialRampToValueAtTime(38, now + 0.4);

  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(level, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  thump.connect(thumpGain);
  thumpGain.connect(master);
  thump.start(now);
  thump.stop(now + 0.55);
}

export function playLockSound() {
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.setValueAtTime(1174, now + 0.07);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.setValueAtTime(0.12, now + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + 0.18);
}

export function playCrashSound() {
  if (!ctx) return;
  playNoiseBurst({ duration: 0.35, filterType: 'bandpass', frequency: 240, peak: 0.55 });
}

function playNoiseBurst({ duration, filterType, frequency, peak }) {
  const now = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(duration);

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = frequency;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(now);
  source.stop(now + duration);
}

function createNoiseBuffer(seconds) {
  const length = Math.ceil(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}
