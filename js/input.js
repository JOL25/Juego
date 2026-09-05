// ============================================================
// INPUT — converts held movement controls and one-shot actions
// from keyboard/pointer devices into a small gameplay API.
// ============================================================

import { normalize, clamp, distance } from './utils.js';

const MOVE_KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
};

const ACTION = {
  DASH: 'dash',
  ULTIMATE: 'ultimate',
};

const DASH_KEYS = new Set(['Space', 'ShiftLeft', 'ShiftRight']);
const ULTIMATE_KEYS = new Set(['KeyQ', 'KeyE', 'KeyR']);
const PAUSE_KEYS = new Set(['Escape', 'KeyP']);
const PREVENT_DEFAULT_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
]);

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.queuedActions = new Set();
    this.pausePressedCallback = null;

    this.joystick = {
      active: false,
      originX: 0,
      originY: 0,
      currentX: 0,
      currentY: 0,
      maxRadius: 55,
      pointerId: null,
    };

    window.addEventListener('keydown', (event) => this._onKeyDown(event));
    window.addEventListener('keyup', (event) => this._onKeyUp(event));
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.reset();
    });

    canvas.addEventListener('pointerdown', (event) => this._onPointerDown(event));
    canvas.addEventListener('pointermove', (event) => this._onPointerMove(event));
    canvas.addEventListener('pointerup', (event) => this._onPointerEnd(event));
    canvas.addEventListener('pointercancel', (event) => this._onPointerEnd(event));
  }

  onPause(callback) {
    this.pausePressedCallback = callback;
  }

  queueDash() {
    this.queuedActions.add(ACTION.DASH);
  }

  queueUltimate() {
    this.queuedActions.add(ACTION.ULTIMATE);
  }

  consumeDash() {
    return this._consumeAction(ACTION.DASH);
  }

  consumeUltimate() {
    return this._consumeAction(ACTION.ULTIMATE);
  }

  resetActions() {
    this.queuedActions.clear();
  }

  reset() {
    this.keys.clear();
    this.resetActions();
    this._releaseJoystick();
  }

  _consumeAction(action) {
    if (!this.queuedActions.has(action)) return false;
    this.queuedActions.delete(action);
    return true;
  }

  _onKeyDown(event) {
    if (PREVENT_DEFAULT_KEYS.has(event.code)) event.preventDefault();
    this.keys.add(event.code);
    if (event.repeat) return;

    if (PAUSE_KEYS.has(event.code)) {
      if (this.pausePressedCallback) this.pausePressedCallback();
      return;
    }
    if (DASH_KEYS.has(event.code)) this.queueDash();
    if (ULTIMATE_KEYS.has(event.code)) this.queueUltimate();
  }

  _onKeyUp(event) {
    this.keys.delete(event.code);
  }

  _rectLocal(pointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (pointerEvent.clientX - rect.left) * scaleX,
      y: (pointerEvent.clientY - rect.top) * scaleY,
    };
  }

  _onPointerDown(event) {
    if (this.joystick.active || event.isPrimary === false) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();

    const point = this._rectLocal(event);
    this.joystick.active = true;
    this.joystick.pointerId = event.pointerId;
    this.joystick.originX = point.x;
    this.joystick.originY = point.y;
    this.joystick.currentX = point.x;
    this.joystick.currentY = point.y;

    if (this.canvas.setPointerCapture) {
      this.canvas.setPointerCapture(event.pointerId);
    }
  }

  _onPointerMove(event) {
    if (!this.joystick.active || event.pointerId !== this.joystick.pointerId) return;
    event.preventDefault();
    const point = this._rectLocal(event);
    this.joystick.currentX = point.x;
    this.joystick.currentY = point.y;
  }

  _onPointerEnd(event) {
    if (event.pointerId !== this.joystick.pointerId) return;
    event.preventDefault();
    this._releaseJoystick();
  }

  _releaseJoystick() {
    const pointerId = this.joystick.pointerId;
    if (
      pointerId !== null &&
      this.canvas.hasPointerCapture &&
      this.canvas.hasPointerCapture(pointerId) &&
      this.canvas.releasePointerCapture
    ) {
      this.canvas.releasePointerCapture(pointerId);
    }
    this.joystick.active = false;
    this.joystick.pointerId = null;
  }

  getMoveVector() {
    let x = 0;
    let y = 0;

    if (MOVE_KEYS.up.some((key) => this.keys.has(key))) y -= 1;
    if (MOVE_KEYS.down.some((key) => this.keys.has(key))) y += 1;
    if (MOVE_KEYS.left.some((key) => this.keys.has(key))) x -= 1;
    if (MOVE_KEYS.right.some((key) => this.keys.has(key))) x += 1;

    if (x !== 0 || y !== 0) return normalize(x, y);

    if (this.joystick.active) {
      const dx = this.joystick.currentX - this.joystick.originX;
      const dy = this.joystick.currentY - this.joystick.originY;
      const pointerDistance = distance(0, 0, dx, dy);
      if (pointerDistance < 6) return { x: 0, y: 0 };
      const direction = normalize(dx, dy);
      const strength = clamp(pointerDistance / this.joystick.maxRadius, 0, 1);
      return { x: direction.x * strength, y: direction.y * strength };
    }

    return { x: 0, y: 0 };
  }

  getJoystickVisual() {
    if (!this.joystick.active) return null;
    const dx = this.joystick.currentX - this.joystick.originX;
    const dy = this.joystick.currentY - this.joystick.originY;
    const pointerDistance = distance(0, 0, dx, dy);
    const clampedDistance = Math.min(pointerDistance, this.joystick.maxRadius);
    const direction = pointerDistance > 0 ? normalize(dx, dy) : { x: 0, y: 0 };
    return {
      originX: this.joystick.originX,
      originY: this.joystick.originY,
      stickX: this.joystick.originX + direction.x * clampedDistance,
      stickY: this.joystick.originY + direction.y * clampedDistance,
      maxRadius: this.joystick.maxRadius,
    };
  }
}
