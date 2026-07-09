// portraits.js — loads the real photo faces from assets/faces/ and draws them
// as round portraits. If a photo is missing, it silently falls back to the
// hand-drawn character so the game always works (even before you add photos).
import { Art } from "./art.js";
import { drawPortrait } from "./game.js";

// Which people can have a photo, and the drawn character preset used as fallback.
const IDS = ["kate", "husband", "mom", "dad", "dog"];
const EXTS = ["jpg", "jpeg", "png", "webp"];

const cache = {}; // id -> HTMLImageElement (loaded) or false (no photo)

function tryLoad(id, exts) {
  return new Promise((resolve) => {
    if (!exts.length) return resolve(false);
    const [ext, ...rest] = exts;
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(tryLoad(id, rest));
    img.src = `./assets/faces/${id}.${ext}`;
  });
}

/** Preload every available face photo. Never rejects. */
export async function preloadFaces() {
  await Promise.all(
    IDS.map(async (id) => {
      cache[id] = await tryLoad(id, EXTS);
    })
  );
}

export function hasPhoto(id) {
  return !!cache[id];
}

/**
 * Draw a round portrait of `id` centred at (cx,cy) with radius r.
 * Uses the real photo (cover-fit, circular) when available, else the drawn art.
 */
export function drawFace(ctx, id, cx, cy, r) {
  const img = cache[id];
  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    // cover-fit the image into the circle's bounding box
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max((2 * r) / iw, (2 * r) / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
    ctx.restore();
    // soft ring
    ctx.lineWidth = Math.max(2, r * 0.06);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  // fallback: hand-drawn portrait inside a circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#cfe8f5";
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // reuse the drawn preset, scaled to the circle
  const s = (r * 2) / 120;
  ctx.translate(cx - r, cy - r);
  ctx.scale(s, s);
  drawPortrait(ctx, id);
  ctx.restore();
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}
