// Broad-phase spatial index. Entities are stored by their center cell;
// area queries expand by the largest indexed radius so large entities
// are never omitted before a caller performs its exact geometry check.
export class SpatialGrid {
  constructor(cellSize, metrics = null) {
    if (!Number.isFinite(cellSize) || cellSize <= 0) {
      throw new RangeError('SpatialGrid cellSize must be a positive number');
    }

    this.cellSize = cellSize;
    this.metrics = metrics;
    this.cells = new Map();
    this.indexedEntities = new Set();
    this.maxEntityRadius = 0;
    this._resetCellBounds();
  }

  clear() {
    this.cells.clear();
    this.indexedEntities.clear();
    this.maxEntityRadius = 0;
    this._resetCellBounds();
  }

  insert(entity) {
    if (!entity || entity.active === false || this.indexedEntities.has(entity)) return false;

    const cellX = this._cellCoordinate(entity.x);
    const cellY = this._cellCoordinate(entity.y);
    const key = this._key(cellX, cellY);
    let bucket = this.cells.get(key);

    if (!bucket) {
      bucket = [];
      this.cells.set(key, bucket);
    }

    bucket.push(entity);
    this.indexedEntities.add(entity);
    const radius = Number.isFinite(entity.radius) ? Math.max(0, entity.radius) : 0;
    this.maxEntityRadius = Math.max(this.maxEntityRadius, radius);
    this.minCellX = Math.min(this.minCellX, cellX);
    this.maxCellX = Math.max(this.maxCellX, cellX);
    this.minCellY = Math.min(this.minCellY, cellY);
    this.maxCellY = Math.max(this.maxCellY, cellY);
    return true;
  }

  forEachNearby(x, y, radius, callback) {
    this._incrementMetric('gridQueries');
    const queryRadius = Number.isFinite(radius) ? Math.max(0, radius) : 0;
    this._forEachInBounds(
      x - queryRadius,
      y - queryRadius,
      x + queryRadius,
      y + queryRadius,
      callback
    );
  }

  forEachInBounds(minX, minY, maxX, maxY, callback) {
    this._incrementMetric('gridQueries');
    this._forEachInBounds(minX, minY, maxX, maxY, callback);
  }

  _forEachInBounds(minX, minY, maxX, maxY, callback) {
    const left = Math.min(minX, maxX) - this.maxEntityRadius;
    const right = Math.max(minX, maxX) + this.maxEntityRadius;
    const top = Math.min(minY, maxY) - this.maxEntityRadius;
    const bottom = Math.max(minY, maxY) + this.maxEntityRadius;

    const minCellX = this._cellCoordinate(left);
    const maxCellX = this._cellCoordinate(right);
    const minCellY = this._cellCoordinate(top);
    const maxCellY = this._cellCoordinate(bottom);

    for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        this._forEachActiveInCell(cellX, cellY, callback);
      }
    }
  }

  findNearest(x, y) {
    return this.findNearestN(x, y, 1)[0] || null;
  }

  findNearestN(x, y, count) {
    this._incrementMetric('gridQueries');
    this._incrementMetric('nearestSearches');
    if (!Number.isFinite(count) || count <= 0 || this.cells.size === 0) return [];
    const requestedCount = Math.floor(count);
    if (requestedCount < 1) return [];
    const originCellX = this._cellCoordinate(x);
    const originCellY = this._cellCoordinate(y);
    const maxRing = Math.max(
      Math.abs(originCellX - this.minCellX),
      Math.abs(originCellX - this.maxCellX),
      Math.abs(originCellY - this.minCellY),
      Math.abs(originCellY - this.maxCellY)
    );
    const candidates = [];

    for (let ring = 0; ring <= maxRing; ring += 1) {
      this._forEachCellInRing(originCellX, originCellY, ring, (entity) => {
        if (entity.active === false) return;
        const dx = entity.x - x;
        const dy = entity.y - y;
        candidates.push({ entity, distanceSq: dx * dx + dy * dy });
      });

      if (candidates.length >= requestedCount) {
        candidates.sort((first, second) => first.distanceSq - second.distanceSq);
        const furthestSelected = candidates[requestedCount - 1].distanceSq;
        const unexploredDistance = this._distanceToOutsideRing(
          x,
          y,
          originCellX,
          originCellY,
          ring
        );
        if (furthestSelected <= unexploredDistance * unexploredDistance) {
          return candidates.slice(0, requestedCount).map((candidate) => candidate.entity);
        }
      }
    }

    candidates.sort((first, second) => first.distanceSq - second.distanceSq);
    return candidates.slice(0, requestedCount).map((candidate) => candidate.entity);
  }

  queryCircle(x, y, radius) {
    const candidates = [];
    this.forEachNearby(x, y, radius, (entity) => candidates.push(entity));
    return candidates;
  }

  _forEachActiveInCell(cellX, cellY, callback) {
    const bucket = this.cells.get(this._key(cellX, cellY));
    if (!bucket) return;
    for (const entity of bucket) {
      if (entity.active !== false) {
        this._incrementMetric('candidateEnemies');
        callback(entity);
      }
    }
  }

  _forEachCellInRing(originCellX, originCellY, ring, callback) {
    if (ring === 0) {
      this._forEachActiveInCell(originCellX, originCellY, callback);
      return;
    }

    const minCellX = originCellX - ring;
    const maxCellX = originCellX + ring;
    const minCellY = originCellY - ring;
    const maxCellY = originCellY + ring;

    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      this._forEachActiveInCell(cellX, minCellY, callback);
      this._forEachActiveInCell(cellX, maxCellY, callback);
    }
    for (let cellY = minCellY + 1; cellY < maxCellY; cellY += 1) {
      this._forEachActiveInCell(minCellX, cellY, callback);
      this._forEachActiveInCell(maxCellX, cellY, callback);
    }
  }

  _distanceToOutsideRing(x, y, originCellX, originCellY, ring) {
    const left = (originCellX - ring) * this.cellSize;
    const right = (originCellX + ring + 1) * this.cellSize;
    const top = (originCellY - ring) * this.cellSize;
    const bottom = (originCellY + ring + 1) * this.cellSize;
    return Math.min(x - left, right - x, y - top, bottom - y);
  }

  _resetCellBounds() {
    this.minCellX = Infinity;
    this.maxCellX = -Infinity;
    this.minCellY = Infinity;
    this.maxCellY = -Infinity;
  }

  _cellCoordinate(position) {
    return Math.floor(position / this.cellSize);
  }

  _key(cellX, cellY) {
    return `${cellX},${cellY}`;
  }

  _incrementMetric(name, amount = 1) {
    if (!this.metrics) return;
    this.metrics[name] = (this.metrics[name] || 0) + amount;
  }
}
