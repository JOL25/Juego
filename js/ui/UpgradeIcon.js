// Tiny code-native sprites: no emoji fonts or external image downloads.
const PATTERNS = {
  wind: [
    '..........#####.........',
    '.........##...##........',
    '........##.....##.......',
    '........##..##.##.......',
    '........##...#.##.......',
    '..#..#...#####.##.......',
    '..............##........',
    '.##############.........',
    '...........##....###....',
    '...........##...##.##...',
    '#############...#...##..',
    '............##......##..',
    '.............##....##...',
    '......###.....######....',
    '.....##.##..............',
    '..##.#...##.............',
    '.....##..##.............',
    '......####..............',
  ],
  bolt: ['....##..', '...##...', '..###...', '.######.', '...###..', '...##...', '..##....', '..#.....'],
  wave: ['#..#..#.', '.#.#.#..', '..###...', '#######.', '..###...', '.#.#.#..', '#..#..#.', '........'],
  orbit: ['..####..', '.##..##.', '##.##.##', '#.#..#.#', '#.#..#.#', '##.##.##', '.##..##.', '..####..'],
  garlic: ['...##...', '...##...', '..####..', '.######.', '##.##.##', '##.##.##', '.######.', '..####..'],
  missile: ['.....###', '....####', '...#####', '..#####.', '.#####..', '..###...', '##.#....', '#.......'],
  heart: ['.##..##.', '########', '########', '.######.', '..####..', '...##...', '........', '........'],
  shield: ['.######.', '.######.', '.######.', '.######.', '..####..', '..####..', '...##...', '........'],
  book: ['.######.', '.#....#.', '.#.##.#.', '.#....#.', '.#.##.#.', '.#....#.', '.######.', '........'],
  boot: ['..###...', '..###...', '..###...', '..###...', '..#####.', '.######.', '.######.', '........'],
  magnet: ['.##..##.', '.##..##.', '.##..##.', '.##..##.', '.##..##.', '.######.', '..####..', '........'],
  whip: ['.....##.', '....#..#', '....#..#', '...#..#.', '..#.....', '.##.....', '##......', '#.......'],
};

let wandSprite = null;
const hudSprites = new Map();

export function drawUpgradeIcon(ctx, id, x, y, size = 24) {
  if (!hudSprites.has(id)) hudSprites.set(id, createUpgradeIcon({ id }));
  const sprite = hudSprites.get(id);
  const scale = Math.max(1, Math.floor(size / sprite.width));
  const width = Math.min(size, sprite.width * scale);
  const offset = Math.floor((size - width) / 2);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, Math.round(x) + offset, Math.round(y) + offset, width, width);
  ctx.restore();
}

export function getMagicWandSprite() {
  if (wandSprite) return wandSprite;
  wandSprite = document.createElement('canvas');
  wandSprite.width = wandSprite.height = 24;
  const ctx = wandSprite.getContext('2d');
  // Diagonal wooden handle with a dark, stepped outline.
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = '#28252c';
    ctx.fillRect(2 + i, 19 - i, 4, 4);
  }
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = '#ac5c29';
    ctx.fillRect(3 + i, 20 - i, 2, 2);
    ctx.fillStyle = '#d28a46';
    ctx.fillRect(3 + i, 20 - i, 1, 1);
  }
  const star = [
    '.....#.....', '....###....', '....###....', '##.#####.##',
    '.#########.', '..#######..', '.#########.', '##.#####.##',
    '....###....', '....###....', '.....#.....',
  ];
  star.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel !== '#') return;
    ctx.fillStyle = '#28252c';
    ctx.fillRect(x + 9, y, 3, 3);
  }));
  star.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel !== '#') return;
    ctx.fillStyle = x === 5 || y === 5 ? '#ffe5a0' : y < 5 ? '#ffca62' : '#ed941e';
    ctx.fillRect(x + 10, y + 1, 1, 1);
  }));
  for (const [x, y] of [[4, 3], [20, 17], [9, 21]]) {
    ctx.fillStyle = '#f6a52c';
    ctx.fillRect(x, y - 1, 1, 3);
    ctx.fillRect(x - 1, y, 3, 1);
    ctx.fillStyle = '#ffe5a0';
    ctx.fillRect(x, y, 1, 1);
  }
  return wandSprite;
}

export function createUpgradeIcon(option) {
  const id = option.id || option.weapon?.id || option.def?.id || option.kind;
  const shapes = {
    'dash-upgrade': 'wind',
    garlic: 'garlic', missile: 'missile', whip: 'whip',
    ult_wave: 'wave', ult_orbit_laser: 'orbit',
    'ultimate-upgrade': 'orbit', heart: 'heart', heal: 'heart',
    armor: 'shield', tome: 'book', boots: 'boot', amulet: 'magnet',
  };
  const pattern = PATTERNS[shapes[id] || 'bolt'];
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.max(pattern.length, ...pattern.map((row) => row.length)) + 2;
  canvas.className = 'levelup-icon';
  canvas.setAttribute('aria-hidden', 'true');
  if (id === 'magic_wand') {
    const sprite = getMagicWandSprite();
    canvas.width = canvas.height = sprite.width;
    canvas.getContext('2d').drawImage(sprite, 0, 0);
    return canvas;
  }
  const ctx = canvas.getContext('2d');
  pattern.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel !== '#') return;
    ctx.fillStyle = '#590e1b';
    ctx.fillRect(x + 2, y + 2, 1, 1);
  }));
  pattern.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel !== '#') return;
    ctx.fillStyle = y < pattern.length * 0.375 ? '#ffc0c3' : y < pattern.length * 0.625 ? '#f45c68' : '#b8273c';
    ctx.fillRect(x + 1, y + 1, 1, 1);
  }));
  return canvas;
}
