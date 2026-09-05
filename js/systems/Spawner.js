// ============================================================
// SPAWNER — the endless-mode difficulty curve lives here.
// Every `tick()` it may spawn a batch of enemies just outside
// the camera view, with stats scaled by elapsed survival time.
// ============================================================

import { DIFFICULTY } from '../config.js';
import { ENEMY_TYPES } from '../entities/Enemy.js';
import { pickWeighted, randRange, clamp } from '../utils.js';

export class Spawner {
  constructor() {
    this.timeSinceSpawn = 0;
    this.lastEliteMinute = -1;
  }

  reset() {
    this.timeSinceSpawn = 0;
    this.lastEliteMinute = -1;
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
    this.timeSinceSpawn += dt;
    const interval = this._currentInterval(elapsedSec);
    if (this.timeSinceSpawn < interval) return;
    this.timeSinceSpawn = 0;

    if (activeEnemyCount >= DIFFICULTY.maxActiveEnemies) return;

    const minute = elapsedSec / 60;
    const hpMult = 1 + minute * DIFFICULTY.enemyHpScalePerMin;
    const speedMult = 1 + minute * DIFFICULTY.enemySpeedScalePerMin;
    const batch = this._currentBatchSize(elapsedSec);
    const types = this._availableTypes(elapsedSec);

    const isEliteWave =
      Math.floor(minute / DIFFICULTY.eliteEveryMinutes) > this.lastEliteMinute &&
      minute >= DIFFICULTY.eliteEveryMinutes;
    if (isEliteWave) this.lastEliteMinute = Math.floor(minute / DIFFICULTY.eliteEveryMinutes);

    for (let i = 0; i < batch; i++) {
      const type = pickWeighted(types);
      const { x, y } = this._edgeSpawnPoint(camera);
      spawnFn(type, x, y, hpMult, speedMult, isEliteWave && i === 0);
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
