import test from 'node:test';
import assert from 'node:assert/strict';

import { PLAYER } from '../js/config.js';
import { Player } from '../js/entities/Player.js';
import { PASSIVE_DEFS } from '../js/weapons/Passives.js';
import { Game } from '../js/core/Game.js';

test('Vampire Kiss cura 5, 10 y 20 y exige cinco segundos entre curaciones', () => {
  const kiss = PASSIVE_DEFS.find((passive) => passive.id === 'heart');
  for (const [index, amount] of [5, 10, 20].entries()) {
    const player = new Player();
    player.hp = 20;
    kiss.apply(player, index + 1);
    const game = {
      player,
      spawnDeathBurst() {},
      spawnPickup() {},
      enemyPool: { release(enemy) { enemy.active = false; } },
    };
    const kill = () => Game.prototype._killEnemy.call(game, {
      active: true, x: 0, y: 0, xpValue: 3, type: { color: '#ffffff' },
    });
    kill();
    kill();
    assert.equal(player.hp, 20 + amount);
    player.update(4.999, { x: 0, y: 0 });
    kill();
    assert.equal(player.hp, 20 + amount);
    player.update(0.001, { x: 0, y: 0 });
    kill();
    assert.equal(player.hp, 20 + amount * 2);
  }
});

test('Vampire Kiss conserva su recarga al mejorar y no consume el efecto con vida llena', () => {
  const player = new Player();
  const kiss = PASSIVE_DEFS.find((passive) => passive.id === 'heart');
  kiss.apply(player, 1);
  assert.equal(player.tryHealOnKill(), false);
  assert.equal(player.healOnKillCooldown, 0);
  player.hp = 98;
  assert.equal(player.tryHealOnKill(), true);
  assert.equal(player.hp, 100);
  kiss.apply(player, 3);
  player.hp = 50;
  assert.equal(player.tryHealOnKill(), false);
  player.update(5, { x: 0, y: 0 });
  assert.equal(player.tryHealOnKill(), true);
  assert.equal(player.hp, 70);
});

test('Vampire Kiss no cura sin el objeto ni revive al jugador', () => {
  const player = new Player();
  player.hp = 50;
  assert.equal(player.tryHealOnKill(), false);
  player.healOnKill = 20;
  player.hp = 0;
  player.alive = false;
  assert.equal(player.tryHealOnKill(), false);
  assert.equal(player.hp, 0);
});

test('gainXp sube de nivel y conserva la experiencia sobrante', () => {
  const player = new Player();
  const firstLevelCost = player.xpToNext;

  assert.equal(player.gainXp(firstLevelCost - 1), 0);
  assert.equal(player.level, 1);

  assert.equal(player.gainXp(1), 1);
  assert.equal(player.level, 2);
  assert.equal(player.xp, 0);
});

test('gainXp puede conceder varios niveles en una sola llamada', () => {
  const player = new Player();
  const amount = PLAYER.xpToLevel(1) + PLAYER.xpToLevel(2) + 7;

  assert.equal(player.gainXp(amount), 2);
  assert.equal(player.level, 3);
  assert.equal(player.xp, 7);
  assert.equal(player.xpToNext, PLAYER.xpToLevel(3));
});

test('takeDamage aplica armadura e invulnerabilidad', () => {
  const player = new Player();
  player.armor = 3;

  assert.equal(player.takeDamage(10), true);
  assert.equal(player.hp, player.maxHp - 7);

  assert.equal(player.takeDamage(10), false);
  assert.equal(player.hp, player.maxHp - 7);
});

test('takeDamage siempre causa al menos un punto y limita la vida a cero', () => {
  const player = new Player();
  player.armor = 999;

  player.takeDamage(10);
  assert.equal(player.hp, player.maxHp - 1);

  player.invulnTimer = 0;
  player.hp = 1;
  player.takeDamage(10);
  assert.equal(player.hp, 0);
  assert.equal(player.alive, false);
});
