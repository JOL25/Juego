// ============================================================
// COLLISION SYSTEM — pure resolution logic against the game's
// pools. Kept separate from Game so hit-detection rules are all
// in one readable place.
// ============================================================

import { circlesOverlap } from '../utils.js';
import { PICKUP_KIND } from '../entities/Pickup.js';

const CONTACT_DAMAGE_COOLDOWN_MS = 500;

export class CollisionSystem {
  /**
   * @param game the Game instance (used for pools + helper methods)
   */
  resolve(game) {
    this._projectilesVsEnemies(game);
    this._enemiesVsPlayer(game);
    this._pickupsVsPlayer(game);
  }

  _projectilesVsEnemies(game) {
    game.projectilePool.forEachActive((projectile) => {
      if (!projectile.active) return;
      game.enemyGrid.forEachNearby(projectile.x, projectile.y, projectile.radius, (enemy) => {
        if (!projectile.active || !enemy.active) return;
        if (projectile.hitEnemyIds.has(enemy.uid)) return;
        if (!circlesOverlap(
          projectile.x,
          projectile.y,
          projectile.radius,
          enemy.x,
          enemy.y,
          enemy.radius
        )) return;

        projectile.hitEnemyIds.add(enemy.uid);

        if (projectile.explodeRadius > 0) {
          if (!projectile.didExplode) {
            projectile.didExplode = true;
            game.explodeAt(
              projectile.x,
              projectile.y,
              projectile.explodeRadius,
              projectile.damage,
              '#ffb070'
            );
          }
          game.projectilePool.release(projectile);
          return;
        }

        game.damageEnemy(enemy, projectile.damage, '#ffffff');

        projectile.pierce -= 1;
        if (projectile.pierce <= 0) {
          game.projectilePool.release(projectile);
        }
      });
    });
  }

  _enemiesVsPlayer(game) {
    const { player } = game;
    if (!player.alive || game.areEnemiesFrozen?.()) return;

    game.enemyGrid.forEachNearby(player.x, player.y, player.radius, (enemy) => {
      if (!enemy.active) return;
      if (enemy.contactCooldown > 0) return;
      if (!circlesOverlap(player.x, player.y, player.radius, enemy.x, enemy.y, enemy.radius)) return;

      const hit = player.takeDamage(enemy.damage);
      enemy.contactCooldown = CONTACT_DAMAGE_COOLDOWN_MS;
      if (hit) game.onPlayerHit();
    });
  }

  _pickupsVsPlayer(game) {
    const { player } = game;
    game.pickupPool.forEachActive((pickup) => {
      if (!circlesOverlap(player.x, player.y, player.radius, pickup.x, pickup.y, pickup.radius)) return;

      if (pickup.kind === PICKUP_KIND.XP) {
        game.onXpCollected(pickup.value);
      } else if (pickup.kind === PICKUP_KIND.HEAL) {
        player.heal(pickup.value);
      } else if (pickup.kind === PICKUP_KIND.MEGA_MAGNET) {
        game.activateMegaMagnet(pickup.value);
      } else if (pickup.kind === PICKUP_KIND.FREEZE_CLOCK) {
        game.activateEnemyFreeze(pickup.value);
      }
      game.pickupPool.release(pickup);
    });
  }
}
