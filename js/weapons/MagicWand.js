// ============================================================
// MAGIC WAND — fires N homing bolts at the nearest enemy(ies).
// ============================================================

import { Weapon } from './Weapon.js';
import { normalize } from '../utils.js';

export const MAGIC_WAND_LEVELS = [
  { damage: 10, cooldownMs: 900, count: 1, pierce: 1, speed: 420 },
  { damage: 13, cooldownMs: 850, count: 1, pierce: 1, speed: 430 },
  { damage: 13, cooldownMs: 850, count: 2, pierce: 1, speed: 430 },
  { damage: 17, cooldownMs: 800, count: 2, pierce: 1, speed: 440 },
  { damage: 17, cooldownMs: 750, count: 3, pierce: 1, speed: 450 },
  { damage: 22, cooldownMs: 700, count: 3, pierce: 2, speed: 460 },
  { damage: 22, cooldownMs: 650, count: 4, pierce: 2, speed: 470 },
  { damage: 30, cooldownMs: 600, count: 4, pierce: 3, speed: 480 },
];

export class MagicWand extends Weapon {
  constructor() {
    super({
      id: 'magic_wand',
      name: 'Magic Wand',
      icon: '🪄',
      levels: MAGIC_WAND_LEVELS,
      description: 'Dispara proyectiles teledirigidos. Se usa a la vez que el resto de armas.',
    });
  }

  fire(game) {
    const { player } = game;
    const targets = game.findNearestEnemies(player.x, player.y, this.stats.count);
    if (targets.length === 0) return;

    targets.forEach((target) => {
      const dir = normalize(target.x - player.x, target.y - player.y);
      game.spawnProjectile({
        x: player.x,
        y: player.y,
        vx: dir.x * this.stats.speed,
        vy: dir.y * this.stats.speed,
        damage: this.stats.damage,
        radius: 5,
        pierce: this.stats.pierce,
        lifespan: 1.6,
        color: '#7ec6e0',
        homing: true,
        homingTurnRate: 6,
        target,
      });
    });
  }
}
