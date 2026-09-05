import test from 'node:test';
import assert from 'node:assert/strict';

import { PLAYER } from '../js/config.js';
import { Player } from '../js/entities/Player.js';

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
