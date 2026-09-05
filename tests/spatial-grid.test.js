import test from 'node:test';
import assert from 'node:assert/strict';

import { SpatialGrid } from '../js/systems/SpatialGrid.js';

test('la cuadrícula devuelve solamente entidades de celdas cercanas', () => {
  const grid = new SpatialGrid(100);
  const nearby = { x: 15, y: 20, radius: 10 };
  const distant = { x: 500, y: 500, radius: 10 };
  grid.insert(nearby);
  grid.insert(distant);

  const candidates = grid.queryCircle(0, 0, 10);

  assert.ok(candidates.includes(nearby));
  assert.equal(candidates.includes(distant), false);
});

test('la cuadrícula funciona con coordenadas negativas', () => {
  const grid = new SpatialGrid(100);
  const entity = { x: -105, y: -95, radius: 12 };
  grid.insert(entity);

  assert.ok(grid.queryCircle(-100, -100, 5).includes(entity));
  assert.equal(grid.queryCircle(100, 100, 5).includes(entity), false);
});

test('el radio máximo evita perder enemigos grandes entre celdas', () => {
  const grid = new SpatialGrid(100);
  const largeEnemy = { x: 180, y: 0, radius: 60 };
  grid.insert(largeEnemy);

  // Ambos círculos se tocan aunque sus centros estén en celdas diferentes.
  assert.ok(grid.queryCircle(119, 0, 2).includes(largeEnemy));
});

test('clear elimina el índice y reinicia el radio máximo', () => {
  const grid = new SpatialGrid(100);
  grid.insert({ x: 0, y: 0, radius: 50 });

  grid.clear();

  assert.deepEqual(grid.queryCircle(0, 0, 100), []);
  assert.equal(grid.maxEntityRadius, 0);
});

test('ignora entidades inactivas al insertar y también si se desactivan después', () => {
  const grid = new SpatialGrid(100);
  const inactiveBeforeInsert = { x: 0, y: 0, radius: 10, active: false };
  const deactivatedAfterInsert = { x: 10, y: 10, radius: 10, active: true };

  assert.equal(grid.insert(inactiveBeforeInsert), false);
  assert.equal(grid.insert(deactivatedAfterInsert), true);
  deactivatedAfterInsert.active = false;

  assert.deepEqual(grid.queryCircle(0, 0, 100), []);
  assert.equal(grid.findNearest(0, 0), null);
});

test('una misma entidad no puede aparecer duplicada', () => {
  const grid = new SpatialGrid(100);
  const entity = { x: 10, y: 10, radius: 5, active: true };

  assert.equal(grid.insert(entity), true);
  assert.equal(grid.insert(entity), false);

  const nearby = grid.queryCircle(10, 10, 20);
  assert.deepEqual(nearby, [entity]);
  assert.deepEqual(grid.findNearestN(10, 10, 5), [entity]);
});

test('forEachInBounds consulta rectángulos, coordenadas negativas y radios grandes', () => {
  const grid = new SpatialGrid(100);
  const inside = { x: -50, y: -50, radius: 5, active: true };
  const overlappingByRadius = { x: 180, y: 0, radius: 60, active: true };
  const distant = { x: 500, y: 500, radius: 10, active: true };
  grid.insert(inside);
  grid.insert(overlappingByRadius);
  grid.insert(distant);
  const negativeCandidates = [];
  const radiusCandidates = [];

  grid.forEachInBounds(-40, -40, -60, -60, (entity) => negativeCandidates.push(entity));
  grid.forEachInBounds(110, -5, 120, 5, (entity) => radiusCandidates.push(entity));

  assert.ok(negativeCandidates.includes(inside));
  assert.equal(negativeCandidates.includes(distant), false);
  assert.ok(radiusCandidates.includes(overlappingByRadius));
  assert.equal(radiusCandidates.includes(distant), false);
});

test('findNearest no se detiene antes de revisar una celda vecina más cercana', () => {
  const grid = new SpatialGrid(100);
  const sameCell = { x: 0, y: 50, radius: 5, active: true };
  const nextCell = { x: 101, y: 50, radius: 5, active: true };
  grid.insert(sameCell);
  grid.insert(nextCell);

  assert.equal(grid.findNearest(99, 50), nextCell);
});

test('findNearestN devuelve la cantidad solicitada en distancia estrictamente creciente', () => {
  const grid = new SpatialGrid(100);
  const nearest = { x: -5, y: -5, radius: 2, active: true };
  const second = { x: 30, y: 0, radius: 20, active: true };
  const third = { x: 0, y: -80, radius: 2, active: true };
  const inactive = { x: 1, y: 1, radius: 2, active: false };
  const furthest = { x: 400, y: 400, radius: 2, active: true };
  for (const entity of [furthest, third, inactive, second, nearest]) grid.insert(entity);

  assert.equal(grid.findNearest(0, 0), nearest);
  assert.deepEqual(grid.findNearestN(0, 0, 3), [nearest, second, third]);
  assert.deepEqual(grid.findNearestN(0, 0, 0), []);
});

test('findNearestN coincide con una búsqueda exhaustiva para múltiples distribuciones', () => {
  const grid = new SpatialGrid(73);
  const entities = [];
  let state = 0x12345678;
  const random = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  for (let index = 0; index < 240; index += 1) {
    const entity = {
      x: random() * 5000 - 2500,
      y: random() * 5000 - 2500,
      radius: random() * 80,
      active: index % 11 !== 0,
    };
    entities.push(entity);
    grid.insert(entity);
  }

  const activeEntities = entities.filter((entity) => entity.active);
  for (let query = 0; query < 30; query += 1) {
    const x = random() * 6000 - 3000;
    const y = random() * 6000 - 3000;
    const count = 1 + Math.floor(random() * 8);
    const expected = activeEntities
      .slice()
      .sort((first, second) => distanceSq(first, x, y) - distanceSq(second, x, y))
      .slice(0, count);

    assert.deepEqual(grid.findNearestN(x, y, count), expected);
    assert.equal(grid.findNearest(x, y), expected[0]);
  }
});

test('registra consultas, candidatos y búsquedas de cercanía cuando recibe métricas', () => {
  const metrics = { gridQueries: 0, candidateEnemies: 0, nearestSearches: 0 };
  const grid = new SpatialGrid(100, metrics);
  const nearby = { x: 60, y: 50, radius: 5, active: true };
  const distant = { x: 500, y: 500, radius: 5, active: true };
  grid.insert(nearby);
  grid.insert(distant);

  grid.forEachNearby(50, 50, 20, () => {});
  assert.equal(grid.findNearest(50, 50), nearby);

  assert.deepEqual(metrics, {
    gridQueries: 2,
    candidateEnemies: 2,
    nearestSearches: 1,
  });
});

function distanceSq(entity, x, y) {
  const dx = entity.x - x;
  const dy = entity.y - y;
  return dx * dx + dy * dy;
}
