import test from 'node:test';
import assert from 'node:assert/strict';

import { MagicWand } from '../../js/weapons/MagicWand.js';
import {
  createEnemy,
  createWeaponGame,
  assertClose,
  resolveProjectileCollision,
} from './helpers.js';

test('MagicWand no crea proyectiles cuando no existen objetivos', () => {
  const game = createWeaponGame();

  new MagicWand().fire(game);

  assert.deepEqual(game.events.targetQueries, [{ x: 0, y: 0, count: 1 }]);
  assert.equal(game.events.projectiles.length, 0);
});

test('MagicWand nivel 1 apunta al enemigo más cercano y crea un proyectil homing', () => {
  const distant = createEnemy({ x: 100, y: 0 });
  const nearest = createEnemy({ x: 3, y: 4 });
  const game = createWeaponGame({ enemies: [distant, nearest] });

  new MagicWand().fire(game);

  assert.equal(game.events.projectiles.length, 1);
  const projectile = game.events.projectiles[0];
  assertClose(projectile.vx, 252);
  assertClose(projectile.vy, 336);
  assert.equal(projectile.damage, 10);
  assert.equal(projectile.pierce, 1);
  assert.equal(projectile.homing, true);
  assert.equal(projectile.homingTurnRate, 6);
  assert.equal(projectile.target, nearest);
  assert.equal(projectile.lifespan, 1.6);
});

test('MagicWand nivel 8 dispara cuatro proyectiles con daño y perforación máximos', () => {
  const enemies = [
    createEnemy({ x: 10, y: 0 }),
    createEnemy({ x: 0, y: 20 }),
    createEnemy({ x: -30, y: 0 }),
    createEnemy({ x: 0, y: -40 }),
    createEnemy({ x: 100, y: 100 }),
  ];
  const game = createWeaponGame({ enemies });
  const wand = new MagicWand();
  wand.level = 8;

  wand.fire(game);

  assert.deepEqual(game.events.targetQueries, [{ x: 0, y: 0, count: 4 }]);
  assert.equal(game.events.projectiles.length, 4);
  assert.ok(game.events.projectiles.every((projectile) => projectile.damage === 30));
  assert.ok(game.events.projectiles.every((projectile) => projectile.pierce === 3));
  assert.ok(
    game.events.projectiles.every((projectile) =>
      Math.abs(Math.hypot(projectile.vx, projectile.vy) - 480) < 1e-9
    )
  );
});

test('un proyectil de MagicWand nivel 8 perfora exactamente tres enemigos', () => {
  const target = createEnemy({ x: 20, y: 0 });
  const game = createWeaponGame({ enemies: [target] });
  const wand = new MagicWand();
  wand.level = 8;
  wand.fire(game);
  const colliders = [
    createEnemy({ x: 0, y: 0 }),
    createEnemy({ x: 0, y: 0 }),
    createEnemy({ x: 0, y: 0 }),
    createEnemy({ x: 0, y: 0 }),
  ];

  const result = resolveProjectileCollision(game.events.projectiles[0], colliders);

  assert.equal(result.events.damage.length, 3);
  assert.ok(result.events.damage.every((event) => event.amount === 30));
  assert.equal(result.projectile.active, false);
  assert.equal(result.projectile.pierce, 0);
});
