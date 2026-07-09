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

/* ---------------- looping background music ---------------- */
// A gentle major-key loop, scheduled note-by-note off the audio clock so it works
// offline and stays in time. [freq, beats]; 0 = rest.
const BEAT = 0.32;
const MELODY = [
  [523, 1], [659, 1], [784, 1], [659, 1],
  [587, 1], [698, 1], [880, 1], [698, 1],
  [523, 1], [659, 1], [784, 2], [0, 1],
  [880, 1], [784, 1], [659, 1], [587, 2], [0, 1],
];
const BASS = [130, 130, 174, 174, 196, 196, 130, 130];  // one per two beats
let musicGain = null, musicOn = false, musicTimer = null, nextNote = 0, mIdx = 0, beatCount = 0;

function ensureMusicGain() {
  const c = ac();
  if (c && !musicGain) {
    musicGain = c.createGain();
    musicGain.gain.value = muted ? 0 : 0.05;
    musicGain.connect(c.destination);
  }
  return musicGain;
}
function musicNote(freq, t, dur, type, peak) {
  const c = ac();
  if (!c || !musicGain) return;
  const osc = c.createOscillator(), g = c.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.92);
  osc.connect(g).connect(musicGain);
  osc.start(t); osc.stop(t + dur);
}
function scheduleMusic() {
  const c = ac();
  if (!c || !musicOn) return;
  while (nextNote < c.currentTime + 0.25) {
    const [freq, beats] = MELODY[mIdx % MELODY.length];
    const dur = beats * BEAT;
    if (freq) musicNote(freq, nextNote, dur, "triangle", 1);
    if (beatCount % 2 === 0) musicNote(BASS[(beatCount / 2) % BASS.length], nextNote, BEAT * 2, "sine", 0.7);
    nextNote += dur; beatCount += beats; mIdx++;
  }
  musicTimer = setTimeout(scheduleMusic, 70);
}

export const Sound = {
  unlock() {
    ac();
  },
  startMusic() {
    const c = ac();
    if (!c || musicOn) return;
    ensureMusicGain();
    musicOn = true; nextNote = c.currentTime + 0.15; mIdx = 0; beatCount = 0;
    scheduleMusic();
  },
  stopMusic() {
    musicOn = false;
    if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
  },
  setMuted(m) {
    muted = m;
    const c = ctx;
    if (musicGain && c) musicGain.gain.setTargetAtTime(m ? 0 : 0.05, c.currentTime, 0.05);
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
  stomp() {
    // Squishy defeat: low thud then a little pop.
    tone(150, 0, 0.1, "triangle", 0.18);
    tone(500, 0.05, 0.09, "square", 0.1);
  },
  hurt() {
    // Descending "ouch" buzz.
    tone(360, 0, 0.14, "sawtooth", 0.14);
    tone(200, 0.1, 0.18, "sawtooth", 0.12);
  },
};
