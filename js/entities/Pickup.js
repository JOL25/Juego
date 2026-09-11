// ============================================================
// PICKUP — pooled. XP gems (and rare heals) dropped by enemies.
// Gets pulled toward the player once inside the magnet radius.
// ============================================================

import { normalize, distance } from '../utils.js';
import { POWER_UPS, XP_GEM } from '../config.js';
import { drawPixelSprite } from '../rendering/PixelArt.js';

export const PICKUP_KIND = Object.freeze({
  XP: 'xp',
  HEAL: 'heal',
  MEGA_MAGNET: 'mega_magnet',
  FREEZE_CLOCK: 'freeze_clock',
  ULTIMATE_INFINITY: 'ultimate_infinity',
});

export class Pickup {
  constructor() {
    this.active = false;
  }

  reset(x, y, kind, value) {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.value = value;
    this.radius = kind === PICKUP_KIND.MEGA_MAGNET || kind === PICKUP_KIND.FREEZE_CLOCK || kind === PICKUP_KIND.ULTIMATE_INFINITY
      ? POWER_UPS.radius
      : XP_GEM.radius + (value >= XP_GEM.largeValue ? 3 : value >= XP_GEM.mediumValue ? 1 : 0);
    this.active = true;
    this.beingPulled = false;
    this.floatPhase = Math.random() * Math.PI * 2;
  }

  update(dt, playerX, playerY, magnetRadius, forcePullXp = false) {
    this.floatPhase = (this.floatPhase + dt * 2.8) % (Math.PI * 2);
    const d = distance(this.x, this.y, playerX, playerY);
    if (d < magnetRadius) this.beingPulled = true;
    const megaMagnetPull = forcePullXp && this.kind === PICKUP_KIND.XP;
    if (this.beingPulled || megaMagnetPull) {
      const dir = normalize(playerX - this.x, playerY - this.y);
      const pullSpeed = megaMagnetPull ? POWER_UPS.megaMagnetPullSpeed : 420;
      this.x += dir.x * pullSpeed * dt;
      this.y += dir.y * pullSpeed * dt;
    }
  }

  draw(ctx, screenX, screenY) {
    ctx.save();
    // Only the drawing floats; collection and attraction use the ground position.
    const lift = 4 + (Math.sin(this.floatPhase) + 1) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + this.radius * 0.7, this.radius * (0.9 - lift * 0.035), this.radius * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    screenY -= lift;
    if (this.kind === PICKUP_KIND.MEGA_MAGNET) {
      this._drawPowerUpBase(ctx, screenX, screenY, '#b96cff', '#f0c8ff');
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(screenX, screenY, 7, 0, Math.PI);
      ctx.moveTo(screenX - 7, screenY);
      ctx.lineTo(screenX - 7, screenY - 6);
      ctx.moveTo(screenX + 7, screenY);
      ctx.lineTo(screenX + 7, screenY - 6);
      ctx.stroke();
    } else if (this.kind === PICKUP_KIND.FREEZE_CLOCK) {
      this._drawPowerUpBase(ctx, screenX, screenY, '#55d9ff', '#d8f8ff');
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(screenX, screenY - 5);
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(screenX + 4, screenY + 2);
      ctx.stroke();
    } else if (this.kind === PICKUP_KIND.ULTIMATE_INFINITY) {
      this._drawPowerUpBase(ctx, screenX, screenY, '#382012', '#ff9a3c');
      ctx.fillStyle = '#ff9a3c';
      ctx.font = 'bold 28px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('∞', screenX, screenY);
    } else if (this.kind === PICKUP_KIND.HEAL) {
      ctx.fillStyle = '#ff6b81';
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = this.value >= XP_GEM.largeValue ? '#e8b13a'
        : this.value >= XP_GEM.mediumValue ? '#7ec6e0'
        : '#4fd1e0';
      drawPixelSprite(ctx, screenX, screenY, this.radius * Math.SQRT2,
        ctx.fillStyle, '#b9f4ee', [[0, -1], [1, 0], [0, 1], [-1, 0]]);
    }
    ctx.restore();
  }

  _drawPowerUpBase(ctx, x, y, color, glowColor) {
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}
