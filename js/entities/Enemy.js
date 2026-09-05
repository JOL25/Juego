// ============================================================
// ENEMY — pooled entity. `reset()` re-arms an inactive instance
// instead of allocating a new object, so the pool can recycle it.
// ============================================================

import { normalize } from '../utils.js';

// Unique id per *spawn* (not per pool slot) so a piercing projectile
// can't mistake a freshly-respawned enemy in a recycled slot for the
// one it already hit.
let NEXT_ENEMY_UID = 1;

// Enemy archetypes. `weight` controls spawn frequency; `minMinute`
// gates when a type starts appearing, so early game stays easy.
export const ENEMY_TYPES = {
  bat: {
    id: 'bat', label: 'Bat', color: '#8a6bb1', radius: 10,
    baseHp: 8, baseSpeed: 130, damage: 6, xpValue: 1,
    weight: 10, minMinute: 0,
  },
  ghoul: {
    id: 'ghoul', label: 'Ghoul', color: '#5a8a4a', radius: 14,
    baseHp: 18, baseSpeed: 85, damage: 10, xpValue: 3,
    weight: 8, minMinute: 0,
  },
  skeleton: {
    id: 'skeleton', label: 'Skeleton', color: '#c9c2a8', radius: 12,
    baseHp: 14, baseSpeed: 105, damage: 8, xpValue: 2,
    weight: 9, minMinute: 1,
  },
  wraith: {
    id: 'wraith', label: 'Wraith', color: '#3fa9c9', radius: 13,
    baseHp: 26, baseSpeed: 150, damage: 12, xpValue: 5,
    weight: 5, minMinute: 3,
  },
  ogre: {
    id: 'ogre', label: 'Ogre', color: '#a1442b', radius: 22,
    baseHp: 90, baseSpeed: 60, damage: 22, xpValue: 15,
    weight: 3, minMinute: 5,
  },
};

export class Enemy {
  constructor() {
    this.active = false;
  }

  reset(type, x, y, hpMult, speedMult) {
    this.uid = NEXT_ENEMY_UID++;
    this.type = type;
    this.x = x;
    this.y = y;
    this.radius = type.radius;
    this.maxHp = Math.round(type.baseHp * hpMult);
    this.hp = this.maxHp;
    this.speed = type.baseSpeed * speedMult;
    this.damage = type.damage;
    this.xpValue = type.xpValue;
    this.contactCooldown = 0; // prevents damaging the player every single frame
    this.hitFlash = 0;        // brief white flash when struck
    this.active = true;
    this.isElite = false;
    this.frozen = false;
  }

  makeElite() {
    this.isElite = true;
    this.maxHp = Math.round(this.maxHp * 2.4);
    this.hp = this.maxHp;
    this.speed *= 1.15;
    this.damage = Math.round(this.damage * 1.6);
    this.radius *= 1.25;
    this.xpValue = Math.round(this.xpValue * 3);
  }

  update(dt, playerX, playerY) {
    const dir = normalize(playerX - this.x, playerY - this.y);
    this.x += dir.x * this.speed * dt;
    this.y += dir.y * this.speed * dt;
    if (this.contactCooldown > 0) this.contactCooldown -= dt * 1000;
    if (this.hitFlash > 0) this.hitFlash -= dt * 1000;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 90;
    return this.hp <= 0;
  }

  draw(ctx, screenX, screenY) {
    ctx.save();

    const flashing = this.hitFlash > 0;
    ctx.fillStyle = flashing ? '#ffffff' : this.frozen ? '#78dff2' : this.type.color;
    ctx.strokeStyle = this.isElite ? '#ffd54a' : 'rgba(0,0,0,0.4)';
    ctx.lineWidth = this.isElite ? 3 : 1.5;

    const size = this.radius * 2;
    ctx.fillRect(screenX - this.radius, screenY - this.radius, size, size);
    ctx.strokeRect(screenX - this.radius, screenY - this.radius, size, size);

    // Inset shading gives every archetype a readable square silhouette.
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(screenX - this.radius + 3, screenY - this.radius + 3, size - 6, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(screenX - this.radius + 3, screenY + this.radius - 5, size - 6, 2);

    if (this.frozen) {
      ctx.strokeStyle = 'rgba(220,250,255,0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX - this.radius - 3, screenY - this.radius - 3, size + 6, size + 6);
    }

    // Small HP sliver above the enemy (only when damaged, keeps clutter down)
    if (this.hp < this.maxHp) {
      const w = this.radius * 2;
      const pct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(screenX - w / 2, screenY - this.radius - 8, w, 3);
      ctx.fillStyle = '#e0453f';
      ctx.fillRect(screenX - w / 2, screenY - this.radius - 8, w * pct, 3);
    }

    ctx.restore();
  }
}
