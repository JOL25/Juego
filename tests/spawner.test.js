import test from 'node:test';
import assert from 'node:assert/strict';

import { Spawner } from '../js/systems/Spawner.js';
import { DIFFICULTY, ENEMY_ANNOUNCEMENT } from '../js/config.js';

const camera = { x: 0, y: 0, viewWidth: 960, viewHeight: 540 };

test('el aviso sonoro ocurre una vez por cartel visible, incluyendo anuncios en cola', () => {
  const announced = [];
  const spawner = new Spawner((announcement) => announced.push(announcement.type.id));
  spawner.updateIntroductions(0, 180);
  assert.deepEqual(announced, ['triangle']);
  spawner.updateIntroductions(1, 181);
  assert.deepEqual(announced, ['triangle']);
  spawner.updateIntroductions(3, 184);
  assert.deepEqual(announced, ['triangle', 'square']);
  spawner.updateIntroductions(4, 188);
  assert.deepEqual(announced, ['triangle', 'square']);
  spawner.reset();
  spawner.updateIntroductions(0, 0);
  assert.deepEqual(announced, ['triangle', 'square', 'triangle']);
});
const schedule = [
  [0, 'triangle'],
  [180, 'square'],
  [360, 'diamond'],
  [540, 'pentagon'],
  [720, 'hexagon'],
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
  spawner.tick(0, 180, camera, DIFFICULTY.maxActiveEnemies, () => spawned++);
  assert.equal(spawner.announcement.type.id, 'square');
  assert.equal(spawned, 0);
  const debut = [];
  spawner.tick(1, 181, camera, 0, (type) => debut.push(type.id));
  assert.equal(debut[0], 'square');
});

test('reiniciar limpia los anuncios y permite estrenar las figuras de nuevo', () => {
  const spawner = new Spawner();
  spawner.tick(2, 720, camera, 0, () => {});
  spawner.reset();
  assert.equal(spawner.announcement, null);
  assert.equal(spawner.pendingDebuts.length, 0);
  spawner.updateIntroductions(0, 0);
  assert.equal(spawner.announcements.length, 1);
  assert.equal(spawner.announcement.type.id, 'triangle');
});
