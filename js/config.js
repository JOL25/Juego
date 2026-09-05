// ============================================================
// CONFIG — every tunable number in the game lives here.
// Change these to balance the game without touching logic.
// ============================================================

export const CANVAS = {
  width: 960,
  height: 540,
};

export const WORLD = {
  // The world is a large bounded square the player roams inside.
  size: 4000,
};

export const PLAYER = {
  radius: 14,
  baseSpeed: 190,          // px/sec
  baseMaxHp: 100,
  baseArmor: 0,             // flat damage reduction
  magnetRadius: 70,         // gem pickup attraction radius
  invulnerabilityMs: 600,   // i-frames after taking a hit
  xpToLevel: (level) => Math.floor(20 * Math.pow(level, 1.45) + 10),
};

export const DIFFICULTY = {
  // Endless scaling: everything ramps with survival time (seconds).
  spawnIntervalStart: 1.1,   // seconds between spawn ticks
  spawnIntervalMin: 0.18,
  spawnRampDuration: 600,    // seconds to reach min interval
  enemiesPerTickStart: 1,
  enemiesPerTickMax: 6,
  enemyHpScalePerMin: 0.14,  // +14% enemy hp per minute survived
  enemySpeedScalePerMin: 0.03,
  eliteEveryMinutes: 2,      // spawn a tougher "elite" wave marker
  maxActiveEnemies: 260,
};

export const ENEMY_ANNOUNCEMENT = {
  durationSeconds: 4,
  fadeInSeconds: 0.35,
  fadeOutSeconds: 1.2,
};

export const XP_GEM = {
  radius: 6,
  smallValue: 5,
  mediumValue: 25,
  largeValue: 50,
};

export const POWER_UPS = {
  startTimeSeconds: 5 * 60,
  respawnIntervalSeconds: 90,
  megaMagnetDurationSeconds: 7,
  megaMagnetPullSpeed: 1200,
  freezeDurationSeconds: 10,
  ultimateInfinityDurationSeconds: 3,
  radius: 15,
  cornerInset: 260,
  centerOffset: 320,
};

export const POOL_SIZES = {
  projectiles: 200,
  particles: 200,
  pickups: 200,
  enemies: 120,
};

export const SPATIAL_GRID = {
  cellSize: 128,
};

export const TIMING = {
  fixedStepSeconds: 1 / 60,
  maxFrameSeconds: 0.25,
  maxUpdatesPerFrame: 8,
};

export const LOADOUT = {
  // High enough that every auto-weapon can be held at once.
  weaponSlots: 8,
  passiveSlots: 5,
  startingWeapon: 'magic_wand',
};

export const DASH = {
  baseCharges: 1,
  maxCharges: 4,
  baseDistanceCm: 5,
  rangePerUpgradeCm: 2,
  maxRangeUpgrades: 6,
  // ~12 px per in-game cm so a 5 cm dash is a readable dodge on the 960×540 canvas.
  pxPerCm: 12,
  durationMs: 130,
  rechargeMs: 1600,
  invulnMs: 160,
};

export const VAMPIRE_KISS = {
  healingByLevel: [5, 10, 20],
  cooldownMs: 5000,
};

export const KNOCKBACK = {
  pxPerCm: 12,
  durationSeconds: 0.15,
};

export const ULTIMATE = {
  unlockLevel: 5,
  maxLevel: 5,
  readyIconDurationSeconds: 2,
};

export const LEVEL_UP_WEIGHTS = {
  'weapon-new': 3.2,
  'weapon-upgrade': 3.6,
  'passive-new': 2.2,
  'passive-upgrade': 2.6,
  'dash-charge': 2.4,
  'dash-range': 2.2,
  'ultimate-upgrade': 3.0,
};

export const COLORS = {
  bg: '#120a10',
  bgGrid: '#1c1018',
  player: '#e8d9c0',
  playerOutline: '#ffffff',
  hpBar: '#c1272d',
  hpBarBack: '#3a1418',
  xpBar: '#7ec6e0',
  xpBarBack: '#1a2a30',
  text: '#f4ece0',
  danger: '#ff4d4d',
  gold: '#e8b13a',
};
