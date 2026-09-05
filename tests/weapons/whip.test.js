import test from 'node:test';
import assert from 'node:assert/strict';

import { Whip } from '../../js/weapons/Whip.js';
import { createEnemy, createWeaponGame, assertClose } from './helpers.js';

test('Whip nivel 1 golpea distancia y ángulo límite, pero no fuera del arco', () => {
  const halfArc = 50 * Math.PI / 180;
  const enemies = {
    front: createEnemy({ x: 50, y: 0 }),
    distanceEdge: createEnemy({ x: 100, y: 0 }),
    distanceOutside: createEnemy({ x: 100.01, y: 0 }),
    angleEdge: createEnemy({ x: Math.cos(halfArc) * 50, y: Math.sin(halfArc) * 50 }),
    angleOutside: createEnemy({
      x: Math.cos(halfArc + 0.01) * 50,
      y: Math.sin(halfArc + 0.01) * 50,
    }),
    behind: createEnemy({ x: -50, y: 0 }),
  };
  const game = createWeaponGame({ enemies: Object.values(enemies) });

  new Whip().fire(game);

  assert.deepEqual(
    game.events.damage.map((event) => event.enemy),
    [enemies.front, enemies.distanceEdge, enemies.angleEdge]
  );
  assert.ok(game.events.damage.every((event) => event.amount === 14));
  assert.deepEqual(game.events.enemyQueries, [{ type: 'near', x: 0, y: 0, radius: 90 }]);
  assert.deepEqual(game.events.whipSwipes, [{
    x: 0,
    y: 0,
    angle: 0,
    range: 90,
    arcDeg: 100,
    bothSides: false,
  }]);
});

test('Whip nivel 5 ataca al frente y detrás una vez por enemigo', () => {
  const front = createEnemy({ x: 50, y: 0 });
  const behind = createEnemy({ x: -50, y: 0 });
  const side = createEnemy({ x: 0, y: 50 });
  const game = createWeaponGame({ enemies: [front, behind, side] });
  const whip = new Whip();
  whip.level = 5;

  whip.fire(game);

  const hitEnemies = game.events.damage.map((event) => event.enemy);
  assert.equal(hitEnemies.length, 2);
  assert.ok(hitEnemies.includes(front));
  assert.ok(hitEnemies.includes(behind));
  assert.ok(game.events.damage.every((event) => event.amount === 24));
  assert.deepEqual(game.events.enemyQueries, [{ type: 'near', x: 0, y: 0, radius: 110 }]);
  assert.equal(game.events.whipSwipes[0].bothSides, true);
});

test('Whip nivel 8 no duplica daño en el límite compartido de ambos arcos', () => {
  const sharedEdge = createEnemy({ x: 0, y: 80 });
  const game = createWeaponGame({ enemies: [sharedEdge] });
  const whip = new Whip();
  whip.level = 8;

  whip.fire(game);

  assert.deepEqual(game.events.damage, [{
    enemy: sharedEdge,
    amount: 44,
    color: '#ffd9d9',
  }]);
  assert.deepEqual(game.events.enemyQueries, [{ type: 'near', x: 0, y: 0, radius: 130 }]);
});

test('Whip utiliza facing para elegir izquierda y dibujar el arco', () => {
  const left = createEnemy({ x: -40, y: 0 });
  const right = createEnemy({ x: 40, y: 0 });
  const game = createWeaponGame({ player: { x: 10, y: 5, facing: -1 }, enemies: [left, right] });

  new Whip().fire(game);

  assert.deepEqual(game.events.damage.map((event) => event.enemy), [left]);
  assert.deepEqual(game.events.enemyQueries, [{ type: 'near', x: 10, y: 5, radius: 90 }]);
  assertClose(game.events.whipSwipes[0].angle, Math.PI);
  assert.equal(game.events.whipSwipes[0].x, 10);
  assert.equal(game.events.whipSwipes[0].y, 5);
});
