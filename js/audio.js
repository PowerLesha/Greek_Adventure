// Procedural sound with the Web Audio API — no audio files, so it works offline.
let ctx = null;
let muted = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  // Browsers suspend audio until a user gesture; resume on demand.
  if (ctx && ctx.state === "suspended") ctx.resume();
  return ctx;
}

// A single soft tone.
function tone(freq, start, dur, type = "sine", gain = 0.18) {
  const c = ac();
  if (!c || muted) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const Sound = {
  unlock() {
    ac();
  },
  setMuted(m) {
    muted = m;
  },
  isMuted() {
    return muted;
  },
  step() {
    // Soft footstep tick.
    tone(90 + Math.random() * 20, 0, 0.06, "triangle", 0.05);
  },
  pickup() {
    // Cheerful two-note chime.
    tone(660, 0, 0.12, "sine", 0.2);
    tone(990, 0.09, 0.18, "sine", 0.18);
  },
  talk() {
    tone(420, 0, 0.09, "sine", 0.09);
  },
  happy() {
    // Little arpeggio for gaining happiness.
    [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.2, "sine", 0.16));
  },
  bark() {
    tone(300, 0, 0.08, "square", 0.12);
    tone(240, 0.08, 0.1, "square", 0.1);
  },
  win() {
    // Fanfare + sparkle.
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => tone(f, i * 0.14, 0.35, "triangle", 0.18));
  },
  pop() {
    tone(880, 0, 0.07, "sine", 0.14);
  },
};
