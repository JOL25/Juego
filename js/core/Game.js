// ============================================================
// GAME — coordinates state, systems, entities, and the main loop.
// Gameplay systems call its public helpers to spawn and resolve
// cross-system rules without accessing each other directly.
// ============================================================

import { CANVAS, LOADOUT, POOL_SIZES, POWER_UPS, SPATIAL_GRID, TIMING } from '../config.js';
import { Pool, distance } from '../utils.js';
import { Camera } from './Camera.js';
import { FixedStepClock } from './FixedStepClock.js';
import { STATE } from './GameState.js';
import { InputManager } from '../input.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Projectile } from '../entities/Projectile.js';
import { PICKUP_KIND, Pickup } from '../entities/Pickup.js';
import { Particle } from '../entities/Particle.js';
import { Spawner } from '../systems/Spawner.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { LevelUpSystem } from '../systems/LevelUpSystem.js';
import { SpatialGrid } from '../systems/SpatialGrid.js';
import { PowerUpSpawner } from '../systems/PowerUpSpawner.js';
import { SoundSystem } from '../systems/SoundSystem.js';
import { MenuManager } from '../ui/MenuManager.js';
import { WorldRenderer } from '../rendering/WorldRenderer.js';
import { createWeapon } from '../weapons/registry.js';

export { STATE };

const HIGH_SCORE_KEY = 'vs_clone_best_time';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = CANVAS.width;
    canvas.height = CANVAS.height;

    this.camera = new Camera(CANVAS.width, CANVAS.height);
    this.clock = new FixedStepClock(TIMING);
    this.input = new InputManager(canvas);
    this.menu = new MenuManager();
    this.spawner = new Spawner(() => this.sound?.play('awakening'));
    this.powerUpSpawner = new PowerUpSpawner();
    this.collisions = new CollisionSystem();
    this.levelUpSystem = new LevelUpSystem();
    this.enemyGrid = new SpatialGrid(SPATIAL_GRID.cellSize);
    this.renderer = new WorldRenderer();
    this.sound = new SoundSystem();

    this.enemyPool = new Pool(() => new Enemy(), POOL_SIZES.enemies);
    this.projectilePool = new Pool(() => new Projectile(), POOL_SIZES.projectiles);
    this.pickupPool = new Pool(() => new Pickup(), POOL_SIZES.pickups);
    this.particlePool = new Pool(() => new Particle(), POOL_SIZES.particles);

    this.swipeEffects = [];
    this.auraEffects = [];
    this.beamEffects = [];
    this.shockwaves = [];
    this.megaMagnetTimer = 0;
    this.enemyFreezeTimer = 0;
    this.ultimateInfinityTimer = 0;

    this.state = STATE.MENU;
    this.shakeTimer = 0;
    this.player = new Player();

    this.input.onPause(() => this.togglePause());
    this._lastTimestamp = null;

    this.menu.showMenu();
    requestAnimationFrame((timestamp) => this._loop(timestamp));
  }

  resize(width, height) {
    if (width <= 0 || height <= 0) return;
    // Keep figures equally sized on different monitors and preserve their shape.
    const scale = CANVAS.height / Math.min(width, height);
    const viewWidth = Math.round(width * scale / 2) * 2;
    const viewHeight = Math.round(height * scale / 2) * 2;
    if (this.canvas.width === viewWidth && this.canvas.height === viewHeight) return;
    this.canvas.width = viewWidth;
    this.canvas.height = viewHeight;
    this.camera.viewWidth = viewWidth;
    this.camera.viewHeight = viewHeight;
    this.input.reset();
  }

  start() {
    this.sound?.stopAll();
    this.sound?.unlock();
    this.input.reset();
    this.clock.reset();
    this._lastTimestamp = null;
    this.player = new Player();
    this.player.weapons.push(createWeapon(LOADOUT.startingWeapon));

    this.enemyPool.forEachActive((enemy) => this.enemyPool.release(enemy));
    this.projectilePool.forEachActive((projectile) => this.projectilePool.release(projectile));
    this.pickupPool.forEachActive((pickup) => this.pickupPool.release(pickup));
    this.particlePool.forEachActive((particle) => this.particlePool.release(particle));
    this.swipeEffects = [];
    this.auraEffects = [];
    this.beamEffects = [];
    this.shockwaves = [];
    this.megaMagnetTimer = 0;
    this.enemyFreezeTimer = 0;
    this.ultimateInfinityTimer = 0;

    this.spawner.reset();
    this.spawner.updateIntroductions(0, 0);
    this.powerUpSpawner.reset();
    this.levelUpSystem.reset();
    this.enemyGrid.clear();
    this.state = STATE.PLAYING;
    this.menu.hideAll();
  }

  togglePause() {
    if (this.state === STATE.PLAYING) {
      this.sound?.stopAll();
      this.input.reset();
      this.state = STATE.PAUSED;
      this.menu.showPause();
    } else if (this.state === STATE.PAUSED) {
      this.sound?.unlock();
      this.input.reset();
      this.clock.reset();
      this.state = STATE.PLAYING;
      this.menu.hideAll();
    }
  }

  _handleGameOver() {
    this.sound?.stopAll();
    this.input.reset();
    this.state = STATE.GAME_OVER;
    const best = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
    const isHighScore = this.player.survivalTime > best;
    if (isHighScore) localStorage.setItem(HIGH_SCORE_KEY, String(this.player.survivalTime));
    this.menu.showGameOver({
      level: this.player.level,
      time: this.player.survivalTime,
      kills: this.player.kills,
      isHighScore,
    });
  }

  _loop(timestamp) {
    if (this._lastTimestamp === null) this._lastTimestamp = timestamp;
    const frameSeconds = (timestamp - this._lastTimestamp) / 1000;
    this._lastTimestamp = timestamp;

    this.clock.advance(frameSeconds, (fixedDt) => this._update(fixedDt));
    this._render();
    requestAnimationFrame((nextTimestamp) => this._loop(nextTimestamp));
  }

  _update(dt) {
    if (this.shakeTimer > 0) this.shakeTimer -= dt * 1000;
    if (this.state !== STATE.PLAYING) return;

    this._updatePowerUpTimers(dt);

    const move = this.input.getMoveVector();
    if (this.input.consumeDash()) this.player.tryDash(move);
    if (this.input.consumeUltimate() && this.player.ultimate) {
      this.player.ultimate.tryActivate(this);
    }

    this.player.update(dt, move);
    if (this.player.ultimate) this.player.ultimate.update(dt, this);
    this.camera.follow(this.player.x, this.player.y);

    this.powerUpSpawner.tick(
      this.player.survivalTime,
      (kind) => this.hasActivePickupKind(kind),
      (x, y, kind, duration) => this.spawnPickup(x, y, kind, duration)
    );

    this.spawner.tick(
      dt,
      this.player.survivalTime,
      this.camera,
      this.enemyPool.activeCount,
      (type, x, y, hpMult, speedMult, isElite) => {
        this._spawnEnemy(type, x, y, hpMult, speedMult, isElite);
      }
    );

    this._updateEnemies(dt);

    for (const weapon of this.player.weapons) weapon.update(dt, this);

    this.projectilePool.forEachActive((projectile) => {
      projectile.update(dt, (x, y) => this.findNearestEnemy(x, y));
      if (
        !projectile.active &&
        projectile.explodeOnExpire &&
        projectile.explodeRadius > 0 &&
        !projectile.didExplode
      ) {
        projectile.didExplode = true;
        this.explodeAt(
          projectile.x,
          projectile.y,
          projectile.explodeRadius,
          projectile.damage,
          '#ffb070'
        );
      }
      if (!projectile.active) this.projectilePool.release(projectile);
    });

    this.pickupPool.forEachActive((pickup) => {
      pickup.update(
        dt,
        this.player.x,
        this.player.y,
        this.player.magnetRadius,
        this.megaMagnetTimer > 0
      );
    });
    this.particlePool.forEachActive((particle) => particle.update(dt));

    this._updateTimedEffects(dt);
    this.collisions.resolve(this);

    if (!this.player.alive) this._handleGameOver();
  }

  _updateTimedEffects(dt) {
    this.swipeEffects = this.swipeEffects.filter((effect) => {
      effect.age += dt;
      return effect.age < effect.life;
    });
    this.auraEffects = this.auraEffects.filter((effect) => {
      effect.age += dt;
      return effect.age < effect.life;
    });
    this.beamEffects = this.beamEffects.filter((effect) => {
      effect.age += dt;
      return effect.age < effect.life;
    });
    this.shockwaves = this.shockwaves.filter((effect) => {
      effect.prevRadius = effect.radius;
      effect.radius += effect.speed * dt;
      this.forEachEnemyNear(effect.x, effect.y, effect.radius, (enemy) => {
        if (effect.hitIds.has(enemy.uid)) return;
        const enemyDistance = distance(effect.x, effect.y, enemy.x, enemy.y);
        if (
          enemyDistance <= effect.radius + enemy.radius &&
          enemyDistance + enemy.radius >= effect.prevRadius
        ) {
          effect.hitIds.add(enemy.uid);
          this.damageEnemy(enemy, effect.damage, '#ffd27a');
        }
      });
      return effect.radius < effect.maxRadius;
    });
  }

  _updatePowerUpTimers(dt) {
    this.megaMagnetTimer = Math.max(0, this.megaMagnetTimer - dt);
    this.enemyFreezeTimer = Math.max(0, this.enemyFreezeTimer - dt);
    this.ultimateInfinityTimer = Math.max(0, (this.ultimateInfinityTimer || 0) - dt);
    this.player?.ultimate?.setUnlimited(this.ultimateInfinityTimer > 0);
  }

  _updateEnemies(dt) {
    const frozen = this.areEnemiesFrozen();
    this.enemyGrid.clear();
    this.enemyPool.forEachActive((enemy) => {
      enemy.frozen = frozen;
      if (!frozen) enemy.update(dt, this.player.x, this.player.y);
      this.enemyGrid.insert(enemy);
    });
  }

  _spawnEnemy(type, x, y, hpMult, speedMult, isElite) {
    const enemy = this.enemyPool.obtain();
    enemy.reset(type, x, y, hpMult, speedMult);
    if (isElite) enemy.makeElite();
  }

  spawnProjectile(options) {
    const projectile = this.projectilePool.obtain();
    projectile.reset(options);
  }

  spawnPickup(x, y, kind, value) {
    const pickup = this.pickupPool.obtain();
    pickup.reset(x, y, kind, value);
  }

  hasActivePickupKind(kind) {
    let found = false;
    this.pickupPool.forEachActive((pickup) => {
      if (pickup.kind === kind) found = true;
    });
    return found;
  }

  activateMegaMagnet(duration = POWER_UPS.megaMagnetDurationSeconds) {
    this.megaMagnetTimer = Math.max(this.megaMagnetTimer, duration);
  }

  activateEnemyFreeze(duration = POWER_UPS.freezeDurationSeconds) {
    this.enemyFreezeTimer = Math.max(this.enemyFreezeTimer, duration);
  }

  activateUltimateInfinity(duration = POWER_UPS.ultimateInfinityDurationSeconds) {
    this.ultimateInfinityTimer = Math.max(this.ultimateInfinityTimer, duration);
    this.player.ultimate?.setUnlimited(true);
  }

  areEnemiesFrozen() {
    return this.enemyFreezeTimer > 0;
  }

  spawnDeathBurst(x, y, color) {
    for (let index = 0; index < 7; index += 1) {
      const particle = this.particlePool.obtain();
      particle.resetSpark(x, y, color);
    }
  }

  spawnDamageText(x, y, amount, color) {
    const particle = this.particlePool.obtain();
    particle.resetText(x, y, String(amount), color);
  }

  spawnWhipSwipe(x, y, angle, range, arcDeg, bothSides) {
    this.swipeEffects.push({ x, y, angle, range, arcDeg, bothSides, age: 0, life: 0.12 });
  }

  pulseAura(x, y, radius) {
    this.auraEffects.push({ x, y, radius, age: 0, life: 0.18 });
  }

  spawnBeam(ax, ay, bx, by, width, color, life = 0.16) {
    this.beamEffects.push({ ax, ay, bx, by, width, color, age: 0, life });
  }

  spawnShockwave(x, y, maxRadius, speed, damage) {
    this.shockwaves.push({
      x,
      y,
      radius: 0,
      prevRadius: 0,
      maxRadius,
      speed,
      damage,
      hitIds: new Set(),
    });
  }

  explodeAt(x, y, radius, damage, textColor) {
    this.sound?.play('explosion');
    this.forEachEnemyNear(x, y, radius, (enemy) => {
      if (distance(x, y, enemy.x, enemy.y) <= radius + enemy.radius) {
        this.damageEnemy(enemy, damage, textColor);
      }
    });
    this.auraEffects.push({ x, y, radius, age: 0, life: 0.22 });
    this.spawnDeathBurst(x, y, textColor);
  }

  forEachActiveEnemy(callback) {
    this.enemyPool.forEachActive(callback);
  }

  forEachEnemyNear(x, y, radius, callback) {
    this.enemyGrid.forEachNearby(x, y, radius, callback);
  }

  forEachEnemyInBounds(minX, minY, maxX, maxY, callback) {
    this.enemyGrid.forEachInBounds(minX, minY, maxX, maxY, callback);
  }

  findNearestEnemy(x, y) {
    return this.enemyGrid.findNearest(x, y);
  }

  findNearestEnemies(x, y, count) {
    return this.enemyGrid.findNearestN(x, y, count);
  }

  damageEnemy(enemy, amount, textColor) {
    if (!enemy.active) return;
    const died = enemy.takeDamage(amount);
    this.spawnDamageText(enemy.x, enemy.y - enemy.radius - 4, Math.round(amount), textColor);
    if (died) this._killEnemy(enemy);
  }

  knockBackEnemy(enemy, distancePx) {
    if (!enemy.active) return;
    const dx = enemy.x - this.player.x;
    const dy = enemy.y - this.player.y;
    enemy.knockBack(dx === 0 && dy === 0 ? this.player.facing : dx, dy, distancePx);
  }

  slowEnemy(enemy, percent, durationSeconds) {
    if (!enemy.active) return;
    enemy.applySlow(percent, durationSeconds);
  }

  _killEnemy(enemy) {
    if (!enemy.active) return;
    this.sound?.play('defeat');
    this.player.kills += 1;
    this.player.tryHealOnKill();
    this.spawnDeathBurst(enemy.x, enemy.y, enemy.type.color);
    this.spawnPickup(enemy.x, enemy.y, PICKUP_KIND.XP, enemy.xpValue);
    this.enemyPool.release(enemy);
  }

  onXpCollected(value) {
    this.sound?.play('xp');
    const levels = this.player.gainXp(value);
    this.levelUpSystem.addLevels(levels, this);
  }

  onPlayerHit() {
    this.shakeTimer = 140;
  }

  _render() {
    this.renderer.render(this);
  }
}
