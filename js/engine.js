// engine.js — a small, data-driven point-and-click adventure engine.
// It knows nothing about the story: it renders whatever `game.js` describes,
// handles taps, the inventory, using items on hotspots, dialogue and saving.
import { drawFace, preloadFaces } from "./portraits.js";
import { loadSave, writeSave, clearSave } from "./storage.js";
import { Sound } from "./audio.js";

let canvas, ctx, game;
let W = 0, H = 0, groundY = 0, dpr = 1;
let time = 0, running = false;

// layout (recomputed on resize)
let topH = 0, invH = 0, playH = 0;

// ---- game state (persisted) ---------------------------------------
const state = {
  scene: null,
  inv: [],          // array of item ids
  flags: {},        // arbitrary booleans/values
};
let selected = null;   // currently selected inventory item id

// ---- transient UI --------------------------------------------------
let dialogue = [];     // queue of { who, text }
let dialogueEnd = null;
let toast = null;      // { text, until }
let sparkleSeed = 0;

/* ================================================================== */
/*  The G object handed to every hotspot handler                      */
/* ================================================================== */
const G = {
  get scene() { return state.scene; },
  get selected() { return selected; },
  get inv() { return state.inv.slice(); },
  // screen layout so scene code can place props exactly where hotspots are.
  // PX(fx) = fx * W ;  PY(fy) = topH + fy * playH   (fy in 0..1 of the playfield)
  get layout() { return { W, H, topH, invH, playH, groundY }; },
  strings: {},
  sound: Sound,

  has(item) { return state.inv.includes(item); },
  give(item) {
    if (!state.inv.includes(item)) {
      state.inv.push(item);
      Sound.pickup?.();
      flashItem = item; flashUntil = time + 1.2;
    }
    save();
  },
  take(item) {
    state.inv = state.inv.filter((i) => i !== item);
    if (selected === item) selected = null;
    save();
  },
  flag(name) { return !!state.flags[name]; },
  setFlag(name, v = true) { state.flags[name] = v; save(); },

  select(item) { selected = item; },
  deselect() { selected = null; },

  say(who, ...lines) {
    for (const line of lines.flat()) dialogue.push({ who, text: line });
  },
  narrate(...lines) { G.say(null, ...lines); },
  onDialogueEnd(fn) { dialogueEnd = fn; },

  toast(text, secs = 2.2) { toast = { text, until: time + secs }; },

  goto(sceneId) {
    state.scene = sceneId;
    selected = null;
    save();
    const sc = game.scenes[sceneId];
    if (sc && sc.onEnter && !state.flags["entered_" + sceneId]) {
      state.flags["entered_" + sceneId] = true;
      sc.onEnter(G);
    }
  },

  win() { if (game.onWin) game.onWin(G); },
};

let flashItem = null, flashUntil = 0;

/* ================================================================== */
/*  Setup & sizing                                                    */
/* ================================================================== */
export async function startEngine(gameDef) {
  game = gameDef;
  G.strings = game.strings || {};
  canvas = document.getElementById("game");
  ctx = canvas.getContext("2d");
  await preloadFaces();

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 200));
  canvas.addEventListener("pointerdown", onPointer, { passive: false });

  running = true;
  requestAnimationFrame(loop);
  return {
    newGame() {
      clearSave();
      state.scene = null; state.inv = []; state.flags = {}; selected = null;
      dialogue = []; dialogueEnd = null;
      G.goto(game.start);
    },
    continueGame() {
      const s = loadSave();
      if (s && s.scene) {
        state.scene = s.scene; state.inv = s.inv || []; state.flags = s.flags || {};
      } else {
        G.goto(game.start);
      }
    },
    hasSave() { const s = loadSave(); return !!(s && s.scene); },
  };
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  topH = Math.round(Math.min(64, H * 0.08));
  invH = Math.round(Math.max(74, Math.min(120, H * 0.14)));
  playH = H - topH - invH;
  groundY = topH + playH * 0.82; // where the "floor" sits, for scene art
}

function save() { writeSave(state); }

/* ================================================================== */
/*  Coordinate helpers                                                */
/*  Hotspot rects are normalized 0..1 within the PLAYFIELD (the area  */
/*  between the top bar and the inventory bar).                       */
/* ================================================================== */
function hsRect(h) {
  return {
    x: h.x * W,
    y: topH + h.y * playH,
    w: h.w * W,
    h: h.h * playH,
  };
}
function inRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
function visibleHotspots() {
  const sc = game.scenes[state.scene];
  if (!sc || !sc.hotspots) return [];
  return sc.hotspots.filter((h) => !h.visible || h.visible(G));
}

/* ================================================================== */
/*  Render loop                                                       */
/* ================================================================== */
let last = 0;
function loop(ts) {
  if (!running) return;
  time = ts / 1000;
  render();
  requestAnimationFrame(loop);
}

function render() {
  const sc = game.scenes[state.scene];
  if (!sc) return; // nothing to draw yet (start screen is showing)

  // background + dynamic props
  sc.bg(ctx, W, H, groundY, time, G);
  if (sc.props) sc.props(ctx, W, H, groundY, time, G);

  // hotspot sparkles + exit arrows (discoverability) — hidden during dialogue
  if (!dialogue.length) {
    for (const h of visibleHotspots()) {
      if (h.arrow) { drawExitArrow(h.arrow); continue; }
      if (h.silent) continue; // plain scenery you can examine but not signposted
      const r = hsRect(h);
      drawSparkle(r.x + r.w / 2, r.y + r.h / 2, h);
    }
  }

  drawTopBar(sc);
  drawInventory();

  if (dialogue.length) drawDialogue();
  drawToast();
}

function drawSparkle(cx, cy, h) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 3 + (h.x + h.y) * 10);
  const selHere = selected && h.onUse && h.onUse[selected];
  const col = selHere ? "255,220,120" : "255,255,255";
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.45 * pulse;
  ctx.fillStyle = `rgba(${col},1)`;
  const r = 3 + pulse * 2;
  for (let a = 0; a < 4; a++) {
    const ang = (Math.PI / 2) * a + time * 0.6;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(ang) * 9, cy + Math.sin(ang) * 9, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.6 + 0.4 * pulse;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawExitArrow(dir) {
  const x = dir === "left" ? W * 0.07 : W * 0.93;
  const y = topH + playH * 0.68;
  const bob = Math.sin(time * 3) * 4 * (dir === "left" ? -1 : 1);
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#ffd36b";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 3;
  ctx.font = `bold ${Math.round(Math.min(46, playH * 0.09))}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const ch = dir === "left" ? "◀" : "▶";
  ctx.strokeText(ch, x + bob, y);
  ctx.fillText(ch, x + bob, y);
  ctx.restore();
}

function drawTopBar(sc) {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, topH);
  g.addColorStop(0, "rgba(20,30,55,0.55)");
  g.addColorStop(1, "rgba(20,30,55,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, topH);
  ctx.fillStyle = "#fff";
  ctx.font = `600 ${Math.round(topH * 0.34)}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 6;
  ctx.fillText(sc.name || "", W / 2, topH * 0.55);
  ctx.restore();
}

function drawInventory() {
  const y0 = H - invH;
  ctx.save();
  // bar background
  const g = ctx.createLinearGradient(0, y0, 0, H);
  g.addColorStop(0, "rgba(28,24,40,0.92)");
  g.addColorStop(1, "rgba(18,16,28,0.98)");
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, W, invH);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath(); ctx.moveTo(0, y0 + 0.5); ctx.lineTo(W, y0 + 0.5); ctx.stroke();

  const slot = invSlotMetrics();
  for (let i = 0; i < slot.count; i++) {
    const cx = slot.x0 + slot.gap + i * (slot.size + slot.gap) + slot.size / 2;
    const cy = y0 + invH / 2;
    const item = state.inv[i];
    // slot frame
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    roundRect(ctx, cx - slot.size / 2, cy - slot.size / 2, slot.size, slot.size, 10);
    ctx.fill();
    if (item) {
      if (selected === item) {
        ctx.strokeStyle = "#ffd36b";
        ctx.lineWidth = 3;
        roundRect(ctx, cx - slot.size / 2, cy - slot.size / 2, slot.size, slot.size, 10);
        ctx.stroke();
      }
      const def = game.items[item];
      const s = slot.size * 0.7;
      if (def && def.draw) def.draw(ctx, cx, cy, s);
      else drawFallbackItem(cx, cy, s);
    }
  }
  // hint text for selected item
  if (selected) {
    ctx.fillStyle = "#ffd36b";
    ctx.font = `500 ${Math.round(invH * 0.16)}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const nm = (game.items[selected] && game.items[selected].name) || selected;
    ctx.fillText(`Using ${nm} — tap where to use it  (tap again to cancel)`, W / 2, y0 + 4);
  }
  ctx.restore();
}

function invSlotMetrics() {
  const size = Math.min(invH * 0.62, 64);
  const gap = size * 0.28;
  const count = Math.max(5, Math.floor((W - gap) / (size + gap)));
  const totalW = count * (size + gap) + gap;
  const x0 = (W - totalW) / 2;
  return { size, gap, count, x0 };
}

function drawFallbackItem(cx, cy, s) {
  ctx.fillStyle = "#f4b942";
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

/* ---- dialogue ----------------------------------------------------- */
function drawDialogue() {
  const d = dialogue[0];
  const boxH = Math.min(H * 0.34, 230);
  const y0 = H - invH - boxH - 8;
  const pad = 16;
  ctx.save();
  // dim
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(0, 0, W, H);
  // panel
  ctx.fillStyle = "rgba(24,22,36,0.97)";
  roundRect(ctx, 10, y0, W - 20, boxH, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1;
  roundRect(ctx, 10, y0, W - 20, boxH, 18);
  ctx.stroke();

  const pr = Math.min(boxH * 0.34, 52);
  const px = 10 + pad + pr;
  const py = y0 + pad + pr;
  if (d.who) {
    drawFace(ctx, d.who, px, py, pr);
    // name
    ctx.fillStyle = "#ffd36b";
    ctx.font = `600 ${Math.round(pr * 0.5)}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const nm = (game.people && game.people[d.who] && game.people[d.who].name) || d.who;
    ctx.fillText(nm, px + pr + 12, py - pr + 12);
  }

  // text
  ctx.fillStyle = "#f4f1ea";
  ctx.font = `400 ${Math.round(Math.min(boxH * 0.11, 20))}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const textX = 10 + pad;
  const textTop = d.who ? y0 + pad + pr + 14 : y0 + pad + 6;
  wrapText(d.text, textX, textTop, W - 20 - pad * 2, Math.round(Math.min(boxH * 0.14, 26)));

  // continue hint
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = `400 ${Math.round(boxH * 0.08)}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText("tap to continue ▸", W - 20 - pad, y0 + boxH - pad);
  ctx.restore();
}

function drawToast() {
  if (!toast) return;
  if (time > toast.until) { toast = null; return; }
  const alpha = Math.min(1, (toast.until - time) * 2);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `500 ${Math.round(Math.min(H * 0.026, 18))}px "Segoe UI", system-ui, sans-serif`;
  const tw = ctx.measureText(toast.text).width;
  const bw = tw + 40, bh = 44;
  const x = (W - bw) / 2, y = H - invH - bh - 20;
  ctx.fillStyle = "rgba(20,18,30,0.92)";
  roundRect(ctx, x, y, bw, bh, 12);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(toast.text, W / 2, y + bh / 2);
  ctx.restore();
}

/* ================================================================== */
/*  Input                                                             */
/* ================================================================== */
function onPointer(e) {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;

  // 1) advance dialogue
  if (dialogue.length) {
    dialogue.shift();
    if (!dialogue.length && dialogueEnd) {
      const fn = dialogueEnd; dialogueEnd = null; fn(G);
    }
    return;
  }

  // 2) inventory taps
  if (py >= H - invH) {
    const slot = invSlotMetrics();
    const y0 = H - invH;
    for (let i = 0; i < slot.count; i++) {
      const cx = slot.x0 + slot.gap + i * (slot.size + slot.gap) + slot.size / 2;
      const cy = y0 + invH / 2;
      if (Math.abs(px - cx) <= slot.size / 2 && Math.abs(py - cy) <= slot.size / 2) {
        const item = state.inv[i];
        if (item) selected = selected === item ? null : item;
        return;
      }
    }
    return;
  }

  // 3) hotspots (topmost = last in array wins)
  const hs = visibleHotspots();
  let hit = null;
  for (let i = hs.length - 1; i >= 0; i--) {
    if (inRect(px, py, hsRect(hs[i]))) { hit = hs[i]; break; }
  }

  if (!hit) {
    if (selected) selected = null; // tap empty space cancels selection
    return;
  }

  if (selected) {
    const use = hit.onUse && hit.onUse[selected];
    if (use) {
      use(G);
    } else if (hit.onUseAny) {
      hit.onUseAny(G, selected);
    } else {
      G.toast(game.strings.noUse || "That doesn't seem to work here.");
    }
    selected = null;
  } else if (hit.onTap) {
    hit.onTap(G);
  } else if (hit.look) {
    G.narrate(hit.look);
  } else if (hit.label) {
    G.toast(hit.label);
  }
}

/* ================================================================== */
/*  small canvas utilities                                            */
/* ================================================================== */
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function wrapText(text, x, y, maxW, lh) {
  const words = String(text).split(/\s+/);
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      y += lh; line = w;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
}

export { G };
