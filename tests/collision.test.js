import test from 'node:test';
import assert from 'node:assert/strict';

import { CollisionSystem } from '../js/systems/CollisionSystem.js';
import { SpatialGrid } from '../js/systems/SpatialGrid.js';

function activePool(items) {
  return {
    forEachActive(callback) {
      for (const item of items) {
        if (item.active) callback(item);
      }
    },
    release(item) {
      item.active = false;
    },
  };
}

test('un proyectil solo daña enemigos cercanos obtenidos de la cuadrícula', () => {
  const enemyGrid = new SpatialGrid(128);
  const nearEnemy = {
    active: true,
    uid: 1,
    x: 10,
    y: 0,
    radius: 10,
    contactCooldown: 0,
    damage: 5,
  };
  const distantEnemy = {
    active: true,
    uid: 2,
    x: 800,
    y: 800,
    radius: 10,
    contactCooldown: 0,
    damage: 5,
  };
  enemyGrid.insert(nearEnemy);
  enemyGrid.insert(distantEnemy);

  const projectile = {
    active: true,
    x: 0,
    y: 0,
    radius: 5,
    damage: 12,
    pierce: 1,
    explodeRadius: 0,
    hitEnemyIds: new Set(),
  };
  const damaged = [];
  const game = {
    enemyGrid,
    projectilePool: activePool([projectile]),
    pickupPool: activePool([]),
    player: {
      alive: true,
      x: 400,
      y: 400,
      radius: 10,
      takeDamage: () => false,
    },
    damageEnemy: (enemy, amount) => damaged.push({ enemy, amount }),
    onPlayerHit: () => {},
  };

  new CollisionSystem().resolve(game);

  assert.deepEqual(damaged, [{ enemy: nearEnemy, amount: 12 }]);
  assert.equal(projectile.active, false);
  assert.ok(projectile.hitEnemyIds.has(nearEnemy.uid));
  assert.equal(projectile.hitEnemyIds.has(distantEnemy.uid), false);
});

test('el contacto enemigo-jugador también utiliza la cuadrícula', () => {
  const enemyGrid = new SpatialGrid(128);
  const enemy = {
    active: true,
    uid: 1,
    x: 5,
    y: 0,
    radius: 10,
    contactCooldown: 0,
    damage: 8,
  };
  enemyGrid.insert(enemy);
  let receivedDamage = 0;
  let hitEvents = 0;
  const game = {
    enemyGrid,
    projectilePool: activePool([]),
    pickupPool: activePool([]),
    player: {
      alive: true,
      x: 0,
      y: 0,
      radius: 10,
      takeDamage(amount) {
        receivedDamage += amount;
        return true;
      },
    },
    onPlayerHit: () => { hitEvents += 1; },
  };

  new CollisionSystem().resolve(game);

  assert.equal(receivedDamage, 8);
  assert.equal(hitEvents, 1);
  assert.equal(enemy.contactCooldown, 500);
});
