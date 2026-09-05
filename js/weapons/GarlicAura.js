// ============================================================
// GARLIC AURA — passive-feeling weapon: pulses damage to every
// enemy within radius on each cooldown tick. No projectile.
// ============================================================

import { Weapon } from './Weapon.js';
import { distance } from '../utils.js';

export const GARLIC_LEVELS = [
  { damage: 4, cooldownMs: 500, radius: 70 },
  { damage: 5, cooldownMs: 500, radius: 78 },
  { damage: 6, cooldownMs: 480, radius: 86 },
  { damage: 8, cooldownMs: 460, radius: 92 },
  { damage: 9, cooldownMs: 440, radius: 98 },
  { damage: 11, cooldownMs: 420, radius: 104 },
  { damage: 13, cooldownMs: 400, radius: 110 },
  { damage: 16, cooldownMs: 380, radius: 120 },
];

export class GarlicAura extends Weapon {
  constructor() {
    super({
      id: 'garlic',
      name: 'Garlic Aura',
      icon: '🧄',
      levels: GARLIC_LEVELS,
      description: 'Aura que pulsa daño alrededor. Se usa a la vez que el resto de armas.',
    });
  }

  fire(game) {
    const { player } = game;
    const s = this.stats;
    game.forEachEnemyNear(player.x, player.y, s.radius, (enemy) => {
      if (distance(player.x, player.y, enemy.x, enemy.y) <= s.radius + enemy.radius) {
        game.damageEnemy(enemy, s.damage, '#c9f0c0');
      }
    });
    game.pulseAura(player.x, player.y, s.radius);
  }
}
