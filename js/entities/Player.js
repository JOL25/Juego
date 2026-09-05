// ============================================================
// PLAYER — the hero. Holds stats, the weapon/passive inventory,
// and handles movement, damage, and XP/leveling.
// ============================================================

import { PLAYER, WORLD, COLORS, DASH } from '../config.js';
import { clamp, normalize } from '../utils.js';

export class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.radius = PLAYER.radius;

    this.maxHp = PLAYER.baseMaxHp;
    this.hp = this.maxHp;
    this.armor = PLAYER.baseArmor;
    this.speed = PLAYER.baseSpeed;
    this.magnetRadius = PLAYER.magnetRadius;
    this.healOnKill = 0;

    // Base values passives scale from, so re-applying a passive at a
    // higher level is a clean recompute rather than a compounding stack.
    this._baseMaxHp = PLAYER.baseMaxHp;
    this._baseSpeed = PLAYER.baseSpeed;
    this._baseArmor = PLAYER.baseArmor;
    this._baseMagnetRadius = PLAYER.magnetRadius;
    this._lastMaxHp = PLAYER.baseMaxHp;

    this.level = 1;
    this.xp = 0;
    this.xpToNext = PLAYER.xpToLevel(this.level);

    this.invulnTimer = 0;
    this.facing = 1; // 1 = right, -1 = left (for weapon aim/flip)
    this.moveDir = { x: 0, y: 0 };

    this.weapons = [];   // active weapon instances — all fire at once
    this.passives = [];  // { id, name, level, apply() }
    this.ultimate = null;

    this.dashMaxCharges = DASH.baseCharges;
    this.dashCharges = DASH.baseCharges;
    this.dashRangeUpgrades = 0;
    this.dashRecharge = 0;
    this.dashActive = 0;
    this.dashDir = { x: 1, y: 0 };

    this.alive = true;
    this.kills = 0;
    this.survivalTime = 0;
  }

  get dashDistancePx() {
    return (DASH.baseDistanceCm + this.dashRangeUpgrades * DASH.rangePerUpgradeCm) * DASH.pxPerCm;
  }

  update(dt, moveVector) {
    this.survivalTime += dt;

    if (moveVector.x !== 0 || moveVector.y !== 0) {
      this.moveDir = moveVector;
      this.facing = moveVector.x !== 0 ? Math.sign(moveVector.x) : this.facing;
    }

    if (this.dashActive > 0) {
      this.dashActive -= dt;
      const duration = DASH.durationMs / 1000;
      const speed = this.dashDistancePx / duration;
      this.x += this.dashDir.x * speed * dt;
      this.y += this.dashDir.y * speed * dt;
    } else {
      this.x += moveVector.x * this.speed * dt;
      this.y += moveVector.y * this.speed * dt;
    }

    const half = WORLD.size / 2;
    this.x = clamp(this.x, -half, half);
    this.y = clamp(this.y, -half, half);

    if (this.invulnTimer > 0) this.invulnTimer -= dt * 1000;

    if (this.dashCharges < this.dashMaxCharges) {
      this.dashRecharge += dt * 1000;
      if (this.dashRecharge >= DASH.rechargeMs) {
        this.dashRecharge = 0;
        this.dashCharges += 1;
      }
    } else {
      this.dashRecharge = 0;
    }
  }

  tryDash(moveVector) {
    if (!this.alive || this.dashCharges <= 0 || this.dashActive > 0) return false;
    let dir = { x: moveVector.x, y: moveVector.y };
    if (dir.x === 0 && dir.y === 0) {
      dir = this.moveDir.x === 0 && this.moveDir.y === 0
        ? { x: this.facing, y: 0 }
        : this.moveDir;
    }
    this.dashDir = normalize(dir.x, dir.y);
    if (this.dashDir.x === 0 && this.dashDir.y === 0) this.dashDir = { x: this.facing, y: 0 };
    this.dashCharges -= 1;
    this.dashActive = DASH.durationMs / 1000;
    this.invulnTimer = Math.max(this.invulnTimer, DASH.invulnMs);
    return true;
  }

  takeDamage(amount) {
    if (this.invulnTimer > 0 || !this.alive) return false;
    const reduced = Math.max(1, amount - this.armor);
    this.hp -= reduced;
    this.invulnTimer = PLAYER.invulnerabilityMs;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
    return true;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  gainXp(amount) {
    if (!this.alive) return 0;
    this.xp += amount;
    let levels = 0;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.xpToNext = PLAYER.xpToLevel(this.level);
      levels += 1;
    }
    return levels;
  }

  isInvulnerable() {
    return this.invulnTimer > 0;
  }

  draw(ctx, screenX, screenY) {
    ctx.save();

    // Flicker while invulnerable so hits still read clearly.
    const flicker = this.isInvulnerable() && Math.floor(this.invulnTimer / 60) % 2 === 0;
    ctx.globalAlpha = flicker ? 0.4 : 1;

    if (this.dashActive > 0) {
      ctx.shadowColor = '#7ec6e0';
      ctx.shadowBlur = 16;
    }

    // Body
    ctx.fillStyle = COLORS.player;
    ctx.strokeStyle = COLORS.playerOutline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Simple facing indicator (a little "nose")
    ctx.fillStyle = COLORS.hpBar;
    ctx.beginPath();
    ctx.arc(screenX + this.facing * (this.radius - 4), screenY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
