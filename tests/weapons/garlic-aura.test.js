import test from 'node:test';
import assert from 'node:assert/strict';

import { GarlicAura } from '../../js/weapons/GarlicAura.js';
import { createEnemy, createWeaponGame } from './helpers.js';

test('GarlicAura golpea todos los enemigos dentro del radio, incluido el borde', () => {
  const inside = createEnemy({ x: 30, y: 0 });
  const edge = createEnemy({ x: 80, y: 0 });
  const outside = createEnemy({ x: 80.01, y: 0 });
  const inactive = createEnemy({ x: 10, y: 0, active: false });
  const game = createWeaponGame({ enemies: [inside, edge, outside, inactive] });

  new GarlicAura().fire(game);

  assert.deepEqual(game.events.damage.map((event) => event.enemy), [inside, edge]);
  assert.ok(game.events.damage.every((event) => event.amount === 4));
  assert.ok(game.events.damage.every((event) => event.color === '#c9f0c0'));
  assert.deepEqual(game.events.enemyQueries, [{ type: 'near', x: 0, y: 0, radius: 70 }]);
  assert.deepEqual(game.events.auraPulses, [{ x: 0, y: 0, radius: 70 }]);
});

test('GarlicAura nivel 8 utiliza su daño y radio máximos', () => {
  const enemy = createEnemy({ x: 125, y: 0, radius: 5 });
  const game = createWeaponGame({ player: { x: 5, y: 0 }, enemies: [enemy] });
  const garlic = new GarlicAura();
  garlic.level = 8;

  garlic.fire(game);

  assert.equal(game.events.damage.length, 1);
  assert.equal(game.events.damage[0].amount, 16);
  assert.deepEqual(game.events.enemyQueries, [{ type: 'near', x: 5, y: 0, radius: 120 }]);
  assert.deepEqual(game.events.auraPulses, [{ x: 5, y: 0, radius: 120 }]);
});
