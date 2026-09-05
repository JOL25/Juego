// ============================================================
// PARTICLE — pooled, purely cosmetic. Two kinds: 'spark' (death
// burst dots) and 'text' (floating damage numbers).
// ============================================================

export class Particle {
  constructor() {
    this.active = false;
  }

  resetSpark(x, y, color) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 120;
    this.kind = 'spark';
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.color = color;
    this.life = 0.35 + Math.random() * 0.25;
    this.age = 0;
    this.size = 2 + Math.random() * 2;
    this.active = true;
  }

  resetText(x, y, text, color) {
    this.kind = 'text';
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 20;
    this.vy = -50;
    this.text = text;
    this.color = color;
    this.life = 0.6;
    this.age = 0;
    this.active = true;
  }

  update(dt) {
    this.age += dt;
    if (this.age >= this.life) {
      this.active = false;
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.kind === 'spark') {
      this.vx *= 0.9;
      this.vy *= 0.9;
    } else {
      this.vy *= 0.92;
    }
  }

  draw(ctx, screenX, screenY) {
    const alpha = 1 - this.age / this.life;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    if (this.kind === 'spark') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = this.color;
      ctx.font = 'bold 13px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.text, screenX, screenY);
    }
    ctx.restore();
  }
}
