import test from 'node:test';
import assert from 'node:assert/strict';

import { InputManager } from '../js/input.js';

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, callback) {
    const callbacks = this.listeners.get(type) || [];
    callbacks.push(callback);
    this.listeners.set(type, callbacks);
  }

  emit(type, event = {}) {
    for (const callback of this.listeners.get(type) || []) callback(event);
  }
}

class FakeCanvas extends FakeEventTarget {
  constructor() {
    super();
    this.width = 960;
    this.height = 540;
    this.capturedPointers = new Set();
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, width: 960, height: 540 };
  }

  setPointerCapture(pointerId) {
    this.capturedPointers.add(pointerId);
  }

  hasPointerCapture(pointerWithin) {
    return this.capturedPointers.has(pointerWithin);
  }

  releasePointerCapture(pointerId) {
    this.capturedPointers.delete(pointerId);
  }
}

function keyEvent(code) {
  return {
    code,
    repeat: false,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
}

test('acciones, movimiento y pérdida de foco mantienen un estado consistente', () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const fakeWindow = new FakeEventTarget();
  const fakeDocument = new FakeEventTarget();
  fakeDocument.hidden = false;
  globalThis.window = fakeWindow;
  globalThis.document = fakeDocument;

  try {
    const canvas = new FakeCanvas();
    const input = new InputManager(canvas);
    const dashEvent = keyEvent('Space');

    fakeWindow.emit('keydown', dashEvent);
    assert.equal(dashEvent.defaultPrevented, true);
    assert.equal(input.consumeDash(), true);
    assert.equal(input.consumeDash(), false);

    fakeWindow.emit('keydown', keyEvent('KeyW'));
    assert.deepEqual(input.getMoveVector(), { x: 0, y: -1 });

    input.queueUltimate();
    fakeWindow.emit('blur');
    assert.deepEqual(input.getMoveVector(), { x: 0, y: 0 });
    assert.equal(input.consumeUltimate(), false);

    canvas.emit('pointerdown', {
      pointerId: 7,
      pointerType: 'touch',
      button: 0,
      isPrimary: true,
      clientX: 100,
      clientY: 100,
      preventDefault() {},
    });
    canvas.emit('pointermove', {
      pointerId: 7,
      clientX: 155,
      clientY: 100,
      preventDefault() {},
    });
    assert.deepEqual(input.getMoveVector(), { x: 1, y: 0 });
    assert.ok(input.getJoystickVisual());

    canvas.emit('pointercancel', { pointerId: 7, preventDefault() {} });
    assert.equal(input.getJoystickVisual(), null);
    assert.equal(canvas.capturedPointers.size, 0);

    input.queueDash();
    fakeDocument.hidden = true;
    fakeDocument.emit('visibilitychange');
    assert.equal(input.consumeDash(), false);
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
  }
});
