// ============================================================
// WEAPON (base class) — every weapon is a cooldown-driven auto
// attack. Subclasses implement `fire(game)`; the base class
// handles leveling and the timer.
// ============================================================

export class Weapon {
  constructor(def) {
    this.id = def.id;
    this.name = def.name;
    this.icon = def.icon;
    this.description = def.description || 'Attacks automatically.';
    this.levels = def.levels;       // array of stat objects, index 0 = level 1
    this.level = 1;
    this.cooldownTimer = 0;
    this.maxLevel = def.levels.length;
  }

  get stats() {
    return this.levels[this.level - 1];
  }

  canLevelUp() {
    return this.level < this.maxLevel;
  }

  levelUp() {
    if (this.canLevelUp()) this.level += 1;
  }

  update(dt, game) {
    this.cooldownTimer -= dt * 1000;
    if (this.cooldownTimer <= 0) {
      this.fire(game);
      this.cooldownTimer = this.stats.cooldownMs;
    }
  }

  // eslint-disable-next-line no-unused-vars
  fire(game) {
    throw new Error(`${this.name} must implement fire()`);
  }
}
