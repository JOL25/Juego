import { LOADOUT, DASH, ULTIMATE, LEVEL_UP_WEIGHTS } from '../config.js';
import { pickWeightedUnique } from '../utils.js';
import { STATE } from '../core/GameState.js';
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
        title: ult.name,
        description: `${ult.blurb} (Q / E para activar)`,
        tag: 'Definitiva',
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
          title: `${weapon.name} → Lv.${weapon.level + 1}`,
          description: weapon.id === 'garlic'
            ? `Daño ${weapon.levels[weapon.level].damage}, radio ${weapon.levels[weapon.level].radius} px y ralentización ${weapon.levels[weapon.level].slowPercent}%.`
            : 'Más daño y mejor cadencia. Todas las armas disparan a la vez.',
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
            title: weapon.name,
            description: weapon.description,
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
          title: `${def.name} → Lv.${passive.level + 1}`,
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
            title: def.name,
            description: def.description(1),
          });
        }
      }
    }

    if (player.dashMaxCharges < DASH.maxCharges) {
      candidates.push({
        kind: 'dash-charge',
        weight: LEVEL_UP_WEIGHTS['dash-charge'],
        icon: '💨',
        title: `Dash extra (${player.dashMaxCharges + 1}/${DASH.maxCharges})`,
        description: `Una carga más de dash (máximo ${DASH.maxCharges}). Espacio / Shift.`,
        tag: 'Dash',
      });
    }

    if (player.dashRangeUpgrades < DASH.maxRangeUpgrades) {
      const nextCm = DASH.baseDistanceCm + (player.dashRangeUpgrades + 1) * DASH.rangePerUpgradeCm;
      candidates.push({
        kind: 'dash-range',
        weight: LEVEL_UP_WEIGHTS['dash-range'],
        icon: '↔️',
        title: `Alcance de dash → ${nextCm} cm`,
        description: `+${DASH.rangePerUpgradeCm} cm de avance por dash (base ${DASH.baseDistanceCm} cm).`,
        tag: 'Dash',
      });
    }

    if (player.ultimate && player.ultimate.canLevelUp()) {
      candidates.push({
        kind: 'ultimate-upgrade',
        weight: LEVEL_UP_WEIGHTS['ultimate-upgrade'],
        icon: player.ultimate.icon,
        title: `${player.ultimate.name} → Lv.${player.ultimate.level + 1}`,
        description: 'Mejora daño, duración o recarga de tu definitiva.',
        tag: 'Definitiva',
      });
    }

    if (candidates.length === 0) {
      return [{
        kind: 'heal',
        icon: '🍷',
        title: 'Healing Draught',
        description: 'Restore 30 HP immediately.',
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
      case 'dash-charge':
        game.player.dashMaxCharges = Math.min(DASH.maxCharges, game.player.dashMaxCharges + 1);
        game.player.dashCharges = Math.min(game.player.dashMaxCharges, game.player.dashCharges + 1);
        break;
      case 'dash-range':
        game.player.dashRangeUpgrades = Math.min(
          DASH.maxRangeUpgrades,
          game.player.dashRangeUpgrades + 1
        );
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
