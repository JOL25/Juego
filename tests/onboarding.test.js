import test from 'node:test';
import assert from 'node:assert/strict';
import { Onboarding } from '../js/systems/Onboarding.js';
import { SafeStorage } from '../js/storage.js';

test('help follows play time and completed guidance does not repeat after retry', () => {
  const tutorial = new Onboarding(new SafeStorage(() => null));
  tutorial.update(1, {}); assert.equal(tutorial.message, 'move');
  tutorial.update(5, {}); assert.equal(tutorial.message, 'xp');
  tutorial.update(6, {}); assert.equal(tutorial.message, 'dash');
  tutorial.update(7, {}); assert.equal(tutorial.message, null);
  tutorial.reset(); tutorial.update(1, {}); assert.equal(tutorial.message, null);
});

test('ultimate help is introduced on acquisition and dismissed on use', () => {
  const tutorial = new Onboarding(new SafeStorage(() => null));
  tutorial.update(20, {});
  tutorial.update(1, { ultimate: {} }); assert.equal(tutorial.message, 'ultimate');
  tutorial.update(1, { ultimate: {} }, true); assert.equal(tutorial.message, null);
  tutorial.reset(); tutorial.update(1, { ultimate: {} }); assert.equal(tutorial.message, null);
});

test('ultimate help expires even without input and works with denied storage', () => {
  const tutorial = new Onboarding(new SafeStorage(() => { throw new Error('Denied'); }));
  tutorial.update(20, {});
  tutorial.update(1, { ultimate: {} }); assert.equal(tutorial.message, 'ultimate');
  tutorial.update(7, { ultimate: {} }); assert.equal(tutorial.message, null);
});
