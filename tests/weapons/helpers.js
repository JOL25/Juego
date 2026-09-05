import assert from 'node:assert/strict';

import { Projectile } from '../../js/entities/Projectile.js';
import { CollisionSystem } from '../../js/systems/CollisionSystem.js';
import { SpatialGrid } from '../../js/systems/SpatialGrid.js';

let nextEnemyId = 1;

export function createEnemy({ x, y, radius = 10, active = true } = {}) {
  return { uid: nextEnemyId++, x, y, radius, active };
}

export function createWeaponGame({ player = {}, enemies = [] } = {}) {
  const events = {
    damage: [],
    knockbacks: [],
    slows: [],
    enemyQueries: [],
    targetQueries: [],
    projectiles: [],
    whipSwipes: [],
    auraPulses: [],
    beams: [],
    shockwaves: [],
  };
  const enemyGrid = new SpatialGrid(128);
  for (const enemy of enemies) enemyGrid.insert(enemy);

  const game = {
    player: { x: 0, y: 0, facing: 1, ...player },
    shakeTimer: 0,
    events,
    forEachActiveEnemy(callback) {
      for (const enemy of enemies) {
        if (enemy.active) callback(enemy);
      }
    },
    forEachEnemyNear(x, y, radius, callback) {
      events.enemyQueries.push({ type: 'near', x, y, radius });
      enemyGrid.forEachNearby(x, y, radius, callback);
    },
    forEachEnemyInBounds(minX, minY, maxX, maxY, callback) {
      events.enemyQueries.push({ type: 'bounds', minX, minY, maxX, maxY });
      enemyGrid.forEachInBounds(minX, minY, maxX, maxY, callback);
    },
    damageEnemy(enemy, amount, color) {
      events.damage.push({ enemy, amount, color });
    },
    knockBackEnemy(enemy, distancePx) {
      events.knockbacks.push({ enemy, distancePx });
    },
    slowEnemy(enemy, percent, durationSeconds) {
      events.slows.push({ enemy, percent, durationSeconds });
    },
    findNearestEnemy(x, y) {
      events.targetQueries.push({ x, y, count: 1 });
      return enemies
        .filter((enemy) => enemy.active)
        .sort((first, second) => distanceSq(x, y, first) - distanceSq(x, y, second))[0] || null;
    },
    findNearestEnemies(x, y, count) {
      events.targetQueries.push({ x, y, count });
      return enemies
        .filter((enemy) => enemy.active)
        .sort((first, second) => distanceSq(x, y, first) - distanceSq(x, y, second))
        .slice(0, count);
    },
    spawnProjectile(options) {
      events.projectiles.push(options);
    },
    spawnWhipSwipe(x, y, angle, range, arcDeg, bothSides) {
      events.whipSwipes.push({ x, y, angle, range, arcDeg, bothSides });
    },
    pulseAura(x, y, radius) {
      events.auraPulses.push({ x, y, radius });
    },
    spawnBeam(ax, ay, bx, by, width, color, life) {
      events.beams.push({ ax, ay, bx, by, width, color, life });
    },
    spawnShockwave(x, y, maxRadius, speed, damage) {
      events.shockwaves.push({ x, y, maxRadius, speed, damage });
    },
  };

  return game;
}

export function assertClose(actual, expected, epsilon = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `Expected ${actual} to be within ${epsilon} of ${expected}`
  );
}

export function resolveProjectileCollision(options, enemies) {
  const projectile = new Projectile();
  projectile.reset(options);
  const enemyGrid = new SpatialGrid(128);
  for (const enemy of enemies) enemyGrid.insert(enemy);

  const events = { damage: [], explosions: [] };
  const game = {
    enemyGrid,
    projectilePool: {
      forEachActive(callback) {
        if (projectile.active) callback(projectile);
      },
      release(item) {
        item.active = false;
      },
    },
    pickupPool: { forEachActive() {} },
    player: {
      alive: true,
      x: 10000,
      y: 10000,
      radius: 10,
      takeDamage: () => false,
    },
    damageEnemy(enemy, amount, color) {
      events.damage.push({ enemy, amount, color });
    },
    explodeAt(x, y, radius, damage, color) {
      events.explosions.push({ x, y, radius, damage, color });
    },
    onPlayerHit() {},
  };

  new CollisionSystem().resolve(game);
  return { projectile, events };
}

function distanceSq(x, y, enemy) {
  const dx = enemy.x - x;
  const dy = enemy.y - y;
  return dx * dx + dy * dy;
}
