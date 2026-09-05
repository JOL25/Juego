import test from 'node:test';
import assert from 'node:assert/strict';

import { Missile } from '../../js/weapons/Missile.js';
import {
  createEnemy,
  createWeaponGame,
  assertClose,
  resolveProjectileCollision,
} from './helpers.js';

test('Missile no crea proyectiles cuando no existen objetivos', () => {
  const game = createWeaponGame();

  new Missile().fire(game);

  assert.deepEqual(game.events.targetQueries, [{ x: 0, y: 0, count: 1 }]);
  assert.equal(game.events.projectiles.length, 0);
});

test('Missile configura seguimiento, explosión y perforación', () => {
  const target = createEnemy({ x: 3, y: 4 });
  const game = createWeaponGame({ enemies: [target] });

  new Missile().fire(game);

  const projectile = game.events.projectiles[0];
  assertClose(projectile.vx, 168);
  assertClose(projectile.vy, 224);
  assert.equal(projectile.damage, 36);
  assert.equal(projectile.pierce, 1);
  assert.equal(projectile.explodeRadius, 70);
  assert.equal(projectile.explodeOnExpire, true);
  assert.equal(projectile.homing, true);
  assert.equal(projectile.target, target);
  assert.equal(projectile.shape, 'missile');
});

test('Missile usa facing como dirección si coincide con el objetivo', () => {
  const target = createEnemy({ x: 10, y: 20, radius: 0 });
  const game = createWeaponGame({ player: { x: 10, y: 20, facing: -1 }, enemies: [target] });

  new Missile().fire(game);

  assert.equal(game.events.projectiles[0].vx, -280);
  assert.equal(game.events.projectiles[0].vy, 0);
});

test('Missile nivel 8 selecciona seis objetivos y conserva sus propiedades explosivas', () => {
  const enemies = [
    createEnemy({ x: 10, y: 0 }),
    createEnemy({ x: 20, y: 0 }),
    createEnemy({ x: 30, y: 0 }),
    createEnemy({ x: 40, y: 0 }),
    createEnemy({ x: 50, y: 0 }),
    createEnemy({ x: 60, y: 0 }),
    createEnemy({ x: 70, y: 0 }),
  ];
  const game = createWeaponGame({ enemies });
  const missile = new Missile();
  missile.level = 8;

  missile.fire(game);

  assert.deepEqual(game.events.targetQueries, [{ x: 0, y: 0, count: 6 }]);
  assert.equal(game.events.projectiles.length, 6);
  assert.ok(game.events.projectiles.every((projectile) => projectile.damage === 100));
  assert.ok(game.events.projectiles.every((projectile) => projectile.explodeRadius === 120));
  assert.ok(game.events.projectiles.every((projectile) => projectile.pierce === 1));
});

test('el impacto de Missile dispara una explosión y consume el proyectil', () => {
  const target = createEnemy({ x: 30, y: 0 });
  const game = createWeaponGame({ enemies: [target] });
  new Missile().fire(game);
  const collider = createEnemy({ x: 0, y: 0 });

  const result = resolveProjectileCollision(game.events.projectiles[0], [collider]);

  assert.equal(result.events.damage.length, 0);
  assert.deepEqual(result.events.explosions, [{
    x: 0,
    y: 0,
    radius: 70,
    damage: 36,
    color: '#ffb070',
  }]);
  assert.equal(result.projectile.didExplode, true);
  assert.equal(result.projectile.active, false);
});
