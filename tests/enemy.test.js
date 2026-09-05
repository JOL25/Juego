import test from 'node:test';
import assert from 'node:assert/strict';

import { Enemy, ENEMY_TYPES } from '../js/entities/Enemy.js';

test('ralentizar no reduce el empuje del latigo y el efecto se limpia al reciclar', () => {
  const enemy = new Enemy();
  enemy.reset(ENEMY_TYPES.square, 50, 0, 1, 1);
  enemy.applySlow(40, 0.5);
  enemy.knockBack(1, 0, 60);
  enemy.update(0.15, 0, 0);
  assert.equal(enemy.x, 110);
  assert.equal(enemy.slowPercent, 40);
  enemy.reset(ENEMY_TYPES.triangle, 50, 0, 1, 1);
  assert.equal(enemy.slowPercent, 0);
  assert.equal(enemy.slowTimer, 0);
  enemy.update(0.1, 0, 0);
  assert.equal(enemy.x, 37);
});

test('un frame que supera la duracion de ralentizacion usa ambas velocidades', () => {
  const enemy = new Enemy();
  enemy.reset(ENEMY_TYPES.square, 100, 0, 1, 1);
  enemy.speed = 100;
  enemy.applySlow(40, 0.2);
  enemy.update(0.5, 0, 0);
  assert.equal(enemy.x, 58);
  assert.equal(enemy.slowPercent, 0);
});

test('el empuje diagonal recorre la distancia indicada y luego reanuda la persecucion', () => {
  const enemy = new Enemy();
  enemy.reset(ENEMY_TYPES.square, 30, 40, 1, 1);
  enemy.knockBack(3, 4, 60);
  enemy.update(0.05, 0, 0);
  enemy.update(0.05, 0, 0);
  enemy.update(0.05, 0, 0);
  assert.ok(Math.abs(enemy.x - 66) < 1e-9);
  assert.ok(Math.abs(enemy.y - 88) < 1e-9);
  assert.equal(enemy.knockbackTimer, 0);
  enemy.update(0.1, 0, 0);
  assert.ok(enemy.x < 66 && enemy.y < 88);
});

test('reciclar un enemigo elimina el empuje de su vida anterior', () => {
  const enemy = new Enemy();
  enemy.reset(ENEMY_TYPES.square, 50, 0, 1, 1);
  enemy.knockBack(1, 0, 60);
  enemy.reset(ENEMY_TYPES.triangle, 50, 0, 1, 1);
  enemy.update(0.1, 0, 0);
  assert.equal(enemy.x, 37);
  assert.equal(enemy.knockbackTimer, 0);
});

test('un enemigo informa su muerte al agotarse su vida', () => {
  const enemy = new Enemy();
  enemy.reset(ENEMY_TYPES.square, 0, 0, 1, 1);

  assert.equal(enemy.takeDamage(enemy.maxHp - 1), false);
  assert.equal(enemy.hp, 1);
  assert.equal(enemy.takeDamage(1), true);
  assert.equal(enemy.hp, 0);
});

test('un enemigo élite recibe correctamente sus multiplicadores', () => {
  const enemy = new Enemy();
  enemy.reset(ENEMY_TYPES.square, 0, 0, 1, 1);
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
