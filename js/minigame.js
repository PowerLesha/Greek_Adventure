// minigame.js — a gentle "catch the falling birthday gifts" game on the beach.
// Kate holds a basket; catch enough gifts to make Lucky happy. It's designed to
// always be winnable (no way to lose) so it stays a joyful moment.
import { Art } from "./art.js";

const GIFT_KINDS = ["Gift", "Flowers", "Cake", "Seashell", "IceCream"];

export class Minigame {
  constructor(W, H, onComplete) {
    this.onComplete = onComplete;
    this.target = 6;
    this.caught = 0;
    this.gifts = [];
    this.spawn = 0;
    this.basketX = W / 2;
    this.W = W;
    this.H = H;
    this.done = false;
    this.finishTimer = 0;
    this.confetti = [];
  }

  resize(W, H) {
    this.W = W;
    this.H = H;
    this.basketX = Math.min(this.basketX, W - 40);
  }

  pointer(x /*, type */) {
    this.basketX = Math.max(46, Math.min(this.W - 46, x));
  }

  update(dt, t) {
    const groundY = this.H * 0.84;
    if (this.done) {
      this.finishTimer -= dt;
      this.confetti.forEach((c) => {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.vy += 400 * dt;
        c.r += c.spin * dt;
      });
      if (this.finishTimer <= 0 && !this._fired) {
        this._fired = true;
        this.onComplete();
      }
      return;
    }

    // spawn gifts
    this.spawn -= dt;
    if (this.spawn <= 0) {
      this.spawn = 0.9 - Math.min(0.4, this.caught * 0.05);
      this.gifts.push({
        x: 40 + Math.random() * (this.W - 80),
        y: -30,
        vy: 150 + Math.random() * 90 + this.caught * 8,
        kind: GIFT_KINDS[(Math.random() * GIFT_KINDS.length) | 0],
        caught: false,
      });
    }

    for (const g of this.gifts) {
      g.y += g.vy * dt;
      // catch check
      if (!g.caught && g.y > groundY - 40 && g.y < groundY - 4 && Math.abs(g.x - this.basketX) < 44) {
        g.caught = true;
        g.dead = true;
        this.caught++;
        if (this._onCatch) this._onCatch();
        if (this.caught >= this.target) this._win();
      }
      if (g.y > this.H + 40) g.dead = true;
    }
    this.gifts = this.gifts.filter((g) => !g.dead);
  }

  _win() {
    this.done = true;
    this.finishTimer = 1.8;
    for (let i = 0; i < 80; i++) {
      this.confetti.push({
        x: this.W / 2,
        y: this.H * 0.4,
        vx: (Math.random() - 0.5) * 500,
        vy: -Math.random() * 400 - 100,
        r: Math.random() * 6,
        spin: (Math.random() - 0.5) * 10,
        c: ["#e5688b", "#f4b942", "#7ec8e3", "#8fae4d", "#fff"][(Math.random() * 5) | 0],
      });
    }
    if (this._onWin) this._onWin();
  }

  draw(ctx, drawScene) {
    const W = this.W,
      H = this.H;
    const groundY = H * 0.84;
    drawScene(); // beach background from the scene

    // falling gifts
    for (const g of this.gifts) Art.drawItem(ctx, g.kind, g.x, g.y, 30, 0);

    // basket
    const bx = this.basketX,
      by = groundY - 10;
    Art.helpers.softShadow(ctx, bx, groundY + 8, 44);
    ctx.fillStyle = "#b07a3a";
    Art.helpers.rr(ctx, bx - 40, by - 22, 80, 30, 8);
    ctx.fill();
    ctx.strokeStyle = "#8a5a2b";
    ctx.lineWidth = 3;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(bx + i * 11, by - 22);
      ctx.lineTo(bx + i * 11, by + 8);
      ctx.stroke();
    }
    ctx.strokeStyle = "#c99a5a";
    ctx.beginPath();
    ctx.arc(bx, by - 22, 40, Math.PI, Math.PI * 2);
    ctx.stroke();
    // little Kate behind basket
    Art.drawPerson(ctx, Art.CHARS.kate, bx, by - 24, H * 0.2, 1, 0, { blink: false });

    // HUD
    ctx.fillStyle = "rgba(20,40,60,0.5)";
    Art.helpers.rr(ctx, W / 2 - 110, 24, 220, 40, 20);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "18px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🎁 Caught ${this.caught} / ${this.target}`, W / 2, 50);
    ctx.font = "14px 'Segoe UI', sans-serif";
    ctx.fillText("Drag to move the basket", W / 2, H * 0.93);
    ctx.textAlign = "left";

    // confetti on win
    for (const c of this.confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.r);
      ctx.fillStyle = c.c;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
    if (this.done) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 30px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Woof! You did it! 🐾", W / 2, H * 0.4);
      ctx.textAlign = "left";
    }
  }
}
