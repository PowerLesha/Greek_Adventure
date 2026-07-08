// scenes.js — the 8 locations of Kate's birthday journey.
// Each scene draws its own hand-made background and lists its items + character.
import { Art } from "./art.js";

const H = Art.helpers;

// 💡 Easy to personalise: change the dog's name here.
export const DOG_NAME = "Lucky";

/* ---- shared background layers ---------------------------------- */

function townBackdrop(ctx, W, HH, groundY, t, opts) {
  H.skyGradient(ctx, W, HH, opts.sky);
  if (opts.stars) H.stars(ctx, W, HH, t);
  if (opts.sun) H.sun(ctx, opts.sun.x * W, opts.sun.y * HH, opts.sun.r, opts.sun.c, opts.sun.g);
  H.clouds(ctx, W, HH, t, opts.cloud || "rgba(255,255,255,0.85)");
  // far sea strip behind the houses
  const horizon = groundY - HH * 0.14;
  H.sea(ctx, W, horizon, groundY - HH * 0.02, t, opts.seaTop, opts.seaBottom);
  H.greekHouses(ctx, W, groundY - HH * 0.02, 1, t);
  H.ground(ctx, W, groundY, HH, opts.gTop, opts.gBottom);
}

function beachBackdrop(ctx, W, HH, groundY, t, opts) {
  H.skyGradient(ctx, W, HH, opts.sky);
  if (opts.stars) H.stars(ctx, W, HH, t);
  if (opts.sun) H.sun(ctx, opts.sun.x * W, opts.sun.y * HH, opts.sun.r, opts.sun.c, opts.sun.g);
  H.clouds(ctx, W, HH, t, opts.cloud || "rgba(255,255,255,0.8)");
  const horizon = groundY - HH * 0.26;
  H.sea(ctx, W, horizon, groundY, t, opts.seaTop, opts.seaBottom);
  // sandy beach
  const g = ctx.createLinearGradient(0, groundY - 6, 0, HH);
  g.addColorStop(0, "#f2dfae");
  g.addColorStop(1, "#e6c988");
  ctx.fillStyle = g;
  ctx.fillRect(0, groundY - 6, W, HH - groundY + 6);
}

/* ---- palettes -------------------------------------------------- */
const PALETTES = {
  morning: {
    sky: [[0, "#a7d8ee"], [0.6, "#d6ecf5"], [1, "#f5f8ea"]],
    sun: { x: 0.18, y: 0.22, r: 26, c: "#fff4c2", g: "rgba(255,244,180,0.9)" },
    seaTop: "#7ec8e3", seaBottom: "#3f9fc4",
    gTop: "#e9d9b8", gBottom: "#cdb98d",
  },
  noon: {
    sky: [[0, "#5bb8e6"], [0.6, "#a5d8f0"], [1, "#e8f4ea"]],
    sun: { x: 0.8, y: 0.16, r: 30, c: "#fff8d0", g: "rgba(255,248,190,0.95)" },
    seaTop: "#5cc0e0", seaBottom: "#2f88b8",
    gTop: "#ecdcb6", gBottom: "#d0bb8a",
  },
  sunset: {
    sky: [[0, "#5a4a8a"], [0.45, "#e57b7b"], [0.8, "#f6b76b"], [1, "#ffe6b0"]],
    sun: { x: 0.5, y: 0.62, r: 40, c: "#ffdf8a", g: "rgba(255,170,120,0.9)" },
    cloud: "rgba(255,200,170,0.7)",
    seaTop: "#e79a7a", seaBottom: "#8a5a9a",
    gTop: "#d8b48a", gBottom: "#a98a6a",
  },
  night: {
    sky: [[0, "#0f1a3a"], [0.6, "#25305c"], [1, "#4a4a72"]],
    stars: true,
    sun: { x: 0.75, y: 0.2, r: 22, c: "#f4f0d0", g: "rgba(230,230,200,0.55)" },
    cloud: "rgba(180,190,220,0.35)",
    seaTop: "#26365e", seaBottom: "#141d38",
    gTop: "#3a3a5a", gBottom: "#242440",
  },
};

/* ---- per-scene extra props ------------------------------------ */

function marketStall(ctx, x, groundY, s) {
  // striped awning + crates of veg
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(x - 4 * s, groundY - 70 * s, 4 * s, 70 * s);
  ctx.fillRect(x + 96 * s, groundY - 70 * s, 4 * s, 70 * s);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? "#e5688b" : "#fff";
    ctx.beginPath();
    ctx.moveTo(x - 6 * s + i * 17 * s, groundY - 70 * s);
    ctx.lineTo(x - 6 * s + (i + 1) * 17 * s, groundY - 70 * s);
    ctx.lineTo(x - 6 * s + (i + 0.5) * 17 * s, groundY - 58 * s);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#b07a3a";
  H.rr(ctx, x, groundY - 28 * s, 96 * s, 20 * s, 3 * s);
  ctx.fill();
  const veg = ["#e5688b", "#f4b942", "#8fae4d", "#c0392b"];
  for (let i = 0; i < 8; i++) H.circle(ctx, x + 12 * s + i * 11 * s, groundY - 30 * s, 6 * s, veg[i % 4]);
}

function cafeTable(ctx, x, groundY, s) {
  ctx.strokeStyle = "#5a4a3a";
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(x, groundY);
  ctx.lineTo(x, groundY - 30 * s);
  ctx.stroke();
  ctx.fillStyle = "#f0e9dc";
  ctx.beginPath();
  ctx.ellipse(x, groundY - 32 * s, 26 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // little umbrella
  ctx.fillStyle = "#e5688b";
  ctx.beginPath();
  ctx.moveTo(x, groundY - 90 * s);
  ctx.lineTo(x - 34 * s, groundY - 60 * s);
  ctx.lineTo(x + 34 * s, groundY - 60 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8a5a2b";
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(x, groundY - 90 * s);
  ctx.lineTo(x, groundY - 32 * s);
  ctx.stroke();
}

function shopFront(ctx, x, groundY, s, color, label) {
  ctx.fillStyle = "#fbf6ee";
  H.rr(ctx, x, groundY - 120 * s, 150 * s, 120 * s, 6 * s);
  ctx.fill();
  ctx.fillStyle = color;
  H.rr(ctx, x + 10 * s, groundY - 116 * s, 130 * s, 24 * s, 4 * s);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `${14 * s}px "Segoe UI", sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(label, x + 75 * s, groundY - 99 * s);
  ctx.textAlign = "left";
  // door + window
  ctx.fillStyle = "#2a6f97";
  H.rr(ctx, x + 20 * s, groundY - 70 * s, 40 * s, 70 * s, 3 * s);
  ctx.fill();
  ctx.fillStyle = "#bfe3f2";
  H.rr(ctx, x + 78 * s, groundY - 70 * s, 54 * s, 44 * s, 3 * s);
  ctx.fill();
}

function stringLights(ctx, W, y, t) {
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 10) ctx.lineTo(x, y + Math.sin(x * 0.03) * 12);
  ctx.stroke();
  const cols = ["#f4b942", "#e5688b", "#7ec8e3", "#8fae4d"];
  for (let x = 20; x < W; x += 46) {
    const yy = y + Math.sin(x * 0.03) * 12 + 10;
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 3 + x);
    H.circle(ctx, x, yy, 5, cols[(x / 46) % 4 | 0]);
  }
  ctx.globalAlpha = 1;
}

/* ---- the scenes ------------------------------------------------ */

export const scenes = [
  {
    id: "square",
    name: "Afitos Square",
    time: "morning",
    draw(ctx, W, HH, groundY, t) {
      townBackdrop(ctx, W, HH, groundY, t, PALETTES.morning);
      H.cypress(ctx, W * 0.12, groundY, HH * 0.34, "#3f6b3a");
      H.cypress(ctx, W * 0.9, groundY, HH * 0.28, "#3f6b3a");
      H.pottedFlowers(ctx, W * 0.72, groundY, 1.4);
    },
    items: [{ name: "Map", label: "an old map", xf: 0.55, yUp: 0.14 }],
    note:
      "Good morning, birthday girl 💖  A little journey is waiting for you across our Greek town. Follow the map, gather the day's treasures, and find everyone who loves you.",
  },
  {
    id: "bakery",
    name: "The Little Bakery",
    time: "morning",
    draw(ctx, W, HH, groundY, t) {
      townBackdrop(ctx, W, HH, groundY, t, PALETTES.morning);
      shopFront(ctx, W * 0.55, groundY, 1, "#d9a441", "BAKERY");
      H.pottedFlowers(ctx, W * 0.42, groundY, 1.2);
    },
    items: [{ name: "Bread", label: "warm koulouri", xf: 0.3, yUp: 0.12 }],
    character: {
      who: "mom",
      xf: 0.7,
      name: "Mom",
      lines: [
        "There's my birthday girl! Come here, let me hug you 🤗",
        "I baked your favourite this morning — still warm.",
        "Take this cake for later. Now go, the others are waiting!",
      ],
      gift: { name: "Cake", label: "birthday cake" },
    },
  },
  {
    id: "market",
    name: "The Market",
    time: "noon",
    draw(ctx, W, HH, groundY, t) {
      townBackdrop(ctx, W, HH, groundY, t, PALETTES.noon);
      marketStall(ctx, W * 0.16, groundY, 1.1);
      marketStall(ctx, W * 0.78, groundY, 1.1);
      stringLights(ctx, W, HH * 0.3, t);
    },
    items: [
      { name: "Onion", label: "a red onion", xf: 0.4, yUp: 0.1 },
      { name: "Flowers", label: "wildflowers", xf: 0.62, yUp: 0.12 },
    ],
    character: {
      who: "dad",
      xf: 0.5,
      name: "Dad",
      lines: [
        "Ha! I knew I'd find you at the market 😄",
        "Grab the reddest onion — you always had the eye for it.",
        "These flowers are for you, my dear. Happy birthday.",
      ],
    },
  },
  {
    id: "cafe",
    name: "Seaside Café",
    time: "noon",
    draw(ctx, W, HH, groundY, t) {
      townBackdrop(ctx, W, HH, groundY, t, PALETTES.noon);
      cafeTable(ctx, W * 0.32, groundY, 1.2);
      cafeTable(ctx, W * 0.68, groundY, 1);
    },
    items: [{ name: "Coffee", label: "a Freddo Cappuccino", xf: 0.5, yUp: 0.22 }],
    note: "Your favourite spot. One Freddo Cappuccino, extra love, just how you like it ☕",
  },
  {
    id: "perfume",
    name: "The Boutique",
    time: "noon",
    draw(ctx, W, HH, groundY, t) {
      townBackdrop(ctx, W, HH, groundY, t, PALETTES.noon);
      shopFront(ctx, W * 0.5, groundY, 1, "#c98bb3", "PARFUM");
      H.pottedFlowers(ctx, W * 0.28, groundY, 1.2);
      H.pottedFlowers(ctx, W * 0.75, groundY, 1.2);
    },
    items: [{ name: "Perfume", label: "your perfume", xf: 0.62, yUp: 0.16 }],
    note: "A little scent to remember this day by. It suits you perfectly 🌸",
  },
  {
    id: "beach",
    name: "The Beach",
    time: "sunset",
    draw(ctx, W, HH, groundY, t) {
      beachBackdrop(ctx, W, HH, groundY, t, PALETTES.sunset);
      // sandcastle
      ctx.fillStyle = "#dcc189";
      H.rr(ctx, W * 0.2, groundY - 24, 40, 24, 3);
      ctx.fill();
      ctx.fillStyle = "#cbb078";
      ctx.fillRect(W * 0.2 + 4, groundY - 36, 8, 14);
      ctx.fillRect(W * 0.2 + 28, groundY - 36, 8, 14);
    },
    items: [{ name: "Seashell", label: "a pink seashell", xf: 0.3, yUp: 0.05 }],
    character: {
      who: "dog",
      xf: 0.66,
      name: DOG_NAME,
      lines: [
        `${DOG_NAME} runs up wagging his whole body! Woof! 🐕`,
        `He drops a stick at your feet — he wants to play a game before sunset!`,
      ],
      startsMinigame: true,
    },
  },
  {
    id: "harbor",
    name: "Sunset Harbor",
    time: "sunset",
    draw(ctx, W, HH, groundY, t) {
      townBackdrop(ctx, W, HH, groundY, t, PALETTES.sunset);
      stringLights(ctx, W, HH * 0.34, t);
      // a little moored boat
      ctx.fillStyle = "#8a4a3a";
      ctx.beginPath();
      ctx.moveTo(W * 0.12, groundY - 6);
      ctx.lineTo(W * 0.28, groundY - 6);
      ctx.lineTo(W * 0.25, groundY + 14);
      ctx.lineTo(W * 0.15, groundY + 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f4b942";
      ctx.beginPath();
      ctx.moveTo(W * 0.2, groundY - 6);
      ctx.lineTo(W * 0.2, groundY - 60);
      ctx.lineTo(W * 0.26, groundY - 12);
      ctx.closePath();
      ctx.fill();
    },
    items: [{ name: "IceCream", label: "ice cream to share", xf: 0.4, yUp: 0.16 }],
    character: {
      who: "lesha",
      xf: 0.6,
      name: "Lesha",
      lines: [
        "There you are. I've been waiting for you by the water 💙",
        "Look at that sunset — but honestly, I'd rather look at you.",
        "One more stop, my love. Everyone's home, and there's cake. Come with me.",
      ],
    },
  },
  {
    id: "home",
    name: "Home",
    time: "night",
    isFinale: true,
    draw(ctx, W, HH, groundY, t) {
      H.skyGradient(ctx, W, HH, PALETTES.night.sky);
      H.stars(ctx, W, HH, t);
      const p = PALETTES.night;
      H.sun(ctx, p.sun.x * W, p.sun.y * HH, p.sun.r, p.sun.c, p.sun.g); // moon
      // cozy house
      const hx = W * 0.5,
        hy = groundY;
      ctx.fillStyle = "#f3ead6";
      H.rr(ctx, hx - 130, hy - 150, 260, 150, 6);
      ctx.fill();
      ctx.fillStyle = "#b5546a";
      ctx.beginPath();
      ctx.moveTo(hx - 150, hy - 150);
      ctx.lineTo(hx, hy - 220);
      ctx.lineTo(hx + 150, hy - 150);
      ctx.closePath();
      ctx.fill();
      // warm windows
      ctx.fillStyle = "#ffd36b";
      for (const dx of [-80, 80]) H.rr(ctx, hx + dx - 26, hy - 120, 52, 52, 4), ctx.fill();
      ctx.fillStyle = "#8a5a2b";
      H.rr(ctx, hx - 26, hy - 80, 52, 80, 4);
      ctx.fill();
      stringLights(ctx, W, HH * 0.2, t);
      H.ground(ctx, W, groundY, HH, "#2f2f4a", "#1c1c30");
    },
    items: [],
  },
];

/* Draw a character preset for the dialogue portrait canvas. */
export function drawPortrait(pctx, who) {
  pctx.clearRect(0, 0, 120, 120);
  pctx.fillStyle = "#cfe8f5";
  pctx.fillRect(0, 0, 120, 120);
  if (who === "dog") {
    Art.drawDog(pctx, 60, 100, 62, 1, 0.3);
  } else {
    // person sized to fit inside the 120×120 portrait
    Art.drawPerson(pctx, Art.CHARS[who], 60, 116, 100, 1, 0, { blink: false });
  }
}
