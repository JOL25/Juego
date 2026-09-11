import test from 'node:test';
import assert from 'node:assert/strict';
import { PowerUpSpawner } from '../js/systems/PowerUpSpawner.js';
import { drawEnemyAnnouncement } from '../js/ui/HUD.js';

test('el cartel aparece con los beneficios a los 5 minutos y no se repite al reaparecer', () => {
  const spawner = new PowerUpSpawner();
  const spawned = [];
  const tick = (time) => spawner.tick(time, () => false, (...args) => spawned.push(args));
  tick(299.99);
  assert.equal(spawner.announcementAge, null);
  assert.equal(spawned.length, 0);
  tick(300);
  assert.equal(spawner.announcementAge, 0);
  assert.equal(spawned.length, 3);
  tick(302);
  assert.equal(spawner.announcementAge, 2);
  tick(304);
  assert.equal(spawner.announcementAge, null);
  tick(390);
  assert.equal(spawner.announcementAge, null);
  spawner.reset();
  assert.equal(spawner.announcementAge, null);
  tick(300);
  assert.equal(spawner.announcementAge, 0);
});

test('el cartel misterioso usa fondo amarillo, interrogacion negra y el mensaje completo', () => {
  const text = [];
  const fills = [];
  const ctx = {
    save() {}, restore() {}, strokeRect() {},
    fillRect() { fills.push(this.fillStyle); },
    fillText(value) { text.push({ value, color: this.fillStyle }); },
  };
  drawEnemyAnnouncement(ctx, { canvas: { width: 960 }, powerUpSpawner: { announcementAge: 1 } });
  assert.deepEqual(fills, ['#ffe45c']);
  assert.deepEqual(text[0], { value: '?', color: '#000000' });
  assert.equal(text.slice(1).map((entry) => entry.value).join(' '), 'Han aparecido beneficios misteriosos en el mapa');
});
