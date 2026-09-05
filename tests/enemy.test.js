import test from 'node:test';
import assert from 'node:assert/strict';

import { Enemy, ENEMY_TYPES } from '../js/entities/Enemy.js';

test('un enemigo informa su muerte al agotarse su vida', () => {
  const enemy = new Enemy();
  enemy.reset(ENEMY_TYPES.ghoul, 0, 0, 1, 1);

  assert.equal(enemy.takeDamage(enemy.maxHp - 1), false);
  assert.equal(enemy.hp, 1);
  assert.equal(enemy.takeDamage(1), true);
  assert.equal(enemy.hp, 0);
});

test('un enemigo élite recibe correctamente sus multiplicadores', () => {
  const enemy = new Enemy();
  enemy.reset(ENEMY_TYPES.ghoul, 0, 0, 1, 1);
  const normalHp = enemy.maxHp;
  const normalDamage = enemy.damage;
  const normalRadius = enemy.radius;

  enemy.makeElite();

  assert.equal(enemy.isElite, true);
  assert.equal(enemy.maxHp, Math.round(normalHp * 2.4));
  assert.equal(enemy.hp, enemy.maxHp);
  assert.equal(enemy.damage, Math.round(normalDamage * 1.6));
  assert.equal(enemy.radius, normalRadius * 1.25);
});
