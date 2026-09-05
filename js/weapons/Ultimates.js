// ============================================================
// ULTIMATES — unlocked at the configured player level. One choice, then
// the same ultimate can be upgraded on later level-ups.
// Activated with Q / E / the on-screen button (not auto-fire).
// ============================================================

import { distPointToSegment } from '../utils.js';
import { ULTIMATE } from '../config.js';

export class Ultimate {
  constructor(def) {
    this.id = def.id;
    this.name = def.name;
    this.icon = def.icon;
    this.blurb = def.blurb;
    this.levels = def.levels;
    this.level = 1;
    this.maxLevel = def.levels.length;
    this.cooldownTimer = 0;
    this.active = false;
    this.readyIconTimer = ULTIMATE.readyIconDurationSeconds;
    this.unlimited = false;
  }

  get stats() {
    return this.levels[this.level - 1];
  }

  canLevelUp() {
    return this.level < this.maxLevel;
  }

  levelUp() {
    if (this.canLevelUp()) this.level += 1;
  }

  isReady() {
    return this.unlimited || (this.cooldownTimer <= 0 && !this.active);
  }

  setUnlimited(enabled) {
    if (this.unlimited === enabled) return;
    this.unlimited = enabled;
    if (enabled) this.cooldownTimer = 0;
    this.readyIconTimer = !enabled && this.isReady() ? ULTIMATE.readyIconDurationSeconds : 0;
  }

  update(dt, game) {
    const wasReady = this.isReady();
    if (this.cooldownTimer > 0) this.cooldownTimer -= dt * 1000;
    this.tick(dt, game);
    if (this.unlimited) {
      this.cooldownTimer = 0;
      this.readyIconTimer = 0;
      return;
    }
    // Play once on acquisition and each transition back to ready.
    this.readyIconTimer = !this.isReady() ? 0 : !wasReady
      ? ULTIMATE.readyIconDurationSeconds
      : Math.max(0, this.readyIconTimer - dt);
  }

  tryActivate(game) {
    if (!this.isReady()) return false;
    this.activate(game);
    this.cooldownTimer = this.unlimited ? 0 : this.stats.cooldownMs;
    this.readyIconTimer = 0;
    return true;
  }

  // eslint-disable-next-line no-unused-vars
  activate(game) {}
  // eslint-disable-next-line no-unused-vars
  tick(dt, game) {}
  // eslint-disable-next-line no-unused-vars
  draw(ctx, camera, player) {}
}

const PIERCE_SHOT_LEVELS = [
  { damage: 90, cooldownMs: 12000, count: 1, speed: 720, radius: 11 },
  { damage: 110, cooldownMs: 11000, count: 1, speed: 740, radius: 12 },
  { damage: 130, cooldownMs: 10000, count: 2, speed: 760, radius: 13 },
  { damage: 155, cooldownMs: 9000, count: 2, speed: 780, radius: 14 },
  { damage: 190, cooldownMs: 8000, count: 3, speed: 820, radius: 16 },
];

export class SuperPierceShot extends Ultimate {
  constructor() {
    super({
      id: 'ult_pierce_shot',
      name: 'Súper disparo perforante',
      icon: '💠',
      blurb: 'Un proyectil enorme que atraviesa a toda la horda.',
      levels: PIERCE_SHOT_LEVELS,
    });
  }

  activate(game) {
    const { player } = game;
    const s = this.stats;
    const nearest = game.findNearestEnemy(player.x, player.y);
    const base = nearest
      ? Math.atan2(nearest.y - player.y, nearest.x - player.x)
      : player.facing >= 0 ? 0 : Math.PI;
    const spread = s.count > 1 ? 0.22 : 0;

    for (let i = 0; i < s.count; i++) {
      const offset = s.count === 1 ? 0 : (i - (s.count - 1) / 2) * spread;
      const angle = base + offset;
      const dir = { x: Math.cos(angle), y: Math.sin(angle) };
      game.spawnProjectile({
        x: player.x,
        y: player.y,
        vx: dir.x * s.speed,
        vy: dir.y * s.speed,
        damage: s.damage,
        radius: s.radius,
        pierce: 999,
        lifespan: 2.2,
        color: '#d4f4ff',
        homing: false,
        shape: 'bolt',
      });
    }
    game.shakeTimer = 180;
  }
}

const WAVE_LEVELS = [
  { damage: 55, cooldownMs: 13000, maxRadius: 200, speed: 420 },
  { damage: 70, cooldownMs: 12000, maxRadius: 230, speed: 440 },
  { damage: 88, cooldownMs: 11000, maxRadius: 260, speed: 460 },
  { damage: 108, cooldownMs: 10000, maxRadius: 300, speed: 490 },
  { damage: 135, cooldownMs: 8500, maxRadius: 340, speed: 520 },
];

export class ExplosiveWave extends Ultimate {
  constructor() {
    super({
      id: 'ult_wave',
      name: 'Onda explosiva grande',
      icon: '💥',
      blurb: 'Una onda de choque que empuja daño en un radio enorme.',
      levels: WAVE_LEVELS,
    });
  }

  activate(game) {
    const { player } = game;
    const s = this.stats;
    game.spawnShockwave(player.x, player.y, s.maxRadius, s.speed, s.damage);
    game.shakeTimer = 220;
  }
}

const ORBIT_LASER_LEVELS = [
  { damage: 16, cooldownMs: 14000, durationMs: 2200, length: 170, width: 22, beams: 1, turnRate: 2.4 },
  { damage: 20, cooldownMs: 13000, durationMs: 2600, length: 190, width: 24, beams: 1, turnRate: 2.6 },
  { damage: 26, cooldownMs: 12000, durationMs: 3000, length: 210, width: 26, beams: 1, turnRate: 2.8 },
  { damage: 30, cooldownMs: 11000, durationMs: 3400, length: 230, width: 28, beams: 2, turnRate: 3.0 },
  { damage: 38, cooldownMs: 9500, durationMs: 4000, length: 260, width: 32, beams: 2, turnRate: 3.3 },
];

export class OrbitLaser extends Ultimate {
  constructor() {
    super({
      id: 'ult_orbit_laser',
      name: 'Láser orbital',
      icon: '🌀',
      blurb: 'Un láser grande que gira alrededor del personaje.',
      levels: ORBIT_LASER_LEVELS,
    });
    this.angle = 0;
    this.age = 0;
    this.hitCd = new Map();
  }

  activate(game) {
    this.active = true;
    this.age = 0;
    this.angle = 0;
    this.hitCd.clear();
    game.shakeTimer = 120;
  }

  tick(dt, game) {
    if (!this.active) return;
    const s = this.stats;
    this.age += dt * 1000;
    this.angle += s.turnRate * dt;

    for (const [uid, t] of this.hitCd) {
      const next = t - dt * 1000;
      if (next <= 0) this.hitCd.delete(uid);
      else this.hitCd.set(uid, next);
    }

    const { player } = game;
    const beams = s.beams;
    for (let b = 0; b < beams; b++) {
      const ang = this.angle + (b * Math.PI * 2) / beams;
      const ax = player.x;
      const ay = player.y;
      const bx = ax + Math.cos(ang) * s.length;
      const by = ay + Math.sin(ang) * s.length;
      const halfW = s.width / 2;
      const minX = Math.min(ax, bx) - halfW;
      const maxX = Math.max(ax, bx) + halfW;
      const minY = Math.min(ay, by) - halfW;
      const maxY = Math.max(ay, by) + halfW;

      game.forEachEnemyInBounds(minX, minY, maxX, maxY, (enemy) => {
        if (this.hitCd.has(enemy.uid)) return;
        const d = distPointToSegment(enemy.x, enemy.y, ax, ay, bx, by);
        if (d <= enemy.radius + halfW) {
          this.hitCd.set(enemy.uid, 180);
          game.damageEnemy(enemy, s.damage, '#ff7ad9');
        }
      });
    }

    if (this.age >= s.durationMs) {
      this.active = false;
      this.hitCd.clear();
    }
  }

  draw(ctx, camera, player) {
    if (!this.active) return;
    const s = this.stats;
    const origin = camera.worldToScreen(player.x, player.y);
    const t = this.age / s.durationMs;
    const alpha = 0.85 * (1 - t * 0.25);

    for (let b = 0; b < s.beams; b++) {
      const ang = this.angle + (b * Math.PI * 2) / beamsSafe(s.beams);
      const end = camera.worldToScreen(
        player.x + Math.cos(ang) * s.length,
        player.y + Math.sin(ang) * s.length
      );
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ff4ec8';
      ctx.lineWidth = s.width;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#ff9ae0';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.7;
      ctx.strokeStyle = '#fff0fb';
      ctx.lineWidth = Math.max(4, s.width * 0.28);
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function beamsSafe(n) {
  return Math.max(1, n);
}

export const ULTIMATE_CLASSES = {
  ult_pierce_shot: SuperPierceShot,
  ult_wave: ExplosiveWave,
  ult_orbit_laser: OrbitLaser,
};

export function createUltimate(id) {
  const Cls = ULTIMATE_CLASSES[id];
  if (!Cls) throw new Error(`Unknown ultimate id: ${id}`);
  return new Cls();
}

export function listUltimates() {
  return Object.keys(ULTIMATE_CLASSES).map((id) => createUltimate(id));
}
