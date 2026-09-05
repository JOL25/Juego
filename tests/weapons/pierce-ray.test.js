import test from 'node:test';
import assert from 'node:assert/strict';

import { PierceRay } from '../../js/weapons/PierceRay.js';
import { createEnemy, createWeaponGame, assertClose } from './helpers.js';

test('PierceRay apunta al enemigo más cercano y golpea toda la línea', () => {
  const target = createEnemy({ x: 0, y: 100 });
  const fartherOnLine = createEnemy({ x: 0, y: 300 });
  const widthEdge = createEnemy({ x: 18, y: 200 });
  const widthOutside = createEnemy({ x: 18.01, y: 200 });
  const behind = createEnemy({ x: 0, y: -500 });
  const beyondEndEdge = createEnemy({ x: 0, y: 438 });
  const beyondEnd = createEnemy({ x: 0, y: 438.01 });
  const game = createWeaponGame({
    enemies: [target, fartherOnLine, widthEdge, widthOutside, behind, beyondEndEdge, beyondEnd],
  });

  new PierceRay().fire(game);

  const hitEnemies = game.events.damage.map((event) => event.enemy);
  assert.equal(hitEnemies.length, 4);
  for (const expected of [target, fartherOnLine, widthEdge, beyondEndEdge]) {
    assert.ok(hitEnemies.includes(expected));
  }
  assert.ok(game.events.damage.every((event) => event.amount === 22));
  assert.equal(game.events.damage.length, 4);
  assert.equal(game.events.enemyQueries.length, 1);
  const query = game.events.enemyQueries[0];
  assert.equal(query.type, 'bounds');
  assertClose(query.minX, -8);
  assertClose(query.maxX, 8);
  assertClose(query.minY, -8);
  assertClose(query.maxY, 428);
  assert.equal(game.events.beams.length, 1);
  const beam = game.events.beams[0];
  assertClose(beam.ax, 0);
  assertClose(beam.ay, 0);
  assertClose(beam.bx, 0, 1e-7);
  assertClose(beam.by, 420);
  assert.equal(beam.width, 16);
  assert.equal(beam.life, 0.18);
});

test('PierceRay sin objetivos utiliza facing como dirección', () => {
  const game = createWeaponGame({ player: { x: 10, y: 20, facing: -1 } });

  new PierceRay().fire(game);

  assert.equal(game.events.damage.length, 0);
  assert.deepEqual(game.events.enemyQueries, [{
    type: 'bounds',
    minX: -418,
    minY: 12,
    maxX: 18,
    maxY: 28.00000000000005,
  }]);
  const beam = game.events.beams[0];
  assert.equal(beam.ax, 10);
  assert.equal(beam.ay, 20);
  assertClose(beam.bx, -410);
  assertClose(beam.by, 20, 1e-7);
});

test('PierceRay nivel 8 usa longitud, anchura y daño máximos', () => {
  const target = createEnemy({ x: 100, y: 0 });
  const game = createWeaponGame({ enemies: [target] });
  const ray = new PierceRay();
  ray.level = 8;

  ray.fire(game);

  assert.equal(game.events.damage[0].amount, 90);
  assert.deepEqual(game.events.enemyQueries, [{
    type: 'bounds',
    minX: -16,
    minY: -16,
    maxX: 666,
    maxY: 16,
  }]);
  assert.equal(game.events.beams[0].bx, 650);
  assert.equal(game.events.beams[0].width, 32);
});
