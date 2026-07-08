// main.js — the game engine: loop, movement, story flow, HUD, save/load.
import { Art } from "./art.js";
import { scenes, drawPortrait } from "./scenes.js";
import { Sound } from "./audio.js";
import { Minigame } from "./minigame.js";
import { loadSave, writeSave, clearSave } from "./storage.js";

/* ---------------- canvas & sizing ---------------- */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let W = 0,
  H = 0,
  groundY = 0,
  dpr = 1;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  groundY = H * 0.8;
  if (kate) kate.x = Math.max(margin(), Math.min(W - margin(), kate.x));
  if (minigame) minigame.resize(W, H);
}
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => setTimeout(resize, 200));

const margin = () => W * 0.12;
const KATE_H = () => H * 0.26;

/* ---------------- game state ---------------- */
let kate,
  dogX = 0,
  minigame = null;

const state = {
  scene: 0,
  collected: new Set(),
  met: new Set(),
  happiness: 0,
  minigameDone: false,
};

// total number of "hearts" available across the whole game
let TOTAL_HEARTS = 0;
function computeTotal() {
  let n = 0;
  for (const s of scenes) {
    n += (s.items ? s.items.length : 0);
    if (s.character) {
      n += 1;
      if (s.character.gift) n += 1;
      if (s.character.startsMinigame) n += 1; // winning the beach game is a heart too
    }
  }
  return n;
}

let running = false;
let dialogue = null; // { who, name, lines, i, onEnd }
let toasts = [];
let fireworks = [];
let started = false;
let inputDir = 0; // -1 left, 1 right, 0 idle
let time = 0;

/* ---------------- helpers ---------------- */
function key(si, kind, i) {
  return `${si}:${kind}:${i}`;
}

function addHeart(n = 1) {
  state.happiness = Math.min(TOTAL_HEARTS, state.happiness + n);
}

function toast(text, color = "#f4b942") {
  toasts.push({ text, color, life: 2.4, y: 0 });
}

function save() {
  writeSave(state);
}

/* ---------------- scene setup ---------------- */
function initKate() {
  kate = { x: margin() + 10, facing: 1, phase: 0, walking: false };
  dogX = kate.x - 60;
}

function enterScene(idx, fromRight) {
  state.scene = idx;
  const s = scenes[idx];
  // place Kate at the entering edge
  kate.x = fromRight ? W - margin() - 10 : margin() + 10;
  kate.facing = fromRight ? -1 : 1;
  dogX = kate.x - kate.facing * 60;
  minigame = null;
  save();

  // Show a scene note (narrator) once, on first entry.
  if (s.note && !state.met.has(key(idx, "note", 0))) {
    state.met.add(key(idx, "note", 0));
    setTimeout(
      () =>
        openDialogue({
          who: "note",
          name: "💌 A note for you",
          lines: [s.note],
        }),
      450
    );
  }
  if (s.isFinale) triggerFinale();
}

/* ---------------- dialogue ---------------- */
function openDialogue(d) {
  dialogue = { ...d, i: 0 };
  Sound.talk();
  const box = document.getElementById("dialogue");
  const pc = document.getElementById("portrait").getContext("2d");
  if (d.who === "note") {
    pc.clearRect(0, 0, 120, 120);
    pc.fillStyle = "#ffe3ec";
    pc.fillRect(0, 0, 120, 120);
    pc.font = "60px serif";
    pc.textAlign = "center";
    pc.fillText("💖", 60, 82);
    pc.textAlign = "left";
  } else {
    drawPortrait(pc, d.who);
  }
  document.getElementById("speakerName").textContent = d.name;
  document.getElementById("dialogueText").textContent = d.lines[0];
  box.classList.remove("hidden");
}

function advanceDialogue() {
  if (!dialogue) return;
  dialogue.i++;
  if (dialogue.i >= dialogue.lines.length) {
    const d = dialogue;
    dialogue = null;
    document.getElementById("dialogue").classList.add("hidden");
    if (d.onEnd) d.onEnd();
    return;
  }
  Sound.talk();
  document.getElementById("dialogueText").textContent = dialogue.lines[dialogue.i];
}

/* ---------------- interactions ---------------- */
function tryCollectAndTalk() {
  if (dialogue || minigame) return;
  const s = scenes[state.scene];

  // items
  if (s.items) {
    s.items.forEach((it, i) => {
      const k = key(state.scene, "item", i);
      if (state.collected.has(k)) return;
      const ix = it.xf * W;
      if (Math.abs(kate.x - ix) < W * 0.09) {
        state.collected.add(k);
        addHeart(1);
        Sound.pickup();
        Sound.happy();
        toast(`Collected: ${it.label} 💛`);
        save();
      }
    });
  }

  // character
  if (s.character) {
    const c = s.character;
    const cx = c.xf * W;
    const metKey = key(state.scene, "char", 0);
    // Safeguard: if they already met Lucky but never finished the beach game
    // (e.g. quit mid-game), let walking back to him restart it — no soft-lock.
    if (
      s.id === "beach" &&
      state.met.has(metKey) &&
      !state.minigameDone &&
      !minigame &&
      Math.abs(kate.x - cx) < W * 0.14
    ) {
      startMinigame();
      return;
    }
    if (!state.met.has(metKey) && Math.abs(kate.x - cx) < W * 0.12) {
      if (c.who === "dog") Sound.bark();
      openDialogue({
        who: c.who,
        name: c.name,
        lines: c.lines,
        onEnd: () => {
          state.met.add(metKey);
          addHeart(1);
          Sound.happy();
          if (c.gift) {
            state.collected.add(key(state.scene, "gift", 0));
            addHeart(1);
            toast(`${c.name} gave you ${c.gift.label} 🎁`);
          }
          if (c.startsMinigame) {
            startMinigame();
          }
          save();
        },
      });
    }
  }
}

function sceneComplete(idx) {
  const s = scenes[idx];
  if (s.items) {
    for (let i = 0; i < s.items.length; i++)
      if (!state.collected.has(key(idx, "item", i))) return false;
  }
  if (s.character && !state.met.has(key(idx, "char", 0))) return false;
  if (s.id === "beach" && !state.minigameDone) return false;
  return true;
}

/* ---------------- minigame ---------------- */
function startMinigame() {
  minigame = new Minigame(W, H, () => {
    state.minigameDone = true;
    minigame = null;
    addHeart(1);
    Sound.win();
    toast("Lucky is so happy! 🐾");
    save();
  });
  minigame._onCatch = () => Sound.pop();
}

/* ---------------- finale ---------------- */
function triggerFinale() {
  state.happiness = TOTAL_HEARTS;
  save();
  setTimeout(() => {
    Sound.win();
    for (let i = 0; i < 5; i++) setTimeout(spawnFirework, i * 500);
    openDialogue({
      who: "note",
      name: "🎂 Happy Birthday, Kate!",
      lines: [
        "You made it through the whole journey 💖",
        "Everyone you love is right here — Mom, Dad, Lucky, and me.",
        "Thank you for another beautiful year by your side.",
        "Happy Birthday, my love. Here's to many more adventures. — Lesha",
      ],
    });
  }, 700);
}

function spawnFirework() {
  const cx = W * (0.2 + Math.random() * 0.6);
  const cy = H * (0.2 + Math.random() * 0.25);
  const col = ["#e5688b", "#f4b942", "#7ec8e3", "#8fae4d", "#fff", "#c96bb0"][
    (Math.random() * 6) | 0
  ];
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2;
    const sp = 90 + Math.random() * 90;
    fireworks.push({
      x: cx,
      y: cy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 1.4,
      col,
    });
  }
  Sound.pop();
}

/* ---------------- update ---------------- */
function update(dt) {
  time += dt;

  if (minigame) {
    minigame.update(dt, time);
  } else if (!dialogue) {
    // movement
    const speed = W * 0.32;
    kate.walking = inputDir !== 0;
    if (inputDir !== 0) {
      kate.facing = inputDir;
      kate.x += inputDir * speed * dt;
      kate.phase += dt * 10;
      if (Math.floor(kate.phase / Math.PI) !== Math.floor((kate.phase - dt * 10) / Math.PI))
        Sound.step();
    }

    // edges -> scene transitions
    if (kate.x >= W - margin()) {
      kate.x = W - margin();
      if (inputDir > 0) tryAdvance(1);
    } else if (kate.x <= margin()) {
      kate.x = margin();
      if (inputDir < 0 && state.scene > 0) enterScene(state.scene - 1, true);
    }

    tryCollectAndTalk();

    // dog follows
    const targetDogX = kate.x - kate.facing * 62;
    dogX += (targetDogX - dogX) * Math.min(1, dt * 4);
  }

  // toasts
  toasts.forEach((t) => {
    t.life -= dt;
    t.y += dt * 26;
  });
  toasts = toasts.filter((t) => t.life > 0);

  // fireworks
  fireworks.forEach((f) => {
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.vy += 60 * dt;
    f.life -= dt;
  });
  fireworks = fireworks.filter((f) => f.life > 0);

  // keep spawning fireworks during finale
  if (scenes[state.scene].isFinale && Math.random() < dt * 0.9) spawnFirework();
}

let advanceHintCooldown = 0;
function tryAdvance(dir) {
  if (state.scene >= scenes.length - 1) return;
  if (!sceneComplete(state.scene)) {
    if (advanceHintCooldown <= 0) {
      advanceHintCooldown = 2.5;
      const s = scenes[state.scene];
      let msg = "Something here still needs you 💭";
      if (s.character && !state.met.has(key(state.scene, "char", 0)))
        msg = `Say hello to ${s.character.name} first!`;
      else if (s.id === "beach" && !state.minigameDone) msg = "Play with Lucky first! 🐾";
      else msg = "Collect everything sparkling here first ✨";
      toast(msg, "#e5688b");
    }
    return;
  }
  enterScene(state.scene + 1, false);
}

/* ---------------- render ---------------- */
function drawSceneBackground() {
  scenes[state.scene].draw(ctx, W, H, groundY, time);
}

function render() {
  if (minigame) {
    minigame.draw(ctx, drawSceneBackground);
    drawFireworks();
    drawToasts();
    return;
  }

  drawSceneBackground();
  const s = scenes[state.scene];

  // items
  if (s.items) {
    s.items.forEach((it, i) => {
      if (state.collected.has(key(state.scene, "item", i))) return;
      Art.drawItem(ctx, it.name, it.xf * W, groundY - it.yUp * H, H * 0.05, time);
    });
  }

  // character
  if (s.character) {
    const c = s.character;
    const cx = c.xf * W;
    const met = state.met.has(key(state.scene, "char", 0));
    if (c.who === "dog") {
      Art.drawDog(ctx, cx, groundY, 66, -1, time * 6);
    } else {
      Art.drawPerson(ctx, Art.CHARS[c.who], cx, groundY, KATE_H() * 1.02, -1, 0, {
        blink: Math.sin(time * 3 + 1) > 0.96,
      });
    }
    if (!met) drawInteractBubble(cx, groundY - KATE_H() * 1.05);
  }

  // finale: gather the whole family
  if (s.isFinale) drawFamily();

  // Kate + dog
  if (!s.isFinale) {
    Art.drawDog(ctx, dogX, groundY, 54, kate.facing, kate.walking ? time * 14 : time * 3);
    Art.drawPerson(ctx, Art.CHARS.kate, kate.x, groundY, KATE_H(), kate.facing, kate.phase, {
      blink: Math.sin(time * 3) > 0.96,
    });
  }

  drawHUDCanvas();
  drawFireworks();
  drawToasts();
}

function drawInteractBubble(x, y) {
  const s = 1 + Math.sin(time * 4) * 0.08;
  ctx.save();
  ctx.translate(x, y - 10);
  ctx.scale(s, s);
  ctx.fillStyle = "#fff";
  Art.helpers.circle(ctx, 0, 0, 15, "#fff");
  ctx.fillStyle = "#e5688b";
  ctx.font = "18px serif";
  ctx.textAlign = "center";
  ctx.fillText("💬", 0, 6);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawFamily() {
  const y = groundY;
  Art.drawPerson(ctx, Art.CHARS.mom, W * 0.3, y, KATE_H(), 1, 0, {});
  Art.drawPerson(ctx, Art.CHARS.dad, W * 0.42, y, KATE_H() * 1.05, 1, 0, {});
  Art.drawPerson(ctx, Art.CHARS.kate, W * 0.54, y, KATE_H(), -1, 0, {});
  Art.drawPerson(ctx, Art.CHARS.lesha, W * 0.66, y, KATE_H() * 1.03, -1, 0, {});
  Art.drawDog(ctx, W * 0.5, y, 54, 1, time * 3);
  // cake on a little table in front
  Art.drawItem(ctx, "Cake", W * 0.5, y - KATE_H() * 0.5, H * 0.06, 0);
}

function drawHUDCanvas() {
  // location name
  const name = scenes[state.scene].name;
  ctx.fillStyle = "rgba(20,40,60,0.35)";
  ctx.font = "bold 20px 'Segoe UI', sans-serif";
  const w = ctx.measureText(name).width + 28;
  Art.helpers.rr(ctx, W / 2 - w / 2, 12 + safeTop(), w, 34, 17);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(name, W / 2, 35 + safeTop());
  ctx.textAlign = "left";

  // happiness meter
  const bw = Math.min(300, W * 0.7);
  const bx = W / 2 - bw / 2;
  const by = 54 + safeTop();
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  Art.helpers.rr(ctx, bx, by, bw, 22, 11);
  ctx.fill();
  const frac = TOTAL_HEARTS ? state.happiness / TOTAL_HEARTS : 0;
  const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  g.addColorStop(0, "#f4b942");
  g.addColorStop(1, "#e5688b");
  ctx.fillStyle = g;
  Art.helpers.rr(ctx, bx, by, Math.max(22, bw * frac), 22, 11);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`💖 Happiness ${Math.round(frac * 100)}%`, W / 2, by + 16);
  ctx.textAlign = "left";

  // advance hint arrow at right edge when scene complete
  if (state.scene < scenes.length - 1 && sceneComplete(state.scene)) {
    const ax = W - 30;
    const ay = H * 0.5;
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 4);
    ctx.fillStyle = "#fff";
    ctx.font = "34px serif";
    ctx.textAlign = "center";
    ctx.fillText("➡️", ax, ay);
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }
  if (advanceHintCooldown > 0) advanceHintCooldown -= 1 / 60;
}

function drawToasts() {
  ctx.textAlign = "center";
  toasts.forEach((t, idx) => {
    ctx.globalAlpha = Math.min(1, t.life);
    ctx.font = "bold 18px 'Segoe UI', sans-serif";
    const y = H * 0.34 - t.y + idx * 4;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    const w = ctx.measureText(t.text).width + 28;
    Art.helpers.rr(ctx, W / 2 - w / 2, y - 22, w, 32, 16);
    ctx.fill();
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, W / 2, y);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
}

function drawFireworks() {
  fireworks.forEach((f) => {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.col;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function safeTop() {
  return 8; // small constant nudge; env(safe-area) handled by DOM buttons
}

/* ---------------- loop ---------------- */
let last = 0;
function frame(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

/* ---------------- input ---------------- */
function bindHold(btn, dir) {
  const on = (e) => {
    e.preventDefault();
    inputDir = dir;
    Sound.unlock();
  };
  const off = (e) => {
    e && e.preventDefault();
    if (inputDir === dir) inputDir = 0;
  };
  btn.addEventListener("pointerdown", on);
  btn.addEventListener("pointerup", off);
  btn.addEventListener("pointerleave", off);
  btn.addEventListener("pointercancel", off);
}

function initInput() {
  bindHold(document.getElementById("btnLeft"), -1);
  bindHold(document.getElementById("btnRight"), 1);

  // Tap on canvas: advance dialogue, drive minigame, or walk toward the tap side.
  canvas.addEventListener("pointerdown", (e) => {
    Sound.unlock();
    if (dialogue) {
      advanceDialogue();
      return;
    }
    if (minigame) {
      minigame.pointer(e.clientX);
      canvas._dragging = true;
      return;
    }
    inputDir = e.clientX < W / 2 ? -1 : 1;
  });
  canvas.addEventListener("pointermove", (e) => {
    if (minigame && canvas._dragging) minigame.pointer(e.clientX);
    else if (!dialogue && inputDir !== 0) inputDir = e.clientX < W / 2 ? -1 : 1;
  });
  const release = () => {
    canvas._dragging = false;
    inputDir = 0;
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  // dialogue box tap advances too
  document.getElementById("dialogue").addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    advanceDialogue();
  });

  // keyboard (nice on laptop)
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") inputDir = -1;
    if (e.key === "ArrowRight" || e.key === "d") inputDir = 1;
    if (e.key === " " || e.key === "Enter") dialogue && advanceDialogue();
  });
  window.addEventListener("keyup", (e) => {
    if (["ArrowLeft", "ArrowRight", "a", "d"].includes(e.key)) inputDir = 0;
  });

  // sound + menu
  const soundBtn = document.getElementById("btnSound");
  soundBtn.addEventListener("click", () => {
    const m = !Sound.isMuted();
    Sound.setMuted(m);
    soundBtn.textContent = m ? "🔇" : "🔊";
  });
  document.getElementById("btnMenu").addEventListener("click", () => {
    document.getElementById("menu").classList.remove("hidden");
  });
  document.getElementById("resumeBtn").addEventListener("click", () => {
    document.getElementById("menu").classList.add("hidden");
  });
  document.getElementById("restartBtn").addEventListener("click", () => {
    clearSave();
    location.reload();
  });
}

/* ---------------- boot ---------------- */
function showGameChrome() {
  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("hud").classList.remove("hidden");
  document.getElementById("btnSound").classList.remove("hidden");
  document.getElementById("btnMenu").classList.remove("hidden");
}

function beginGame(fresh) {
  Sound.unlock();
  showGameChrome();
  initKate();
  if (fresh) {
    state.scene = 0;
    state.collected = new Set();
    state.met = new Set();
    state.happiness = 0;
    state.minigameDone = false;
    enterScene(0, false);
  } else {
    // enter saved scene without re-triggering its intro note
    const s = scenes[state.scene];
    kate.x = margin() + 10;
    if (s.isFinale) triggerFinale();
  }
  running = true;
  started = true;
  last = performance.now();
  requestAnimationFrame(frame);
}

function boot() {
  resize();
  TOTAL_HEARTS = computeTotal();
  initInput();

  const saved = loadSave();
  const continueBtn = document.getElementById("continueBtn");
  if (saved && (saved.scene > 0 || (saved.collected && saved.collected.length))) {
    continueBtn.hidden = false;
    continueBtn.addEventListener("click", () => {
      state.scene = saved.scene || 0;
      state.collected = new Set(saved.collected || []);
      state.met = new Set(saved.met || []);
      state.happiness = saved.happiness || 0;
      state.minigameDone = !!saved.minigameDone;
      beginGame(false);
    });
  }
  document.getElementById("startBtn").addEventListener("click", () => beginGame(true));

  // draw a soft preview behind the start card
  scenes[0].draw(ctx, W, H, groundY, 0);

  // Dev/testing helper: open with #auto or #scene=3 to jump straight in.
  const hash = location.hash;
  if (hash.includes("auto") || hash.includes("scene")) {
    beginGame(true);
    const m = hash.match(/scene=(\d+)/);
    if (m) enterScene(Math.min(scenes.length - 1, +m[1]), false);
  }
}

boot();
