import test from 'node:test';
import assert from 'node:assert/strict';
import { SafeStorage, storage } from '../js/storage.js';
import { Game, STATE } from '../js/core/Game.js';

test('blocked storage keeps session writes and does not stop the game-over screen', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  try {
    let stats;
    const game = Object.assign(Object.create(Game.prototype), {
      input: { reset() {} }, sound: { stopAll() {} },
      player: { level: 3, kills: 17, survivalTime: 42 },
      menu: { showGameOver(value) { stats = value; } },
    });
    assert.doesNotThrow(() => game._handleGameOver());
    assert.equal(game.state, STATE.GAME_OVER);
    assert.equal(stats.time, 42);
    assert.equal(stats.isHighScore, true);
    game.player.survivalTime = 25;
    game._handleGameOver();
    assert.equal(stats.isHighScore, false);
    assert.equal(storage.getItem('vs_clone_best_time'), '42');
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('a failed write never restores a stale score or preference in this session', () => {
  const store = new SafeStorage(() => ({ getItem: () => '10', setItem() { throw new Error('QuotaExceededError'); } }));
  assert.equal(store.getItem('score'), '10');
  store.setItem('score', '100');
  assert.equal(store.getItem('score'), '100');
});

test('portal data is the only persistent store when available', () => {
  const cloud = new Map([['score', '100']]);
  const store = new SafeStorage(() => { throw new Error('Local storage should not be used on the portal'); });
  store.useBackend({ getItem: key => cloud.get(key) ?? null, setItem: (key, value) => cloud.set(key, value) });
  assert.equal(store.getItem('score'), '100');
  store.setItem('score', '200');
  assert.equal(cloud.get('score'), '200');
});

test('malformed saved scores do not suppress new records', () => {
  storage.setItem('vs_clone_best_time', 'NaN');
  let stats;
  const game = Object.assign(Object.create(Game.prototype), {
    input: { reset() {} }, player: { survivalTime: 12 },
    menu: { showGameOver(value) { stats = value; } },
  });
  game._handleGameOver();
  assert.equal(stats.isHighScore, true);
});
