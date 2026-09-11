// Cached, shaded sprites on a two-pixel grid; collision geometry stays intact.
const sprites = new Map();
const STEP = 2;

function insidePolygon(x, y, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const [ax, ay] = vertices[i];
    const [bx, by] = vertices[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

export function drawPixelSprite(ctx, x, y, radius, color, outline, vertices = null) {
  const key = JSON.stringify([radius, color, outline, vertices]);
  let sprite = sprites.get(key);
  if (!sprite) {
    const half = Math.ceil((radius + STEP) / STEP);
    const size = half * 2;
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = size;
    const paint = sprite.getContext('2d');
    const mask = (column, row) => {
      const nx = (column - half + 0.5) * STEP / radius;
      const ny = (row - half + 0.5) * STEP / radius;
      return vertices ? insidePolygon(nx, ny, vertices) : nx * nx + ny * ny <= 1;
    };
    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        if (!mask(column, row)) continue;
        const edge = !mask(column, row - 1) || !mask(column - 1, row)
          || !mask(column, row + 1) || !mask(column + 1, row);
        paint.fillStyle = edge ? outline : color;
        paint.fillRect(column, row, 1, 1);
        if (!edge) {
          paint.fillStyle = row < half - 2 ? 'rgba(255,255,255,0.3)' : row > half + 1 ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0)';
          paint.fillRect(column, row, 1, 1);
        }
      }
    }
    sprites.set(key, sprite);
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, Math.round(x / STEP) * STEP - sprite.width, Math.round(y / STEP) * STEP - sprite.height, sprite.width * STEP, sprite.height * STEP);
  ctx.restore();
}
