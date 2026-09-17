import test from 'node:test';
import assert from 'node:assert/strict';

import { Spawner } from '../js/systems/Spawner.js';
import { DIFFICULTY, ENEMY_ANNOUNCEMENT } from '../js/config.js';

const camera = { x: 0, y: 0, viewWidth: 960, viewHeight: 540 };

test('elites arrive at 1:30 and 4:00, grow stronger, and reset with the run', () => {
  const spawner = new Spawner();
  const elites = [];
  const tick = (time, count = 0) => spawner.tick(0.02, time, camera, count,
    (type, x, y, hp, speed, elite) => { if (elite) elites.push({ type, hp, speed }); });
  tick(0);
  tick(89.99);
  assert.equal(elites.length, 0);
  tick(90);
  assert.equal(elites.length, 1);
  tick(90.02);
  tick(239.99);
  assert.equal(elites.length, 1);
  tick(240, DIFFICULTY.maxActiveEnemies);
  assert.equal(elites.length, 1);
  tick(240.02);
  assert.equal(elites.length, 2);
  assert.equal(elites[1].type, elites[0].type);
  assert.ok(elites[1].hp > elites[0].hp * 1.5);
  assert.ok(elites[1].speed > elites[0].speed);
  tick(389.99);
  assert.equal(elites.length, 2);
  tick(390);
  assert.equal(elites.length, 3);
  spawner.reset();
  tick(90);
  assert.equal(elites.length, 4);
  assert.equal(elites[3].hp, elites[0].hp);
});

test('el aviso sonoro ocurre una vez por cartel visible, incluyendo anuncios en cola', () => {
  const announced = [];
  const spawner = new Spawner((announcement) => announced.push(announcement.type.id));
  spawner.updateIntroductions(0, 45);
  assert.deepEqual(announced, ['triangle']);
  spawner.updateIntroductions(1, 46);
  assert.deepEqual(announced, ['triangle']);
  spawner.updateIntroductions(3, 49);
  assert.deepEqual(announced, ['triangle', 'square']);
  spawner.updateIntroductions(4, 53);
  assert.deepEqual(announced, ['triangle', 'square']);
  spawner.reset();
  spawner.updateIntroductions(0, 0);
  assert.deepEqual(announced, ['triangle', 'square', 'triangle']);
});
const schedule = [
  [0, 'triangle'],
  [45, 'square'],
  [150, 'diamond'],
  [300, 'pentagon'],
  [420, 'hexagon'],
];

test('cada figura se desbloquea en su minuto y las anteriores siguen disponibles', () => {
  const spawner = new Spawner();
  for (let index = 0; index < schedule.length; index++) {
    const [seconds] = schedule[index];
    const previous = schedule.slice(0, index).map(([, id]) => id);
    assert.deepEqual(spawner._availableTypes(seconds - 0.001).map((type) => type.id), previous);
    assert.deepEqual(spawner._availableTypes(seconds).map((type) => type.id),
      schedule.slice(0, index + 1).map(([, id]) => id));
  }
});

test('cada estreno tiene anuncio y una aparicion garantizada sin repetir el aviso', () => {
  const spawner = new Spawner();
  for (const [seconds, id] of schedule) {
    const spawned = [];
    spawner.tick(2, seconds, camera, 0, (type) => spawned.push(type));
    assert.equal(spawner.announcement.type.id, id);
    assert.equal(spawner.announcement.age, 0);
    assert.equal(spawned[0].id, id);
    assert.ok(spawned.every((type) => type.minMinute * 60 <= seconds));

    spawner.tick(ENEMY_ANNOUNCEMENT.durationSeconds, seconds + 4, camera, 0, () => {});
    assert.equal(spawner.announcement, null);
    spawner.tick(1, seconds + 5, camera, 0, () => {});
    assert.equal(spawner.announcement, null);
  }
});

test('un pool lleno no retrasa el aviso y conserva el estreno hasta tener espacio', () => {
  const spawner = new Spawner();
  spawner.tick(2, 0, camera, 0, () => {});
  spawner.tick(4, 4, camera, 0, () => {});
  let spawned = 0;
  spawner.tick(0, 45, camera, DIFFICULTY.maxActiveEnemies, () => spawned++);
  assert.equal(spawner.announcement.type.id, 'square');
  assert.equal(spawned, 0);
  const debut = [];
  spawner.tick(1, 46, camera, 0, (type) => debut.push(type.id));
  assert.equal(debut[0], 'square');
});

test('reiniciar limpia los anuncios y permite estrenar las figuras de nuevo', () => {
  const spawner = new Spawner();
  spawner.tick(2, 420, camera, 0, () => {});
  spawner.reset();
  assert.equal(spawner.announcement, null);
  assert.equal(spawner.pendingDebuts.length, 0);
  spawner.updateIntroductions(0, 0);
  assert.equal(spawner.announcements.length, 1);
  assert.equal(spawner.announcement.type.id, 'triangle');
});
