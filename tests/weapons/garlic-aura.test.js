import test from 'node:test';
import assert from 'node:assert/strict';

import { GarlicAura } from '../../js/weapons/GarlicAura.js';
import { Game } from '../../js/core/Game.js';
import { Enemy, ENEMY_TYPES } from '../../js/entities/Enemy.js';
import { createEnemy, createWeaponGame } from './helpers.js';

test('GarlicAura golpea todos los enemigos dentro del radio, incluido el borde', () => {
  const inside = createEnemy({ x: 30, y: 0 });
  const edge = createEnemy({ x: 80, y: 0 });
  const outside = createEnemy({ x: 80.01, y: 0 });
  const inactive = createEnemy({ x: 10, y: 0, active: false });
  const game = createWeaponGame({ enemies: [inside, edge, outside, inactive] });

  new GarlicAura().fire(game);

  assert.deepEqual(game.events.damage.map((event) => event.enemy), [inside, edge]);
  assert.deepEqual(game.events.slows.map((event) => event.enemy), [inside, edge]);
  assert.ok(game.events.damage.every((event) => event.amount === 4));
  assert.ok(game.events.damage.every((event) => event.color === '#c9f0c0'));
  assert.deepEqual(game.events.enemyQueries, [{ type: 'near', x: 0, y: 0, radius: 70 }]);
  assert.deepEqual(game.events.auraPulses, [{ x: 0, y: 0, radius: 70 }]);
});

test('el ajo ralentiza 10, 20, 30 y 40 por ciento segun su nivel', () => {
  const percentages = [10, 10, 20, 20, 30, 30, 40, 40];
  for (let level = 1; level <= 8; level++) {
    const enemy = new Enemy();
    enemy.reset(ENEMY_TYPES.hexagon, 50, 0, 1, 1);
    enemy.speed = 100;
    const game = createWeaponGame({ enemies: [enemy] });
    game.slowEnemy = Game.prototype.slowEnemy;
    const garlic = new GarlicAura();
    garlic.level = level;
    garlic.fire(game);
    enemy.update(0.25, 0, 0);
    const expected = 50 - 25 * (1 - percentages[level - 1] / 100);
    assert.ok(Math.abs(enemy.x - expected) < 1e-9);
    assert.equal(enemy.speed, 100);
  }
});

test('los pulsos renuevan el efecto sin acumularlo y termina al dejar de recibirlos', () => {
  const enemy = new Enemy();
  enemy.reset(ENEMY_TYPES.hexagon, 50, 0, 1, 1);
  enemy.speed = 0;
  const game = createWeaponGame({ enemies: [enemy] });
  game.slowEnemy = Game.prototype.slowEnemy;
  const garlic = new GarlicAura();
  garlic.level = 7;
  for (let i = 0; i < 5; i++) {
    garlic.fire(game);
    enemy.update(0.4, 0, 0);
    assert.equal(enemy.slowPercent, 40);
    assert.ok(enemy.slowTimer > 0);
  }
  enemy.update(1, 0, 0);
  assert.equal(enemy.slowPercent, 0);
  assert.equal(enemy.slowTimer, 0);
  enemy.speed = 100;
  enemy.update(0.1, 0, 0);
  assert.equal(enemy.x, 40);
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
