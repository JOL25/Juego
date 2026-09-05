// ============================================================
// CAMERA — tracks the player and converts world <-> screen space.
// Everything renders in world coordinates; the camera is the
// only thing that knows about the viewport offset.
// ============================================================

export class Camera {
  constructor(viewWidth, viewHeight) {
    this.x = 0; // world-space center
    this.y = 0;
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
  }

  follow(targetX, targetY) {
    this.x = targetX;
    this.y = targetY;
  }

  worldToScreen(wx, wy) {
    return {
      x: wx - this.x + this.viewWidth / 2,
      y: wy - this.y + this.viewHeight / 2,
    };
  }

  screenToWorld(sx, sy) {
    return {
      x: sx + this.x - this.viewWidth / 2,
      y: sy + this.y - this.viewHeight / 2,
    };
  }

  /** Is a world-space circle at least partially visible (with margin)? */
  isVisible(wx, wy, radius, margin = 40) {
    const s = this.worldToScreen(wx, wy);
    return (
      s.x + radius + margin > 0 &&
      s.x - radius - margin < this.viewWidth &&
      s.y + radius + margin > 0 &&
      s.y - radius - margin < this.viewHeight
    );
  }
}
