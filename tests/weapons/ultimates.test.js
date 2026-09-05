import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ExplosiveWave,
  OrbitLaser,
  SuperPierceShot,
} from '../../js/weapons/Ultimates.js';
import { Game } from '../../js/core/Game.js';
import { createEnemy, createWeaponGame, assertClose } from './helpers.js';

test('SuperPierceShot apunta al más cercano y genera un proyectil de perforación total', () => {
  const target = createEnemy({ x: 0, y: 100 });
  const game = createWeaponGame({ enemies: [target] });
  const ultimate = new SuperPierceShot();

  assert.equal(ultimate.tryActivate(game), true);

  assert.equal(game.events.projectiles.length, 1);
  const projectile = game.events.projectiles[0];
  assertClose(projectile.vx, 0, 1e-7);
  assertClose(projectile.vy, 720);
  assert.equal(projectile.damage, 90);
  assert.equal(projectile.pierce, 999);
  assert.equal(projectile.homing, false);
  assert.equal(projectile.shape, 'bolt');
  assert.equal(game.shakeTimer, 180);
  assert.equal(ultimate.cooldownTimer, 12000);
});

test('SuperPierceShot nivel 5 crea tres disparos simétricos', () => {
  const target = createEnemy({ x: 100, y: 0 });
  const game = createWeaponGame({ enemies: [target] });
  const ultimate = new SuperPierceShot();
  ultimate.level = 5;

  ultimate.activate(game);

  assert.equal(game.events.projectiles.length, 3);
  const [upper, center, lower] = game.events.projectiles;
  assertClose(Math.hypot(upper.vx, upper.vy), 820);
  assertClose(Math.hypot(center.vx, center.vy), 820);
  assertClose(Math.hypot(lower.vx, lower.vy), 820);
  assertClose(upper.vy, -lower.vy);
  assertClose(center.vy, 0);
  assert.ok(game.events.projectiles.every((projectile) => projectile.damage === 190));
  assert.ok(game.events.projectiles.every((projectile) => projectile.pierce === 999));
});

test('ExplosiveWave registra radio, velocidad, daño y cooldown', () => {
  const game = createWeaponGame({ player: { x: 15, y: -20 } });
  const ultimate = new ExplosiveWave();

  assert.equal(ultimate.tryActivate(game), true);

  assert.deepEqual(game.events.shockwaves, [{
    x: 15,
    y: -20,
    maxRadius: 200,
    speed: 420,
    damage: 55,
  }]);
  assert.equal(game.shakeTimer, 220);
  assert.equal(ultimate.cooldownTimer, 13000);
  assert.equal(ultimate.tryActivate(game), false);

  ultimate.update(13, game);
  assert.equal(ultimate.tryActivate(game), true);
  assert.equal(game.events.shockwaves.length, 2);
});

test('ExplosiveWave daña al cruzar cada enemigo y no repite impactos', () => {
  const near = createEnemy({ x: 50, y: 0, radius: 5 });
  const far = createEnemy({ x: 150, y: 0, radius: 5 });
  const setup = createWeaponGame();
  const ultimate = new ExplosiveWave();
  ultimate.activate(setup);
  const wave = setup.events.shockwaves[0];
  const damage = [];
  const queries = [];
  const game = {
    swipeEffects: [],
    auraEffects: [],
    beamEffects: [],
    shockwaves: [{ ...wave, radius: 0, prevRadius: 0, hitIds: new Set() }],
    forEachEnemyNear(x, y, radius, callback) {
      queries.push({ x, y, radius });
      callback(near);
      callback(far);
    },
    damageEnemy(enemy, amount) {
      damage.push({ enemy, amount });
    },
  };

  Game.prototype._updateTimedEffects.call(game, 0.25);
  assert.deepEqual(damage, [{ enemy: near, amount: 55 }]);

  Game.prototype._updateTimedEffects.call(game, 0.25);
  assert.deepEqual(damage, [
    { enemy: near, amount: 55 },
    { enemy: far, amount: 55 },
  ]);
  assert.deepEqual(queries, [
    { x: 0, y: 0, radius: 105 },
    { x: 0, y: 0, radius: 210 },
  ]);
  assert.equal(game.shockwaves.length, 0);
});

test('OrbitLaser golpea línea y borde, respeta hitCd y termina por duración', () => {
  const line = createEnemy({ x: 100, y: 0, radius: 5 });
  const widthEdge = createEnemy({ x: 100, y: 16, radius: 5 });
  const widthOutside = createEnemy({ x: 100, y: 16.01, radius: 5 });
  const behind = createEnemy({ x: -20, y: 0, radius: 5 });
  const game = createWeaponGame({ enemies: [line, widthEdge, widthOutside, behind] });
  const ultimate = new OrbitLaser();

  ultimate.activate(game);
  ultimate.tick(0, game);

  assert.deepEqual(game.events.damage.map((event) => event.enemy), [line, widthEdge]);
  assert.ok(game.events.damage.every((event) => event.amount === 16));
  assert.deepEqual(game.events.enemyQueries, [{
    type: 'bounds',
    minX: -11,
    minY: -11,
    maxX: 181,
    maxY: 11,
  }]);
  ultimate.tick(0, game);
  assert.equal(game.events.damage.length, 2);
  assert.equal(game.events.enemyQueries.length, 2);

  ultimate.tick(2.2, game);
  assert.equal(game.events.enemyQueries.length, 3);
  assert.equal(ultimate.active, false);
  assert.equal(ultimate.hitCd.size, 0);
});

test('OrbitLaser nivel 4 usa dos haces opuestos', () => {
  const right = createEnemy({ x: 100, y: 0, radius: 5 });
  const left = createEnemy({ x: -100, y: 0, radius: 5 });
  const up = createEnemy({ x: 0, y: -100, radius: 5 });
  const game = createWeaponGame({ enemies: [right, left, up] });
  const ultimate = new OrbitLaser();
  ultimate.level = 4;

  ultimate.activate(game);
  ultimate.tick(0, game);

  assert.deepEqual(game.events.damage.map((event) => event.enemy), [right, left]);
  assert.ok(game.events.damage.every((event) => event.amount === 30));
  assert.equal(game.events.enemyQueries.length, 2);
  const [rightQuery, leftQuery] = game.events.enemyQueries;
  assert.deepEqual(rightQuery, {
    type: 'bounds',
    minX: -14,
    minY: -14,
    maxX: 244,
    maxY: 14,
  });
  assert.equal(leftQuery.type, 'bounds');
  assertClose(leftQuery.minX, -244);
  assertClose(leftQuery.minY, -14);
  assertClose(leftQuery.maxX, 14);
  assertClose(leftQuery.maxY, 14);
});
