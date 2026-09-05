// ============================================================
// WHIP — instant melee arc in front of the player (both sides
// at higher levels). No projectile entity; it's resolved as an
// immediate hit-test against nearby enemies, with a brief visual.
// ============================================================

import { Weapon } from './Weapon.js';
import { distance } from '../utils.js';
import { KNOCKBACK } from '../config.js';

export const WHIP_LEVELS = [
  { damage: 14, cooldownMs: 750, range: 90, arcDeg: 100, bothSides: false, knockbackCm: 0 },
  { damage: 18, cooldownMs: 720, range: 95, arcDeg: 110, bothSides: false, knockbackCm: 0 },
  { damage: 18, cooldownMs: 690, range: 100, arcDeg: 120, bothSides: false, knockbackCm: 5 },
  { damage: 24, cooldownMs: 660, range: 105, arcDeg: 130, bothSides: false, knockbackCm: 5 },
  { damage: 24, cooldownMs: 630, range: 110, arcDeg: 140, bothSides: true, knockbackCm: 6 },
  { damage: 32, cooldownMs: 600, range: 115, arcDeg: 150, bothSides: true, knockbackCm: 7 },
  { damage: 32, cooldownMs: 560, range: 120, arcDeg: 160, bothSides: true, knockbackCm: 8 },
  { damage: 44, cooldownMs: 520, range: 130, arcDeg: 180, bothSides: true, knockbackCm: 9 },
];

export class Whip extends Weapon {
  constructor() {
    super({
      id: 'whip',
      name: 'Whip',
      icon: '🩸',
      levels: WHIP_LEVELS,
      description: 'Latigazo cuerpo a cuerpo. Se usa a la vez que el resto de armas.',
    });
  }

  fire(game) {
    const { player } = game;
    const s = this.stats;
    const halfArc = (s.arcDeg * Math.PI) / 360;
    const baseAngle = player.facing >= 0 ? 0 : Math.PI;

    const isInsideArc = (angleToEnemy, center) => {
      let diff = angleToEnemy - center;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      return Math.abs(diff) <= halfArc;
    };

    game.forEachEnemyNear(player.x, player.y, s.range, (enemy) => {
      const enemyDistance = distance(player.x, player.y, enemy.x, enemy.y);
      if (enemyDistance > s.range + enemy.radius) return;

      const angleToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
      const insideFrontArc = isInsideArc(angleToEnemy, baseAngle);
      const insideBackArc =
        !insideFrontArc && s.bothSides && isInsideArc(angleToEnemy, baseAngle + Math.PI);

      if (insideFrontArc || insideBackArc) {
        game.damageEnemy(enemy, s.damage, '#ffd9d9');
        if (s.knockbackCm > 0) game.knockBackEnemy(enemy, s.knockbackCm * KNOCKBACK.pxPerCm);
      }
    });

    game.spawnWhipSwipe(player.x, player.y, baseAngle, s.range, s.arcDeg, s.bothSides);
  }
}
