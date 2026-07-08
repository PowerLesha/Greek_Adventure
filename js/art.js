// art.js — everything you see is drawn here with canvas code.
// No image files => nothing to break offline, and it scales to any screen.

/* ------------------------------------------------------------------ */
/*  Small drawing helpers                                             */
/* ------------------------------------------------------------------ */

function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function capsule(ctx, x1, y1, x2, y2, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function circle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function softShadow(ctx, x, y, w) {
  ctx.save();
  ctx.fillStyle = "rgba(20,25,40,0.18)";
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Scenery pieces                                                    */
/* ------------------------------------------------------------------ */

function skyGradient(ctx, W, H, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  stops.forEach((s) => g.addColorStop(s[0], s[1]));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function sun(ctx, x, y, r, color, glow) {
  const g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 3);
  g.addColorStop(0, glow);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 3, 0, Math.PI * 2);
  ctx.fill();
  circle(ctx, x, y, r, color);
}

function stars(ctx, W, H, t) {
  ctx.fillStyle = "#fff";
  for (let i = 0; i < 60; i++) {
    const x = (i * 137.5) % W;
    const y = ((i * 89.3) % (H * 0.55));
    const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
    ctx.globalAlpha = 0.3 + 0.7 * tw;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function cloud(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 26 * s, y + 6 * s, 18 * s, 0, Math.PI * 2);
  ctx.arc(x - 26 * s, y + 6 * s, 16 * s, 0, Math.PI * 2);
  ctx.arc(x, y + 12 * s, 24 * s, 0, Math.PI * 2);
  ctx.fill();
}

function clouds(ctx, W, H, t, color) {
  const y = H * 0.16;
  for (let i = 0; i < 3; i++) {
    let x = ((t * 8 * (0.4 + i * 0.2) + i * 420) % (W + 240)) - 120;
    cloud(ctx, x, y + i * 46, 1 - i * 0.15, color);
  }
}

function sea(ctx, W, horizonY, H, t, top, bottom) {
  const g = ctx.createLinearGradient(0, horizonY, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, horizonY, W, H - horizonY);
  // shimmering wave lines
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const yy = horizonY + 16 + i * 22;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 12) {
      const y = yy + Math.sin(x * 0.05 + t * 2 + i) * 3;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.globalAlpha = 0.5 - i * 0.08;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// A row of classic white Greek houses with blue domes along a horizon.
function greekHouses(ctx, W, baseY, scale, t) {
  const unit = 70 * scale;
  for (let x = -unit; x < W + unit; x += unit) {
    const jig = Math.sin(x * 0.7) * 6 * scale;
    const h = (40 + (Math.abs((x * 13) % 30))) * scale;
    ctx.fillStyle = "#fbf6ee";
    rr(ctx, x, baseY - h + jig, unit * 0.86, h, 4 * scale);
    ctx.fill();
    // windows
    ctx.fillStyle = "#2a6f97";
    ctx.fillRect(x + unit * 0.16, baseY - h + jig + h * 0.3, unit * 0.16, h * 0.22);
    ctx.fillRect(x + unit * 0.5, baseY - h + jig + h * 0.3, unit * 0.16, h * 0.22);
    // blue dome on some
    if ((Math.round(x / unit)) % 2 === 0) {
      ctx.fillStyle = "#1b5e83";
      ctx.beginPath();
      ctx.arc(x + unit * 0.43, baseY - h + jig, unit * 0.24, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = "#f4b942";
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(x + unit * 0.43, baseY - h + jig - unit * 0.24);
      ctx.lineTo(x + unit * 0.43, baseY - h + jig - unit * 0.34);
      ctx.stroke();
    }
  }
}

function cypress(ctx, x, groundY, h, color) {
  ctx.fillStyle = "#6b4f2a";
  ctx.fillRect(x - 3, groundY - h * 0.15, 6, h * 0.15);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, groundY - h);
  ctx.quadraticCurveTo(x + h * 0.16, groundY - h * 0.4, x, groundY - h * 0.12);
  ctx.quadraticCurveTo(x - h * 0.16, groundY - h * 0.4, x, groundY - h);
  ctx.fill();
}

// Cobblestone / paved ground band.
function ground(ctx, W, groundY, H, top, bottom) {
  const g = ctx.createLinearGradient(0, groundY, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const y = groundY + 18 + i * ((H - groundY) / 6);
    ctx.beginPath();
    for (let x = ((i % 2) * 40); x < W; x += 80) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 36, y);
    }
    ctx.stroke();
  }
}

function pottedFlowers(ctx, x, groundY, s) {
  ctx.fillStyle = "#d98c5f";
  rr(ctx, x - 12 * s, groundY - 20 * s, 24 * s, 20 * s, 3 * s);
  ctx.fill();
  const cols = ["#e5688b", "#f4b942", "#fff", "#c96bb0"];
  for (let i = 0; i < 5; i++) {
    circle(ctx, x - 10 * s + i * 5 * s, groundY - 24 * s - (i % 2) * 5 * s, 4 * s, cols[i % cols.length]);
  }
  ctx.fillStyle = "#3f7d3f";
  ctx.fillRect(x - 1 * s, groundY - 26 * s, 2 * s, 8 * s);
}

/* ------------------------------------------------------------------ */
/*  Characters                                                        */
/* ------------------------------------------------------------------ */

const CHARS = {
  kate: { skin: "#ffe0c2", hair: "#8a5a2b", hairStyle: "wavy", top: "#20b2aa", bottom: "#146b66", cheek: "#ffb3b3" },
  lesha: { skin: "#f2cba3", hair: "#3a2c22", hairStyle: "short", top: "#3f7cac", bottom: "#28425e", cheek: "#e8a98a" },
  mom: { skin: "#ffdcbf", hair: "#b9b3ad", hairStyle: "bun", top: "#e5688b", bottom: "#7a3450", glasses: true, cheek: "#ffb3b3" },
  dad: { skin: "#eec19b", hair: "#6a6a6a", hairStyle: "cap", top: "#7a8b4f", bottom: "#4d5a33", moustache: true, cheek: "#d99a7a" },
};

// Draw a cartoon person. (x,y) is the point between the feet, h = total height.
function drawPerson(ctx, def, x, y, h, facing, phase, extra = {}) {
  const dir = facing >= 0 ? 1 : -1;
  const headR = h * 0.13;
  const headY = y - h + headR;
  const shoulderY = headY + headR * 1.5;
  const hipY = y - h * 0.42;
  const legSwing = Math.sin(phase) * h * 0.11;
  const armSwing = Math.sin(phase) * h * 0.09;
  const bob = Math.cos(phase * 2) * h * 0.012;

  ctx.save();
  ctx.translate(0, bob);
  softShadow(ctx, x, y + 2, headR * 2.1);

  // legs
  const lw = h * 0.045;
  capsule(ctx, x, hipY, x - legSwing, y, lw, def.bottom);
  capsule(ctx, x, hipY, x + legSwing, y, lw, def.bottom);
  // shoes
  circle(ctx, x - legSwing, y, lw * 1.1, "#3a3a3a");
  circle(ctx, x + legSwing, y, lw * 1.1, "#3a3a3a");

  // torso (dress/shirt)
  ctx.fillStyle = def.top;
  ctx.beginPath();
  ctx.moveTo(x - h * 0.11, shoulderY);
  ctx.lineTo(x + h * 0.11, shoulderY);
  ctx.lineTo(x + h * 0.13, hipY + h * 0.02);
  ctx.lineTo(x - h * 0.13, hipY + h * 0.02);
  ctx.closePath();
  ctx.fill();

  // arms
  const aw = h * 0.038;
  capsule(ctx, x - h * 0.1, shoulderY + h * 0.02, x - h * 0.12 + armSwing, hipY + h * 0.04, aw, def.top);
  capsule(ctx, x + h * 0.1, shoulderY + h * 0.02, x + h * 0.12 - armSwing, hipY + h * 0.04, aw, def.top);
  circle(ctx, x - h * 0.12 + armSwing, hipY + h * 0.04, aw * 0.9, def.skin);
  circle(ctx, x + h * 0.12 - armSwing, hipY + h * 0.04, aw * 0.9, def.skin);

  // neck + head
  capsule(ctx, x, shoulderY, x, headY + headR * 0.6, h * 0.028, def.skin);
  circle(ctx, x, headY, headR, def.skin);

  // cheeks
  ctx.globalAlpha = 0.6;
  circle(ctx, x - headR * 0.45 * dir, headY + headR * 0.25, headR * 0.22, def.cheek);
  circle(ctx, x + headR * 0.35 * dir, headY + headR * 0.25, headR * 0.22, def.cheek);
  ctx.globalAlpha = 1;

  // eyes (both forward-ish, offset by facing)
  const eo = headR * 0.32;
  const ex = x + dir * headR * 0.12;
  const blink = extra.blink ? 0.15 : 1;
  ctx.fillStyle = "#2b2440";
  ctx.beginPath();
  ctx.ellipse(ex - eo, headY - headR * 0.05, headR * 0.1, headR * 0.16 * blink, 0, 0, Math.PI * 2);
  ctx.ellipse(ex + eo, headY - headR * 0.05, headR * 0.1, headR * 0.16 * blink, 0, 0, Math.PI * 2);
  ctx.fill();
  // smile
  ctx.strokeStyle = "#b5546a";
  ctx.lineWidth = headR * 0.09;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(ex, headY + headR * 0.28, headR * 0.34, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // hair styles
  ctx.fillStyle = def.hair;
  if (def.hairStyle === "wavy") {
    ctx.beginPath();
    ctx.arc(x, headY - headR * 0.15, headR * 1.02, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    // side waves
    ctx.beginPath();
    ctx.moveTo(x - headR, headY);
    ctx.quadraticCurveTo(x - headR * 1.4, headY + headR * 1.2, x - headR * 0.7, headY + headR * 1.7);
    ctx.quadraticCurveTo(x - headR * 0.5, headY + headR, x - headR * 0.6, headY);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + headR, headY);
    ctx.quadraticCurveTo(x + headR * 1.4, headY + headR * 1.2, x + headR * 0.7, headY + headR * 1.7);
    ctx.quadraticCurveTo(x + headR * 0.5, headY + headR, x + headR * 0.6, headY);
    ctx.fill();
  } else if (def.hairStyle === "short") {
    ctx.beginPath();
    ctx.arc(x, headY - headR * 0.1, headR * 1.02, Math.PI * 1.02, Math.PI * 1.98);
    ctx.fill();
    ctx.fillRect(x - headR, headY - headR * 0.5, headR * 2, headR * 0.5);
  } else if (def.hairStyle === "bun") {
    ctx.beginPath();
    ctx.arc(x, headY - headR * 0.2, headR * 1.0, Math.PI, Math.PI * 2);
    ctx.fill();
    circle(ctx, x, headY - headR * 1.2, headR * 0.42, def.hair);
  } else if (def.hairStyle === "cap") {
    // sun hat / cap
    ctx.fillStyle = def.hair;
    ctx.beginPath();
    ctx.arc(x, headY - headR * 0.1, headR * 1.0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5a6b3a";
    rr(ctx, x - headR * 1.2, headY - headR * 0.35, headR * 2.4, headR * 0.3, headR * 0.15);
    ctx.fill();
    ctx.fillStyle = "#43502c";
    rr(ctx, x - headR * 0.8, headY - headR * 1.1, headR * 1.6, headR * 0.8, headR * 0.3);
    ctx.fill();
  }

  if (def.glasses) {
    ctx.strokeStyle = "#5a4a3a";
    ctx.lineWidth = headR * 0.08;
    ctx.beginPath();
    ctx.arc(ex - eo, headY - headR * 0.05, headR * 0.22, 0, Math.PI * 2);
    ctx.arc(ex + eo, headY - headR * 0.05, headR * 0.22, 0, Math.PI * 2);
    ctx.moveTo(ex - eo + headR * 0.22, headY - headR * 0.05);
    ctx.lineTo(ex + eo - headR * 0.22, headY - headR * 0.05);
    ctx.stroke();
  }
  if (def.moustache) {
    ctx.strokeStyle = def.hair;
    ctx.lineWidth = headR * 0.16;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ex - headR * 0.28, headY + headR * 0.18);
    ctx.quadraticCurveTo(ex, headY + headR * 0.3, ex + headR * 0.28, headY + headR * 0.18);
    ctx.stroke();
  }

  ctx.restore();
}

// Golden cartoon dog. (x,y) at feet, len = body length.
function drawDog(ctx, x, y, len, facing, phase) {
  const dir = facing >= 0 ? 1 : -1;
  const s = len / 60;
  const legY = y;
  const bodyY = y - 20 * s;
  const swing = Math.sin(phase) * 6 * s;
  ctx.save();
  softShadow(ctx, x, y + 2, 34 * s);
  const gold = "#e0a763";
  const goldD = "#b9803f";
  // tail (wagging)
  ctx.strokeStyle = gold;
  ctx.lineWidth = 6 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - dir * 26 * s, bodyY);
  ctx.quadraticCurveTo(
    x - dir * 40 * s,
    bodyY - 18 * s - Math.sin(phase * 3) * 6 * s,
    x - dir * 44 * s,
    bodyY - 26 * s - Math.sin(phase * 3) * 8 * s
  );
  ctx.stroke();
  // legs
  capsule(ctx, x - 14 * s, bodyY + 6 * s, x - 14 * s - swing, legY, 4 * s, goldD);
  capsule(ctx, x + 14 * s, bodyY + 6 * s, x + 14 * s + swing, legY, 4 * s, goldD);
  capsule(ctx, x - 8 * s, bodyY + 6 * s, x - 8 * s + swing, legY, 4 * s, gold);
  capsule(ctx, x + 18 * s, bodyY + 6 * s, x + 18 * s - swing, legY, 4 * s, gold);
  // body
  ctx.fillStyle = gold;
  rr(ctx, x - 26 * s, bodyY - 10 * s, 52 * s, 22 * s, 11 * s);
  ctx.fill();
  // head
  const hx = x + dir * 26 * s;
  const hy = bodyY - 8 * s;
  circle(ctx, hx, hy, 13 * s, gold);
  // snout
  ctx.fillStyle = gold;
  rr(ctx, hx + dir * 4 * s, hy + 2 * s, dir * 14 * s, 9 * s, 4 * s);
  ctx.fill();
  circle(ctx, hx + dir * 15 * s, hy + 4 * s, 3 * s, "#3a2a1a"); // nose
  // ear
  ctx.fillStyle = goldD;
  ctx.beginPath();
  ctx.ellipse(hx - dir * 6 * s, hy - 8 * s, 6 * s, 11 * s, dir * 0.4, 0, Math.PI * 2);
  ctx.fill();
  // eye
  circle(ctx, hx + dir * 5 * s, hy - 2 * s, 2.4 * s, "#2b2440");
  // collar
  ctx.strokeStyle = "#e5688b";
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.arc(hx - dir * 8 * s, hy + 6 * s, 8 * s, -0.3, 1.2);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Collectible items                                                 */
/* ------------------------------------------------------------------ */

function drawItem(ctx, name, x, y, size, t) {
  const bob = Math.sin(t * 2 + x) * 3;
  ctx.save();
  ctx.translate(x, y + bob);
  // sparkle halo
  ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 3 + x);
  circle(ctx, 0, 0, size * 0.85, "rgba(255,225,140,0.5)");
  ctx.globalAlpha = 1;
  const s = size / 24;
  switch (name) {
    case "Map": {
      ctx.fillStyle = "#f0e2c0";
      rr(ctx, -14 * s, -10 * s, 28 * s, 20 * s, 3 * s);
      ctx.fill();
      ctx.strokeStyle = "#c9a35a";
      ctx.lineWidth = 2 * s;
      ctx.stroke();
      ctx.strokeStyle = "#c0392b";
      ctx.setLineDash([3 * s, 3 * s]);
      ctx.beginPath();
      ctx.moveTo(-8 * s, 4 * s);
      ctx.lineTo(0, -3 * s);
      ctx.lineTo(8 * s, 2 * s);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#c0392b";
      ctx.font = `${10 * s}px serif`;
      ctx.fillText("✕", 6 * s, 6 * s);
      break;
    }
    case "Bread": {
      ctx.fillStyle = "#d9a441";
      ctx.beginPath();
      ctx.ellipse(0, 0, 15 * s, 9 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#a9761f";
      ctx.lineWidth = 1.5 * s;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 5 * s, -7 * s);
        ctx.lineTo(i * 5 * s + 3 * s, 7 * s);
        ctx.stroke();
      }
      break;
    }
    case "Onion": {
      ctx.fillStyle = "#b5476b";
      ctx.beginPath();
      ctx.ellipse(0, 2 * s, 11 * s, 13 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8fae4d";
      ctx.beginPath();
      ctx.moveTo(0, -10 * s);
      ctx.lineTo(-4 * s, -20 * s);
      ctx.moveTo(0, -10 * s);
      ctx.lineTo(4 * s, -20 * s);
      ctx.strokeStyle = "#8fae4d";
      ctx.lineWidth = 2 * s;
      ctx.stroke();
      break;
    }
    case "Coffee": {
      ctx.fillStyle = "#fff";
      rr(ctx, -9 * s, -12 * s, 18 * s, 22 * s, 3 * s);
      ctx.fill();
      ctx.fillStyle = "#6f4e37";
      rr(ctx, -7 * s, -10 * s, 14 * s, 7 * s, 2 * s);
      ctx.fill();
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(0, -14 * s);
      ctx.lineTo(0, -20 * s);
      ctx.stroke();
      circle(ctx, 0, -21 * s, 2 * s, "#e5688b");
      break;
    }
    case "Perfume": {
      ctx.fillStyle = "#e8b7d4";
      rr(ctx, -8 * s, -4 * s, 16 * s, 16 * s, 4 * s);
      ctx.fill();
      ctx.fillStyle = "#c98bb3";
      ctx.fillRect(-3 * s, -12 * s, 6 * s, 8 * s);
      ctx.fillStyle = "#f4b942";
      rr(ctx, -4 * s, -16 * s, 8 * s, 5 * s, 1.5 * s);
      ctx.fill();
      break;
    }
    case "Seashell": {
      ctx.fillStyle = "#f6ccd8";
      ctx.beginPath();
      ctx.moveTo(0, 10 * s);
      ctx.arc(0, -2 * s, 13 * s, Math.PI * 0.05, Math.PI * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#d68ba1";
      ctx.lineWidth = 1.4 * s;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 9 * s);
        ctx.lineTo(i * 6 * s, -12 * s);
        ctx.stroke();
      }
      break;
    }
    case "IceCream": {
      ctx.fillStyle = "#e6b877";
      ctx.beginPath();
      ctx.moveTo(-7 * s, -2 * s);
      ctx.lineTo(7 * s, -2 * s);
      ctx.lineTo(0, 14 * s);
      ctx.closePath();
      ctx.fill();
      circle(ctx, -3 * s, -6 * s, 7 * s, "#f7b3c2");
      circle(ctx, 4 * s, -8 * s, 7 * s, "#b7e0d0");
      circle(ctx, 0, -14 * s, 3 * s, "#c0392b");
      break;
    }
    case "Flowers": {
      ctx.strokeStyle = "#3f7d3f";
      ctx.lineWidth = 2 * s;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 5 * s, 12 * s);
        ctx.lineTo(i * 3 * s, -6 * s);
        ctx.stroke();
      }
      const cols = ["#e5688b", "#f4b942", "#c96bb0"];
      for (let i = -1; i <= 1; i++) {
        const cx = i * 5 * s,
          cy = -8 * s;
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          circle(ctx, cx + Math.cos(a) * 4 * s, cy + Math.sin(a) * 4 * s, 3 * s, cols[i + 1]);
        }
        circle(ctx, cx, cy, 2.5 * s, "#fff3c0");
      }
      break;
    }
    case "Gift": {
      ctx.fillStyle = "#e5688b";
      rr(ctx, -11 * s, -8 * s, 22 * s, 18 * s, 3 * s);
      ctx.fill();
      ctx.fillStyle = "#f4b942";
      ctx.fillRect(-2 * s, -8 * s, 4 * s, 18 * s);
      ctx.fillRect(-11 * s, -1 * s, 22 * s, 4 * s);
      circle(ctx, -4 * s, -10 * s, 4 * s, "#f4b942");
      circle(ctx, 4 * s, -10 * s, 4 * s, "#f4b942");
      break;
    }
    case "Cake": {
      ctx.fillStyle = "#f7d9e3";
      rr(ctx, -14 * s, -4 * s, 28 * s, 16 * s, 3 * s);
      ctx.fill();
      ctx.fillStyle = "#fff6fa";
      rr(ctx, -14 * s, -8 * s, 28 * s, 8 * s, 4 * s);
      ctx.fill();
      for (let i = -1; i <= 1; i++) {
        ctx.strokeStyle = "#f4b942";
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(i * 8 * s, -8 * s);
        ctx.lineTo(i * 8 * s, -16 * s);
        ctx.stroke();
        // flame
        ctx.fillStyle = "#ffb020";
        ctx.beginPath();
        ctx.ellipse(i * 8 * s, -18 * s, 2.2 * s, 4 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    default:
      circle(ctx, 0, 0, size * 0.5, "#f4b942");
  }
  ctx.restore();
}

export const Art = {
  drawPerson,
  drawDog,
  drawItem,
  CHARS,
  helpers: { rr, circle, capsule, softShadow, skyGradient, sun, stars, clouds, sea, greekHouses, cypress, ground, pottedFlowers },
};
