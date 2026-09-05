import { POWER_UPS, WORLD } from '../config.js';
import { PICKUP_KIND } from '../entities/Pickup.js';

export class PowerUpSpawner {
  constructor(config = POWER_UPS, worldSize = WORLD.size) {
    this.config = config;
    this.worldSize = worldSize;
    this.spawnPoints = this._createSpawnPoints();
    this.reset();
  }

  reset() {
    this.nextSpawnTime = this.config.startTimeSeconds;
    this.nextPointIndex = 0;
  }

  tick(elapsedSeconds, isKindActive, spawnPowerUp) {
    if (elapsedSeconds < this.nextSpawnTime) return;

    while (elapsedSeconds >= this.nextSpawnTime) {
      this._spawnIfMissing(
        PICKUP_KIND.MEGA_MAGNET,
        this.config.megaMagnetDurationSeconds,
        isKindActive,
        spawnPowerUp
      );
      this._spawnIfMissing(
        PICKUP_KIND.FREEZE_CLOCK,
        this.config.freezeDurationSeconds,
        isKindActive,
        spawnPowerUp
      );
      this._spawnIfMissing(
        PICKUP_KIND.ULTIMATE_INFINITY,
        this.config.ultimateInfinityDurationSeconds,
        isKindActive,
        spawnPowerUp
      );
      this.nextSpawnTime += this.config.respawnIntervalSeconds;
    }
  }

  _spawnIfMissing(kind, duration, isKindActive, spawnPowerUp) {
    if (isKindActive(kind)) return;
    const point = this.spawnPoints[this.nextPointIndex % this.spawnPoints.length];
    this.nextPointIndex += 1;
    spawnPowerUp(point.x, point.y, kind, duration);
  }

  _createSpawnPoints() {
    const corner = this.worldSize / 2 - this.config.cornerInset;
    const center = this.config.centerOffset;
    return [
      { x: -corner, y: -corner },
      { x: center, y: -center },
      { x: corner, y: -corner },
      { x: center, y: center },
      { x: corner, y: corner },
      { x: -center, y: center },
      { x: -corner, y: corner },
      { x: -center, y: -center },
    ];
  }
}
