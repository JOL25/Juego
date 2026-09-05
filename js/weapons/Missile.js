// ============================================================
// MISSILE — every 10s a homing rocket that explodes on impact.
// ============================================================

import { Weapon } from './Weapon.js';
import { normalize } from '../utils.js';

export const MISSILE_LEVELS = [
  { damage: 36, cooldownMs: 10000, speed: 280, explodeRadius: 70, count: 1 },
  { damage: 42, cooldownMs: 9600, speed: 290, explodeRadius: 76, count: 1 },
  { damage: 50, cooldownMs: 9200, speed: 300, explodeRadius: 82, count: 2 },
  { damage: 50, cooldownMs: 8800, speed: 310, explodeRadius: 88, count: 2 },
  { damage: 60, cooldownMs: 8400, speed: 320, explodeRadius: 94, count: 4 },
  { damage: 72, cooldownMs: 8000, speed: 330, explodeRadius: 100, count: 4 },
  { damage: 84, cooldownMs: 7600, speed: 340, explodeRadius: 110, count: 6 },
  { damage: 100, cooldownMs: 7000, speed: 360, explodeRadius: 120, count: 6 },
];

export class Missile extends Weapon {
  constructor() {
    super({
      id: 'missile',
      name: 'Misil',
      icon: '🚀',
      levels: MISSILE_LEVELS,
      description: 'Cada 10 s un misil busca un enemigo y explota.',
    });
  }

  fire(game) {
    const { player } = game;
    const s = this.stats;
    const targets = game.findNearestEnemies(player.x, player.y, s.count);
    if (targets.length === 0) return;

    targets.forEach((target) => {
      const dir = normalize(target.x - player.x, target.y - player.y);
      const fallback = player.facing >= 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
      const d = dir.x === 0 && dir.y === 0 ? fallback : dir;
      game.spawnProjectile({
        x: player.x,
        y: player.y,
        vx: d.x * s.speed,
        vy: d.y * s.speed,
        damage: s.damage,
        radius: 7,
        pierce: 1,
        lifespan: 3.2,
        color: '#ff8a4a',
        homing: true,
        homingTurnRate: 4.2,
        target,
        explodeRadius: s.explodeRadius,
        explodeOnExpire: true,
        shape: 'missile',
      });
    });
  }
}
