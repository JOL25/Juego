// ============================================================
// SPAWNER — the endless-mode difficulty curve lives here.
// Every `tick()` it may spawn a batch of enemies just outside
// the camera view, with stats scaled by elapsed survival time.
// ============================================================

import { DIFFICULTY, ENEMY_ANNOUNCEMENT } from '../config.js';
import { ENEMY_TYPES } from '../entities/Enemy.js';
import { pickWeighted, randRange, clamp } from '../utils.js';

export class Spawner {
  constructor(onAnnouncement = () => {}) {
    this.onAnnouncement = onAnnouncement;
    this.reset();
  }

  reset() {
    this.timeSinceSpawn = 0;
    this.eliteWave = 0;
    this.nextEliteTime = DIFFICULTY.firstEliteSeconds;
    this.introducedTypes = new Set();
    this.pendingDebuts = [];
    this.announcements = [];
  }

  get announcement() {
    return this.announcements[0] || null;
  }

  updateIntroductions(dt, elapsedSec) {
    const previous = this.announcement;
    if (this.announcement) {
      this.announcement.age += dt;
      if (this.announcement.age >= ENEMY_ANNOUNCEMENT.durationSeconds) this.announcements.shift();
    }
    for (const type of this._availableTypes(elapsedSec)) {
      if (this.introducedTypes.has(type.id)) continue;
      this.introducedTypes.add(type.id);
      this.pendingDebuts.push(type);
      this.announcements.push({ type, age: 0 });
    }
    if (this.announcement && this.announcement !== previous) this.onAnnouncement(this.announcement);
  }

  _currentInterval(elapsedSec) {
    const t = clamp(elapsedSec / DIFFICULTY.spawnRampDuration, 0, 1);
    return DIFFICULTY.spawnIntervalStart +
      (DIFFICULTY.spawnIntervalMin - DIFFICULTY.spawnIntervalStart) * t;
  }

  _currentBatchSize(elapsedSec) {
    const t = clamp(elapsedSec / DIFFICULTY.spawnRampDuration, 0, 1);
    return Math.round(
      DIFFICULTY.enemiesPerTickStart +
      (DIFFICULTY.enemiesPerTickMax - DIFFICULTY.enemiesPerTickStart) * t
    );
  }

  _availableTypes(elapsedSec) {
    const minute = elapsedSec / 60;
    return Object.values(ENEMY_TYPES).filter((t) => minute >= t.minMinute);
  }

  /**
   * @param dt seconds since last frame
   * @param elapsedSec total survival time
   * @param camera for picking off-screen spawn points
   * @param activeEnemyCount current pool usage, to enforce a hard cap
   * @param spawnFn (type, x, y, hpMult, speedMult, isElite) => void
   */
  tick(dt, elapsedSec, camera, activeEnemyCount, spawnFn) {
    // Announce on the time boundary, even when the enemy pool is full.
    this.updateIntroductions(dt, elapsedSec);
    this.timeSinceSpawn += dt;
    const interval = this._currentInterval(elapsedSec);
    const eliteDue = elapsedSec >= this.nextEliteTime;
    if (this.timeSinceSpawn < interval && !eliteDue && !this.pendingDebuts.length) return;
    this.timeSinceSpawn = 0;

    if (activeEnemyCount >= DIFFICULTY.maxActiveEnemies) return;

    const minute = elapsedSec / 60;
    const hpMult = 1 + minute * DIFFICULTY.enemyHpScalePerMin;
    const speedMult = 1 + minute * DIFFICULTY.enemySpeedScalePerMin;
    const batch = this._currentBatchSize(elapsedSec);
    const types = this._availableTypes(elapsedSec);

    if (eliteDue) {
      this.eliteWave += 1;
      this.nextEliteTime += DIFFICULTY.eliteIntervalSeconds;
    }

    const count = Math.min(batch + (eliteDue ? 1 : 0), DIFFICULTY.maxActiveEnemies - activeEnemyCount);
    for (let i = 0; i < count; i++) {
      const isElite = eliteDue && i === count - 1;
      const type = isElite ? ENEMY_TYPES.square : this.pendingDebuts.shift() || pickWeighted(types);
      const { x, y } = this._edgeSpawnPoint(camera);
      // Use a consistent archetype so later elites cannot roll weaker base stats.
      const health = isElite ? hpMult * (1 + (this.eliteWave - 1) * DIFFICULTY.eliteHpBonusPerWave) : hpMult;
      spawnFn(type, x, y, health, speedMult, isElite);
    }
  }

  _edgeSpawnPoint(camera) {
    // Spawn just outside the visible viewport, in a random direction.
    const margin = 80;
    const angle = randRange(0, Math.PI * 2);
    const dist = Math.max(camera.viewWidth, camera.viewHeight) / 2 + margin;
    return {
      x: camera.x + Math.cos(angle) * dist,
      y: camera.y + Math.sin(angle) * dist,
    };
  }
}
