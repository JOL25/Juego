// ============================================================
// GARLIC AURA — passive-feeling weapon: pulses damage to every
// enemy within radius on each cooldown tick. No projectile.
// ============================================================

import { Weapon } from './Weapon.js';
import { distance } from '../utils.js';
import { TIMING } from '../config.js';

export const GARLIC_LEVELS = [
  { damage: 4, cooldownMs: 500, radius: 70, slowPercent: 10 },
  { damage: 5, cooldownMs: 500, radius: 78, slowPercent: 10 },
  { damage: 6, cooldownMs: 480, radius: 86, slowPercent: 20 },
  { damage: 8, cooldownMs: 460, radius: 92, slowPercent: 20 },
  { damage: 9, cooldownMs: 440, radius: 98, slowPercent: 30 },
  { damage: 11, cooldownMs: 420, radius: 104, slowPercent: 30 },
  { damage: 13, cooldownMs: 400, radius: 110, slowPercent: 40 },
  { damage: 16, cooldownMs: 380, radius: 120, slowPercent: 40 },
];

export class GarlicAura extends Weapon {
  constructor() {
    super({
      id: 'garlic',
      name: 'Garlic Aura',
      icon: '🧄',
      levels: GARLIC_LEVELS,
      description: 'Aura que pulsa daño y ralentiza un 10%. La ralentización aumenta en los niveles 3, 5 y 7.',
    });
  }

  fire(game) {
    const { player } = game;
    const s = this.stats;
    game.forEachEnemyNear(player.x, player.y, s.radius, (enemy) => {
      if (distance(player.x, player.y, enemy.x, enemy.y) <= s.radius + enemy.radius) {
        game.damageEnemy(enemy, s.damage, '#c9f0c0');
        // Bridge the fixed-step rounding between pulses without stacking slows.
        game.slowEnemy(enemy, s.slowPercent, s.cooldownMs / 1000 + TIMING.fixedStepSeconds);
      }
    });
    game.pulseAura(player.x, player.y, s.radius);
  }
}
