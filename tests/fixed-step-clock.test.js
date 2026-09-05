import test from 'node:test';
import assert from 'node:assert/strict';

import { FixedStepClock } from '../js/core/FixedStepClock.js';

const OPTIONS = {
  fixedStepSeconds: 1 / 60,
  maxFrameSeconds: 0.25,
  maxUpdatesPerFrame: 8,
};

test('convierte un frame largo en varias actualizaciones fijas', () => {
  const clock = new FixedStepClock(OPTIONS);
  const receivedSteps = [];

  const result = clock.advance(0.1, (step) => receivedSteps.push(step));

  assert.equal(result.updates, 6);
  assert.equal(receivedSteps.length, 6);
  assert.ok(receivedSteps.every((step) => step === OPTIONS.fixedStepSeconds));
  assert.equal(result.droppedTime, false);
});

test('conserva fracciones de tiempo para el siguiente frame', () => {
  const clock = new FixedStepClock(OPTIONS);
  let updates = 0;

  clock.advance(0.01, () => { updates += 1; });
  clock.advance(0.01, () => { updates += 1; });

  assert.equal(updates, 1);
  assert.ok(clock.accumulator > 0);
  assert.ok(clock.accumulator < OPTIONS.fixedStepSeconds);
});

test('limita el trabajo acumulado y descarta el atraso excesivo', () => {
  const clock = new FixedStepClock(OPTIONS);
  let updates = 0;

  const result = clock.advance(10, () => { updates += 1; });

  assert.equal(updates, OPTIONS.maxUpdatesPerFrame);
  assert.equal(result.droppedTime, true);
  assert.ok(clock.accumulator < OPTIONS.fixedStepSeconds);
});

test('reset elimina el tiempo pendiente', () => {
  const clock = new FixedStepClock(OPTIONS);
  clock.advance(0.01, () => {});

  clock.reset();

  assert.equal(clock.accumulator, 0);
});
