// ============================================================
// PIERCE RAY — every 5s a line beam fires toward the nearest
// enemy and damages every foe it crosses (true pierce).
// ============================================================

import { Weapon } from './Weapon.js';
import { distPointToSegment } from '../utils.js';

export const PIERCE_RAY_LEVELS = [
  { damage: 22, cooldownMs: 5000, length: 420, width: 16 },
  { damage: 28, cooldownMs: 4800, length: 440, width: 18 },
  { damage: 34, cooldownMs: 4600, length: 460, width: 20 },
  { damage: 42, cooldownMs: 4400, length: 490, width: 22 },
  { damage: 50, cooldownMs: 4200, length: 520, width: 24 },
  { damage: 62, cooldownMs: 4000, length: 560, width: 26 },
  { damage: 74, cooldownMs: 3800, length: 600, width: 28 },
  { damage: 90, cooldownMs: 3500, length: 650, width: 32 },
];

export class PierceRay extends Weapon {
  constructor() {
    super({
      id: 'pierce_ray',
      name: 'Rayo perforante',
      icon: '⚡',
      levels: PIERCE_RAY_LEVELS,
      description: 'Cada 5 s un rayo atraviesa a todos los enemigos en línea.',
    });
  }

  fire(game) {
    const { player } = game;
    const s = this.stats;
    const target = game.findNearestEnemy(player.x, player.y);
    const angle = target
      ? Math.atan2(target.y - player.y, target.x - player.x)
      : player.facing >= 0 ? 0 : Math.PI;

    const ax = player.x;
    const ay = player.y;
    const bx = ax + Math.cos(angle) * s.length;
    const by = ay + Math.sin(angle) * s.length;
    const halfW = s.width / 2;
    const minX = Math.min(ax, bx) - halfW;
    const maxX = Math.max(ax, bx) + halfW;
    const minY = Math.min(ay, by) - halfW;
    const maxY = Math.max(ay, by) + halfW;

    game.forEachEnemyInBounds(minX, minY, maxX, maxY, (enemy) => {
      const d = distPointToSegment(enemy.x, enemy.y, ax, ay, bx, by);
      if (d <= enemy.radius + halfW) {
        game.damageEnemy(enemy, s.damage, '#f4e08a');
      }
    });

    game.spawnBeam(ax, ay, bx, by, s.width, '#ffe566', 0.18);
  }
}
