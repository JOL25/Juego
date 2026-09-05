// ============================================================
// UTILS — pure helper functions + generic Pool class.
// No game state lives here; keep it side-effect free.
// ============================================================

export function distanceSq(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function distance(ax, ay, bx, by) {
  return Math.sqrt(distanceSq(ax, ay, bx, by));
}

export function circlesOverlap(ax, ay, ar, bx, by, br) {
  const r = ar + br;
  return distanceSq(ax, ay, bx, by) <= r * r;
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(randRange(min, max + 1));
}

export function pickWeighted(items) {
  // items: [{ weight, ...payload }]
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    if (r < item.weight) return item;
    r -= item.weight;
  }
  return items[items.length - 1];
}

export function normalize(x, y) {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

/** Shortest distance from point P to segment AB. */
export function distPointToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return distance(px, py, ax, ay);
  let t = ((px - ax) * abx + (py - ay) * aby) / lenSq;
  t = clamp(t, 0, 1);
  return distance(px, py, ax + abx * t, ay + aby * t);
}

/**
 * Pick `count` unique items by `weight` without replacement.
 * items: [{ weight, ...payload }]
 */
export function pickWeightedUnique(items, count) {
  const pool = items.slice();
  const chosen = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const pick = pickWeighted(pool);
    chosen.push(pick);
    pool.splice(pool.indexOf(pick), 1);
  }
  return chosen;
}

/**
 * Generic fixed-size object pool. Avoids GC churn from constantly
 * creating/destroying enemies, projectiles, particles, and pickups.
 * `factory` builds a fresh inactive instance; `reset` re-arms one
 * for reuse instead of allocating a new object every spawn.
 */
export class Pool {
  constructor(factory, size) {
    this.factory = factory;
    this.items = new Array(size).fill(null).map(() => factory());
    for (const it of this.items) it.active = false;
  }

  obtain() {
    for (const it of this.items) {
      if (!it.active) {
        it.active = true;
        return it;
      }
    }
    // Pool exhausted — grow it rather than dropping the spawn.
    const fresh = this.factory();
    fresh.active = true;
    this.items.push(fresh);
    return fresh;
  }

  forEachActive(fn) {
    for (const it of this.items) {
      if (it.active) fn(it);
    }
  }

  release(item) {
    item.active = false;
  }

  get activeCount() {
    let n = 0;
    for (const it of this.items) if (it.active) n++;
    return n;
  }
}
