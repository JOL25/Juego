// ============================================================
// PASSIVES — simple stat-boosting items. Unlike weapons they
// have no cooldown; `apply(player)` runs once when picked/leveled.
// ============================================================

export const PASSIVE_DEFS = [
  {
    id: 'tome',
    name: 'Ancient Tome',
    icon: '📖',
    maxLevel: 5,
    description: (lvl) => `+${lvl * 10}% max HP`,
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
    name: 'Swift Boots',
    icon: '🥾',
    maxLevel: 5,
    description: (lvl) => `+${lvl * 8}% move speed`,
    apply(player, level) {
      player.speed = player._baseSpeed * (1 + level * 0.08);
    },
  },
  {
    id: 'armor',
    name: 'Bone Armor',
    icon: '🛡️',
    maxLevel: 5,
    description: (lvl) => `+${lvl * 2} armor`,
    apply(player, level) {
      player.armor = player._baseArmor + level * 2;
    },
  },
  {
    id: 'amulet',
    name: 'Pull Amulet',
    icon: '🧲',
    maxLevel: 5,
    description: (lvl) => `+${lvl * 25}% pickup radius`,
    apply(player, level) {
      player.magnetRadius = player._baseMagnetRadius * (1 + level * 0.25);
    },
  },
  {
    id: 'heart',
    name: "Vampire's Kiss",
    icon: '❤️',
    maxLevel: 3,
    description: (lvl) => `Heal ${lvl * 2} HP per kill`,
    apply(player, level) {
      player.healOnKill = level * 2;
    },
  },
];
