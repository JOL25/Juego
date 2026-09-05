import test from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../js/core/Game.js';

test('forEachEnemyNear delega la consulta circular a SpatialGrid', () => {
  const visited = [];
  const callback = (enemy) => visited.push(enemy);
  const enemy = { x: -20, y: 15, radius: 8, active: true };
  const calls = [];
  const game = createGameWithGrid({
    forEachNearby(x, y, radius, receivedCallback) {
      calls.push({ x, y, radius, callback: receivedCallback });
      receivedCallback(enemy);
    },
  });

  Game.prototype.forEachEnemyNear.call(game, -10, 25, 70, callback);

  assert.deepEqual(calls, [{ x: -10, y: 25, radius: 70, callback }]);
  assert.deepEqual(visited, [enemy]);
});

test('forEachEnemyInBounds delega los límites y callback a SpatialGrid', () => {
  const callback = () => {};
  const calls = [];
  const game = createGameWithGrid({
    forEachInBounds(minX, minY, maxX, maxY, receivedCallback) {
      calls.push({ minX, minY, maxX, maxY, callback: receivedCallback });
    },
  });

  Game.prototype.forEachEnemyInBounds.call(game, -100, -50, 200, 90, callback);

  assert.deepEqual(calls, [{
    minX: -100,
    minY: -50,
    maxX: 200,
    maxY: 90,
    callback,
  }]);
});

test('findNearestEnemy devuelve el resultado de SpatialGrid', () => {
  const expected = { x: 4, y: 7, active: true };
  const calls = [];
  const game = createGameWithGrid({
    findNearest(x, y) {
      calls.push({ x, y });
      return expected;
    },
  });

  const result = Game.prototype.findNearestEnemy.call(game, -5, 12);

  assert.equal(result, expected);
  assert.deepEqual(calls, [{ x: -5, y: 12 }]);
});

test('findNearestEnemies devuelve los resultados ordenados de SpatialGrid', () => {
  const expected = [{ x: 1, y: 0 }, { x: 3, y: 0 }];
  const calls = [];
  const game = createGameWithGrid({
    findNearestN(x, y, count) {
      calls.push({ x, y, count });
      return expected;
    },
  });

  const result = Game.prototype.findNearestEnemies.call(game, 0, 0, 2);

  assert.equal(result, expected);
  assert.deepEqual(calls, [{ x: 0, y: 0, count: 2 }]);
});

test('explodeAt consulta candidatos cercanos y conserva la comprobación circular exacta', () => {
  const inside = { x: 30, y: 0, radius: 5, active: true };
  const edge = { x: 80, y: 0, radius: 10, active: true };
  const outside = { x: 80.01, y: 0, radius: 10, active: true };
  const damage = [];
  const queries = [];
  const bursts = [];
  const game = {
    auraEffects: [],
    forEachEnemyNear(x, y, radius, callback) {
      queries.push({ x, y, radius });
      for (const enemy of [inside, edge, outside]) callback(enemy);
    },
    damageEnemy(enemy, amount, color) {
      damage.push({ enemy, amount, color });
    },
    spawnDeathBurst(x, y, color) {
      bursts.push({ x, y, color });
    },
  };

  Game.prototype.explodeAt.call(game, 0, 0, 70, 36, '#ffb070');

  assert.deepEqual(queries, [{ x: 0, y: 0, radius: 70 }]);
  assert.deepEqual(damage, [
    { enemy: inside, amount: 36, color: '#ffb070' },
    { enemy: edge, amount: 36, color: '#ffb070' },
  ]);
  assert.deepEqual(game.auraEffects, [{ x: 0, y: 0, radius: 70, age: 0, life: 0.22 }]);
  assert.deepEqual(bursts, [{ x: 0, y: 0, color: '#ffb070' }]);
});

function createGameWithGrid(enemyGrid) {
  return { enemyGrid };
}
