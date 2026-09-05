import test from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../js/core/Game.js';
import { Pickup, PICKUP_KIND } from '../js/entities/Pickup.js';
import { PowerUpSpawner } from '../js/systems/PowerUpSpawner.js';
import { CollisionSystem } from '../js/systems/CollisionSystem.js';
import { SuperPierceShot, ExplosiveWave, OrbitLaser } from '../js/weapons/Ultimates.js';
import { createWeaponGame } from './weapons/helpers.js';

test('los power-ups aparecen desde el minuto 5 cerca de una esquina y del centro', () => {
  const spawner = new PowerUpSpawner();
  const activeKinds = new Set();
  const spawned = [];
  const spawn = (x, y, kind, duration) => {
    activeKinds.add(kind);
    spawned.push({ x, y, kind, duration });
  };

  spawner.tick(299.99, (kind) => activeKinds.has(kind), spawn);
  assert.deepEqual(spawned, []);

  spawner.tick(300, (kind) => activeKinds.has(kind), spawn);

  assert.deepEqual(spawned, [
    { x: -1740, y: -1740, kind: PICKUP_KIND.MEGA_MAGNET, duration: 7 },
    { x: 320, y: -320, kind: PICKUP_KIND.FREEZE_CLOCK, duration: 10 },
    { x: 1740, y: -1740, kind: PICKUP_KIND.ULTIMATE_INFINITY, duration: 3 },
  ]);
});

test('el spawner no duplica power-ups activos y repone los recogidos', () => {
  const spawner = new PowerUpSpawner();
  const activeKinds = new Set();
  const spawned = [];
  const spawn = (x, y, kind, duration) => {
    activeKinds.add(kind);
    spawned.push({ x, y, kind, duration });
  };

  spawner.tick(300, (kind) => activeKinds.has(kind), spawn);
  activeKinds.delete(PICKUP_KIND.MEGA_MAGNET);
  spawner.tick(390, (kind) => activeKinds.has(kind), spawn);

  assert.equal(spawned.length, 4);
  assert.deepEqual(spawned[3], {
    x: 320,
    y: 320,
    kind: PICKUP_KIND.MEGA_MAGNET,
    duration: 7,
  });
});

test('el megaimán atrae XP lejana sin atraer otros power-ups', () => {
  const normalXp = new Pickup();
  normalXp.reset(2000, 0, PICKUP_KIND.XP, 5);
  normalXp.update(1, 0, 0, 70, false);
  assert.equal(normalXp.x, 2000);

  const attractedXp = new Pickup();
  attractedXp.reset(2000, 0, PICKUP_KIND.XP, 5);
  attractedXp.update(1, 0, 0, 70, true);
  assert.equal(attractedXp.x, 800);

  const clock = new Pickup();
  clock.reset(2000, 0, PICKUP_KIND.FREEZE_CLOCK, 10);
  clock.update(1, 0, 0, 70, true);
  assert.equal(clock.x, 2000);
});

test('recoger los power-ups activa sus duraciones y los libera del pool', () => {
  const magnet = createPowerUp(PICKUP_KIND.MEGA_MAGNET, 7);
  const clock = createPowerUp(PICKUP_KIND.FREEZE_CLOCK, 10);
  const infinity = createPowerUp(PICKUP_KIND.ULTIMATE_INFINITY, 3);
  const activated = [];
  const game = createCollisionGame([magnet, clock, infinity]);
  game.activateMegaMagnet = (duration) => activated.push({ kind: 'magnet', duration });
  game.activateEnemyFreeze = (duration) => activated.push({ kind: 'clock', duration });
  game.activateUltimateInfinity = (duration) => activated.push({ kind: 'infinity', duration });

  new CollisionSystem().resolve(game);

  assert.deepEqual(activated, [
    { kind: 'magnet', duration: 7 },
    { kind: 'clock', duration: 10 },
    { kind: 'infinity', duration: 3 },
  ]);
  assert.equal(magnet.active, false);
  assert.equal(clock.active, false);
  assert.equal(infinity.active, false);
});

for (const UltimateClass of [SuperPierceShot, ExplosiveWave, OrbitLaser]) {
  test(`infinito permite repetir ${UltimateClass.name} y restaura la recarga al terminar`, () => {
    const ultimate = new UltimateClass();
    const game = createWeaponGame({ player: { ultimate } });
    Object.assign(game, { megaMagnetTimer: 0, enemyFreezeTimer: 0, ultimateInfinityTimer: 0 });
    ultimate.cooldownTimer = 9000;
    Game.prototype.activateUltimateInfinity.call(game);
    assert.equal(game.ultimateInfinityTimer, 3);
    assert.equal(ultimate.isReady(), true);
    for (let i = 0; i < 3; i++) {
      assert.equal(ultimate.tryActivate(game), true);
      ultimate.update(0.2, game);
      assert.equal(ultimate.cooldownTimer, 0);
      assert.equal(ultimate.readyIconTimer, 0);
    }
    Game.prototype._updatePowerUpTimers.call(game, 3);
    assert.equal(game.ultimateInfinityTimer, 0);
    assert.equal(ultimate.unlimited, false);
    // A continuous ultimate finishes its active effect before becoming ready.
    if (ultimate.active) ultimate.update(ultimate.stats.durationMs / 1000, game);
    assert.equal(ultimate.readyIconTimer, 2);
    assert.equal(ultimate.tryActivate(game), true);
    assert.equal(ultimate.cooldownTimer, ultimate.stats.cooldownMs);
    assert.equal(ultimate.tryActivate(game), false);
  });
}

test('infinito puede recogerse sin ultimate y renovarse sin acumular duraciones', () => {
  const game = { player: {}, megaMagnetTimer: 0, enemyFreezeTimer: 0, ultimateInfinityTimer: 0 };
  Game.prototype.activateUltimateInfinity.call(game);
  Game.prototype._updatePowerUpTimers.call(game, 1);
  Game.prototype.activateUltimateInfinity.call(game);
  assert.equal(game.ultimateInfinityTimer, 3);
  game.player.ultimate = new SuperPierceShot();
  Game.prototype._updatePowerUpTimers.call(game, 0.5);
  assert.equal(game.player.ultimate.unlimited, true);
  Game.prototype._updatePowerUpTimers.call(game, 10);
  assert.equal(game.player.ultimate.unlimited, false);
  assert.equal(game.ultimateInfinityTimer, 0);
});

test('la levitacion avanza sin desplazar la posicion de recogida', () => {
  for (const kind of Object.values(PICKUP_KIND)) {
    const pickup = new Pickup();
    pickup.reset(1000, 1000, kind, 3);
    const phase = pickup.floatPhase;
    pickup.update(0.25, 0, 0, 70);
    assert.notEqual(pickup.floatPhase, phase);
    assert.equal(pickup.x, 1000);
    assert.equal(pickup.y, 1000);
  }
});

test('los temporizadores no se acumulan y terminan exactamente en cero', () => {
  const game = { megaMagnetTimer: 0, enemyFreezeTimer: 0 };

  Game.prototype.activateMegaMagnet.call(game, 5);
  Game.prototype.activateMegaMagnet.call(game, 2);
  Game.prototype.activateEnemyFreeze.call(game, 10);
  Game.prototype._updatePowerUpTimers.call(game, 4);

  assert.equal(game.megaMagnetTimer, 1);
  assert.equal(game.enemyFreezeTimer, 6);

  Game.prototype._updatePowerUpTimers.call(game, 20);
  assert.equal(game.megaMagnetTimer, 0);
  assert.equal(game.enemyFreezeTimer, 0);
});

test('los enemigos congelados no se mueven, siguen indexados y no dañan al jugador', () => {
  let enemyUpdates = 0;
  let gridClears = 0;
  const indexed = [];
  const enemy = {
    active: true,
    frozen: false,
    x: 0,
    y: 0,
    radius: 10,
    damage: 10,
    contactCooldown: 0,
    update() {
      enemyUpdates += 1;
    },
  };
  const game = {
    enemyFreezeTimer: 10,
    player: { x: 0, y: 0 },
    enemyPool: activePool([enemy]),
    enemyGrid: {
      clear() { gridClears += 1; },
      insert(entity) { indexed.push(entity); },
      forEachNearby(x, y, radius, callback) { callback(enemy); },
    },
    areEnemiesFrozen: Game.prototype.areEnemiesFrozen,
  };

  Game.prototype._updateEnemies.call(game, 1 / 60);

  assert.equal(enemyUpdates, 0);
  assert.equal(enemy.frozen, true);
  assert.equal(gridClears, 1);
  assert.deepEqual(indexed, [enemy]);

  let playerDamage = 0;
  const collisionGame = {
    ...game,
    projectilePool: activePool([]),
    pickupPool: activePool([]),
    player: {
      alive: true,
      x: 0,
      y: 0,
      radius: 10,
      takeDamage(amount) { playerDamage += amount; },
    },
  };
  new CollisionSystem().resolve(collisionGame);
  assert.equal(playerDamage, 0);
});

function createPowerUp(kind, duration) {
  return { active: true, x: 0, y: 0, radius: 15, kind, value: duration };
}

function createCollisionGame(pickups) {
  return {
    enemyGrid: { forEachNearby() {} },
    enemyFreezeTimer: 0,
    areEnemiesFrozen() { return false; },
    projectilePool: activePool([]),
    pickupPool: activePool(pickups),
    player: {
      alive: true,
      x: 0,
      y: 0,
      radius: 14,
      takeDamage() { return false; },
      heal() {},
    },
    onPlayerHit() {},
    onXpCollected() {},
  };
}

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
