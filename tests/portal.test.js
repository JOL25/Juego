import test from 'node:test';
import assert from 'node:assert/strict';
import { CrazyGamesPortal } from '../js/platform/CrazyGamesPortal.js';
import { SafeStorage } from '../js/storage.js';
import { Game, STATE } from '../js/core/Game.js';

function setup(requestAd = (_, callbacks) => callbacks.adError()) {
  const events = [];
  const sdk = { init: async () => {}, environment: 'crazygames',
    game: Object.fromEntries(['gameplayStart', 'gameplayStop', 'loadingStart', 'loadingStop'].map(name => [name, () => events.push(name)])),
    ad: { requestAd },
  };
  const portal = new CrazyGamesPortal({ sdk, store: new SafeStorage(() => null), initTimeoutMs: 20 });
  return { sdk, portal, events };
}

test('game state changes emit one event per actual gameplay transition', async () => {
  const { portal, events } = setup();
  await portal.init();
  portal.loadingStart(); portal.loadingStop();
  const game = Object.assign(Object.create(Game.prototype), { portal });
  for (const state of [STATE.MENU, STATE.PLAYING, STATE.PLAYING, STATE.PAUSED, STATE.PLAYING, STATE.LEVEL_UP, STATE.PLAYING, STATE.GAME_OVER]) game.state = state;
  assert.deepEqual(events, ['loadingStart', 'loadingStop', 'gameplayStart', 'gameplayStop', 'gameplayStart', 'gameplayStop', 'gameplayStart', 'gameplayStop']);
});

test('video requests lock immediately, mute only on start, and unlock on finish', async () => {
  let callbacks;
  const { portal } = setup((type, cb) => { assert.equal(type, 'midgame'); callbacks = cb; });
  await portal.init();
  const states = [];
  portal.onAdState = (...state) => states.push(state);
  const request = portal.requestMidgame();
  assert.equal(portal.adPending, true);
  assert.equal(portal.requestMidgame(), request);
  callbacks.adStarted();
  // The game must wait for the SDK's completion/error callback.
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(portal.adPending, true);
  callbacks.adFinished();
  assert.equal(await request, true);
  callbacks.adError();
  assert.deepEqual(states, [[true, false], [true, true], [false, false]]);
});

test('unfilled, Basic Launch, adblock, throwing and rejecting ads all release controls', async () => {
  for (const requestAd of [
    (_, cb) => cb.adError({ code: 'adsDisabled' }),
    (_, cb) => cb.adError({ code: 'adblock' }),
    () => { throw new Error('Unavailable'); },
    () => Promise.reject(new Error('Unavailable')),
  ]) {
    const { portal } = setup(requestAd);
    await portal.init();
    assert.equal(await portal.requestMidgame(), false);
    assert.equal(portal.adPending, false);
  }
});

test('missing, disabled, failed and unresponsive SDKs leave the game playable', async () => {
  const { sdk } = setup();
  for (const candidate of [null, { ...sdk, environment: 'disabled' },
    { ...sdk, init: () => Promise.reject(new Error('Blocked')) }, { ...sdk, init: () => new Promise(() => {}) }]) {
    const portal = new CrazyGamesPortal({ sdk: candidate, initTimeoutMs: 10 });
    assert.equal(await portal.init(), false);
    portal.setGameplay(true);
    assert.equal(await portal.requestMidgame(), false);
  }
});

test('ad opportunities are rejected during gameplay and freeze simulation while pending', async () => {
  const { portal } = setup();
  await portal.init();
  portal.setGameplay(true);
  assert.equal(await portal.requestMidgame(), false);
  const game = Object.assign(Object.create(Game.prototype), { portal, state: STATE.PLAYING });
  portal.adPending = true;
  // No player or systems are supplied: touching either would fail this test.
  assert.doesNotThrow(() => game._update(1 / 60));
  assert.doesNotThrow(() => game.start());
  assert.doesNotThrow(() => game.togglePause());
});

test('hidden pages do not report gameplay or advance simulation after an async state change', async () => {
  const { portal, events } = setup();
  await portal.init();
  const game = Object.assign(Object.create(Game.prototype), { portal, pageHidden: true });
  game.state = STATE.PLAYING;
  assert.deepEqual(events, []);
  assert.doesNotThrow(() => game._update(1 / 60));
});
