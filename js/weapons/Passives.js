// ============================================================
// PASSIVES — simple stat-boosting items. Unlike weapons they
// have no cooldown; `apply(player)` runs once when picked/leveled.
// ============================================================

import { VAMPIRE_KISS } from '../config.js';
import { t } from '../ui/i18n.js';

export const PASSIVE_DEFS = [
  {
    id: 'tome',
    name: 'Vital Core',
    icon: '📖',
    maxLevel: 5,
    description: (lvl) => `${t('Vida máxima:')} +${lvl * 10}%`,
    apply(player, level) {
      // Reset to base then reapply — simplest way to keep stacking correct.
      const bonus = 1 + level * 0.10;
      player.maxHp = Math.round(player._baseMaxHp * bonus);
      player.hp = Math.min(player.hp + player.maxHp - (player._lastMaxHp || player.maxHp), player.maxHp);
      player._lastMaxHp = player.maxHp;
    },
  },
  {
    id: 'boots',
    name: 'Velocity Vector',
    icon: '🥾',
    maxLevel: 5,
    description: (lvl) => `${t('Velocidad:')} +${lvl * 8}%`,
    apply(player, level) {
      player.speed = player._baseSpeed * (1 + level * 0.08);
    },
  },
  {
    id: 'armor',
    name: 'Polygon Shell',
    icon: '🛡️',
    maxLevel: 5,
    description: (lvl) => `${t('Armadura:')} +${lvl * 2}`,
    apply(player, level) {
      player.armor = player._baseArmor + level * 2;
    },
  },
  {
    id: 'amulet',
    name: 'Attraction Field',
    icon: '🧲',
    maxLevel: 5,
    description: (lvl) => `${t('Rango de recogida:')} +${lvl * 25}%`,
    apply(player, level) {
      player.magnetRadius = player._baseMagnetRadius * (1 + level * 0.25);
    },
  },
  {
    id: 'heart',
    name: "Energy Recycle",
    icon: '❤️',
    maxLevel: 3,
    description: (lvl) => `${t('Vida al matar:')} +${VAMPIRE_KISS.healingByLevel[lvl - 1]}\n${t('Recarga:')} ${VAMPIRE_KISS.cooldownMs / 1000} s`,
    apply(player, level) {
      player.healOnKill = VAMPIRE_KISS.healingByLevel[level - 1];
    },
  },
];
