import { useCallback, useSyncExternalStore } from "react";

const KEY = "kvant_muted";
let muted = localStorage.getItem(KEY) === "1";
const subs = new Set();
let ctx = null;

function audio() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, dur, type = "sine", gain = 0.06, when = 0, slide) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function noise(dur, gain = 0.05, freq = 2400) {
  const c = audio();
  if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  src.buffer = buf;
  f.type = "bandpass";
  f.frequency.value = freq;
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start();
}

const SFX = {
  tap: () => tone(620, 0.08, "sine", 0.05, 0, 900),
  pop: () => tone(980, 0.07, "triangle", 0.045, 0, 1500),
  ok: () => { tone(523, 0.12, "triangle", 0.07); tone(784, 0.2, "triangle", 0.07, 0.09); },
  bad: () => tone(220, 0.22, "sine", 0.08, 0, 140),
  swipe: () => noise(0.14, 0.035, 1600),
  win: () => { tone(523, 0.12, "triangle", 0.06); tone(659, 0.12, "triangle", 0.06, 0.1); tone(1046, 0.3, "triangle", 0.06, 0.2); },
  coin: () => { tone(1320, 0.06, "square", 0.025); tone(1760, 0.14, "square", 0.025, 0.06); },
  buy: () => { tone(1320, 0.06, "square", 0.03); tone(1760, 0.1, "square", 0.03, 0.06); tone(2349, 0.2, "triangle", 0.04, 0.14); },
  level: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.16, "triangle", 0.06, i * 0.08)),
  charge: () => tone(180, 1.4, "sawtooth", 0.025, 0, 900),
  crack: () => { noise(0.3, 0.14, 3200); tone(90, 0.3, "sine", 0.1); },
  whoosh: () => noise(0.35, 0.06, 800),
  tick: () => [0, 0.28, 0.56].forEach((w) => tone(1800, 0.03, "square", 0.03, w)),
  tuning: () => tone(440, 1.3, "sine", 0.07),
  zap: () => { noise(0.08, 0.1, 5200); noise(0.12, 0.08, 4200); },
  chime: () => { tone(1046, 0.4, "sine", 0.04); tone(1568, 0.5, "sine", 0.03, 0.08); },
};

export function sfx(name) {
  if (!muted) SFX[name]?.();
}

export function haptic(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

export function toggleMute() {
  muted = !muted;
  localStorage.setItem(KEY, muted ? "1" : "0");
  subs.forEach((f) => f());
}

export const useMuted = () =>
  useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => muted,
  );

export function useSfx() {
  return useCallback((name) => sfx(name), []);
}
