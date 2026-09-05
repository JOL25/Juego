export class FixedStepClock {
  constructor({ fixedStepSeconds, maxFrameSeconds, maxUpdatesPerFrame }) {
    if (!Number.isFinite(fixedStepSeconds) || fixedStepSeconds <= 0) {
      throw new RangeError('fixedStepSeconds must be a positive number');
    }
    if (!Number.isFinite(maxFrameSeconds) || maxFrameSeconds <= 0) {
      throw new RangeError('maxFrameSeconds must be a positive number');
    }
    if (!Number.isInteger(maxUpdatesPerFrame) || maxUpdatesPerFrame <= 0) {
      throw new RangeError('maxUpdatesPerFrame must be a positive integer');
    }

    this.fixedStepSeconds = fixedStepSeconds;
    this.maxFrameSeconds = maxFrameSeconds;
    this.maxUpdatesPerFrame = maxUpdatesPerFrame;
    this.accumulator = 0;
  }

  reset() {
    this.accumulator = 0;
  }

  advance(frameSeconds, update) {
    const safeFrameSeconds = Number.isFinite(frameSeconds)
      ? Math.max(0, Math.min(frameSeconds, this.maxFrameSeconds))
      : 0;
    this.accumulator += safeFrameSeconds;

    let updates = 0;
    const epsilon = 1e-10;
    while (
      this.accumulator + epsilon >= this.fixedStepSeconds &&
      updates < this.maxUpdatesPerFrame
    ) {
      update(this.fixedStepSeconds);
      this.accumulator -= this.fixedStepSeconds;
      if (this.accumulator < 0) this.accumulator = 0;
      updates += 1;
    }

    const droppedTime = this.accumulator + epsilon >= this.fixedStepSeconds;
    if (droppedTime) {
      // Keep only the fractional remainder so a slow device cannot build
      // an ever-growing backlog of simulation work.
      this.accumulator %= this.fixedStepSeconds;
    }

    return {
      updates,
      alpha: this.accumulator / this.fixedStepSeconds,
      droppedTime,
    };
  }
}
