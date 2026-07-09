// game.js — the STORY and PUZZLES (all the content lives here).
// The engine in engine.js renders whatever this file describes.
//
// ✏️ To personalise names, edit STRINGS below.
// ✏️ To use real photos, drop them in assets/faces/ (see that folder's README).
import { Art } from "./art.js";
const H = Art.helpers;

/* ---------------- names (easy to edit) ---------------- */
export const STRINGS = {
  kate: "Kate",
  husband: "Lesha",  // 👈 change to Kate's husband's real name
  dog: "Lucky",      // 👈 change to the dog's real name
  mom: "Mom",
  dad: "Dad",
  noUse: "That doesn't work here.",
};

/* people -> portrait art fallback (used until a real photo is added) */
export const people = {
  kate:    { name: STRINGS.kate,    char: "kate" },
  husband: { name: STRINGS.husband, char: "lesha" },
  mom:     { name: STRINGS.mom,     char: "mom" },
  dad:     { name: STRINGS.dad,     char: "dad" },
  dog:     { name: STRINGS.dog,     char: "dog" },
};

/* Draw a hand-drawn portrait for `who` into a 120×120 box (fallback only). */
export function drawPortrait(pctx, who) {
  const g = pctx.createLinearGradient(0, 0, 0, 120);
  g.addColorStop(0, "#dff1fb"); g.addColorStop(1, "#c3e4f4");
  pctx.fillStyle = g; pctx.fillRect(0, 0, 120, 120);
  if (who === "dog") {
    Art.drawDog(pctx, 60, 104, 62, 1, 0.3);
  } else {
    const p = people[who];
    const def = Art.CHARS[(p && p.char) || who] || Art.CHARS.kate;
    Art.drawPerson(pctx, def, 60, 128, 150, 1, 0, { blink: false });
  }
}

/* ================================================================== */
/*  Layout helpers — PX(fx)=fx*W ; PY(fy)=topH+fy*playH               */
/* ================================================================== */
const GROUND = 0.84;
const PX = (L, f) => f * L.W;
const PY = (L, f) => L.topH + f * L.playH;

function roundRectP(ctx, x, y, w, h, r) {
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ================================================================== */
/*  ITEMS (inventory icons)                                           */
/* ================================================================== */
export const items = {
  basket: {
    name: "Basket",
    draw(ctx, cx, cy, s) {
      ctx.save();
      ctx.strokeStyle = "#b07a3a"; ctx.fillStyle = "#c99a55";
      ctx.lineWidth = Math.max(1, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.32, cy - s * 0.15);
      ctx.lineTo(cx - s * 0.22, cy + s * 0.28);
      ctx.lineTo(cx + s * 0.22, cy + s * 0.28);
      ctx.lineTo(cx + s * 0.32, cy - s * 0.15);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy - s * 0.15, s * 0.34, s * 0.12, 0, Math.PI, 0);
      ctx.stroke();
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * s * 0.11, cy - s * 0.12);
        ctx.lineTo(cx + i * s * 0.09, cy + s * 0.26);
        ctx.stroke();
      }
      ctx.restore();
    },
  },
  coaster: {
    name: "Coaster",
    draw(ctx, cx, cy, s) {
      ctx.fillStyle = "#7a5a3a"; ctx.strokeStyle = "#5a4028"; ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#c9a35a";
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.16, 0, Math.PI * 2); ctx.fill();
    },
  },
  glasses: {
    name: "Reading glasses",
    draw(ctx, cx, cy, s) {
      ctx.strokeStyle = "#333"; ctx.lineWidth = Math.max(1.5, s * 0.06);
      ctx.beginPath(); ctx.arc(cx - s * 0.16, cy, s * 0.15, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + s * 0.16, cy, s * 0.15, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.02, cy); ctx.lineTo(cx + s * 0.02, cy);
      ctx.moveTo(cx - s * 0.31, cy); ctx.lineTo(cx - s * 0.4, cy - s * 0.08);
      ctx.moveTo(cx + s * 0.31, cy); ctx.lineTo(cx + s * 0.4, cy - s * 0.08);
      ctx.stroke();
    },
  },
  honey: {
    name: "Jar of honey",
    draw(ctx, cx, cy, s) {
      ctx.fillStyle = "#e6a417"; ctx.strokeStyle = "#a8760c"; ctx.lineWidth = Math.max(1, s * 0.05);
      roundRectP(ctx, cx - s * 0.2, cy - s * 0.22, s * 0.4, s * 0.46, s * 0.06);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#f7f2e6";
      roundRectP(ctx, cx - s * 0.22, cy - s * 0.3, s * 0.44, s * 0.12, s * 0.04);
      ctx.fill();
    },
  },
  bone: {
    name: "Bone",
    draw(ctx, cx, cy, s) {
      ctx.fillStyle = "#f2ead6"; ctx.strokeStyle = "#c9bd9a"; ctx.lineWidth = Math.max(1, s * 0.04);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.5);
      roundRectP(ctx, -s * 0.28, -s * 0.06, s * 0.56, s * 0.12, s * 0.06);
      ctx.fill(); ctx.stroke();
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(sx * s * 0.28, -s * 0.07, s * 0.08, 0, Math.PI * 2);
        ctx.arc(sx * s * 0.28, s * 0.07, s * 0.08, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    },
  },
  cake: {
    name: "Birthday cake",
    draw(ctx, cx, cy, s) {
      ctx.fillStyle = "#f7d7e3";
      roundRectP(ctx, cx - s * 0.26, cy - s * 0.05, s * 0.52, s * 0.28, s * 0.05); ctx.fill();
      ctx.fillStyle = "#e28fb0";
      roundRectP(ctx, cx - s * 0.26, cy - s * 0.05, s * 0.52, s * 0.07, s * 0.03); ctx.fill();
      ctx.strokeStyle = "#f4b942"; ctx.lineWidth = Math.max(1, s * 0.04);
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.05); ctx.lineTo(cx, cy - s * 0.22); ctx.stroke();
      ctx.fillStyle = "#ffdf6b";
      ctx.beginPath(); ctx.arc(cx, cy - s * 0.26, s * 0.05, 0, Math.PI * 2); ctx.fill();
    },
  },
  key: {
    name: "Little key",
    draw(ctx, cx, cy, s) {
      ctx.strokeStyle = "#d9b64a"; ctx.fillStyle = "#d9b64a"; ctx.lineWidth = Math.max(1.5, s * 0.07);
      ctx.beginPath(); ctx.arc(cx - s * 0.16, cy - s * 0.14, s * 0.12, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.08, cy - s * 0.06);
      ctx.lineTo(cx + s * 0.22, cy + s * 0.24);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.12, cy + s * 0.14); ctx.lineTo(cx + s * 0.22, cy + s * 0.06);
      ctx.moveTo(cx + s * 0.2, cy + s * 0.22); ctx.lineTo(cx + s * 0.3, cy + s * 0.14);
      ctx.stroke();
    },
  },
};

/* ================================================================== */
/*  BACKDROPS (fill the whole frame — no more empty sky)              */
/* ================================================================== */
const PAL = {
  morning: { sky: [[0, "#8fd0ec"], [0.55, "#c4e6f3"], [1, "#eaf6ef"]], seaTop: "#7ec8e3", seaBottom: "#3f9fc4", gTop: "#ecdcbb", gBottom: "#d2ba8c", sun: { x: 0.22, y: 0.16, r: 26, c: "#fff4c2", g: "rgba(255,244,180,0.9)" } },
  noon:    { sky: [[0, "#5bb8e6"], [0.55, "#9bd3ee"], [1, "#e3f2ec"]], seaTop: "#5cc0e0", seaBottom: "#2f88b8", gTop: "#efe0bd", gBottom: "#d3bd8d", sun: { x: 0.8, y: 0.13, r: 30, c: "#fff8d0", g: "rgba(255,248,190,0.95)" } },
  sunset:  { sky: [[0, "#54468c"], [0.4, "#e57b7b"], [0.75, "#f6b76b"], [1, "#ffe6b0"]], seaTop: "#e79a7a", seaBottom: "#8a5a9a", gTop: "#dcb488", gBottom: "#ab8a68", sun: { x: 0.5, y: 0.5, r: 40, c: "#ffdf8a", g: "rgba(255,170,120,0.9)" } },
  night:   { sky: [[0, "#0f1a3a"], [0.6, "#26305e"], [1, "#43436e"]], seaTop: "#26365e", seaBottom: "#141d38", gTop: "#39395a", gBottom: "#232340", sun: { x: 0.76, y: 0.16, r: 22, c: "#f4f0d0", g: "rgba(230,230,200,0.55)" } },
};

function skyBand(ctx, L, pal) {
  const g = ctx.createLinearGradient(0, 0, 0, PY(L, 0.72));
  pal.sky.forEach((s) => g.addColorStop(s[0], s[1]));
  ctx.fillStyle = g; ctx.fillRect(0, 0, L.W, L.H);
}

/* a close cluster of big white cubic Greek houses; bases on baseY */
function bigHouses(ctx, L, baseY, seed) {
  const W = L.W, unit = Math.max(76, W * 0.22);
  let i = 0;
  for (let x = -unit * 0.35; x < W + unit; x += unit * 0.84, i++) {
    const h = L.playH * (0.15 + ((i * 41 + seed) % 9) / 90);
    const w = unit * 0.8, top = baseY - h;
    ctx.fillStyle = i % 2 ? "#fbf6ee" : "#f1e8d7";
    roundRectP(ctx, x, top, w, h, 6); ctx.fill();
    ctx.fillStyle = "rgba(30,40,70,0.05)";
    roundRectP(ctx, x + w * 0.6, top, w * 0.4, h, 6); ctx.fill();
    ctx.fillStyle = "#2f83b0";
    const ww = w * 0.15, wh = h * 0.18;
    roundRectP(ctx, x + w * 0.2, top + h * 0.32, ww, wh, 2); ctx.fill();
    roundRectP(ctx, x + w * 0.6, top + h * 0.32, ww, wh, 2); ctx.fill();
    if (i % 2) {
      ctx.fillStyle = "#3f7cac";
      roundRectP(ctx, x + w * 0.4, baseY - h * 0.4, w * 0.2, h * 0.4, 3); ctx.fill();
    } else {
      ctx.fillStyle = "#1b6f9c";
      ctx.beginPath(); ctx.arc(x + w * 0.5, top, w * 0.25, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = "#f4b942"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + w * 0.5, top - w * 0.25); ctx.lineTo(x + w * 0.5, top - w * 0.35); ctx.stroke();
    }
  }
}

function pavedGround(ctx, L, baseY, pal) {
  const g = ctx.createLinearGradient(0, baseY, 0, L.H);
  g.addColorStop(0, pal.gTop); g.addColorStop(1, pal.gBottom);
  ctx.fillStyle = g; ctx.fillRect(0, baseY, L.W, L.H - baseY);
  ctx.strokeStyle = "rgba(60,40,20,0.08)"; ctx.lineWidth = 2;
  for (let r = 0; r < 5; r++) {
    const y = baseY + (r + 1) * ((L.H - baseY) / 6);
    ctx.beginPath();
    for (let x = (r % 2) * 46; x < L.W; x += 92) { ctx.moveTo(x, y); ctx.lineTo(x + 42, y); }
    ctx.stroke();
  }
}

function townScene(ctx, L, t, pal, opts = {}) {
  skyBand(ctx, L, pal);
  if (opts.stars) H.stars(ctx, L.W, PY(L, 0.5), t);
  H.sun(ctx, pal.sun.x * L.W, PY(L, pal.sun.y), pal.sun.r * 1.1, pal.sun.c, pal.sun.g);
  H.clouds(ctx, L.W, PY(L, 0.4), t, opts.cloud || "rgba(255,255,255,0.9)");
  const baseY = PY(L, 0.66);
  H.sea(ctx, L.W, PY(L, 0.44), baseY, t, pal.seaTop, pal.seaBottom);
  bigHouses(ctx, L, baseY, opts.seed || 0);
  pavedGround(ctx, L, baseY, pal);
}

function beachScene(ctx, L, t, pal) {
  skyBand(ctx, L, pal);
  H.sun(ctx, pal.sun.x * L.W, PY(L, pal.sun.y), pal.sun.r * 1.2, pal.sun.c, pal.sun.g);
  H.clouds(ctx, L.W, PY(L, 0.32), t, "rgba(255,205,175,0.7)");
  const shore = PY(L, 0.62);
  H.sea(ctx, L.W, PY(L, 0.36), shore, t, pal.seaTop, pal.seaBottom);
  const g = ctx.createLinearGradient(0, shore - 6, 0, L.H);
  g.addColorStop(0, "#f4e2b2"); g.addColorStop(1, "#e4c684");
  ctx.fillStyle = g; ctx.fillRect(0, shore - 6, L.W, L.H - shore + 6);
}

/* ---- scene structures ------------------------------------------- */
function potPlant(ctx, x, baseY, s) {
  ctx.fillStyle = "#4f9d5a";
  for (const a of [-0.55, -0.18, 0.18, 0.55]) {
    ctx.save(); ctx.translate(x, baseY - s * 0.28); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, -s * 0.4, s * 0.11, s * 0.42, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.fillStyle = "#c96f4a";
  roundRectP(ctx, x - s * 0.3, baseY - s * 0.32, s * 0.6, s * 0.34, s * 0.06); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  roundRectP(ctx, x - s * 0.3, baseY - s * 0.1, s * 0.6, s * 0.12, s * 0.04); ctx.fill();
}

function shopFacade(ctx, L, cx, color, label, drawGoods) {
  const top = PY(L, 0.3), baseY = PY(L, 0.66), w = L.W * 0.52, h = baseY - top, x = cx - w / 2;
  ctx.fillStyle = "#fbf6ee"; roundRectP(ctx, x, top, w, h, 8); ctx.fill();
  ctx.fillStyle = "rgba(30,40,70,0.05)"; roundRectP(ctx, x + w * 0.7, top, w * 0.3, h, 8); ctx.fill();
  // sign
  ctx.fillStyle = color; roundRectP(ctx, x + w * 0.18, top + 3, w * 0.64, h * 0.14, 5); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = `700 ${Math.round(h * 0.1)}px "Segoe UI", sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(label, cx, top + 3 + h * 0.07); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  // awning
  const ay = top + h * 0.2, aH = h * 0.11, n = 8, sw = w / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? color : "#fff";
    ctx.beginPath();
    ctx.moveTo(x + i * sw, ay); ctx.lineTo(x + (i + 1) * sw, ay);
    ctx.lineTo(x + (i + 1) * sw, ay + aH); ctx.lineTo(x + i * sw + sw * 0.5, ay + aH * 1.5);
    ctx.lineTo(x + i * sw, ay + aH); ctx.closePath(); ctx.fill();
  }
  // window + door
  const wy = ay + aH * 1.7;
  ctx.fillStyle = "#bfe3f2"; roundRectP(ctx, x + w * 0.1, wy, w * 0.42, h * 0.46, 4); ctx.fill();
  ctx.strokeStyle = "#e8d3ba"; ctx.lineWidth = 4; ctx.strokeRect(x + w * 0.1, wy, w * 0.42, h * 0.46);
  ctx.fillStyle = "#9c6b3f"; roundRectP(ctx, x + w * 0.62, wy, w * 0.26, h * 0.58, 4); ctx.fill();
  ctx.fillStyle = "#f4c95d"; ctx.beginPath(); ctx.arc(x + w * 0.66, wy + h * 0.3, 3, 0, Math.PI * 2); ctx.fill();
  if (drawGoods) drawGoods(x + w * 0.1, wy, w * 0.42, h * 0.46);
}

function musicBox(ctx, cx, cy, s, opened) {
  ctx.fillStyle = opened ? "#caa24a" : "#8a4a6a";
  roundRectP(ctx, cx - s, cy - s * 0.5, s * 2, s, s * 0.16); ctx.fill();
  ctx.strokeStyle = "#f4c95d"; ctx.lineWidth = Math.max(2, s * 0.12);
  roundRectP(ctx, cx - s, cy - s * 0.5, s * 2, s, s * 0.16); ctx.stroke();
  if (opened) {
    ctx.save(); ctx.translate(cx - s, cy - s * 0.5); ctx.rotate(-0.5);
    ctx.fillStyle = "#a9843a"; roundRectP(ctx, 0, -s * 0.5, s * 2, s * 0.5, s * 0.12); ctx.fill(); ctx.restore();
    ctx.fillStyle = "#ffd36b"; ctx.font = `${s * 1.1}px serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("✨", cx, cy - s * 1.2); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  } else {
    ctx.fillStyle = "#f4c95d"; ctx.font = `${s * 0.8}px serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("♥", cx, cy + s * 0.02); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }
}

/* ---- characters ------------------------------------------------- */
function drawChar(ctx, L, who, fx, t, size = 0.4) {
  const feetY = PY(L, GROUND);
  const h = L.playH * size;
  const x = PX(L, fx);
  const def = Art.CHARS[people[who].char];
  Art.drawPerson(ctx, def, x, feetY, h, -1, t * 2.2, { blink: (t % 4) < 0.12 });
  bubble(ctx, x + h * 0.24, feetY - h - 6);
}
function drawDogChar(ctx, L, fx, t) {
  const feetY = PY(L, GROUND);
  const x = PX(L, fx);
  Art.drawDog(ctx, x, feetY, L.playH * 0.14, -1, t * 4);
  bubble(ctx, x + L.playH * 0.1, feetY - L.playH * 0.2);
}
function bubble(ctx, x, y) {
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.font = "14px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("💬", x, y + 1); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
}

function exitLeft(to) {
  return { id: "exitL", x: 0, y: 0.35, w: 0.16, h: 0.62, silent: true, arrow: "left",
    onTap(G) { G.goto(to); } };
}
function exitRight(to) {
  return { id: "exitR", x: 0.84, y: 0.35, w: 0.16, h: 0.62, silent: true, arrow: "right",
    onTap(G) { G.goto(to); } };
}

/* ================================================================== */
/*  SCENES + PUZZLES                                                  */
/* ================================================================== */
export const scenes = {
  /* ---------------- HOME (a cosy room) ---------------- */
  home: {
    name: "Home",
    onEnter(G) {
      G.say("husband",
        "Good morning, birthday girl. 💖",
        "I couldn't wait beside you this morning — so I left you a little journey instead.",
        "Follow our perfect day around town, gather what you need, and my gift will be waiting right here in the music box. I love you.");
    },
    bg(ctx, W, HH, groundY, t, G) {
      const L = G.layout;
      // wall
      const wallBot = PY(L, 0.68);
      const wg = ctx.createLinearGradient(0, 0, 0, wallBot);
      wg.addColorStop(0, "#f7e6d4"); wg.addColorStop(1, "#efd6c1");
      ctx.fillStyle = wg; ctx.fillRect(0, 0, L.W, wallBot);
      // wooden floor
      const fg = ctx.createLinearGradient(0, wallBot, 0, L.H);
      fg.addColorStop(0, "#c99a6a"); fg.addColorStop(1, "#a67a4d");
      ctx.fillStyle = fg; ctx.fillRect(0, wallBot, L.W, L.H - wallBot);
      ctx.strokeStyle = "rgba(60,40,20,0.12)"; ctx.lineWidth = 2;
      for (let i = 1; i < 5; i++) { const y = wallBot + i * ((L.H - wallBot) / 5); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(L.W, y); ctx.stroke(); }
      // rug
      ctx.fillStyle = "rgba(200,110,140,0.22)";
      ctx.beginPath(); ctx.ellipse(PX(L, 0.42), PY(L, 0.92), L.W * 0.3, L.playH * 0.05, 0, 0, Math.PI * 2); ctx.fill();
      // window with sea view (left)
      const wx = PX(L, 0.19), wy = PY(L, 0.16), ww = L.W * 0.26, wh = L.playH * 0.26;
      ctx.fillStyle = "#8ecae6"; roundRectP(ctx, wx - ww / 2, wy, ww, wh, 8); ctx.fill();
      ctx.fillStyle = "#2f88b8"; ctx.fillRect(wx - ww / 2, wy + wh * 0.6, ww, wh * 0.4);
      ctx.fillStyle = "#fff8d0"; ctx.beginPath(); ctx.arc(wx + ww * 0.2, wy + wh * 0.3, ww * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#e8d3ba"; ctx.lineWidth = 6; roundRectP(ctx, wx - ww / 2, wy, ww, wh, 8); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx, wy + wh); ctx.moveTo(wx - ww / 2, wy + wh / 2); ctx.lineTo(wx + ww / 2, wy + wh / 2); ctx.stroke();
      // framed heart (right)
      const px = PX(L, 0.74), py = PY(L, 0.2), pw = L.W * 0.14, ph = L.playH * 0.17;
      ctx.fillStyle = "#e8d3ba"; roundRectP(ctx, px - pw / 2, py, pw, ph, 4); ctx.fill();
      ctx.fillStyle = "#fff7ec"; roundRectP(ctx, px - pw / 2 + 6, py + 6, pw - 12, ph - 12, 3); ctx.fill();
      ctx.fillStyle = "#e5688b"; ctx.font = `${ph * 0.45}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("❤", px, py + ph / 2); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      // shelf
      ctx.fillStyle = "#a67a4d"; ctx.fillRect(PX(L, 0.5) - L.W * 0.15, PY(L, 0.6), L.W * 0.3, 8);
      ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(PX(L, 0.5) - L.W * 0.15, PY(L, 0.6) + 8, L.W * 0.3, 3);
      // plant
      potPlant(ctx, PX(L, 0.88), PY(L, 0.82), L.playH * 0.16);
    },
    props(ctx, W, HH, groundY, t, G) {
      const L = G.layout;
      if (!G.has("basket")) items.basket.draw(ctx, PX(L, 0.26), PY(L, 0.8), L.playH * 0.16);
      musicBox(ctx, PX(L, 0.5), PY(L, 0.53), L.playH * 0.07, G.flag("boxOpen"));
    },
    hotspots: [
      { id: "basket", x: 0.17, y: 0.71, w: 0.18, h: 0.2,
        visible: (G) => !G.has("basket"),
        onTap(G) { G.give("basket"); G.narrate("An empty wicker basket. Good for carrying things — a cake, maybe."); } },
      { id: "musicbox", x: 0.41, y: 0.44, w: 0.18, h: 0.18,
        onTap(G) {
          if (G.flag("boxOpen")) { checkFinale(G); return; }
          G.narrate("A little wooden music box, locked tight. There's a tiny keyhole.");
        },
        onUse: {
          key(G) {
            G.setFlag("boxOpen"); G.take("key"); G.sound.win?.();
            G.say(null, "The key turns with a soft click… the music box opens and a gentle tune begins to play. 🎶");
            G.onDialogueEnd((g) => checkFinale(g));
          },
        } },
      { id: "window", x: 0.06, y: 0.14, w: 0.26, h: 0.3, silent: true,
        look: "Through the window, the Greek sea sparkles. What a morning for a birthday." },
      exitRight("bakery"),
    ],
  },

  /* ---------------- BAKERY ---------------- */
  bakery: {
    name: "The Little Bakery",
    bg(ctx, W, HH, groundY, t, G) {
      const L = G.layout;
      townScene(ctx, L, t, PAL.morning, { seed: 1 });
      shopFacade(ctx, L, PX(L, 0.66), "#d9992f", "BAKERY", (gx, gy, gw, gh) => {
        // breads in the window
        const cols = ["#e0a95a", "#caa24a", "#d9992f"];
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = cols[i]; ctx.beginPath();
          ctx.ellipse(gx + gw * (0.25 + i * 0.25), gy + gh * 0.5, gw * 0.1, gh * 0.14, 0, 0, Math.PI * 2); ctx.fill();
        }
      });
      potPlant(ctx, PX(L, 0.44), PY(L, 0.82), L.playH * 0.14);
    },
    props(ctx, W, HH, groundY, t, G) { drawChar(ctx, G.layout, "mom", 0.28, t, 0.42); },
    hotspots: [
      { id: "mom", x: 0.14, y: 0.4, w: 0.28, h: 0.56,
        onTap(G) {
          if (G.flag("gotCake")) { G.say("mom", "Go on, my darling — everyone's waiting to celebrate you! 🎂"); return; }
          if (G.has("honey") && G.has("basket")) giveCake(G);
          else if (G.has("honey")) G.say("mom", "You brought the honey! But where will you carry the cake? Fetch a basket from home first, dear.");
          else G.say("mom",
            "There's my birthday girl! I'm baking your cake right now…",
            "…but I've run clean out of honey for the icing. Bring me a jar of honey from the market and it's all yours.");
        },
        onUse: {
          honey(G) {
            if (!G.has("basket")) { G.say("mom", "Wonderful honey! But bring a basket to carry the cake, dear."); return; }
            giveCake(G);
          },
          basket(G) { G.say("mom", "A basket — perfect for the cake! Now I just need that honey from the market."); },
        } },
      exitLeft("home"),
      exitRight("market"),
    ],
  },

  /* ---------------- MARKET ---------------- */
  market: {
    name: "The Market",
    bg(ctx, W, HH, groundY, t, G) {
      const L = G.layout;
      townScene(ctx, L, t, PAL.noon, { seed: 4 });
      // big striped market stall (left)
      const sx = PX(L, 0.35), top = PY(L, 0.4), w = L.W * 0.44, h = L.playH * 0.14, x = sx - w / 2;
      // posts
      ctx.fillStyle = "#8a5a2b"; ctx.fillRect(x, top, 6, PY(L, GROUND) - top); ctx.fillRect(x + w - 6, top, 6, PY(L, GROUND) - top);
      // awning
      const n = 7, sw = w / n;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i % 2 ? "#e5688b" : "#fff";
        ctx.beginPath(); ctx.moveTo(x + i * sw, top); ctx.lineTo(x + (i + 1) * sw, top);
        ctx.lineTo(x + (i + 1) * sw, top + h * 0.7); ctx.lineTo(x + i * sw + sw * 0.5, top + h);
        ctx.lineTo(x + i * sw, top + h * 0.7); ctx.closePath(); ctx.fill();
      }
      // counter with produce
      const cy = PY(L, 0.62);
      ctx.fillStyle = "#b07a3a"; roundRectP(ctx, x, cy, w, L.playH * 0.06, 4); ctx.fill();
      const veg = ["#e5688b", "#f4b942", "#8fae4d", "#c0392b", "#e07a3a"];
      for (let i = 0; i < 9; i++) H.circle(ctx, x + w * 0.08 + i * (w * 0.1), cy - 2, Math.max(5, L.playH * 0.012), veg[i % 5]);
    },
    props(ctx, W, HH, groundY, t, G) {
      const L = G.layout;
      drawChar(ctx, L, "dad", 0.7, t, 0.42);
      if (!G.has("bone")) {
        ctx.fillStyle = "#9c6b3f"; roundRectP(ctx, PX(L, 0.31) - L.playH * 0.06, PY(L, 0.8), L.playH * 0.12, L.playH * 0.06, 3); ctx.fill();
        items.bone.draw(ctx, PX(L, 0.31), PY(L, 0.79), L.playH * 0.11);
      }
    },
    hotspots: [
      { id: "dad", x: 0.56, y: 0.4, w: 0.28, h: 0.56,
        onTap(G) {
          if (G.flag("gotHoney")) { G.say("dad", "Ha! Best onions in Greece — and the best daughter, too. Off you go! 😄"); return; }
          if (G.has("glasses")) giveHoney(G);
          else G.say("dad",
            "There she is! Happy birthday, sweetheart.",
            "I'd hand you honey for the cake in a heartbeat — but I've lost my reading glasses and can't read my own price tags!",
            "Find them and the honey's yours. Last I had them… down at the café, I think.");
        },
        onUse: { glasses(G) { giveHoney(G); } } },
      { id: "bone", x: 0.22, y: 0.71, w: 0.18, h: 0.2,
        visible: (G) => !G.has("bone"),
        onTap(G) { G.give("bone"); G.narrate("A big meaty bone from the butcher's crate. Some good dog will love this."); } },
      exitLeft("bakery"),
      exitRight("cafe"),
    ],
  },

  /* ---------------- CAFÉ ---------------- */
  cafe: {
    name: "Seaside Café",
    bg(ctx, W, HH, groundY, t, G) {
      const L = G.layout;
      townScene(ctx, L, t, PAL.noon, { seed: 7 });
      potPlant(ctx, PX(L, 0.14), PY(L, 0.82), L.playH * 0.15);
      potPlant(ctx, PX(L, 0.86), PY(L, 0.82), L.playH * 0.15);
    },
    props(ctx, W, HH, groundY, t, G) {
      const L = G.layout;
      const x = PX(L, 0.4), baseY = PY(L, 0.88), topY = PY(L, 0.54);
      // umbrella
      ctx.fillStyle = "#e5688b";
      ctx.beginPath();
      ctx.moveTo(x, PY(L, 0.3)); ctx.lineTo(x - L.W * 0.16, PY(L, 0.44)); ctx.lineTo(x + L.W * 0.16, PY(L, 0.44));
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath(); ctx.moveTo(x, PY(L, 0.3)); ctx.lineTo(x - L.W * 0.055, PY(L, 0.44)); ctx.lineTo(x + L.W * 0.0, PY(L, 0.44)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = Math.max(3, L.playH * 0.008);
      ctx.beginPath(); ctx.moveTo(x, PY(L, 0.3)); ctx.lineTo(x, topY); ctx.stroke();
      // table
      ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = Math.max(4, L.playH * 0.012);
      ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x, topY); ctx.stroke();
      ctx.fillStyle = "#f0e9dc";
      ctx.beginPath(); ctx.ellipse(x, topY, L.W * 0.12, L.playH * 0.022, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.beginPath(); ctx.ellipse(x, topY + L.playH * 0.01, L.W * 0.12, L.playH * 0.012, 0, 0, Math.PI); ctx.fill();
      // fishbowl on the table
      const by = topY - L.playH * 0.04;
      ctx.fillStyle = "rgba(150,210,235,0.8)";
      ctx.beginPath(); ctx.arc(x, by, L.playH * 0.04, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 2; ctx.stroke();
      if (!G.flag("gotGlasses")) items.glasses.draw(ctx, x, by, L.playH * 0.06);
      if (!G.flag("tableSteady") && !G.flag("gotGlasses")) {
        const wob = Math.sin(t * 6) * 3;
        ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = "#fff";
        ctx.font = `${Math.round(L.playH * 0.03)}px sans-serif`; ctx.textAlign = "center";
        ctx.fillText("〜", x + L.W * 0.15 + wob, topY); ctx.restore(); ctx.textAlign = "left";
      }
      if (!G.has("coaster") && !G.flag("tableSteady")) items.coaster.draw(ctx, PX(L, 0.73), PY(L, 0.83), L.playH * 0.11);
    },
    hotspots: [
      { id: "coaster", x: 0.64, y: 0.74, w: 0.18, h: 0.18,
        visible: (G) => !G.has("coaster") && !G.flag("tableSteady"),
        onTap(G) { G.give("coaster"); G.narrate("A little cork coaster. Just the thing to steady a wobbly table."); } },
      { id: "table", x: 0.3, y: 0.42, w: 0.2, h: 0.5,
        onTap(G) {
          if (G.flag("gotGlasses")) { G.narrate("A charming little café table by the sea."); return; }
          if (G.flag("tableSteady")) {
            G.give("glasses"); G.setFlag("gotGlasses");
            G.narrate("With the table steady, you lift the glasses out of the fishbowl. Dad will be so glad!");
          } else {
            G.narrate("Dad's reading glasses have slipped into the fishbowl on the table! But the table wobbles — reach in now and you'll knock the whole bowl over.");
          }
        },
        onUse: {
          coaster(G) {
            if (G.flag("tableSteady")) { G.toast("The table is already steady."); return; }
            G.setFlag("tableSteady"); G.take("coaster");
            G.narrate("You wedge the coaster under the short leg. The table stops wobbling — now you can safely reach the glasses.");
          },
        } },
      exitLeft("market"),
      exitRight("beach"),
    ],
  },

  /* ---------------- BEACH ---------------- */
  beach: {
    name: "The Beach",
    bg(ctx, W, HH, groundY, t, G) {
      const L = G.layout;
      beachScene(ctx, L, t, PAL.sunset);
      // sandcastle
      ctx.fillStyle = "#dcc189"; roundRectP(ctx, PX(L, 0.1), PY(L, 0.78), L.W * 0.1, L.playH * 0.06, 3); ctx.fill();
      ctx.fillStyle = "#cbb078"; ctx.fillRect(PX(L, 0.11), PY(L, 0.74), 8, L.playH * 0.04); ctx.fillRect(PX(L, 0.17), PY(L, 0.74), 8, L.playH * 0.04);
      // beach umbrella (right)
      const ux = PX(L, 0.8), uy = PY(L, 0.5);
      ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(ux, PY(L, GROUND)); ctx.stroke();
      ctx.fillStyle = "#e5688b"; ctx.beginPath(); ctx.arc(ux, uy, L.W * 0.13, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ux - L.W * 0.06, uy, L.W * 0.03, Math.PI, 0); ctx.arc(ux + L.W * 0.06, uy, L.W * 0.03, Math.PI, 0); ctx.fill();
    },
    props(ctx, W, HH, groundY, t, G) {
      const L = G.layout;
      drawDogChar(ctx, L, 0.66, t);
      if (!G.flag("dugKey")) {
        ctx.fillStyle = "#d3b06f";
        ctx.beginPath(); ctx.ellipse(PX(L, 0.45), PY(L, 0.86), L.W * 0.055, L.playH * 0.022, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#bd9a55"; ctx.fillRect(PX(L, 0.45) - 2, PY(L, 0.82), 4, L.playH * 0.035);
      } else if (!G.has("key")) {
        items.key.draw(ctx, PX(L, 0.45), PY(L, 0.82), L.playH * 0.1);
      }
    },
    hotspots: [
      { id: "dog", x: 0.55, y: 0.45, w: 0.24, h: 0.5,
        onTap(G) {
          if (G.flag("dugKey")) { G.say("dog", `${STRINGS.dog} flops down happily, tail thumping the sand. 🐕`); return; }
          G.say("dog",
            `${STRINGS.dog} bounds up, tail going like mad! 🐕`,
            `He keeps pawing at a little mound in the sand and looking at you — like he's guarding a secret. Maybe a treat would win him over?`);
        },
        onUse: {
          bone(G) {
            G.take("bone"); G.setFlag("dugKey");
            G.say("dog",
              `${STRINGS.dog} snatches the bone, delighted!`,
              "Then he digs furiously at the mound and proudly unearths… a tiny golden key! He drops it at your feet.");
          },
        } },
      { id: "mound", x: 0.36, y: 0.75, w: 0.18, h: 0.17,
        onTap(G) {
          if (!G.flag("dugKey")) { G.narrate(`A little mound of patted-down sand. ${STRINGS.dog} won't let you dig here — but he might, for a treat.`); return; }
          if (!G.has("key")) { G.give("key"); G.narrate("You pick up the little golden key. Just the size for a music box…"); }
        },
        onUse: { bone(G) { G.toast(`Give the bone to ${STRINGS.dog}, not the sand!`); } } },
      exitLeft("cafe"),
    ],
  },

  /* ---------------- PARTY (finale) ---------------- */
  party: {
    name: "Happy Birthday",
    bg(ctx, W, HH, groundY, t, G) {
      const L = G.layout;
      townScene(ctx, L, t, PAL.night, { stars: true, cloud: "rgba(180,190,220,0.3)", seed: 2 });
      // bunting
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, PY(L, 0.14)); ctx.quadraticCurveTo(L.W / 2, PY(L, 0.22), L.W, PY(L, 0.14)); ctx.stroke();
      const flags = ["#ffd36b", "#e5688b", "#7ec8e3", "#8fae4d"];
      for (let i = 0; i < 10; i++) {
        const fx = (i + 0.5) * (L.W / 10);
        const fy = PY(L, 0.14) + Math.sin((fx / L.W) * Math.PI) * L.playH * 0.06;
        ctx.fillStyle = flags[i % 4];
        ctx.beginPath(); ctx.moveTo(fx - 8, fy); ctx.lineTo(fx + 8, fy); ctx.lineTo(fx, fy + 16); ctx.closePath(); ctx.fill();
      }
    },
    props(ctx, W, HH, groundY, t, G) {
      const L = G.layout, feet = PY(L, GROUND), h = L.playH * 0.38;
      Art.drawPerson(ctx, Art.CHARS.mom,   PX(L, 0.2),  feet, h * 0.95, 1, 0, { blink: (t % 4) < 0.12 });
      Art.drawPerson(ctx, Art.CHARS.dad,   PX(L, 0.34), feet, h, 1, 0, { blink: (t % 3.3) < 0.12 });
      Art.drawPerson(ctx, Art.CHARS.kate,  PX(L, 0.55), feet, h * 1.02, -1, 0, { blink: (t % 3.7) < 0.12 });
      Art.drawPerson(ctx, Art.CHARS.lesha, PX(L, 0.69), feet, h, -1, 0, { blink: (t % 4.3) < 0.12 });
      Art.drawDog(ctx, PX(L, 0.83), feet, L.playH * 0.11, -1, t * 3);
      items.cake.draw(ctx, PX(L, 0.45), PY(L, 0.66), L.playH * 0.17);
      fireworks(ctx, L, t);
    },
    hotspots: [],
  },
};

/* ---- shared puzzle outcomes ---- */
function giveCake(G) {
  G.say("mom",
    "Honey — perfect! Now the icing will be just right.",
    "There… your favourite cake, still warm. Carry it home safely in the basket.",
    "Happy birthday, my treasure. 💖");
  G.take("honey"); G.give("cake"); G.setFlag("gotCake");
}
function giveHoney(G) {
  G.say("dad",
    "My glasses! Bless you — I've been squinting all morning.",
    "A deal's a deal: here's the finest jar of honey in the market. For your mother's cake, I'd wager? 😉");
  G.take("glasses"); G.give("honey"); G.setFlag("gotHoney");
}

/* finale: need the cake AND the opened music box */
function checkFinale(G) {
  if (!G.flag("boxOpen")) return;
  if (!G.has("cake")) {
    G.say("husband", "The music box is open… but a birthday isn't complete without cake. Bring Mom's cake home, my love. 🎂");
    return;
  }
  if (G.flag("won")) { G.goto("party"); return; }
  G.setFlag("won");
  G.say("husband",
    "Inside the music box is a note in my handwriting:",
    `"${STRINGS.kate}, you found your way through our whole beautiful day — just like you found your way into my whole life."`,
    "Now turn around…",
    "Everyone's here. Happy birthday, my love. 💖🎂");
  G.onDialogueEnd((g) => { g.goto("party"); g.sound.win?.(); });
}

/* firework particles for the finale (deterministic, no RNG) */
function fireworks(ctx, L, t) {
  const cols = ["#ffd36b", "#e5688b", "#7ec8e3", "#8fae4d"];
  for (let b = 0; b < 4; b++) {
    const life = (t * 0.5 + b * 0.7) % 2;
    const cx = L.W * (0.2 + 0.2 * b), cy = PY(L, 0.12 + 0.06 * (b % 2)), R = life * L.playH * 0.14;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - life / 2);
    ctx.fillStyle = cols[b % 4];
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12;
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

/* ================================================================== */
/*  The game definition handed to the engine                          */
/* ================================================================== */
export const game = {
  title: "Kate's Greek Adventure",
  start: "home",
  strings: STRINGS,
  people,
  items,
  scenes,
  onWin(G) { G.goto("party"); },
};
