import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundSystem } from '../js/systems/SoundSystem.js';
import { AUDIO } from '../js/config.js';
import { Missile } from '../js/weapons/Missile.js';
import { PierceRay } from '../js/weapons/PierceRay.js';
import { SuperPierceShot, ExplosiveWave, OrbitLaser } from '../js/weapons/Ultimates.js';
import { createEnemy, createWeaponGame } from './weapons/helpers.js';

function setup() {
  const sources = [];
  const context = {
    state: 'running', currentTime: 0, sampleRate: 22050,
    createGain: () => ({ gain: { value: 0, setTargetAtTime() {} }, connect() {} }),
    createBuffer: (_, size) => {
      const samples = new Float32Array(size);
      return { getChannelData: () => samples };
    },
    createBufferSource: () => {
      const source = { connect() {}, disconnect() {}, start() {}, stop() { this.stopped = true; } };
      sources.push(source);
      return source;
    },
  };
  const sound = new SoundSystem(() => context);
  sound.unlock();
  return { sound, context, sources };
}

test('all effects contain finite, audible samples and a quiet envelope', () => {
  const { sound } = setup();
  assert.equal(sound.buffers.size, 11);
  for (const name of ['hit', 'defeat', 'xp', 'levelUp', 'powerUp', 'ray', 'rocket', 'explosion', 'ult_pierce_shot', 'ult_wave', 'ult_orbit_laser']) {
    const data = sound.buffers.get(name).getChannelData(0);
    assert.ok(data.some((sample) => Math.abs(sample) > 0.05), name);
    assert.ok(data.every((sample) => Number.isFinite(sample) && Math.abs(sample) < 1), name);
    assert.equal(data[0], 0);
    assert.ok(Math.abs(data.at(-1)) < 0.001);
  }
});

test('rapid pickups are throttled and priority jingles still play at the voice limit', () => {
  const { sound, context, sources } = setup();
  assert.equal(sound.play('xp'), true);
  assert.equal(sound.play('xp'), false);
  for (let i = 1; i < AUDIO.maxVoices; i++) {
    context.currentTime += 0.1;
    assert.equal(sound.play('hit'), true);
  }
  context.currentTime += 0.1;
  assert.equal(sound.play('hit'), false);
  assert.equal(sound.play('levelUp'), true);
  assert.equal(sound.voices.size, AUDIO.maxVoices);
  assert.equal(sources[0].stopped, true);
  sources.at(-1).onended();
  assert.equal(sound.voices.size, AUDIO.maxVoices - 1);
});

test('muting stops active effects, unmuting allows playback, reset clears throttling', () => {
  const { sound, sources } = setup();
  sound.play('xp');
  sound.setMuted(true);
  assert.equal(sources[0].stopped, true);
  assert.equal(sound.voices.size, 0);
  assert.equal(sound.play('xp'), false);
  sound.setMuted(false);
  assert.equal(sound.play('xp'), true);
  sound.stopAll();
  assert.equal(sound.play('xp'), true);
});

test('missing or blocked audio never prevents gameplay', async () => {
  for (const factory of [() => null, () => { throw new Error('Unavailable'); }]) {
    const sound = new SoundSystem(factory);
    assert.doesNotThrow(() => sound.unlock());
    assert.equal(sound.play('hit'), false);
  }
  const { sound, context } = setup();
  context.state = 'suspended';
  context.resume = () => Promise.reject(new Error('Gesture required'));
  sound.unlock();
  await Promise.resolve();
  assert.equal(sound.play('hit'), false);
});

test('rocket audio requires a target and plays once for a multi-rocket salvo', () => {
  const sounds = [];
  const missile = new Missile();
  missile.level = 8;
  const empty = createWeaponGame();
  empty.sound = { play: (name) => sounds.push(name) };
  missile.fire(empty);
  assert.deepEqual(sounds, []);
  const game = createWeaponGame({ enemies: [createEnemy({ x: 20, y: 0 }), createEnemy({ x: 40, y: 0 })] });
  game.sound = empty.sound;
  missile.fire(game);
  assert.equal(game.events.projectiles.length, 2);
  assert.deepEqual(sounds, ['rocket']);
  new PierceRay().fire(game);
  assert.deepEqual(sounds, ['rocket', 'ray']);
});

test('each ultimate plays its own effect only on successful activation', () => {
  for (const Type of [SuperPierceShot, ExplosiveWave, OrbitLaser]) {
    const game = createWeaponGame();
    const sounds = [];
    game.sound = { play: (name) => sounds.push(name) };
    const ultimate = new Type();
    assert.equal(ultimate.tryActivate(game), true);
    assert.equal(ultimate.tryActivate(game), false);
    assert.deepEqual(sounds, [ultimate.id]);
    ultimate.setUnlimited(true);
    assert.equal(ultimate.tryActivate(game), true);
    assert.deepEqual(sounds, [ultimate.id, ultimate.id]);
  }
});
