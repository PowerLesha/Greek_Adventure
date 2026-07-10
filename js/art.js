// art.js — everything you see is drawn here with canvas code.
// No image files => nothing to break offline, and it scales to any screen.

/* ------------------------------------------------------------------ */
/*  Small drawing helpers                                             */
/* ------------------------------------------------------------------ */

function rr(ctx, x, y, w, h, r) {
  if (w < 0) { x += w; w = -w; }   // tolerate negative width/height
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
  kate: { skin: "#ffe0c2", hair: "#bda06f", hairStyle: "bob", top: "#b98fd6", bottom: "#6f4f96", sunglasses: true, cheek: "#ffc2b3" },
  lesha: { skin: "#f2cba3", hair: "#565a60", hairStyle: "cap", beard: "#6b4a2f", top: "#3f7cac", bottom: "#28425e", cheek: "#e8a98a" },
  mom: { skin: "#ffe0c8", hair: "#6b4a34", hairStyle: "bob", dress: true, top: "#6f9ec4", bottom: "#41607a", glasses: true, cheek: "#ff9a9a" },
  dad: { skin: "#f4ceac", hair: "#e6e4df", hairStyle: "long", top: "#bcbfc2", bottom: "#5e6470", glasses: true, cheek: "#f0a888" },
};

// Draw a cartoon person. (x,y) = point between the feet, h = total height.
// Proportions ~4.8 heads tall for a clean, balanced cartoon look.
function drawPerson(ctx, def, x, y, h, facing, phase, extra = {}) {
  const dir = facing >= 0 ? 1 : -1;
  const headR = h * 0.105;
  const headY = y - h + headR;            // head centre
  const headBottom = headY + headR;
  const shoulderY = headBottom + h * 0.03;
  const hipY = y - h * 0.44;
  const footY = y;
  const bob = Math.sin(phase) * h * 0.006; // gentle breathing
  const dress = !!def.dress;

  ctx.save();
  ctx.translate(0, bob);
  // squash & stretch about the feet (extra.squash: <1 squashed, >1 stretched)
  const sq = extra.squash || 1;
  if (sq !== 1) {
    ctx.translate(x, footY);
    ctx.scale(1 + (1 - sq) * 0.7, sq);
    ctx.translate(-x, -footY);
  }
  softShadow(ctx, x, footY, headR * 1.7 * (sq < 1 ? 1.15 : 1));

  // animation drivers
  const air = extra.air || 0;   // >0 rising, <0 falling, 0 grounded
  const run = extra.run || 0;   // 0..1 running-swing amplitude
  const sw = Math.sin(phase);

  // ---- legs + shoes (animated) ----
  const lw = h * 0.04;
  const spread = h * 0.045;
  let fAx, fBx, fAy, fBy;
  if (air > 0) { fAx = -spread * 0.5; fBx = spread * 0.5; fAy = h * 0.07; fBy = h * 0.11; }      // tucked
  else if (air < 0) { fAx = -spread * 1.35; fBx = spread * 1.15; fAy = 0; fBy = 0; }             // reaching
  else {
    fAx = -spread + run * sw * h * 0.11; fBx = spread - run * sw * h * 0.11;                     // stride
    fAy = run > 0 ? Math.max(0, sw) * h * 0.05 : 0;
    fBy = run > 0 ? Math.max(0, -sw) * h * 0.05 : 0;
  }
  capsule(ctx, x - h * 0.028, hipY, x + fAx, footY - fAy - lw * 0.5, lw, def.bottom);
  capsule(ctx, x + h * 0.028, hipY, x + fBx, footY - fBy - lw * 0.5, lw, def.bottom);
  ctx.fillStyle = "#3d3a48";
  for (const f of [[fAx, fAy], [fBx, fBy]]) {
    ctx.beginPath();
    ctx.ellipse(x + f[0] + dir * lw * 0.35, footY - f[1] - lw * 0.4, lw * 0.95, lw * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- torso ----
  const shoulderW = h * 0.082;
  ctx.fillStyle = def.top;
  ctx.beginPath();
  if (dress) {
    const hemW = h * 0.135;
    ctx.moveTo(x - shoulderW, shoulderY);
    ctx.lineTo(x + shoulderW, shoulderY);
    ctx.quadraticCurveTo(x + hemW, hipY - h * 0.02, x + hemW, hipY + h * 0.05);
    ctx.lineTo(x - hemW, hipY + h * 0.05);
    ctx.quadraticCurveTo(x - hemW, hipY - h * 0.02, x - shoulderW, shoulderY);
  } else {
    const waistW = h * 0.07;
    ctx.moveTo(x - shoulderW, shoulderY);
    ctx.lineTo(x + shoulderW, shoulderY);
    ctx.lineTo(x + waistW, hipY + h * 0.02);
    ctx.lineTo(x - waistW, hipY + h * 0.02);
  }
  ctx.closePath();
  ctx.fill();

  // ---- arms (animated) ----
  const aw = h * 0.03;
  const handY = hipY + (dress ? -h * 0.01 : h * 0.0);
  const shL = x - shoulderW * 0.9, shR = x + shoulderW * 0.9;
  let hAx, hAy, hBx, hBy;
  if (air > 0) { hAx = x - shoulderW - h * 0.05; hAy = shoulderY - h * 0.03; hBx = x + shoulderW + h * 0.05; hBy = shoulderY - h * 0.03; } // up
  else if (air < 0) { hAx = x - shoulderW - h * 0.06; hAy = handY - h * 0.05; hBx = x + shoulderW + h * 0.06; hBy = handY - h * 0.05; }      // out
  else {
    hAx = x - shoulderW - h * 0.015 - run * sw * h * 0.06; hAy = handY - run * Math.max(0, -sw) * h * 0.05;
    hBx = x + shoulderW + h * 0.015 - run * sw * h * 0.06; hBy = handY - run * Math.max(0, sw) * h * 0.05;
  }
  capsule(ctx, shL, shoulderY + h * 0.015, hAx, hAy, aw, def.top);
  capsule(ctx, shR, shoulderY + h * 0.015, hBx, hBy, aw, def.top);
  circle(ctx, hAx, hAy, aw * 0.8, def.skin);
  circle(ctx, hBx, hBy, aw * 0.8, def.skin);

  // ---- neck + head ----
  capsule(ctx, x, shoulderY + h * 0.004, x, headBottom - h * 0.004, h * 0.022, def.skin);

  // back hair (volume behind the head), then head, then face, then front hair
  ctx.fillStyle = def.hair;
  if (def.hairStyle === "wavy") {
    ctx.beginPath();
    ctx.ellipse(x, headY + headR * 0.55, headR * 1.18, headR * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (def.hairStyle === "long") {
    // shoulder-length: rounded back hair framing the face, reaching the shoulders
    ctx.beginPath();
    ctx.moveTo(x - headR * 1.12, headY - headR * 0.2);
    ctx.quadraticCurveTo(x - headR * 1.32, headY + headR * 1.2, x - headR * 0.85, shoulderY - h * 0.01);
    ctx.lineTo(x + headR * 0.85, shoulderY - h * 0.01);
    ctx.quadraticCurveTo(x + headR * 1.32, headY + headR * 1.2, x + headR * 1.12, headY - headR * 0.2);
    ctx.quadraticCurveTo(x, headY - headR * 1.35, x - headR * 1.12, headY - headR * 0.2);
    ctx.fill();
  } else if (def.hairStyle === "bun") {
    ctx.beginPath();
    ctx.ellipse(x, headY, headR * 1.12, headR * 1.14, 0, 0, Math.PI * 2);
    ctx.fill();
    circle(ctx, x, headY - headR * 1.02, headR * 0.42, def.hair);
  } else if (def.hairStyle === "curly") {
    // a halo of overlapping curls around the top & sides; the face circle sits on top
    const curls = [
      [-1.0, -0.15, 0.55], [-0.9, -0.8, 0.5], [-0.4, -1.15, 0.56], [0.15, -1.22, 0.54],
      [0.68, -1.0, 0.52], [1.0, -0.4, 0.52], [1.05, 0.3, 0.44], [-1.06, 0.4, 0.44],
      [-0.72, 0.92, 0.4], [0.78, 0.85, 0.4],
    ];
    for (const c of curls) circle(ctx, x + c[0] * headR, headY + c[1] * headR, c[2] * headR, def.hair);
  } else if (def.hairStyle === "bob") {
    // short chin-length wavy bob framing the face; tips tuck in at the jaw
    ctx.beginPath();
    ctx.moveTo(x - headR * 1.12, headY + headR * 0.85);
    ctx.quadraticCurveTo(x - headR * 1.34, headY - headR * 0.15, x - headR * 0.8, headY - headR * 0.95);
    ctx.quadraticCurveTo(x, headY - headR * 1.4, x + headR * 0.8, headY - headR * 0.95);
    ctx.quadraticCurveTo(x + headR * 1.34, headY - headR * 0.15, x + headR * 1.12, headY + headR * 0.85);
    ctx.quadraticCurveTo(x + headR * 0.95, headY + headR * 1.02, x + headR * 0.62, headY + headR * 0.86);
    ctx.lineTo(x - headR * 0.62, headY + headR * 0.86);
    ctx.quadraticCurveTo(x - headR * 0.95, headY + headR * 1.02, x - headR * 1.12, headY + headR * 0.85);
    ctx.closePath();
    ctx.fill();
  }

  circle(ctx, x, headY, headR, def.skin);

  // cheeks
  ctx.globalAlpha = 0.5;
  circle(ctx, x - headR * 0.52, headY + headR * 0.3, headR * 0.2, def.cheek);
  circle(ctx, x + headR * 0.52, headY + headR * 0.3, headR * 0.2, def.cheek);
  ctx.globalAlpha = 1;

  // beard — fills the lower face; eyes & smile are drawn on top afterwards
  if (def.beard) {
    ctx.save();
    ctx.beginPath();                       // clip to a face-shaped ellipse so it hugs the jaw
    ctx.ellipse(x, headY + headR * 0.25, headR * 1.02, headR * 1.32, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = def.beard;
    const eyeYb = headY + headR * 0.04;
    ctx.fillRect(x - headR * 1.1, eyeYb + headR * 0.22, headR * 2.2, headR * 1.6);  // jaw + chin
    ctx.fillRect(x - headR * 0.55, eyeYb + headR * 0.26, headR * 1.1, headR * 0.2); // moustache
    ctx.restore();
  }

  // eyes
  const eo = headR * 0.36;
  const eyeY = headY + headR * 0.04;
  const blink = extra.blink ? 0.12 : 1;
  ctx.fillStyle = "#3a3346";
  ctx.beginPath();
  ctx.ellipse(x - eo, eyeY, headR * 0.1, headR * 0.16 * blink, 0, 0, Math.PI * 2);
  ctx.ellipse(x + eo, eyeY, headR * 0.1, headR * 0.16 * blink, 0, 0, Math.PI * 2);
  ctx.fill();
  // tiny eye highlight
  if (blink > 0.5) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    circle(ctx, x - eo + headR * 0.04, eyeY - headR * 0.05, headR * 0.03, "rgba(255,255,255,0.85)");
    circle(ctx, x + eo + headR * 0.04, eyeY - headR * 0.05, headR * 0.03, "rgba(255,255,255,0.85)");
  }
  // smile
  ctx.strokeStyle = "#c56a7a";
  ctx.lineWidth = headR * 0.08;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(x, eyeY + headR * 0.26, headR * 0.3, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();

  // front hair (fringe) — clipped to the head so it always fits
  if (def.hairStyle === "curly") {
    // a row of little curls along the hairline
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, headY, headR, 0, Math.PI * 2);
    ctx.clip();
    for (const c of [[-0.78, -0.7, 0.42], [-0.36, -0.9, 0.44], [0.08, -0.92, 0.44], [0.5, -0.82, 0.42], [0.85, -0.55, 0.38]]) {
      circle(ctx, x + c[0] * headR, headY + c[1] * headR, c[2] * headR, def.hair);
    }
    ctx.restore();
  } else if (def.hairStyle === "bald") {
    // bald on top — no hair drawn (a beard usually carries the look)
  } else if (def.hairStyle !== "cap") {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, headY, headR, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = def.hair;
    ctx.beginPath();
    ctx.moveTo(x - headR * 1.1, headY - headR * 1.1);
    ctx.lineTo(x + headR * 1.1, headY - headR * 1.1);
    ctx.lineTo(x + headR * 1.1, headY - headR * 0.12);
    // side-swept fringe
    ctx.quadraticCurveTo(x + headR * 0.2, headY + headR * 0.12, x - headR * 0.15, headY - headR * 0.02);
    ctx.quadraticCurveTo(x - headR * 0.7, headY - headR * 0.12, x - headR * 1.1, headY + headR * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else {
    // sun cap / hat for Dad
    ctx.fillStyle = def.hair;
    ctx.beginPath();
    ctx.arc(x, headY - headR * 0.05, headR * 1.0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    rr(ctx, x - headR * 1.25, headY - headR * 0.28, headR * 2.5, headR * 0.26, headR * 0.13); ctx.fill();
    ctx.fillStyle = def.hair;
    rr(ctx, x - headR * 1.25, headY - headR * 0.34, headR * 2.5, headR * 0.2, headR * 0.1); ctx.fill();
  }

  // sunglasses pushed up on the head (Kate's signature)
  if (def.sunglasses) {
    const gy = headY - headR * 0.52;
    ctx.fillStyle = "rgba(35,35,50,0.9)";
    rr(ctx, x - headR * 0.66, gy - headR * 0.18, headR * 0.52, headR * 0.34, headR * 0.12); ctx.fill();
    rr(ctx, x + headR * 0.14, gy - headR * 0.18, headR * 0.52, headR * 0.34, headR * 0.12); ctx.fill();
    ctx.strokeStyle = "#23232f"; ctx.lineWidth = headR * 0.06; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - headR * 0.14, gy - headR * 0.02); ctx.lineTo(x + headR * 0.14, gy - headR * 0.02); // bridge
    ctx.moveTo(x - headR * 0.66, gy); ctx.lineTo(x - headR * 0.92, gy + headR * 0.06);               // temples
    ctx.moveTo(x + headR * 0.66, gy); ctx.lineTo(x + headR * 0.92, gy + headR * 0.06);
    ctx.stroke();
  }

  // glasses / moustache
  if (def.glasses) {
    ctx.strokeStyle = "#4a4450";
    ctx.lineWidth = headR * 0.07;
    ctx.beginPath();
    ctx.arc(x - eo, eyeY, headR * 0.22, 0, Math.PI * 2);
    ctx.arc(x + eo, eyeY, headR * 0.22, 0, Math.PI * 2);
    ctx.moveTo(x - eo + headR * 0.22, eyeY);
    ctx.lineTo(x + eo - headR * 0.22, eyeY);
    ctx.stroke();
  }
  if (def.moustache) {
    ctx.strokeStyle = def.hair;
    ctx.lineWidth = headR * 0.14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - headR * 0.3, eyeY + headR * 0.5);
    ctx.quadraticCurveTo(x, eyeY + headR * 0.64, x + headR * 0.3, eyeY + headR * 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

// Yorkshire Terrier. (x,y) at feet, len = body length. Steel-blue silky coat,
// tan face & legs, perky ears, little topknot bow.
function drawDog(ctx, x, y, len, facing, phase) {
  const dir = facing >= 0 ? 1 : -1;
  const s = len / 60;
  const legY = y;
  const bodyY = y - 16 * s;
  const swing = Math.sin(phase) * 4 * s;
  const wag = Math.sin(phase * 3) * 0.35;
  ctx.save();
  ctx.lineCap = "round";
  softShadow(ctx, x, y + 2, 28 * s);
  const blue = "#7f8ca0", blueD = "#5f6b80";
  const tan = "#cf9a55", tanD = "#a9743a";

  // legs (tan, short)
  capsule(ctx, x - 13 * s, bodyY + 4 * s, x - 13 * s - swing, legY, 3.4 * s, tanD);
  capsule(ctx, x + 11 * s, bodyY + 4 * s, x + 11 * s + swing, legY, 3.4 * s, tanD);
  capsule(ctx, x - 7 * s, bodyY + 4 * s, x - 7 * s + swing, legY, 3.4 * s, tan);
  capsule(ctx, x + 15 * s, bodyY + 4 * s, x + 15 * s - swing, legY, 3.4 * s, tan);

  // little upright tail (grey), wagging
  ctx.save();
  ctx.translate(x - dir * 21 * s, bodyY - 6 * s);
  ctx.rotate(-dir * 0.3 + wag);
  ctx.fillStyle = blue; rr(ctx, -3 * s, -15 * s, 6 * s, 17 * s, 3 * s); ctx.fill();
  ctx.restore();

  // body — long silky blue-grey coat
  ctx.fillStyle = blue;
  rr(ctx, x - 23 * s, bodyY - 9 * s, 46 * s, 21 * s, 10 * s); ctx.fill();
  // shaggy coat hem draping toward the feet
  ctx.fillStyle = blueD;
  ctx.beginPath();
  ctx.moveTo(x - 23 * s, bodyY + 2 * s);
  for (let i = 0; i <= 8; i++) {
    const xx = x - 23 * s + 46 * s * (i / 8);
    ctx.lineTo(xx, y - 5 * s + (i % 2 ? 3 * s : -1 * s));
  }
  ctx.lineTo(x + 23 * s, bodyY + 2 * s);
  ctx.closePath(); ctx.fill();
  // tan chest patch (front/underside)
  ctx.fillStyle = tan;
  ctx.beginPath(); ctx.ellipse(x + dir * 13 * s, bodyY + 5 * s, 11 * s, 8 * s, 0, 0, Math.PI * 2); ctx.fill();

  // head (tan)
  const hx = x + dir * 23 * s, hy = bodyY - 7 * s, hr = 11 * s;
  // perky ears (erect V's), drawn behind the head
  ctx.fillStyle = tanD;
  for (const eo of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + eo * 6 * s, hy - 7 * s);
    ctx.lineTo(hx + eo * 10 * s, hy - 17 * s);
    ctx.lineTo(hx + eo * 2 * s, hy - 9 * s);
    ctx.closePath(); ctx.fill();
  }
  circle(ctx, hx, hy, hr, tan);
  // topknot tuft
  circle(ctx, hx, hy - hr * 0.95, hr * 0.42, tanD);
  // muzzle + nose
  ctx.fillStyle = tan;
  ctx.beginPath(); ctx.ellipse(hx + dir * 6 * s, hy + 3 * s, 6 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
  circle(ctx, hx + dir * 11 * s, hy + 2.5 * s, 2.6 * s, "#2b2440"); // nose
  // eye (dark button + highlight)
  circle(ctx, hx + dir * 2 * s, hy - 1 * s, 2.3 * s, "#2b2440");
  circle(ctx, hx + dir * 1.3 * s, hy - 1.7 * s, 0.8 * s, "#fff");
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
