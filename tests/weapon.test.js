import test from 'node:test';
import assert from 'node:assert/strict';

import { Weapon } from '../js/weapons/Weapon.js';

class TestWeapon extends Weapon {
  constructor() {
    super({
      id: 'test',
      name: 'Test Weapon',
      levels: [
        { cooldownMs: 100 },
        { cooldownMs: 40 },
      ],
    });
    this.shots = 0;
  }

  fire() {
    this.shots += 1;
  }
}

test('un arma dispara solamente cuando termina su cooldown', () => {
  const weapon = new TestWeapon();

  weapon.update(0, {});
  assert.equal(weapon.shots, 1);
  assert.equal(weapon.cooldownTimer, 100);

  weapon.update(0.05, {});
  assert.equal(weapon.shots, 1);

  weapon.update(0.05, {});
  assert.equal(weapon.shots, 2);
  assert.equal(weapon.cooldownTimer, 100);
});

test('el cooldown usa las estadísticas del nuevo nivel', () => {
  const weapon = new TestWeapon();
  weapon.levelUp();

  weapon.update(0, {});

  assert.equal(weapon.level, 2);
  assert.equal(weapon.shots, 1);
  assert.equal(weapon.cooldownTimer, 40);
});
