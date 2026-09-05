import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HOMING_TARGET_REFRESH_SECONDS,
  Projectile,
} from '../js/entities/Projectile.js';

test('un proyectil homing conserva su objetivo durante 150 ms', () => {
  const target = { uid: 1, active: true, x: 100, y: 0 };
  const projectile = createHomingProjectile(target);
  let searches = 0;

  projectile.update(0.1, () => {
    searches += 1;
    return target;
  });
  projectile.update(0.04, () => {
    searches += 1;
    return target;
  });

  assert.equal(searches, 0);
  assert.equal(projectile.target, target);

  projectile.update(0.02, () => {
    searches += 1;
    return target;
  });

  assert.equal(searches, 1);
  assert.equal(projectile.targetRefreshTimer, HOMING_TARGET_REFRESH_SECONDS);
});

test('un proyectil homing busca inmediatamente si su objetivo muere', () => {
  const deadTarget = { uid: 1, active: false, x: 100, y: 0 };
  const replacement = { uid: 2, active: true, x: 0, y: 100 };
  const projectile = createHomingProjectile(deadTarget);
  let searches = 0;

  projectile.update(0.01, () => {
    searches += 1;
    return replacement;
  });

  assert.equal(searches, 1);
  assert.equal(projectile.target, replacement);
  assert.equal(projectile.targetUid, replacement.uid);
  assert.ok(projectile.vy > 0);
});

test('el homing detecta si el pool reutiliza el objeto con una uid nueva', () => {
  const recycledTarget = { uid: 10, active: true, x: 100, y: 0 };
  const projectile = createHomingProjectile(recycledTarget);
  recycledTarget.uid = 11;
  let searches = 0;

  projectile.update(0.01, () => {
    searches += 1;
    return recycledTarget;
  });

  assert.equal(searches, 1);
  assert.equal(projectile.targetUid, 11);
});

test('si no encuentra objetivo, limita los nuevos intentos a uno cada 150 ms', () => {
  const projectile = createHomingProjectile(null);
  let searches = 0;
  const findNobody = () => {
    searches += 1;
    return null;
  };

  projectile.update(0.01, findNobody);
  projectile.update(0.05, findNobody);
  projectile.update(0.05, findNobody);
  assert.equal(searches, 1);

  projectile.update(0.05, findNobody);
  assert.equal(searches, 2);
});

function createHomingProjectile(target) {
  const projectile = new Projectile();
  projectile.reset({
    x: 0,
    y: 0,
    vx: 100,
    vy: 0,
    damage: 10,
    radius: 5,
    pierce: 1,
    lifespan: 10,
    color: '#fff',
    homing: true,
    homingTurnRate: 6,
    target,
  });
  return projectile;
}
