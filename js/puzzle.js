// puzzle.js — Level 2: "The Rescue of Marshall".
// A Sokoban-style grid puzzle: Kate threads the dog-napper's alley maze, pushes
// crates aside, collects keys, steps on paw-plates to open gates, and frees Marshall.
//
// As with the platformer, the rules live in a pure `createPuzzle()` (no DOM) so the
// levels can be machine-verified solvable; `startPuzzle()` wraps it with render+input.
import { Art } from "./art.js";
import { Sound } from "./audio.js";

/* Level legend (ASCII rows):
   #  wall            (space) floor        @  Kate start
   $  crate           *  paw-plate         +  key
   D  gate (locked until every plate has a crate)
   M  Marshall's cage (reach it — with a key if the level has any — to win)   */
export const PUZZLES = [
  {
    name: "Закоулок",
    hint: "Пройди по закоулку, возьми ключ 🔑 и доберись до Маршалла.",
    rows: [
      "#########",
      "#@  #   #",
      "# # # # #",
      "# # # # #",
      "# #   # #",
      "# ##### #",
      "#+     M#",
      "#########",
    ],
  },
  {
    name: "Замок и ключ",
    hint: "Толкни ящик 📦 на плиту-лапку 🐾, чтобы открыть ворота — и возьми ключ 🔑!",
    rows: [
      "#########",
      "#@ +#M  #",
      "#   D   #",
      "### #####",
      "#       #",
      "# $   * #",
      "#       #",
      "#########",
    ],
  },
  {
    name: "Логово похитителя",
    hint: "Оба ящика 📦 на плиты-лапки 🐾 И возьми ключ 🔑 — последнее спасение!",
    rows: [
      "#########",
      "#@  #M  #",
      "#   D   #",
      "#   #####",
      "# $   $ #",
      "# *   * #",
      "#   +   #",
      "#########",
    ],
  },
];

export function createPuzzle(def) {
  const rows = def.rows;
  const H = rows.length,
    W = Math.max(...rows.map((r) => r.length));
  const wall = [],
    plate = [],
    ice = [];
  let kate = null,
    marshall = null,
    gate = null;
  let crates = new Set(),
    keys = new Set(),
    pits = new Set();
  const cell = (r, c) => r * W + c;
  const rc = (id) => [Math.floor(id / W), id % W];

  for (let r = 0; r < H; r++) {
    wall.push([]);
    plate.push([]);
    ice.push([]);
    for (let c = 0; c < W; c++) {
      const ch = rows[r][c] || " ";
      wall[r][c] = ch === "#";
      plate[r][c] = ch === "*";
      ice[r][c] = ch === "I"; // ice: Kate slides across it
      if (ch === "@") kate = { r, c };
      else if (ch === "M") marshall = { r, c };
      else if (ch === "D") gate = { r, c };
      else if (ch === "$") crates.add(cell(r, c));
      else if (ch === "+") keys.add(cell(r, c));
      else if (ch === "O") pits.add(cell(r, c)); // pit: fill with a crate to cross
    }
  }
  const plateCells = [];
  for (let r = 0; r < H; r++)
    for (let c = 0; c < W; c++) if (plate[r][c]) plateCells.push(cell(r, c));
  const totalKeys = keys.size;

  let keysHeld = 0,
    won = false,
    moves = 0;
  const start = {
    kr: kate.r,
    kc: kate.c,
    crates: new Set(crates),
    keys: new Set(keys),
    pits: new Set(pits),
  };
  const history = [];

  const inBounds = (r, c) => r >= 0 && r < H && c >= 0 && c < W;
  const gateOpen = () =>
    plateCells.length > 0 && plateCells.every((id) => crates.has(id));
  const isGate = (r, c) => gate && gate.r === r && gate.c === c;
  const isIce = (r, c) => inBounds(r, c) && ice[r][c];
  // a cell blocks Kate/crate if it's a wall, a shut gate, or an open pit
  function blocked(r, c) {
    if (!inBounds(r, c) || wall[r][c]) return true;
    if (isGate(r, c) && !gateOpen()) return true;
    if (pits.has(cell(r, c))) return true;
    return false;
  }
  function collectAt(r, c) {
    const id = cell(r, c);
    if (keys.has(id)) {
      keys.delete(id);
      keysHeld++;
    }
  }

  function move(dr, dc) {
    if (won) return false;
    const nr = kate.r + dr,
      nc = kate.c + dc;
    if (!inBounds(nr, nc) || wall[nr][nc] || (isGate(nr, nc) && !gateOpen()))
      return false;
    const target = cell(nr, nc);
    const snap = {
      kr: kate.r,
      kc: kate.c,
      crates: new Set(crates),
      keys: new Set(keys),
      pits: new Set(pits),
      keysHeld,
    };

    if (crates.has(target)) {
      // --- pushing a crate ---
      const br = nr + dr,
        bc = nc + dc,
        beyond = cell(br, bc);
      if (inBounds(br, bc) && pits.has(beyond)) {
        // shove it into a pit → fills it, both vanish
        crates.delete(target);
        pits.delete(beyond);
        kate = { r: nr, c: nc };
        collectAt(nr, nc);
      } else if (
        blocked(br, bc) ||
        crates.has(beyond) ||
        (marshall.r === br && marshall.c === bc)
      ) {
        return false;
      } else {
        crates.delete(target);
        crates.add(beyond);
        kate = { r: nr, c: nc };
        collectAt(nr, nc);
      }
      history.push(snap);
      moves++;
      return true; // a push never triggers a slide
    }
    if (pits.has(target)) return false; // can't walk into an open pit
    if (marshall.r === nr && marshall.c === nc) {
      // reach Marshall (needs a key if any exist)
      if (totalKeys > 0 && keysHeld < 1) return false;
      kate = { r: nr, c: nc };
      won = true;
      history.push(snap);
      moves++;
      return true;
    }
    kate = { r: nr, c: nc };
    collectAt(nr, nc);
    if (ice[nr][nc]) slide(dr, dc); // stepped onto ice → keep sliding
    history.push(snap);
    moves++;
    return true;
  }

  function slide(dr, dc) {
    while (ice[kate.r][kate.c]) {
      const nr = kate.r + dr,
        nc = kate.c + dc,
        t = cell(nr, nc);
      if (marshall.r === nr && marshall.c === nc) {
        if (totalKeys > 0 && keysHeld < 1) return; // locked cage — stop just short
        kate = { r: nr, c: nc };
        won = true;
        return;
      }
      if (blocked(nr, nc) || crates.has(t)) return; // wall/gate/pit/crate stops the slide
      kate = { r: nr, c: nc };
      collectAt(nr, nc);
      if (!ice[nr][nc]) return; // slid onto solid ground → stop
    }
  }

  function undo() {
    const s = history.pop();
    if (!s) return false;
    kate = { r: s.kr, c: s.kc };
    crates = s.crates;
    keys = s.keys;
    pits = s.pits;
    keysHeld = s.keysHeld;
    won = false;
    moves++;
    return true;
  }
  function reset() {
    kate = { r: start.kr, c: start.kc };
    crates = new Set(start.crates);
    keys = new Set(start.keys);
    pits = new Set(start.pits);
    keysHeld = 0;
    won = false;
    moves = 0;
    history.length = 0;
  }

  return {
    W,
    H,
    name: def.name,
    hint: def.hint,
    isWall: (r, c) => wall[r][c],
    isPlate: (r, c) => plate[r][c],
    isGate,
    isIce,
    isPit: (r, c) => pits.has(cell(r, c)),
    get gate() {
      return gate;
    },
    get marshall() {
      return marshall;
    },
    get kate() {
      return kate;
    },
    get crates() {
      return crates;
    },
    get keys() {
      return keys;
    },
    get pits() {
      return pits;
    },
    get keysHeld() {
      return keysHeld;
    },
    get totalKeys() {
      return totalKeys;
    },
    get plateCells() {
      return plateCells;
    },
    gateOpen,
    cell,
    rc,
    get won() {
      return won;
    },
    get moves() {
      return moves;
    },
    move,
    undo,
    reset,
    key() {
      return (
        kate.r +
        "," +
        kate.c +
        "|" +
        [...crates].sort((a, b) => a - b).join(",") +
        "|" +
        [...pits].sort((a, b) => a - b).join(",") +
        "|" +
        keysHeld
      );
    },
  };
}

/* ================================================================== */
/*  DOM wrapper: render, input, story → puzzles → victory flow        */
/* ================================================================== */
const STORY = [
  "Эта воровка-ПТИЦА —",
  "похитительница собак старого города!",
  "",
  "Она унесла Маршалла в",
  "запутанный лабиринт закоулков.",
  "",
  "Проведи Кейт через лабиринт —",
  "толкай ящики, ищи ключи и",
  "верни Маршалла домой целым. 🐾",
];

export function startPuzzle(onExit, opts = {}) {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const H = Art.helpers;
  let W = 0,
    HH = 0,
    dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = window.innerWidth;
    HH = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(HH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  let idx = 0,
    sim = createPuzzle(PUZZLES[0]);
  let screen = "cutscene",
    t = 0,
    csT = 0,
    vicT = 0,
    clearedT = 0,
    kateFace = 1,
    katePhase = 0,
    shakeT = 0;
  // dev/skip: jump straight to a given alley (1-based), past the cutscene + story
  if (opts.startAlley) {
    const a = Math.min(PUZZLES.length, Math.max(1, opts.startAlley)) - 1;
    loadLevel(a);
    screen = "play";
  }
  let btns = [];
  let running = true,
    last = 0,
    pStart = null;

  function loadLevel(i) {
    idx = i;
    sim = createPuzzle(PUZZLES[i]);
    kateFace = 1;
    katePhase = 0;
  }

  function doMove(dr, dc) {
    if (screen !== "play" || sim.won) return;
    if (dc !== 0) kateFace = dc > 0 ? 1 : -1;
    const before = sim.keysHeld,
      gwas = sim.gateOpen();
    if (sim.move(dr, dc)) {
      katePhase += 1;
      Sound.step?.();
      if (sim.keysHeld > before) Sound.pickup?.();
      if (!gwas && sim.gateOpen()) Sound.happy?.();
      if (sim.won) {
        Sound.win?.();
        clearedT = 0;
        vicT = 0;
        screen = idx >= PUZZLES.length - 1 ? "victory" : "cleared";
      }
    } else {
      shakeT = 0.18;
      Sound.pop?.();
    }
  }

  function advance() {
    if (screen === "cutscene") screen = "story";
    else if (screen === "story") screen = "play";
    else if (screen === "victory") {
      cleanup();
      onExit && onExit();
    }
  }
  function cleanup() {
    running = false;
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", resize);
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointerup", onUp);
  }

  const onKey = (e) => {
    if (screen === "cutscene" || screen === "story" || screen === "victory") {
      if (e.key === " " || e.key === "Enter") advance();
      return;
    }
    if (screen !== "play") return;
    const k = e.key;
    if (k === "ArrowUp" || k === "w") doMove(-1, 0);
    else if (k === "ArrowDown" || k === "s") doMove(1, 0);
    else if (k === "ArrowLeft" || k === "a") doMove(0, -1);
    else if (k === "ArrowRight" || k === "d") doMove(0, 1);
    else if (k === "z" || k === "Backspace") sim.undo();
    else if (k === "r") sim.reset();
  };
  window.addEventListener("keydown", onKey);

  const onDown = (e) => {
    const x = e.clientX,
      y = e.clientY;
    if (screen === "cutscene" || screen === "story" || screen === "victory") {
      advance();
      return;
    }
    if (screen !== "play") return;
    for (const b of btns)
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        b.act();
        return;
      }
    pStart = { x, y };
  };
  const onUp = (e) => {
    if (!pStart) return;
    const dx = e.clientX - pStart.x,
      dy = e.clientY - pStart.y;
    pStart = null;
    if (Math.hypot(dx, dy) < 26) return;
    if (Math.abs(dx) > Math.abs(dy)) doMove(0, dx > 0 ? 1 : -1);
    else doMove(dy > 0 ? 1 : -1, 0);
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);

  /* ---------------- drawing ---------------- */
  function rrFill(x, y, w, h, r, col) {
    ctx.fillStyle = col;
    H.rr(ctx, x, y, w, h, r);
    ctx.fill();
  }
  function drawFloor(x, y, s) {
    ctx.fillStyle = "#e7d7b4";
    ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = "rgba(150,120,80,0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
  }
  function drawWall(x, y, s) {
    ctx.fillStyle = "#8a7d94";
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = "#9a8da4";
    ctx.fillRect(x, y, s, s * 0.16);
    ctx.strokeStyle = "#6f6379";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.5);
    ctx.lineTo(x + s, y + s * 0.5);
    ctx.moveTo(x + s * 0.5, y);
    ctx.lineTo(x + s * 0.5, y + s * 0.5);
    ctx.moveTo(x + s * 0.25, y + s * 0.5);
    ctx.lineTo(x + s * 0.25, y + s);
    ctx.moveTo(x + s * 0.75, y + s * 0.5);
    ctx.lineTo(x + s * 0.75, y + s);
    ctx.stroke();
  }
  function drawIce(x, y, s) {
    ctx.fillStyle = "#bfe6f0";
    ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + s * 0.22, y + s * 0.18);
    ctx.lineTo(x + s * 0.52, y + s * 0.18);
    ctx.moveTo(x + s * 0.16, y + s * 0.42);
    ctx.lineTo(x + s * 0.34, y + s * 0.42);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.strokeStyle = "rgba(130,185,205,0.4)";
    ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
  }
  function drawPit(x, y, s) {
    ctx.fillStyle = "#2a2436";
    ctx.beginPath();
    ctx.ellipse(x + s / 2, y + s / 2, s * 0.4, s * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#14101d";
    ctx.beginPath();
    ctx.ellipse(x + s / 2, y + s * 0.56, s * 0.3, s * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawPlate(x, y, s, covered) {
    const cx = x + s / 2,
      cy = y + s / 2,
      col = covered ? "#7cc47a" : "#b9a67e";
    ctx.save();
    ctx.globalAlpha = covered ? 0.9 : 0.5;
    H.circle(ctx, cx, cy + s * 0.06, s * 0.16, col);
    for (let i = -1; i <= 1; i++)
      H.circle(ctx, cx + i * s * 0.12, cy - s * 0.12, s * 0.05, col);
    ctx.restore();
    if (covered) {
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t * 6);
      H.circle(ctx, cx, cy, s * 0.34, "rgba(150,230,150,0.5)");
      ctx.globalAlpha = 1;
    }
  }
  function drawGate(x, y, s, open) {
    if (open) ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#5a4a3a";
    ctx.fillRect(x + s * 0.08, y, s * 0.84, s * 0.1);
    ctx.fillStyle = "#8a6a44";
    for (let i = 0; i < 4; i++)
      ctx.fillRect(
        x + s * 0.12 + i * s * 0.24,
        y + s * 0.08,
        s * 0.07,
        s * 0.9,
      );
    ctx.globalAlpha = 1;
  }
  function drawKey(cx, cy, s) {
    const bob = Math.sin(t * 3 + cx) * 2;
    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 5);
    H.circle(ctx, 0, 0, s * 0.26, "rgba(255,220,120,0.5)");
    ctx.globalAlpha = 1;
    ctx.font = Math.round(s * 0.5) + "px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🔑", 0, 1);
    ctx.restore();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  function drawCrate(x, y, s, onPlate) {
    const p = s * 0.12;
    rrFill(
      x + p,
      y + p,
      s - 2 * p,
      s - 2 * p,
      4,
      onPlate ? "#c98f5a" : "#b8834f",
    );
    ctx.strokeStyle = "#8a5f36";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + p, y + p, s - 2 * p, s - 2 * p);
    ctx.beginPath();
    ctx.moveTo(x + p, y + p);
    ctx.lineTo(x + s - p, y + s - p);
    ctx.moveTo(x + s - p, y + p);
    ctx.lineTo(x + p, y + s - p);
    ctx.stroke();
  }
  function drawMarshall(x, y, s, freed) {
    if (freed) {
      // rescued — the full happy dog appears
      Art.drawDog(ctx, x + s / 2, y + s * 0.82, s * 0.62, -1, t * 6);
      return;
    }
    // captured: a covered cage with Marshall's eyes peeking from the dark inside
    const cx = x + s / 2;
    const bw = s * 0.72,
      bh = s * 0.66,
      bx = x + (s - bw) / 2,
      by = y + s * 0.26;
    ctx.fillStyle = "#241f1a";
    H.rr(ctx, bx, by, bw, bh, s * 0.07);
    ctx.fill(); // dark cage interior
    ctx.fillStyle = "#8a6a42";
    H.rr(ctx, bx - s * 0.05, by - s * 0.09, bw + s * 0.1, s * 0.16, s * 0.06);
    ctx.fill(); // cloth cover on top
    // two glowing eyes peeking out
    const ey = by + bh * 0.52,
      eo = s * 0.11;
    H.circle(ctx, cx - eo, ey, s * 0.055, "#ffe08a");
    H.circle(ctx, cx + eo, ey, s * 0.055, "#ffe08a");
    H.circle(ctx, cx - eo, ey, s * 0.024, "#2b2440");
    H.circle(ctx, cx + eo, ey, s * 0.024, "#2b2440");
    // bars
    ctx.strokeStyle = "#5a4d3e";
    ctx.lineWidth = Math.max(2, s * 0.045);
    for (let i = 0; i <= 3; i++) {
      const bxx = bx + bw * (i / 3);
      ctx.beginPath();
      ctx.moveTo(bxx, by);
      ctx.lineTo(bxx, by + bh);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bw, by);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, by + bh);
    ctx.lineTo(bx + bw, by + bh);
    ctx.stroke();
  }
  function drawKate(x, y, s) {
    Art.drawPerson(
      ctx,
      Art.CHARS.kate,
      x + s / 2,
      y + s * 0.9,
      s * 1.05,
      kateFace,
      katePhase * 0.5,
      { blink: t % 4 < 0.12 },
    );
  }
  function circleBtn(cx, cy, r, label, act, hot) {
    ctx.fillStyle = hot ? "rgba(229,104,139,0.9)" : "rgba(40,50,75,0.55)";
    H.circle(ctx, cx, cy, r, ctx.fillStyle);
    ctx.fillStyle = "#fff";
    ctx.font = Math.round(r * 0.95) + "px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, cx, cy + 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    btns.push({ x: cx - r, y: cy - r, w: r * 2, h: r * 2, act });
  }
  function drawControls(botH) {
    btns = [];
    const baseY = HH - botH / 2,
      r = Math.min(botH * 0.24, 42),
      gap = r * 2.1,
      dpX = W * 0.27;
    circleBtn(dpX, baseY - gap, r, "▲", () => doMove(-1, 0));
    circleBtn(dpX, baseY + gap, r, "▼", () => doMove(1, 0));
    circleBtn(dpX - gap, baseY, r, "◀", () => doMove(0, -1));
    circleBtn(dpX + gap, baseY, r, "▶", () => doMove(0, 1));
    circleBtn(W * 0.75, baseY - r * 0.7, r * 0.86, "↶", () => sim.undo());
    circleBtn(W * 0.75, baseY + r * 1.1, r * 0.86, "⟲", () => sim.reset());
  }
  // draw centered text, shrinking the font so it always fits within maxW
  function fitText(text, cx, cy, weight, basePx, maxW, minPx) {
    let px = basePx;
    do {
      ctx.font = weight + " " + px + "px 'Segoe UI', system-ui, sans-serif";
      if (ctx.measureText(text).width <= maxW) break;
      px -= 1;
    } while (px > minPx);
    ctx.fillText(text, cx, cy);
  }
  function drawPuzzleHUD() {
    ctx.fillStyle = "rgba(20,30,55,0.4)";
    ctx.fillRect(0, 0, W, 58);
    const maxW = W - 24;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(
      "Закоулок " + (idx + 1) + "/" + PUZZLES.length + " — " + sim.name,
      W / 2,
      20,
      "700",
      18,
      maxW,
      12,
    );
    ctx.fillStyle = "#ffe08a";
    fitText(sim.hint, W / 2, 42, "500", 13, maxW, 9);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  function renderPuzzle() {
    const g = ctx.createLinearGradient(0, 0, 0, HH);
    g.addColorStop(0, "#3a5a78");
    g.addColorStop(1, "#243a52");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HH);
    const topH = 58,
      botH = Math.min(200, HH * 0.3),
      margin = 14,
      areaH = HH - topH - botH;
    const tile = Math.max(
      24,
      Math.min((W - 2 * margin) / sim.W, (areaH - 2 * margin) / sim.H),
    );
    const gw = tile * sim.W,
      gh = tile * sim.H;
    const ox = (W - gw) / 2 + (shakeT > 0 ? Math.sin(t * 70) * 3 : 0),
      oy = topH + (areaH - gh) / 2;
    rrFill(ox - 8, oy - 8, gw + 16, gh + 16, 10, "rgba(0,0,0,0.25)");
    for (let r = 0; r < sim.H; r++)
      for (let c = 0; c < sim.W; c++) {
        const x = ox + c * tile,
          y = oy + r * tile;
        if (sim.isWall(r, c)) drawWall(x, y, tile);
        else if (sim.isPit(r, c)) {
          drawFloor(x, y, tile);
          drawPit(x, y, tile);
        } else if (sim.isIce(r, c)) drawIce(x, y, tile);
        else {
          drawFloor(x, y, tile);
          if (sim.isPlate(r, c))
            drawPlate(x, y, tile, sim.crates.has(sim.cell(r, c)));
        }
      }
    if (sim.gate)
      drawGate(
        ox + sim.gate.c * tile,
        oy + sim.gate.r * tile,
        tile,
        sim.gateOpen(),
      );
    for (const id of sim.keys) {
      const [r, c] = sim.rc(id);
      drawKey(ox + c * tile + tile / 2, oy + r * tile + tile / 2, tile);
    }
    for (const id of sim.crates) {
      const [r, c] = sim.rc(id);
      drawCrate(ox + c * tile, oy + r * tile, tile, sim.isPlate(r, c));
    }
    drawMarshall(
      ox + sim.marshall.c * tile,
      oy + sim.marshall.r * tile,
      tile,
      sim.won,
    );
    drawKate(ox + sim.kate.c * tile, oy + sim.kate.r * tile, tile);
    drawPuzzleHUD();
    drawControls(botH);
  }
  function wrap(lines, x, y, lh, font, col) {
    ctx.font = font;
    ctx.fillStyle = col;
    ctx.textAlign = "center";
    let yy = y;
    for (const ln of lines) {
      ctx.fillText(ln, x, yy);
      yy += lh;
    }
    ctx.textAlign = "left";
    return yy;
  }
  /* ---- the "bird grabs Marshall" cutscene (plays before the story) ---- */
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const ease = (u) => u * u * (3 - 2 * u);
  function drawBird(x, y, s, flap, carrying, dir) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#5a5560"; // wings
    const wy = -flap * s * 0.28;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-s * 0.75, wy - s * 0.12, -s * 1.05, wy + s * 0.18);
    ctx.quadraticCurveTo(-s * 0.5, s * 0.12, 0, s * 0.14);
    ctx.quadraticCurveTo(s * 0.5, s * 0.12, s * 1.05, wy + s * 0.18);
    ctx.quadraticCurveTo(s * 0.75, wy - s * 0.12, 0, 0);
    ctx.fill();
    ctx.fillStyle = "#6b6570"; // body
    ctx.beginPath();
    ctx.ellipse(0, s * 0.06, s * 0.28, s * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    H.circle(ctx, dir * s * 0.18, -s * 0.18, s * 0.16, "#6b6570"); // head
    ctx.fillStyle = "#f4a83a"; // beak
    ctx.beginPath();
    ctx.moveTo(dir * s * 0.3, -s * 0.2);
    ctx.lineTo(dir * s * 0.55, -s * 0.16);
    ctx.lineTo(dir * s * 0.3, -s * 0.09);
    ctx.closePath();
    ctx.fill();
    H.circle(ctx, dir * s * 0.2, -s * 0.22, s * 0.05, "#fff"); // angry eye
    H.circle(ctx, dir * s * 0.22, -s * 0.22, s * 0.025, "#111");
    if (carrying) {
      // talons gripping down
      ctx.strokeStyle = "#f4a83a";
      ctx.lineWidth = s * 0.05;
      ctx.lineCap = "round";
      for (const tx of [-s * 0.12, s * 0.12]) {
        ctx.beginPath();
        ctx.moveTo(tx, s * 0.32);
        ctx.lineTo(tx, s * 0.52);
        ctx.stroke();
      }
      ctx.lineCap = "butt";
    }
    ctx.restore();
  }
  function renderCutscene() {
    const g = ctx.createLinearGradient(0, 0, 0, HH);
    g.addColorStop(0, "#8fd0ec");
    g.addColorStop(0.6, "#c4e6f3");
    g.addColorStop(1, "#eaf6ef");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HH);
    if (H.sun)
      H.sun(ctx, W * 0.8, HH * 0.16, 28, "#fff8d0", "rgba(255,248,190,0.9)");
    const groundY = HH * 0.7;
    if (H.greekHouses) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      H.greekHouses(ctx, W * 1.4, groundY - 66, 0.8, t);
      ctx.restore();
    }
    ctx.fillStyle = "#e7d7b4";
    ctx.fillRect(0, groundY, W, HH - groundY);
    ctx.fillStyle = "#d0b884";
    ctx.fillRect(0, groundY, W, 6);

    const kx = W * 0.33,
      mx0 = W * 0.5;
    const approach = clamp01((csT - 0.5) / 1.5),
      carry = clamp01((csT - 2.0) / 2.6),
      grabbed = csT >= 2.0;
    const bx = grabbed
      ? lerp(mx0, W * 1.35, ease(carry))
      : lerp(W * 1.15, mx0, ease(approach));
    const by = grabbed
      ? lerp(groundY - 64, -HH * 0.3, ease(carry))
      : lerp(HH * 0.02, groundY - 64, ease(approach));

    Art.drawPerson(ctx, Art.CHARS.kate, kx, groundY, 120, 1, 0, {
      blink: t % 3 < 0.12,
    });
    if (grabbed)
      Art.drawDog(ctx, bx, by + 60, 50, -1, t * 9); // dangling, legs flailing
    else Art.drawDog(ctx, mx0, groundY, 50, -1, csT * 3);
    drawBird(bx, by, 68, Math.sin(t * 14), grabbed, 1);
    if (csT > 2.1) {
      // Kate's shocked "!"
      ctx.fillStyle = "#e5688b";
      ctx.font = "800 42px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("!", kx, groundY - 132);
    }
    // caption
    const cap =
      csT < 2.0
        ? "Спокойная вечерняя прогулка…"
        : "Похитительница нападает — Маршалл!!";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "600 18px 'Segoe UI', system-ui, sans-serif";
    const cw = ctx.measureText(cap).width + 32;
    ctx.fillStyle = "rgba(20,30,55,0.6)";
    H.rr(ctx, W / 2 - cw / 2, HH * 0.85, cw, 40, 12);
    ctx.fill();
    ctx.fillStyle = csT < 2.0 ? "#fff" : "#ffd36b";
    ctx.fillText(cap, W / 2, HH * 0.85 + 21);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "500 13px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("нажми, чтобы пропустить", W / 2, HH * 0.94);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  function renderStory() {
    const g = ctx.createLinearGradient(0, 0, 0, HH);
    g.addColorStop(0, "#20304a");
    g.addColorStop(1, "#0f1a2c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HH);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "56px serif";
    ctx.fillText("🐾", W / 2, HH * 0.19);
    ctx.fillStyle = "#ffd36b";
    ctx.font = "800 25px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("Спасение Маршалла", W / 2, HH * 0.27);
    wrap(
      STORY,
      W / 2,
      HH * 0.37,
      25,
      "500 15px 'Segoe UI', system-ui, sans-serif",
      "#e8eef6",
    );
    ctx.fillStyle = "#fff";
    ctx.font = "600 17px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("Начать  ▶", W / 2, HH * 0.84);
    ctx.textAlign = "left";
  }
  function renderClearedOverlay() {
    ctx.fillStyle = "rgba(10,20,35,0.55)";
    ctx.fillRect(0, 0, W, HH);
    ctx.textAlign = "center";
    ctx.fillStyle = "#7cff9a";
    ctx.font = "800 30px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("Закоулок пройден! 🐾", W / 2, HH * 0.46);
    ctx.fillStyle = "#fff";
    ctx.font = "500 17px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("Дальше, к следующему…", W / 2, HH * 0.53);
    ctx.textAlign = "left";
  }
  function renderVictory() {
    const g = ctx.createLinearGradient(0, 0, 0, HH);
    g.addColorStop(0, "#3a7ca5");
    g.addColorStop(1, "#16324f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HH);
    const groundY = HH * 0.56,
      kx = W * 0.5;

    // fireworks — bloom into a finale in the last phase
    const fw = clamp01((vicT - 2.8) / 1.5),
      nFw = 3 + Math.round(fw * 4);
    const cols = ["#ffd36b", "#e5688b", "#7ec8e3", "#8fae4d", "#c58be0"];
    for (let b = 0; b < nFw; b++) {
      const life = (t * 0.6 + b * 0.5) % 2,
        cx = W * (0.12 + 0.15 * b),
        cy = HH * (0.13 + 0.06 * (b % 2)),
        R = life * 72;
      ctx.globalAlpha = Math.max(0, 1 - life / 2) * (0.5 + 0.5 * fw);
      ctx.fillStyle = cols[b % 5];
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI * 2 * i) / 12;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // the whole family fades in to celebrate (final phase)
    const famA = clamp01((vicT - 3.0) / 1.2);
    if (famA > 0) {
      ctx.globalAlpha = famA;
      Art.drawPerson(ctx, Art.CHARS.mom, kx - 165, groundY, 108, 1, 0, {
        blink: t % 3 < 0.12,
      });
      Art.drawPerson(ctx, Art.CHARS.dad, kx - 118, groundY, 108, 1, 0, {});
      Art.drawPerson(ctx, Art.CHARS.lesha, kx + 128, groundY, 112, -1, 0, {
        blink: (t + 1) % 3 < 0.12,
      });
      ctx.globalAlpha = 1;
    }

    // the defeated dog-napper bird flapping away
    if (vicT < 2.4) {
      const ba = clamp01(vicT / 1.8);
      ctx.globalAlpha = 1 - ba * 0.8;
      drawBird(
        lerp(W * 0.72, W * 1.35, ease(ba)),
        lerp(groundY - 96, -HH * 0.2, ease(ba)),
        58,
        Math.sin(t * 14),
        false,
        1,
      );
      ctx.globalAlpha = 1;
    }

    Art.drawPerson(ctx, Art.CHARS.kate, kx - 28, groundY, 130, 1, 0, {
      blink: t % 3 < 0.12,
    });

    const reunited = vicT > 1.4;
    if (!reunited) {
      // Marshall races back in
      Art.drawDog(
        ctx,
        lerp(W * 1.15, kx + 44, ease(clamp01(vicT / 1.4))),
        groundY,
        55,
        -1,
        vicT * 15,
      );
    } else {
      // happy reunion hop
      const hop =
        Math.abs(Math.sin((vicT - 1.4) * 6)) *
        22 *
        Math.max(0, 1 - (vicT - 1.4) / 3.5);
      Art.drawDog(ctx, kx + 44, groundY - hop, 55, -1, t * 10);
    }

    // captions
    ctx.textAlign = "center";
    if (reunited) {
      ctx.fillStyle = "#fff";
      ctx.font = "800 25px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("Маршалл дома, цел и невредим! 🐾", W / 2, HH * 0.73);
    }
    if (famA > 0.3) {
      ctx.globalAlpha = clamp01((famA - 0.3) / 0.5);
      ctx.fillStyle = "#ffe08a";
      ctx.font = "700 22px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("С днём рождения, Кейт! 🎂💖", W / 2, HH * 0.79);
      ctx.globalAlpha = 1;
    }
    if (vicT > 4.6) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "600 16px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("Нажми, чтобы завершить", W / 2, HH * 0.87);
    }
    ctx.textAlign = "left";
  }
  function render() {
    if (screen === "cutscene") return renderCutscene();
    if (screen === "story") return renderStory();
    if (screen === "victory") return renderVictory();
    renderPuzzle();
    if (screen === "cleared") renderClearedOverlay();
  }
  function loop(ts) {
    if (!running) return;
    const now = ts / 1000;
    const dt = last ? Math.min(now - last, 0.05) : 0;
    last = now;
    t = now;
    if (shakeT > 0) shakeT -= dt;
    if (screen === "cutscene") {
      csT += dt;
      if (csT > 5.0) screen = "story";
    }
    if (screen === "victory") vicT += dt;
    if (screen === "cleared") {
      clearedT += dt;
      if (clearedT > 1.3) {
        loadLevel(idx + 1);
        screen = "play";
      }
    }
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return { exit: cleanup };
}
