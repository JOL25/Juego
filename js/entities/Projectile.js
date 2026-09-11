// ============================================================
// PROJECTILE — pooled. Travels in a straight line (or homes,
// depending on config), damages enemies it overlaps, and expires
// after `pierce` hits or `lifespan` seconds.
// ============================================================

export const HOMING_TARGET_REFRESH_SECONDS = 0.15;

export class Projectile {
  constructor() {
    this.active = false;
  }

  reset({
    x, y, vx, vy, damage, radius, pierce, lifespan, color,
    homing = false, homingTurnRate = 0,
    explodeRadius = 0, explodeOnExpire = false, shape = 'orb',
    target = null,
  }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.damage = damage;
    this.radius = radius;
    this.pierce = pierce;
    this.lifespan = lifespan;
    this.age = 0;
    this.color = color;
    this.homing = homing;
    this.homingTurnRate = homingTurnRate;
    this.target = target;
    this.targetUid = target?.uid ?? null;
    this.targetRefreshTimer = target ? HOMING_TARGET_REFRESH_SECONDS : 0;
    this.explodeRadius = explodeRadius;
    this.explodeOnExpire = explodeOnExpire;
    this.shape = shape;
    this.didExplode = false;
    this.hitEnemyIds = new Set(); // enemy.uid values already hit by this shot
    this.active = true;
  }

  update(dt, findNearestEnemy) {
    this.age += dt;
    if (this.age >= this.lifespan) {
      this.active = false;
      return;
    }

    if (this.homing) {
      this.targetRefreshTimer -= dt;
      const targetIsValid =
        this.target?.active === true && this.target.uid === this.targetUid;
      const lostTrackedTarget = this.target !== null && !targetIsValid;

      if (lostTrackedTarget || this.targetRefreshTimer <= 0) {
        this.target = findNearestEnemy(this.x, this.y);
        this.targetUid = this.target?.uid ?? null;
        this.targetRefreshTimer = HOMING_TARGET_REFRESH_SECONDS;
      }

      const target = this.target;
      if (target) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const targetAngle = Math.atan2(dy, dx);
        const curAngle = Math.atan2(this.vy, this.vx);
        let diff = targetAngle - curAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turn = Math.sign(diff) * Math.min(Math.abs(diff), this.homingTurnRate * dt);
        const speed = Math.hypot(this.vx, this.vy);
        const newAngle = curAngle + turn;
        this.vx = Math.cos(newAngle) * speed;
        this.vy = Math.sin(newAngle) * speed;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx, screenX, screenY) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.shape === 'bolt' ? 14 : 6;

    if (this.shape === 'missile') {
      const ang = Math.atan2(this.vy, this.vx);
      ctx.translate(screenX, screenY);
      ctx.rotate(ang);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffcf5a';
      ctx.fillRect(-12, -2, 6, 4);
      ctx.fillStyle = '#ff693b';
      ctx.fillRect(-10, -1, 4, 2);
      ctx.fillStyle = '#412636';
      ctx.fillRect(-6, -4, 14, 8);
      ctx.fillStyle = '#e8d9c0';
      ctx.fillRect(-6, -2, 12, 4);
      ctx.fillStyle = '#ff8a4a';
      ctx.fillRect(6, -2, 4, 4);
      ctx.fillRect(-6, -6, 4, 2);
      ctx.fillRect(-6, 4, 4, 2);
    } else if (this.shape === 'bolt') {
      const ang = Math.atan2(this.vy, this.vx);
      ctx.translate(screenX, screenY);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 2.2, this.radius * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
