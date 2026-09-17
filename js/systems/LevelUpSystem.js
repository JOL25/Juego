import { LOADOUT, DASH, ULTIMATE, LEVEL_UP_WEIGHTS } from '../config.js';
import { pickWeightedUnique } from '../utils.js';
import { STATE } from '../core/GameState.js';
import { upgradeDescription } from '../ui/upgradeDescription.js';
import { t } from '../ui/i18n.js';
import {
  createWeapon,
  WEAPON_CLASSES,
  PASSIVE_DEFS,
  createUltimate,
  listUltimates,
} from '../weapons/registry.js';

export class LevelUpSystem {
  constructor(selectOptions = pickWeightedUnique) {
    this.selectOptions = selectOptions;
    this.pendingLevelUps = 0;
  }

  reset() {
    this.pendingLevelUps = 0;
  }

  addLevels(levels, game) {
    if (levels <= 0) return;
    this.pendingLevelUps += levels;
    if (game.state === STATE.PLAYING) this.present(game);
  }

  present(game) {
    if (this.pendingLevelUps <= 0) return;
    game.input.resetActions();
    game.state = STATE.LEVEL_UP;
    game.sound?.play('levelUp');
    const options = this.buildOptions(game.player);
    game.menu.showLevelUp(
      options.map((opt) => ({ ...opt, onPick: () => this.applyChoice(opt, game) }))
    );
  }

  buildOptions(player) {
    if (player.level >= ULTIMATE.unlockLevel && !player.ultimate) {
      return listUltimates().map((ult) => ({
        kind: 'ultimate-new',
        id: ult.id,
        icon: ult.icon,
        title: t(ult.name),
        description: `${upgradeDescription(ult)}\n${t('Activar:')} Q / E / R`,
        tag: t('Definitiva'),
      }));
    }

    const candidates = [];
    const owned = new Set(player.weapons.map((weapon) => weapon.id));

    for (const weapon of player.weapons) {
      if (weapon.canLevelUp()) {
        candidates.push({
          kind: 'weapon-upgrade',
          weight: LEVEL_UP_WEIGHTS['weapon-upgrade'],
          weapon,
          icon: weapon.icon,
          title: `${t(weapon.name)} → Lv.${weapon.level + 1}`,
          description: upgradeDescription(weapon, weapon.levels[weapon.level]),
        });
      }
    }

    if (player.weapons.length < LOADOUT.weaponSlots) {
      for (const id of Object.keys(WEAPON_CLASSES)) {
        if (!owned.has(id)) {
          const weapon = createWeapon(id);
          candidates.push({
            kind: 'weapon-new',
            weight: LEVEL_UP_WEIGHTS['weapon-new'],
            id,
            icon: weapon.icon,
            title: t(weapon.name),
            description: upgradeDescription(weapon),
          });
        }
      }
    }

    const ownedPassiveIds = new Set(player.passives.map((passive) => passive.id));
    for (const passive of player.passives) {
      const def = PASSIVE_DEFS.find((candidate) => candidate.id === passive.id);
      if (passive.level < def.maxLevel) {
        candidates.push({
          kind: 'passive-upgrade',
          weight: LEVEL_UP_WEIGHTS['passive-upgrade'],
          instance: passive,
          def,
          icon: def.icon,
          title: `${t(def.name)} → Lv.${passive.level + 1}`,
          description: def.description(passive.level + 1),
        });
      }
    }

    if (player.passives.length < LOADOUT.passiveSlots) {
      for (const def of PASSIVE_DEFS) {
        if (!ownedPassiveIds.has(def.id)) {
          candidates.push({
            kind: 'passive-new',
            weight: LEVEL_UP_WEIGHTS['passive-new'],
            def,
            icon: def.icon,
            title: t(def.name),
            description: def.description(1),
          });
        }
      }
    }

    if (player.dashLevel < DASH.maxLevel) {
      candidates.push({
        kind: 'dash-upgrade',
        weight: LEVEL_UP_WEIGHTS['dash-upgrade'],
        icon: '💨',
        title: `Dash → ${t('Nv.')} ${player.dashLevel + 1}/${DASH.maxLevel}`,
        description: `${t('Cargas:')} ${player.dashMaxCharges + 1}\n${t('+1 carga')} · ${t('Más alcance')}`,
        tag: 'Dash',
      });
    }

    if (player.ultimate && player.ultimate.canLevelUp()) {
      candidates.push({
        kind: 'ultimate-upgrade',
        id: player.ultimate.id,
        weight: LEVEL_UP_WEIGHTS['ultimate-upgrade'],
        icon: player.ultimate.icon,
        title: `${t(player.ultimate.name)} → Lv.${player.ultimate.level + 1}`,
        description: upgradeDescription(player.ultimate, player.ultimate.levels[player.ultimate.level]),
        tag: t('Definitiva'),
      });
    }

    if (candidates.length === 0) {
      return [{
        kind: 'heal',
        icon: '🍷',
        title: t('Poción curativa'),
        description: t('Recupera 30 de vida'),
      }];
    }

    return this.selectOptions(candidates, 3);
  }

  applyChoice(option, game) {
    switch (option.kind) {
      case 'weapon-upgrade':
        option.weapon.levelUp();
        break;
      case 'weapon-new':
        game.player.weapons.push(createWeapon(option.id));
        break;
      case 'passive-upgrade':
        option.instance.level += 1;
        option.def.apply(game.player, option.instance.level);
        break;
      case 'passive-new': {
        const instance = {
          id: option.def.id,
          name: option.def.name,
          icon: option.def.icon,
          level: 1,
        };
        game.player.passives.push(instance);
        option.def.apply(game.player, 1);
        break;
      }
      case 'ultimate-new':
        game.player.ultimate = createUltimate(option.id);
        break;
      case 'ultimate-upgrade':
        game.player.ultimate.levelUp();
        break;
      case 'dash-upgrade':
        if (game.player.dashLevel < DASH.maxLevel) {
          game.player.dashLevel += 1;
          game.player.dashCharges = Math.min(game.player.dashMaxCharges, game.player.dashCharges + 1);
        }
        break;
      case 'heal':
        game.player.heal(30);
        break;
      default:
        break;
    }

    this.pendingLevelUps -= 1;
    if (this.pendingLevelUps > 0) {
      this.present(game);
    } else {
      game.input.resetActions();
      game.state = STATE.PLAYING;
      game.menu.hideAll();
    }
  }
}
