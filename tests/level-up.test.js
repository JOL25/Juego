import test from 'node:test';
import assert from 'node:assert/strict';

import { DASH, ULTIMATE } from '../js/config.js';
import { Player } from '../js/entities/Player.js';
import { LevelUpSystem } from '../js/systems/LevelUpSystem.js';
import {
  createWeapon,
  createUltimate,
  PASSIVE_DEFS,
  WEAPON_CLASSES,
} from '../js/weapons/registry.js';

const allCandidates = (candidates) => candidates;

test('dash combina cargas y alcance en cuatro niveles y desaparece al maximizarlo', () => {
  const system = new LevelUpSystem(allCandidates);
  const player = new Player();
  const game = { player, input: { resetActions() {} }, menu: { hideAll() {} } };
  for (let level = 1; level <= 4; level++) {
    assert.equal(player.dashLevel, level);
    assert.equal(player.dashMaxCharges, level);
    assert.equal(player.dashCharges, level);
    assert.equal(player.dashDistancePx, level * 5 * DASH.pxPerCm);
    const choices = system.buildOptions(player).filter((option) => option.kind.startsWith('dash-'));
    assert.equal(choices.length, level === 4 ? 0 : 1);
    if (level < 4) {
      assert.equal(choices[0].kind, 'dash-upgrade');
      system.pendingLevelUps = 1;
      system.applyChoice(choices[0], game);
    }
  }
  system.pendingLevelUps = 1;
  system.applyChoice({ kind: 'dash-upgrade' }, game);
  assert.equal(player.dashLevel, 4);
  assert.equal(player.dashCharges, 4);
  assert.equal(new Player().dashLevel, 1);
});

test('dash recorre la distancia de cada nivel sin excederse en el ultimo frame', () => {
  for (let level = 1; level <= 4; level++) {
    const player = new Player();
    player.dashLevel = level;
    assert.equal(player.tryDash({ x: 1, y: 0 }), true);
    for (let frame = 0; frame < 8; frame++) player.update(1 / 60, { x: 0, y: 0 });
    assert.ok(Math.abs(player.x - level * 60) < 0.000001);
    assert.equal(player.dashActive, 0);
    assert.equal(player.dashCharges, 0);
    for (let frame = 0; frame < 90; frame++) player.update(1 / 60, { x: 0, y: 0 });
    assert.equal(player.dashCharges, 1);
  }
});

test('las definitivas aparecen al alcanzar el nivel configurado', () => {
  const system = new LevelUpSystem(allCandidates);
  const player = new Player();

  player.level = ULTIMATE.unlockLevel - 1;
  assert.equal(
    system.buildOptions(player).some((option) => option.kind === 'ultimate-new'),
    false
  );

  player.level = ULTIMATE.unlockLevel;
  const options = system.buildOptions(player);
  assert.equal(options.length, 3);
  assert.ok(options.every((option) => option.kind === 'ultimate-new'));
});

test('no ofrece como nueva un arma que ya pertenece al jugador', () => {
  const system = new LevelUpSystem(allCandidates);
  const player = new Player();
  const weapon = createWeapon('magic_wand');
  weapon.level = weapon.maxLevel;
  player.weapons.push(weapon);

  const options = system.buildOptions(player);

  assert.equal(
    options.some((option) => option.kind === 'weapon-new' && option.id === weapon.id),
    false
  );
  assert.equal(
    options.some((option) => option.kind === 'weapon-upgrade' && option.weapon === weapon),
    false
  );
});

test('ofrece curación cuando todas las mejoras están maximizadas', () => {
  const system = new LevelUpSystem(allCandidates);
  const player = new Player();

  player.weapons = Object.keys(WEAPON_CLASSES).map((id) => {
    const weapon = createWeapon(id);
    weapon.level = weapon.maxLevel;
    return weapon;
  });
  player.passives = PASSIVE_DEFS.map((def) => ({
    id: def.id,
    name: def.name,
    icon: def.icon,
    level: def.maxLevel,
  }));
  player.dashLevel = DASH.maxLevel;
  player.ultimate = createUltimate('ult_wave');
  player.ultimate.level = player.ultimate.maxLevel;

  assert.deepEqual(system.buildOptions(player), [{
    kind: 'heal',
    icon: '🍷',
    title: 'Poción curativa',
    description: 'Recupera 30 de vida',
  }]);
});

test('aplicar una elección añade el arma y reanuda la partida', () => {
  const system = new LevelUpSystem(allCandidates);
  const player = new Player();
  let menuHidden = false;
  const game = {
    player,
    state: 'level_up',
    input: { resetActions: () => {} },
    menu: { hideAll: () => { menuHidden = true; } },
  };
  system.pendingLevelUps = 1;

  system.applyChoice({ kind: 'weapon-new', id: 'whip' }, game);

  assert.equal(player.weapons.length, 1);
  assert.equal(player.weapons[0].id, 'whip');
  assert.equal(game.state, 'playing');
  assert.equal(menuHidden, true);
});
