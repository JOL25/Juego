import { performance } from 'node:perf_hooks';

import { Projectile } from '../js/entities/Projectile.js';
import { SpatialGrid } from '../js/systems/SpatialGrid.js';
import { circlesOverlap, distPointToSegment, distanceSq } from '../js/utils.js';

const ENEMY_COUNT = 260;
const PROJECTILE_COUNT = 200;
const EXPLOSION_COUNT = 12;
const CELL_SIZE = 128;
const FIXED_DT = 1 / 60;
const WARMUP_FRAMES = 30;
const MEASURED_FRAMES = 180;

const baseline = runScenario('baseline');
const spatial = runScenario('spatial');

if (baseline.hits !== spatial.hits) {
  throw new Error(`El benchmark produjo impactos distintos: ${baseline.hits} vs ${spatial.hits}`);
}

console.log('Escenario: 260 enemigos, 200 proyectiles homing, Magic Wand nivel 8,');
console.log('dos láseres orbitales, una onda activa y 12 explosiones por actualización.');
console.table([
  metricRow('Recorridos globales/frame', baseline.globalTraversals, spatial.globalTraversals),
  metricRow('Consultas de cuadrícula/frame', baseline.gridQueries, spatial.gridQueries),
  metricRow('Candidatos examinados/frame', baseline.candidateEnemies, spatial.candidateEnemies),
  metricRow('Comprobaciones exactas/frame', baseline.exactCollisionChecks, spatial.exactCollisionChecks),
  metricRow('Búsquedas nearest/frame', baseline.nearestSearches, spatial.nearestSearches),
  metricRow('Tiempo medio actualización (ms)', baseline.averageUpdateMs, spatial.averageUpdateMs),
  metricRow('FPS teóricos de CPU', baseline.estimatedFps, spatial.estimatedFps, false),
]);
console.log(`Impactos equivalentes verificados: ${baseline.hits}`);

function runScenario(mode) {
  const enemies = createEnemies();
  const counters = createCounters();
  const grid = mode === 'spatial' ? new SpatialGrid(CELL_SIZE, counters) : null;
  const projectiles = createProjectiles();
  const state = { enemies, counters, grid, projectiles, hits: 0 };

  for (let frame = 0; frame < WARMUP_FRAMES; frame += 1) {
    runFrame(mode, state, frame);
  }

  resetCounters(counters);
  state.hits = 0;
  const startedAt = performance.now();
  for (let frame = 0; frame < MEASURED_FRAMES; frame += 1) {
    runFrame(mode, state, frame + WARMUP_FRAMES);
  }
  const elapsedMs = performance.now() - startedAt;
  const averageUpdateMs = elapsedMs / MEASURED_FRAMES;

  return {
    ...averageCounters(counters),
    averageUpdateMs,
    estimatedFps: 1000 / averageUpdateMs,
    hits: state.hits,
  };
}

function runFrame(mode, state, frame) {
  if (mode === 'spatial') {
    state.grid.clear();
    for (const enemy of state.enemies) state.grid.insert(enemy);
  }

  const query = createQueryApi(mode, state);
  for (const projectile of state.projectiles) {
    if (mode === 'baseline') {
      // Reproduce el comportamiento anterior: seleccionar objetivo en cada actualización.
      projectile.target = null;
      projectile.targetUid = null;
      projectile.targetRefreshTimer = 0;
    }
    projectile.update(FIXED_DT, query.findNearest);
    query.forEachNear(projectile.x, projectile.y, projectile.radius, (enemy) => {
      state.counters.exactCollisionChecks += 1;
      if (circlesOverlap(
        projectile.x,
        projectile.y,
        projectile.radius,
        enemy.x,
        enemy.y,
        enemy.radius
      )) state.hits += 1;
    });
  }

  // Magic Wand nivel 8 solicita cuatro objetivos.
  query.findNearestN(0, 0, 4);

  const laserAngle = frame * FIXED_DT * 3.3;
  for (let beam = 0; beam < 2; beam += 1) {
    const angle = laserAngle + beam * Math.PI;
    checkSegment(query, state, 0, 0, Math.cos(angle) * 260, Math.sin(angle) * 260, 32);
  }

  query.forEachNear(0, 0, 340, (enemy) => {
    state.counters.exactCollisionChecks += 1;
    const enemyDistance = Math.hypot(enemy.x, enemy.y);
    if (enemyDistance <= 340 + enemy.radius && enemyDistance + enemy.radius >= 320) {
      state.hits += 1;
    }
  });

  for (let index = 0; index < EXPLOSION_COUNT; index += 1) {
    const missile = state.projectiles[index];
    query.forEachNear(missile.x, missile.y, 120, (enemy) => {
      state.counters.exactCollisionChecks += 1;
      if (Math.hypot(enemy.x - missile.x, enemy.y - missile.y) <= 120 + enemy.radius) {
        state.hits += 1;
      }
    });
  }
}

function createQueryApi(mode, state) {
  if (mode === 'spatial') {
    return {
      findNearest: (x, y) => state.grid.findNearest(x, y),
      findNearestN: (x, y, count) => state.grid.findNearestN(x, y, count),
      forEachNear: (x, y, radius, callback) => {
        state.grid.forEachNearby(x, y, radius, callback);
      },
      forEachBounds: (minX, minY, maxX, maxY, callback) => {
        state.grid.forEachInBounds(minX, minY, maxX, maxY, callback);
      },
    };
  }

  const forEachEnemy = (callback) => {
    state.counters.globalTraversals += 1;
    for (const enemy of state.enemies) {
      if (!enemy.active) continue;
      state.counters.candidateEnemies += 1;
      callback(enemy);
    }
  };

  return {
    findNearest(x, y) {
      state.counters.nearestSearches += 1;
      let nearest = null;
      let nearestDistance = Infinity;
      forEachEnemy((enemy) => {
        const candidateDistance = distanceSq(x, y, enemy.x, enemy.y);
        if (candidateDistance < nearestDistance) {
          nearestDistance = candidateDistance;
          nearest = enemy;
        }
      });
      return nearest;
    },
    findNearestN(x, y, count) {
      state.counters.nearestSearches += 1;
      const candidates = [];
      forEachEnemy((enemy) => {
        candidates.push({ enemy, distance: distanceSq(x, y, enemy.x, enemy.y) });
      });
      candidates.sort((first, second) => first.distance - second.distance);
      return candidates.slice(0, count).map((candidate) => candidate.enemy);
    },
    forEachNear: (x, y, radius, callback) => forEachEnemy(callback),
    forEachBounds: (minX, minY, maxX, maxY, callback) => forEachEnemy(callback),
  };
}

function checkSegment(query, state, ax, ay, bx, by, width) {
  const halfWidth = width / 2;
  query.forEachBounds(
    Math.min(ax, bx) - halfWidth,
    Math.min(ay, by) - halfWidth,
    Math.max(ax, bx) + halfWidth,
    Math.max(ay, by) + halfWidth,
    (enemy) => {
      state.counters.exactCollisionChecks += 1;
      if (distPointToSegment(enemy.x, enemy.y, ax, ay, bx, by) <= enemy.radius + halfWidth) {
        state.hits += 1;
      }
    }
  );
}

function createEnemies() {
  const random = seededRandom(0x51a7c0de);
  return Array.from({ length: ENEMY_COUNT }, (_, index) => ({
    uid: index + 1,
    active: true,
    x: random() * 2400 - 1200,
    y: random() * 2400 - 1200,
    radius: 8 + random() * 16,
  }));
}

function createProjectiles() {
  const random = seededRandom(0xc001d00d);
  return Array.from({ length: PROJECTILE_COUNT }, () => {
    const projectile = new Projectile();
    projectile.reset({
      x: random() * 1200 - 600,
      y: random() * 1200 - 600,
      // Posiciones fijas para que ambos modos comprueben exactamente la misma geometría.
      vx: 0,
      vy: 0,
      damage: 30,
      radius: 7,
      pierce: 3,
      lifespan: 1000,
      color: '#fff',
      homing: true,
      homingTurnRate: 6,
    });
    return projectile;
  });
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function createCounters() {
  return {
    globalTraversals: 0,
    gridQueries: 0,
    candidateEnemies: 0,
    exactCollisionChecks: 0,
    nearestSearches: 0,
  };
}

function resetCounters(counters) {
  for (const key of Object.keys(counters)) counters[key] = 0;
}

function averageCounters(counters) {
  return Object.fromEntries(
    Object.entries(counters).map(([key, value]) => [key, value / MEASURED_FRAMES])
  );
}

function metricRow(metric, before, after, lowerIsBetter = true) {
  const change = before === 0
    ? '—'
    : lowerIsBetter
      ? `${(((before - after) / before) * 100).toFixed(1)}% menos`
      : `${(((after - before) / before) * 100).toFixed(1)}% más`;
  return {
    Métrica: metric,
    Antes: formatNumber(before),
    Después: formatNumber(after),
    Variación: change,
  };
}

function formatNumber(value) {
  return value.toLocaleString('es-PE', { maximumFractionDigits: 2 });
}
