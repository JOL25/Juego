import test from 'node:test';
import assert from 'node:assert/strict';
import { t, setLanguage, getLanguage } from '../js/ui/i18n.js';
import { Player } from '../js/entities/Player.js';
import { LevelUpSystem } from '../js/systems/LevelUpSystem.js';
import { createWeapon, createUltimate, WEAPON_CLASSES, PASSIVE_DEFS, listUltimates } from '../js/weapons/registry.js';

test('language switches in both directions and translates numeric upgrade descriptions', () => {
  const system = new LevelUpSystem((options) => options);
  const player = new Player();
  player.weapons.push(createWeapon('garlic'));
  setLanguage('en');
  let option = system.buildOptions(player).find((option) => option.kind === 'weapon-upgrade');
  assert.equal(option.title, 'Repulsion Field → Lv.2');
  assert.equal(option.description, 'Damage: 5\nLonger reach\nSlows enemies');
  assert.equal(t('Misiles:'), 'Missiles:');
  assert.equal(t('Definitiva al Nv.'), 'Ultimate at Lv.');
  setLanguage('es');
  option = system.buildOptions(player).find((option) => option.kind === 'weapon-upgrade');
  assert.equal(option.title, 'Campo de repulsión → Lv.2');
  assert.match(option.description, /Daño: 5/);
  assert.equal(t('Enemies slain'), 'Enemigos derrotados');
  setLanguage('fr');
  assert.equal(getLanguage(), 'es');
});

test('every weapon, passive, ultimate and dash level is translated into English', () => {
  setLanguage('en');
  const system = new LevelUpSystem((options) => options);
  const player = new Player();
  const check = (option) => {
    assert.doesNotMatch(`${option.title} ${option.description} ${option.tag || ''}`,
      /[áéíóúñ¡¿]|\b(?:Daño|Recarga|Cargas|Misil|Haces|Nv|carga|alcance|enemigos|alrededor|vida|Armadura|Definitiva|Pasiva)\b/);
    assert.doesNotMatch(option.description, /undefined|\{.*\}/);
  };
  system.buildOptions(player).forEach(check);
  const names = {
    magic_wand: 'Vector Cannon', garlic: 'Repulsion Field', whip: 'Arc Slash',
    pierce_ray: 'Prism Ray', missile: 'Polygon Missile',
  };
  for (const id of Object.keys(WEAPON_CLASSES)) {
    const weapon = createWeapon(id);
    player.weapons = [weapon];
    for (let level = 1; level < weapon.maxLevel; level++) {
      weapon.level = level;
      const option = system.buildOptions(player).find((entry) => entry.kind === 'weapon-upgrade');
      assert.equal(option.title, `${names[id]} → Lv.${level + 1}`);
      check(option);
    }
  }
  for (const def of PASSIVE_DEFS) {
    for (let level = 1; level < def.maxLevel; level++) {
      player.passives = [{ id: def.id, level }];
      check(system.buildOptions(player).find((option) => option.kind === 'passive-upgrade'));
    }
  }
  player.level = 5;
  system.buildOptions(player).forEach(check);
  for (const ultimate of listUltimates()) {
    player.ultimate = ultimate;
    for (let level = 1; level < ultimate.maxLevel; level++) {
      ultimate.level = level;
      check(system.buildOptions(player).find((option) => option.kind === 'ultimate-upgrade'));
    }
  }
  for (let level = 1; level < 4; level++) {
    player.dashLevel = level;
    check(system.buildOptions(player).find((option) => option.kind === 'dash-upgrade'));
  }
  player.weapons = Object.keys(WEAPON_CLASSES).map((id) => {
    const weapon = createWeapon(id); weapon.level = weapon.maxLevel; return weapon;
  });
  player.passives = PASSIVE_DEFS.map((def) => ({ id: def.id, level: def.maxLevel }));
  player.dashLevel = 4;
  player.ultimate = createUltimate('ult_wave');
  player.ultimate.level = player.ultimate.maxLevel;
  assert.equal(system.buildOptions(player)[0].title, 'Healing Potion');
  system.buildOptions(player).forEach(check);
});

test('complete-message translation does not replace substrings of other words', () => {
  setLanguage('en');
  assert.equal(t('Pausa:'), 'Pause:');
  assert.equal(t('Español'), 'Spanish');
  assert.equal(t('Armadura:'), 'Armor:');
  assert.equal(t('Armageddon'), 'Armageddon');
});
