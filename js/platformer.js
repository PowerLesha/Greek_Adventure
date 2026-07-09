// platformer.js — a small mobile action platformer.
// Kate runs & jumps through a Greek town, collects hearts, crosses gaps over
// the sea, and reaches the birthday cake at Home.
//
// The physics live in a pure `createSim()` (no DOM) so they can be tested
// headlessly; `startPlatformer()` wraps it with input, camera and rendering.
import { Art } from "./art.js";
import { Sound } from "./audio.js";
import { loadSave, writeSave, clearSave } from "./storage.js";

const H = Art.helpers;

/* ---------------- tuning (px, seconds) ---------------- */
const GRAV = 2100;
const MOVE = 2600;      // horizontal acceleration
const MAXV = 300;       // max run speed
const FRICTION = 1900;
const JUMP_V = 780;     // jump impulse  (apex ≈ 145 px)
const COYOTE = 0.10;    // grace after leaving a ledge
const BUFFER = 0.12;    // grace for pressing jump early
const CUT = 0.45;       // variable jump: fraction of up-velocity kept on release

const GY = 460;               // world Y of the ground surface
const KW = 16, KH = 34;       // Kate half-width / half-height (shorter — head clears the
                              // stepping stones so she falls into gaps instead of snagging)
const EW = 17, EH = 12;       // crab (enemy) half-width / half-height
const GW = 20, GH = 11;       // seagull half-width / half-height
const DW = 20, DH = 14;       // dog half-width / half-height

/* enemy tuning */
const CRAB_SPEED = 52;        // crab patrol speed (px/s)
const GULL_SPEED = 96;        // seagull cruise speed (px/s)
const GULL_BOB = 8;           // seagull vertical bob amplitude (px)
const STOMP_BOUNCE = 560;     // upward pop after squashing an enemy
const HIT_KNOCK = 300;        // horizontal knockback when Kate is hurt
const IFRAMES = 1.3;          // invulnerability window after a hit (s)

/* the dog companion — Kate must keep it safe */
const DOG_MAXV = 360;         // top chase speed (px/s)
const DOG_JUMP = 740;         // jump impulse (clears the sea gaps)
const DOG_IFRAMES = 1.5;      // dog invulnerability after a hit (s)

/* ---------------- the level ---------------- */
function seg(x, w) { return { x, y: GY, w, h: 600, ground: true }; }
function plat(x, y, w) { return { x, y, w, h: 22 }; }

export const LEVEL = buildLevel();

// The level is generated so every candle sits above a solid surface within jump
// range (a jump lifts Kate ~145px on Normal, ~123px on Hard), keeping all 33
// reachable while the long chain of gaps + staircases supplies the platforming.
function buildLevel() {
  const solids = [], hearts = [], candles = [], enemies = [];
  const C = (x, y) => candles.push({ x, y });
  const crab = (minX, maxX) => enemies.push({ type: "crab", minX, maxX });
  const gull = (minX, maxX, y) => enemies.push({ type: "gull", minX, maxX, y });

  // ground stretches [x, width]; the spaces between them are sea gaps
  const grounds = [
    [-40, 560], [660, 420], [1220, 520], [1880, 560], [2580, 480],
    [3200, 620], [3960, 560], [4660, 640], [5440, 600], [6180, 700], [7020, 1080],
  ];
  for (const [x, w] of grounds) solids.push(seg(x, w));

  // No stepping stones: the 10 sea gaps (140px) are open pits crossed with a single
  // running jump (a jump clears ~220px). Mistime it and Kate falls in — real stakes.

  // three staircases for vertical platforming — the top step hides a candle
  solids.push(plat(1330, GY - 95, 95), plat(1460, GY - 175, 95), plat(1590, GY - 110, 95));
  solids.push(plat(3300, GY - 100, 95), plat(3430, GY - 180, 95), plat(3560, GY - 255, 95));
  solids.push(plat(5560, GY - 95, 95), plat(5690, GY - 175, 95), plat(5820, GY - 250, 95));

  // just a handful of hearts now (health + score), spread thin over OPEN ground
  // (kept clear of the staircases + stepping stones so none get walled off)
  for (const hx of [300, 850, 2200, 2800, 4150, 6350]) hearts.push({ x: hx, y: GY - 66 });

  // 33 birthday candles — ALL required to light the cake, all reachable.
  // over the ground (needs a hop):
  for (const cx of [420, 380, 770, 970, 1260, 1710, 1950, 2120, 2320, 2660, 2900,
    3240, 3760, 4020, 4260, 4460, 4720, 4980, 5240, 5480, 5980,
    6240, 6480, 6720, 7100, 7350, 7550]) C(cx, GY - 105);
  // a few more over the ground (were on the old stepping stones):
  C(460, GY - 105); C(2380, GY - 105); C(6360, GY - 105);
  // the reward atop each staircase:
  C(1507, GY - 225); C(3607, GY - 305); C(5867, GY - 300);

  // enemies — a crab patrolling each stretch (kept ~120px back from gap edges so
  // there's a run-up to each jump)
  crab(200, 430); crab(720, 980); crab(1270, 1640); crab(1930, 2320); crab(2630, 2960);
  crab(3230, 3700); crab(4010, 4400); crab(4710, 5180); crab(5490, 5920);
  crab(6230, 6760); crab(7060, 7440);
  // seagulls patrol OVER THE GROUND (never the gaps) high enough to walk & candle-hop
  // under — you stomp them or pass beneath; they never block a mandatory gap jump
  gull(760, 1020, GY - 120); gull(2000, 2340, GY - 120);
  gull(4040, 4400, GY - 120); gull(6280, 6640, GY - 120);

  return { width: 8200, spawn: { x: 90, y: GY - 120 }, solids, hearts, candles, enemies, goal: { x: 7700, y: GY } };
}

function solidsOverlap(ax, ay, aw, ah, s) {
  return ax - aw < s.x + s.w && ax + aw > s.x && ay - ah < s.y + s.h && ay + ah > s.y;
}

/* difficulty presets — multipliers on the base tuning above */
export const DIFFS = {
  easy:   { label: "Easy",   grav: 0.9,  maxv: 0.92, jump: 1.06, coyote: 1.7,  buffer: 1.7, easyRespawn: true,  hp: 8, maxHp: 8, crab: 0.7,  iframe: 1.5, doghp: 8 },
  normal: { label: "Normal", grav: 1.0,  maxv: 1.0,  jump: 1.0,  coyote: 1.0,  buffer: 1.0, easyRespawn: false, hp: 7, maxHp: 8, crab: 1.0,  iframe: 1.0, doghp: 7 },
  hard:   { label: "Hard",   grav: 1.18, maxv: 1.18, jump: 1.0,  coyote: 0.55, buffer: 0.6, easyRespawn: false, hp: 6, maxHp: 7, crab: 1.35, iframe: 0.8, doghp: 6 },
};

/* ================================================================== */
/*  Pure simulation (no DOM) — testable                               */
/* ================================================================== */
export function createSim(level = LEVEL, tuning = DIFFS.normal) {
  const T = tuning || DIFFS.normal;
  const grav = GRAV * (T.grav ?? 1), maxv = MAXV * (T.maxv ?? 1), jumpV = JUMP_V * (T.jump ?? 1);
  const coyoteMax = COYOTE * (T.coyote ?? 1), bufMax = BUFFER * (T.buffer ?? 1);
  const startHp = T.hp ?? 3, maxHp = T.maxHp ?? 5;
  const crabSpeed = CRAB_SPEED * (T.crab ?? 1), gullSpeed = GULL_SPEED * (T.crab ?? 1);
  const iframeMax = IFRAMES * (T.iframe ?? 1);
  const dogMaxHp = T.doghp ?? 5;
  const kate = { x: 0, y: 0, vx: 0, vy: 0, onGround: false, facing: 1, phase: 0 };
  const dog = { x: 0, y: 0, vy: 0, onGround: false, facing: 1, phase: 0 };
  let hearts = [];
  let candles = [];
  let enemies = [];
  let state = "play", lostReason = "";
  let coyote = 0, buffer = 0, jumpHeld = false;
  let collected = 0, candlesGot = 0, winT = 0, deaths = 0, overT = 0;
  let hp = startHp, iFrames = 0, defeated = 0;
  let dogHp = dogMaxHp, dogIFrames = 0;
  let landT = 1, prevGround = false;   // landing timer, for squash-&-stretch

  function reset() {
    kate.x = level.spawn.x; kate.y = level.spawn.y;
    kate.vx = kate.vy = 0; kate.onGround = false; kate.facing = 1; kate.phase = 0;
    dog.x = kate.x - 70; dog.y = GY - DH; dog.vy = 0; dog.onGround = true; dog.facing = 1; dog.phase = 0;
    hearts = level.hearts.map((h) => ({ ...h, got: false }));
    candles = (level.candles || []).map((c) => ({ ...c, got: false }));
    enemies = (level.enemies || []).map((e) => ({
      type: e.type || "crab", minX: e.minX, maxX: e.maxX,
      x: (e.minX + e.maxX) / 2, dir: 1, alive: true, squashT: 0,
      baseY: e.y ?? (GY - EH), y: e.y ?? (GY - EH), t: 0,
    }));
    state = "play"; lostReason = ""; collected = 0; candlesGot = 0; winT = 0; overT = 0; deaths = 0;
    hp = startHp; iFrames = 0; defeated = 0;
    dogHp = dogMaxHp; dogIFrames = 0;
    coyote = 0; buffer = 0; jumpHeld = false;
  }
  function jumpPress() { buffer = bufMax; jumpHeld = true; }
  function jumpRelease() { jumpHeld = false; }

  function step(dt, input) {
    if (state === "won") { winT += dt; return; }
    if (state === "lost") { overT += dt; return; }

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir !== 0) { kate.vx += dir * MOVE * dt; kate.facing = dir; }
    else {
      const f = FRICTION * dt;
      kate.vx = Math.abs(kate.vx) <= f ? 0 : kate.vx - Math.sign(kate.vx) * f;
    }
    kate.vx = Math.max(-maxv, Math.min(maxv, kate.vx));

    coyote = kate.onGround ? coyoteMax : Math.max(0, coyote - dt);
    buffer = Math.max(0, buffer - dt);
    if (buffer > 0 && coyote > 0) { kate.vy = -jumpV; kate.onGround = false; coyote = 0; buffer = 0; }
    if (!jumpHeld && kate.vy < 0) kate.vy *= CUT; // variable jump height
    kate.vy += grav * dt;

    // X
    kate.x += kate.vx * dt;
    for (const s of level.solids) {
      if (solidsOverlap(kate.x, kate.y, KW, KH, s)) {
        if (kate.vx > 0) kate.x = s.x - KW; else if (kate.vx < 0) kate.x = s.x + s.w + KW;
        kate.vx = 0;
      }
    }
    kate.x = Math.max(KW, Math.min(level.width - KW, kate.x));

    // Y
    kate.y += kate.vy * dt;
    const impactV = kate.vy;   // downward speed at moment of contact
    kate.onGround = false;
    for (const s of level.solids) {
      if (solidsOverlap(kate.x, kate.y, KW, KH, s)) {
        if (kate.vy > 0) { kate.y = s.y - KH; kate.onGround = true; }
        else if (kate.vy < 0) kate.y = s.y + s.h + KH;
        kate.vy = 0;
      }
    }
    if (kate.onGround) landT = (!prevGround && impactV > 260) ? 0 : landT + dt;
    else landT = 1;
    prevGround = kate.onGround;

    if (!kate.onGround) kate.phase = 1.6;
    else if (Math.abs(kate.vx) > 12) kate.phase += Math.abs(kate.vx) * dt * 0.045;
    else kate.phase = 0;

    if (kate.y - KH > GY + 260) {
      deaths++; hp--;                                            // a plunge into the sea costs a heart
      if (hp <= 0) { state = "lost"; lostReason = "kate"; overT = 0; }
      else { iFrames = iframeMax; softRespawn(); }
    }

    for (const h of hearts) {
      if (!h.got && Math.abs(h.x - kate.x) < 34 && Math.abs(h.y - kate.y) < 46) {
        h.got = true; collected++;
        if (hp < maxHp) hp++;   // a heart heals as well as scores
      }
    }

    // required birthday candles — gather them all to light the cake
    for (const c of candles) {
      if (!c.got && Math.abs(c.x - kate.x) < 36 && Math.abs(c.y - kate.y) < 48) {
        c.got = true; candlesGot++;
      }
    }

    // ---- enemies: crabs patrol the ground, gulls swoop; stomp to defeat ----
    iFrames = Math.max(0, iFrames - dt);
    for (const e of enemies) {
      const gull = e.type === "gull";
      const ew = gull ? GW : EW, eh = gull ? GH : EH;
      if (!e.alive) { e.squashT += dt; continue; }
      e.x += e.dir * (gull ? gullSpeed : crabSpeed) * dt;
      if (e.x <= e.minX + ew) { e.x = e.minX + ew; e.dir = 1; }
      else if (e.x >= e.maxX - ew) { e.x = e.maxX - ew; e.dir = -1; }
      e.t += dt;
      e.y = gull ? e.baseY + Math.sin(e.t * 3) * GULL_BOB : (GY - EH);
      const ecy = e.y;
      if (solidsOverlap(kate.x, kate.y, KW, KH, { x: e.x - ew, y: ecy - eh, w: ew * 2, h: eh * 2 })) {
        if (kate.vy > 0 && kate.y < ecy) {
          e.alive = false; e.squashT = 0; defeated++;           // stomp: squash & bounce
          kate.vy = -STOMP_BOUNCE; kate.onGround = false; buffer = 0;
        } else if (iFrames <= 0) {
          hp--; iFrames = iframeMax;                            // a bite costs Kate a heart (+ a shove
          kate.vx = (kate.x < e.x ? -1 : 1) * HIT_KNOCK; kate.vy = -320; kate.onGround = false;
          if (hp <= 0) { deaths++; state = "lost"; lostReason = "kate"; overT = 0; }  // that can fling her into a gap)
        }
      }
      // the pup can't fight back — every live crab it touches costs a heart (with a
      // grace window). Kate must stomp crabs before the trailing dog reaches them,
      // else it drains and the game ends. Gulls stay up where Kate deals with them,
      // so the dog is never punished just for jumping a gap.
      const M = 14;   // a little reach so the fast-moving pup can't just blur past a live crab
      if (!gull && e.alive && dogHp > 0 && dogIFrames <= 0 &&
          solidsOverlap(dog.x, dog.y, DW, DH, { x: e.x - ew - M, y: ecy - eh - M, w: (ew + M) * 2, h: (eh + M) * 2 })) {
        dogHp--; dogIFrames = DOG_IFRAMES; dog.vy = -280; dog.onGround = false;
        if (dogHp <= 0) { state = "lost"; lostReason = "dog"; overT = 0; }
      }
    }

    // reach the cake — but only win once every candle is collected
    if (Math.abs(kate.x - level.goal.x) < 46 && kate.onGround && candlesGot >= candles.length) state = "won";

    updateDog(dt);
  }

  // The dog follows Kate, obeys gravity, jumps the sea gaps, and hops up to keep
  // pace. It never drowns (a fall just teleports it back to Kate) — only enemies
  // hurt it. Simple, forgiving AI so it doesn't get stranded.
  function updateDog(dt) {
    if (dogHp <= 0) return;
    dogIFrames = Math.max(0, dogIFrames - dt);
    const followX = kate.x - 72 * kate.facing;
    const dx = followX - dog.x;
    if (Math.abs(dx) > 4) dog.facing = dx < 0 ? -1 : 1;
    dog.x += Math.max(-DOG_MAXV, Math.min(DOG_MAXV, dx * 5)) * dt;

    dog.vy += GRAV * dt;
    dog.y += dog.vy * dt;
    let onG = false;
    for (const s of level.solids) {
      if (dog.x - DW < s.x + s.w && dog.x + DW > s.x && dog.y - DH < s.y + s.h && dog.y + DH > s.y) {
        if (dog.vy >= 0 && dog.y < s.y) { dog.y = s.y - DH; dog.vy = 0; onG = true; }
      }
    }
    dog.onGround = onG;
    dog.phase = onG && Math.abs(dx) > 12 ? dog.phase + dt * 12 : (onG ? 0 : 1.6);

    // jump early when a gap is coming up, or when Kate is well above and near.
    // NOTE: the pup does NOT dodge crabs on its own — Kate must stomp them, else the
    // dog walks into them and loses health (that's the "protect the dog" mechanic).
    const aheadX = dog.x + dog.facing * 46;
    const groundAhead = level.solids.some((s) => s.ground && aheadX >= s.x && aheadX <= s.x + s.w);
    // chase-jump only when Kate is STANDING on higher ground (not falling from spawn)
    if (dog.onGround && ((!groundAhead && Math.abs(dx) > 24) || (kate.onGround && kate.y < dog.y - 70 && Math.abs(dx) < 150)))
      dog.vy = -DOG_JUMP;

    // fell in the sea → hop back to Kate's side (the pup never drowns)
    if (dog.y - DH > GY + 240) { dog.x = kate.x - 40 * kate.facing; dog.y = kate.y - 20; dog.vy = 0; }
  }

  function softRespawn() {
    let sx = level.spawn.x;
    // easy: pop back onto the ledge you fell from (minimal loss)
    // else: back to the start of the last ground stretch
    for (const s of level.solids) if (s.ground && s.x + 40 < kate.x) {
      sx = Math.max(sx, T.easyRespawn ? Math.min(s.x + s.w - 40, kate.x) : s.x + 70);
    }
    kate.x = sx; kate.y = GY - 120; kate.vx = kate.vy = 0;
    // bring the pup back with her so it can't get stranded among crabs during respawns
    dog.x = kate.x - 46; dog.y = GY - DH; dog.vy = 0; dog.onGround = true; dogIFrames = Math.max(dogIFrames, 0.6);
  }

  reset();
  return {
    kate, dog, level, GY, KW, KH,
    get hearts() { return hearts; },
    get candles() { return candles; },
    get candlesGot() { return candlesGot; },
    get candlesTotal() { return candles.length; },
    get enemies() { return enemies; },
    get state() { return state; },
    get lostReason() { return lostReason; },
    get collected() { return collected; },
    get hp() { return hp; },
    get maxHp() { return maxHp; },
    get iFrames() { return iFrames; },
    get defeated() { return defeated; },
    get dogHp() { return dogHp; },
    get dogMaxHp() { return dogMaxHp; },
    get dogIFrames() { return dogIFrames; },
    get winT() { return winT; },
    get overT() { return overT; },
    get deaths() { return deaths; },
    get dogX() { return dog.x; },
    get landT() { return landT; },
    reset, jumpPress, jumpRelease, step,
  };
}

/* ================================================================== */
/*  DOM wrapper: input, camera, rendering                             */
/* ================================================================== */
export async function startPlatformer() {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  let W = 0, HH = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = window.innerWidth; HH = window.innerHeight;
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(HH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 200));

  let currentDiff = "normal";
  let sim = createSim(LEVEL, DIFFS.normal);
  let savedWin = false;
  let sfxHp = sim.hp, sfxCollected = 0, sfxDefeated = 0, sfxCandles = 0, sfxDogHp = sim.dogHp;   // change-triggered sounds
  const input = { left: false, right: false };
  let camX = 0, camY = GY - 520, time = 0;

  // draw a character sprite (cartoon styled to resemble the real family)
  function drawCharacter(charKey, faceId, x, feetY, h, facing, phase, anim) {
    Art.drawPerson(ctx, Art.CHARS[charKey], x, feetY, h, facing, phase, anim || {});
  }

  /* ---- input ---- */
  bindButton("btnLeft", (v) => (input.left = v));
  bindButton("btnRight", (v) => (input.right = v));
  bindButton("btnJump", (v) => (v ? sim.jumpPress() : sim.jumpRelease()));
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.key === "ArrowLeft" || e.key === "a") input.left = true;
    else if (e.key === "ArrowRight" || e.key === "d") input.right = true;
    else if (e.key === " " || e.key === "ArrowUp" || e.key === "w") sim.jumpPress();
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") input.left = false;
    else if (e.key === "ArrowRight" || e.key === "d") input.right = false;
    else if (e.key === " " || e.key === "ArrowUp" || e.key === "w") sim.jumpRelease();
  });
  canvas.addEventListener("pointerdown", (e) => {
    if (sim.state === "won") { if (sim.winT > 0.6) sim.reset(); return; }
    if (sim.state === "lost") { if (sim.overT > 0.6) sim.reset(); return; }
    if (e.clientX > W * 0.5 && e.clientY < HH * 0.78) sim.jumpPress();
  });
  canvas.addEventListener("pointerup", () => sim.jumpRelease());

  /* ---- camera ---- */
  function updateCamera(dt) {
    const k = sim.kate;
    camX = Math.max(0, Math.min(LEVEL.width - W, k.x - W * 0.36));
    const targetY = Math.min(GY - HH * 0.62, k.y - HH * 0.52);
    camY += (targetY - camY) * Math.min(1, dt * 4);
  }

  /* ---- render ---- */
  function render() {
    const g = ctx.createLinearGradient(0, 0, 0, HH);
    g.addColorStop(0, "#8fd0ec"); g.addColorStop(0.6, "#c4e6f3"); g.addColorStop(1, "#eaf6ef");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HH);
    H.sun(ctx, W * 0.82, HH * 0.16, 30, "#fff8d0", "rgba(255,248,190,0.95)");
    H.clouds(ctx, W, HH * 0.5, time, "rgba(255,255,255,0.9)");

    // parallax distant town on the horizon (smaller, hazy, clearly behind)
    ctx.save();
    ctx.translate(-camX * 0.4, 0);
    ctx.globalAlpha = 0.8;
    H.greekHouses(ctx, LEVEL.width * 1.4, (GY - 70) - camY, 0.78, time);
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.save();
    ctx.translate(-camX, -camY);
    drawSea();
    for (const s of LEVEL.solids) drawSolid(s);
    drawStartSign(250);                         // objective sign near the spawn
    drawGoal(LEVEL.goal.x, LEVEL.goal.y);
    for (const h of sim.hearts) if (!h.got) drawHeart(h.x, h.y);
    for (const c of sim.candles) if (!c.got) drawCandle(c.x, c.y);
    for (const e of sim.enemies) (e.type === "gull" ? drawGull : drawCrab)(e);
    const d = sim.dog;   // flash the pup while it's briefly invulnerable after a hit
    if (!(sim.dogIFrames > 0 && Math.floor(time * 14) % 2 === 0))
      Art.drawDog(ctx, d.x, d.y + DH, 42, d.facing, d.phase);
    const k = sim.kate;
    const running = k.onGround && Math.abs(k.vx) > 12;
    const anim = {
      blink: (time % 4) < 0.12,
      run: running ? 1 : 0,
      air: k.onGround ? 0 : (k.vy < 0 ? 1 : -1),
      squash: k.onGround
        ? 0.82 + 0.18 * Math.min(1, sim.landT * 7)          // squash on landing, recover
        : 1 + Math.max(-0.06, Math.min(0.12, k.vy / 2600)),  // stretch while falling
    };
    // flash Kate on/off while she's briefly invulnerable after a hit
    if (!(sim.iFrames > 0 && Math.floor(time * 14) % 2 === 0)) {
      drawCharacter("kate", "kate", k.x, k.y + KH, KH * 2, k.facing, k.phase, anim);
    }
    ctx.restore();

    drawHUD();
    // reminder at the cake if candles are still missing
    if (sim.state !== "won" && sim.candlesGot < sim.candlesTotal && Math.abs(k.x - LEVEL.goal.x) < 300) {
      const msg = "Light the cake: find all candles  🕯️ " + sim.candlesGot + "/" + sim.candlesTotal;
      ctx.save();
      ctx.font = "600 16px 'Segoe UI', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const bw = ctx.measureText(msg).width + 28;
      ctx.fillStyle = "rgba(20,30,55,0.62)"; H.rr(ctx, W / 2 - bw / 2, 58, bw, 34, 10); ctx.fill();
      ctx.fillStyle = "#ffe08a"; ctx.fillText(msg, W / 2, 76);
      ctx.restore();
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    }
    if (sim.state === "won") drawWin();
    if (sim.state === "lost") drawLost();
  }

  function drawSea() {
    const top = GY - 70, bottom = GY + 600;
    const sg = ctx.createLinearGradient(0, top, 0, bottom);
    sg.addColorStop(0, "#5cc0e0"); sg.addColorStop(1, "#2f88b8");
    ctx.fillStyle = sg; ctx.fillRect(camX - 20, top, W + 40, bottom - top);
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const yy = top + 18 + i * 20;
      ctx.beginPath();
      for (let x = camX - 20; x < camX + W + 20; x += 14) {
        const y = yy + Math.sin(x * 0.05 + time * 2 + i) * 3;
        x === camX - 20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function drawSolid(s) {
    if (s.ground) {
      const g = ctx.createLinearGradient(0, s.y, 0, s.y + 120);
      g.addColorStop(0, "#efe0bd"); g.addColorStop(1, "#d0b884");
      ctx.fillStyle = g; ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = "#cdb47f"; ctx.fillRect(s.x, s.y, s.w, 6);
    } else {
      ctx.fillStyle = "#c98b5a"; H.rr(ctx, s.x, s.y, s.w, s.h, 5); ctx.fill();
      ctx.fillStyle = "#e07a5a"; H.rr(ctx, s.x, s.y, s.w, 8, 4); ctx.fill();
    }
  }

  function drawHeart(x, y) {
    const bob = Math.sin(time * 3 + x) * 4;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.globalAlpha = 0.45 + 0.3 * Math.sin(time * 4 + x);
    H.circle(ctx, 0, 0, 15, "rgba(255,180,200,0.5)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#e5688b"; ctx.font = "22px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("❤", 0, 1);
    ctx.restore();
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  function drawCrab(e) {
    ctx.save();
    ctx.translate(e.x, GY);                 // crab sits on the ground surface
    if (!e.alive) {
      ctx.globalAlpha = Math.max(0, 1 - e.squashT * 1.3);
      ctx.scale(1 + e.squashT * 0.5, Math.max(0.12, 1 - e.squashT * 3));   // flatten out
    }
    const look = e.alive ? e.dir : 1;
    // legs
    ctx.strokeStyle = "#a3331f"; ctx.lineWidth = 3; ctx.lineCap = "round";
    for (let i = -1; i <= 1; i++) {
      const lx = i * 9;
      ctx.beginPath(); ctx.moveTo(lx, -6); ctx.lineTo(lx - 6, -1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx, -6); ctx.lineTo(lx + 6, -1); ctx.stroke();
    }
    // claws
    H.circle(ctx, -EW - 4, -13, 5, "#e0533b");
    H.circle(ctx, EW + 4, -13, 5, "#e0533b");
    // shell
    ctx.fillStyle = "#e0533b";
    ctx.beginPath(); ctx.ellipse(0, -13, EW, EH, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c8442f";
    ctx.beginPath(); ctx.ellipse(0, -10, EW * 0.9, EH * 0.55, 0, 0, Math.PI); ctx.fill();
    // eyes on stalks
    ctx.strokeStyle = "#a3331f"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-5, -21); ctx.lineTo(-5, -27); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -21); ctx.lineTo(5, -27); ctx.stroke();
    if (e.alive) {
      H.circle(ctx, -5, -29, 3, "#fff"); H.circle(ctx, 5, -29, 3, "#fff");
      H.circle(ctx, -5 + look, -29, 1.5, "#222"); H.circle(ctx, 5 + look, -29, 1.5, "#222");
    } else {
      ctx.strokeStyle = "#7a2418"; ctx.lineWidth = 2;
      for (const ex of [-5, 5]) {
        ctx.beginPath();
        ctx.moveTo(ex - 2, -31); ctx.lineTo(ex + 2, -27);
        ctx.moveTo(ex + 2, -31); ctx.lineTo(ex - 2, -27); ctx.stroke();
      }
    }
    ctx.restore();
    ctx.lineCap = "butt";
  }

  function drawGull(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (!e.alive) {
      ctx.globalAlpha = Math.max(0, 1 - e.squashT * 1.3);
      ctx.translate(0, e.squashT * 240);       // tumble downward when hit
      ctx.rotate(e.squashT * 6 * e.dir);
    }
    const dir = e.alive ? e.dir : 1;
    const flap = Math.sin(e.t * 12) * 0.5;      // wing beat
    // body
    ctx.fillStyle = "#f7f9fb";
    ctx.beginPath(); ctx.ellipse(0, 0, GW * 0.55, GH, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d9e2ea";                  // grey back
    ctx.beginPath(); ctx.ellipse(-dir * 3, -2, GW * 0.4, GH * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    // wings (a soft "M" that flaps)
    ctx.strokeStyle = "#cfd8e0"; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-GW, -2 - flap * 8);
    ctx.quadraticCurveTo(-GW * 0.4, -8 - flap * 10, 0, -3);
    ctx.quadraticCurveTo(GW * 0.4, -8 - flap * 10, GW, -2 - flap * 8);
    ctx.stroke();
    // beak + eye
    ctx.fillStyle = "#f4a83a";
    ctx.beginPath();
    ctx.moveTo(dir * GW * 0.5, 0); ctx.lineTo(dir * (GW * 0.5 + 7), -1); ctx.lineTo(dir * GW * 0.5, 3);
    ctx.closePath(); ctx.fill();
    if (e.alive) H.circle(ctx, dir * 5, -2, 1.7, "#222");
    ctx.restore();
    ctx.lineCap = "butt";
  }

  function drawCandle(x, y) {
    const bob = Math.sin(time * 2.5 + x) * 3;
    ctx.save();
    ctx.translate(x, y + bob);
    // soft glow
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 5 + x);
    H.circle(ctx, 0, -12, 13, "rgba(255,214,120,0.55)");
    ctx.globalAlpha = 1;
    // candle stick (pink stripes)
    ctx.fillStyle = "#ffd1e0"; H.rr(ctx, -4, -6, 8, 20, 3); ctx.fill();
    ctx.strokeStyle = "#e5688b"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, -3); ctx.moveTo(-4, 6); ctx.lineTo(4, 3); ctx.stroke();
    // wick + flame
    ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, -11); ctx.stroke();
    const fl = 1 + Math.sin(time * 12 + x) * 0.12;
    ctx.fillStyle = "#ffb03a";
    ctx.beginPath(); ctx.ellipse(0, -15, 3.4, 6 * fl, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff1b0";
    ctx.beginPath(); ctx.ellipse(0, -14, 1.6, 3 * fl, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // a signpost by the spawn that spells out the objective
  function drawStartSign(x) {
    const by = GY;
    // post
    ctx.fillStyle = "#a9763f"; ctx.fillRect(x - 4, by - 104, 8, 104);
    ctx.fillStyle = "#8a5e30"; ctx.fillRect(x - 4, by - 104, 3, 104);
    // board
    ctx.fillStyle = "#fff7ec"; ctx.strokeStyle = "#caa96b"; ctx.lineWidth = 4;
    H.rr(ctx, x - 116, by - 214, 232, 110, 12); ctx.fill(); ctx.stroke();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#c0506e"; ctx.font = "700 19px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("Reach the cake! 🎂", x, by - 189);
    ctx.fillStyle = "#6b6480"; ctx.font = "600 15px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("Collect ALL 33 candles 🕯️", x, by - 162);
    ctx.fillText("Protect your dog! 🐾", x, by - 138);
    // bouncing "this way" arrow
    const ax = x + 70 + Math.sin(time * 4) * 6;
    ctx.strokeStyle = "#e5688b"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ax - 26, by - 116); ctx.lineTo(ax, by - 116);
    ctx.moveTo(ax - 9, by - 125); ctx.lineTo(ax, by - 116); ctx.lineTo(ax - 9, by - 107);
    ctx.stroke();
    ctx.lineCap = "butt";
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  function drawGoal(x, y) {
    ctx.fillStyle = "#f3ead6"; H.rr(ctx, x - 70, y - 150, 140, 150, 8); ctx.fill();
    ctx.fillStyle = "#b5546a";
    ctx.beginPath(); ctx.moveTo(x - 82, y - 150); ctx.lineTo(x, y - 200); ctx.lineTo(x + 82, y - 150); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffd36b"; H.rr(ctx, x - 16, y - 70, 32, 70, 4); ctx.fill();
    ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 26); ctx.stroke();
    ctx.fillStyle = "#f7d7e3"; H.rr(ctx, x - 22, y - 44, 44, 20, 4); ctx.fill();
    ctx.fillStyle = "#e28fb0"; H.rr(ctx, x - 22, y - 44, 44, 6, 3); ctx.fill();
    ctx.strokeStyle = "#f4b942"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y - 44); ctx.lineTo(x, y - 58); ctx.stroke();
    H.circle(ctx, x, y - 60, 4, "#ffdf6b");
    const bob = Math.sin(time * 3) * 5;
    ctx.font = "22px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("🎂", x, y - 92 + bob); ctx.textAlign = "left";
  }

  function drawHUD() {
    ctx.save();
    ctx.fillStyle = "rgba(20,30,55,0.35)"; ctx.fillRect(0, 0, W, 46);
    ctx.textBaseline = "middle";
    // health: a row of little heart pips (left)
    ctx.font = "21px serif"; ctx.textAlign = "left";
    for (let i = 0; i < sim.maxHp; i++) {
      const filled = i < sim.hp;
      ctx.fillStyle = filled ? "#ff5a7a" : "rgba(255,255,255,0.30)";
      ctx.fillText(filled ? "♥" : "♡", 14 + i * 21, 24);
    }
    // required candles (centre) — the objective
    const allC = sim.candlesGot >= sim.candlesTotal;
    ctx.textAlign = "center"; ctx.font = "600 17px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = allC ? "#ffe08a" : "#fff";
    ctx.fillText("🕯️ " + sim.candlesGot + "/" + sim.candlesTotal, W / 2, 24);
    // hearts gathered toward the birthday total (right)
    ctx.fillStyle = "#fff"; ctx.font = "600 18px 'Segoe UI', system-ui, sans-serif"; ctx.textAlign = "right";
    ctx.fillText("💖 " + sim.collected + " / " + LEVEL.hearts.length, W - 14, 24);

    // the dog's health — protect the pup! (second row, left)
    ctx.textAlign = "left";
    const dw = 44 + sim.dogMaxHp * 18;
    ctx.fillStyle = "rgba(20,30,55,0.4)"; H.rr(ctx, 8, 52, dw, 28, 9); ctx.fill();
    ctx.font = "16px sans-serif"; ctx.fillStyle = "#fff"; ctx.fillText("🐾", 14, 67);
    ctx.font = "17px serif";
    for (let i = 0; i < sim.dogMaxHp; i++) {
      ctx.fillStyle = i < sim.dogHp ? "#5bb8e6" : "rgba(255,255,255,0.28)";
      ctx.fillText(i < sim.dogHp ? "♥" : "♡", 40 + i * 18, 67);
    }
    ctx.textBaseline = "alphabetic";
    ctx.restore();
  }

  function drawWin() {
    ctx.save();
    ctx.fillStyle = "rgba(10,15,35,0.55)"; ctx.fillRect(0, 0, W, HH);
    const cols = ["#ffd36b", "#e5688b", "#7ec8e3", "#8fae4d"];
    for (let b = 0; b < 5; b++) {
      const life = (sim.winT * 0.6 + b * 0.5) % 2;
      const cx = W * (0.15 + 0.18 * b), cy = HH * (0.2 + 0.05 * (b % 2)), R = life * 80;
      ctx.globalAlpha = Math.max(0, 1 - life / 2); ctx.fillStyle = cols[b % 4];
      for (let i = 0; i < 12; i++) { const a = (Math.PI * 2 * i) / 12; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 3, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;

    // the whole family celebrating (cartoon-styled to resemble the real people)
    const fam = [["mom", "mom"], ["dad", "dad"], ["kate", "kate"], ["lesha", "husband"]];
    const fh = Math.min(HH * 0.15, 124), fy = HH * 0.36, gap = fh * 0.54;
    const totalW = (fam.length - 1) * gap + fh * 0.5;
    fam.forEach((p, i) => {
      const px = W / 2 - totalW / 2 + i * gap;
      drawCharacter(p[0], p[1], px, fy, fh, i < 2 ? 1 : -1, 0, { blink: (sim.winT % 3 + i) < 0.12 });
    });
    Art.drawDog(ctx, W / 2 + totalW / 2 + gap * 0.6, fy, fh * 0.44, -1, sim.winT * 4);

    ctx.fillStyle = "#fff"; ctx.textAlign = "center";
    ctx.font = "800 26px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("Happy Birthday, Kate! 🎂", W / 2, HH * 0.56);
    ctx.font = "500 18px 'Segoe UI', system-ui, sans-serif";
    const all = sim.collected >= LEVEL.hearts.length;
    ctx.fillText("All " + sim.candlesTotal + " candles lit 🕯️", W / 2, HH * 0.62);
    ctx.fillText("You gathered " + sim.collected + " of " + LEVEL.hearts.length + " hearts of love 💖", W / 2, HH * 0.67);
    if (all) {
      ctx.fillStyle = "#ffe08a"; ctx.font = "700 18px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("★ Every single one — perfect! ★", W / 2, HH * 0.72);
      ctx.fillStyle = "#fff"; ctx.font = "500 18px 'Segoe UI', system-ui, sans-serif";
    }
    ctx.fillText("Tap to play again", W / 2, HH * (all ? 0.77 : 0.73));
    ctx.textAlign = "left";
    ctx.restore();
  }

  function drawLost() {
    ctx.save();
    ctx.fillStyle = "rgba(30,12,20,0.6)"; ctx.fillRect(0, 0, W, HH);
    ctx.textAlign = "center";
    const dogLost = sim.lostReason === "dog";
    if (dogLost) {
      Art.drawDog(ctx, W / 2, HH * 0.44, 90, -1, 0);
      ctx.fillStyle = "#fff"; ctx.font = "800 25px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("Keep the pup safe! 🐾", W / 2, HH * 0.55);
      ctx.font = "500 17px 'Segoe UI', system-ui, sans-serif"; ctx.fillStyle = "#f4c9d3";
      ctx.fillText("The dog got hurt — stomp enemies before", W / 2, HH * 0.61);
      ctx.fillText("they reach it. Kate must protect the dog!", W / 2, HH * 0.645);
    } else {
      ctx.font = "60px serif"; ctx.fillText("💔", W / 2, HH * 0.42);
      ctx.fillStyle = "#fff"; ctx.font = "800 25px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("Out of hearts!", W / 2, HH * 0.55);
      ctx.font = "500 17px 'Segoe UI', system-ui, sans-serif"; ctx.fillStyle = "#f4c9d3";
      ctx.fillText("Enemies bite and every sea-fall costs a", W / 2, HH * 0.61);
      ctx.fillText("heart. Run out and the journey ends!", W / 2, HH * 0.645);
    }
    ctx.fillStyle = "#fff"; ctx.font = "600 18px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText("Tap to try again", W / 2, HH * 0.71);
    ctx.textAlign = "left";
    ctx.restore();
  }

  /* ---- loop ---- */
  let last = 0, running = true;
  function loop(ts) {
    if (!running) return;
    const now = ts / 1000;
    let dt = last ? now - last : 0; last = now; time = now;
    dt = Math.min(dt, 1 / 30);
    if (dt > 0) {
      sim.step(dt, input); updateCamera(dt);
      if (sim.collected !== sfxCollected) { sfxCollected = sim.collected; Sound.pickup?.(); }
      if (sim.candlesGot !== sfxCandles) { sfxCandles = sim.candlesGot; Sound.happy?.(); }
      if (sim.defeated !== sfxDefeated) { sfxDefeated = sim.defeated; Sound.stomp?.(); }
      if (sim.hp < sfxHp) Sound.hurt?.();
      if (sim.dogHp < sfxDogHp) { Sound.bark?.(); Sound.hurt?.(); }   // the pup yelps
      sfxHp = sim.hp; sfxDogHp = sim.dogHp;
      if (sim.state === "won" && !savedWin) {
        savedWin = true; Sound.win?.();
        writeSave({ scene: "platformer", inv: [], flags: { best: sim.collected, diff: currentDiff } });
      }
    }
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function start(diffKey) {
    currentDiff = DIFFS[diffKey] ? diffKey : "normal";
    sim = createSim(LEVEL, DIFFS[currentDiff]);
    savedWin = false;
    sfxHp = sim.hp; sfxCollected = 0; sfxDefeated = 0; sfxCandles = 0; sfxDogHp = sim.dogHp;
  }

  return {
    newGame(diffKey) { clearSave(); start(diffKey); },
    continueGame() { const s = loadSave(); start(s && s.flags && s.flags.diff); },
    restart() { start(currentDiff); },
    hasSave() { const s = loadSave(); return !!(s && s.flags && typeof s.flags.best === "number"); },
  };
}

/* hold-to-repeat button binding (pointer + touch friendly) */
function bindButton(id, cb) {
  const el = document.getElementById(id);
  if (!el) return;
  const down = (e) => { e.preventDefault(); cb(true); };
  const up = (e) => { e.preventDefault(); cb(false); };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointerleave", up);
  el.addEventListener("pointercancel", up);
}
