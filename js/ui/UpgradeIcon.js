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
  shield: ['.######.', '.##..##.', '.##..##.', '.######.', '..####..', '..####..', '...##...', '........'],
  book: ['.######.', '.#....#.', '.#.##.#.', '.#....#.', '.#.##.#.', '.#....#.', '.######.', '........'],
  boot: ['..####..', '..#..#..', '..####..', '..#..#..', '..#####.', '.######.', '.######.', '........'],
  magnet: ['.##..##.', '.##..##.', '.##..##.', '.##..##.', '.##..##.', '.######.', '..####..', '........'],
  whip: ['.....##.', '....#..#', '....#..#', '...#..#.', '..#.....', '.##.....', '##......', '#.......'],
};

let wandSprite = null;
const PALETTES = {
  magic_wand: ['#fff0b5', '#e8b13a', '#9d602e'],
  garlic: ['#f4ece0', '#a8c991', '#587856'],
  whip: ['#ffd6b1', '#ce8b60', '#83504a'],
  pierce_ray: ['#fff4be', '#e8c956', '#9b7334'],
  missile: ['#ffe2bd', '#ed995b', '#a94b3f'],
  tome: ['#eee0ff', '#ac8bcd', '#635080'],
  boots: ['#e5f4d4', '#a8c991', '#587856'],
  armor: ['#e4edf3', '#9caec6', '#566581'],
  amulet: ['#dcf6f1', '#81c8ba', '#497e84'],
  heart: ['#ffdbdc', '#e58091', '#a34968'],
  heal: ['#ffdbdc', '#e58091', '#a34968'],
  'dash-upgrade': ['#e1f6ff', '#7ec6e0', '#477f9d'],
  ult_pierce_shot: ['#e1f6ff', '#7ec6e0', '#477f9d'],
  ult_wave: ['#ffe2bd', '#ed995b', '#a94b3f'],
  ult_orbit_laser: ['#f6e2ff', '#c69cde', '#80549b'],
};

export function getUpgradePalette(id) {
  return PALETTES[id] || PALETTES.magic_wand;
}
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
    ctx.fillStyle = '#9d602e';
    ctx.fillRect(3 + i, 20 - i, 2, 2);
    ctx.fillStyle = '#ce9653';
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
    ctx.fillStyle = x === 5 || y === 5 ? '#fff0b5' : y < 5 ? '#e8c956' : '#d49837';
    ctx.fillRect(x + 10, y + 1, 1, 1);
  }));
  for (const [x, y] of [[4, 3], [20, 17], [9, 21]]) {
    ctx.fillStyle = '#e8b13a';
    ctx.fillRect(x, y - 1, 1, 3);
    ctx.fillRect(x - 1, y, 3, 1);
    ctx.fillStyle = '#fff0dc';
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
  const palette = getUpgradePalette(id);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.max(pattern.length, ...pattern.map((row) => row.length)) + 2;
  canvas.className = 'levelup-icon';
  canvas.setAttribute('aria-hidden', 'true');
  const displaySize = Math.floor(56 / canvas.width) * canvas.width;
  canvas.style.width = canvas.style.height = `${displaySize}px`;
  if (id === 'magic_wand') {
    const sprite = getMagicWandSprite();
    canvas.width = canvas.height = sprite.width;
    canvas.style.width = canvas.style.height = '48px';
    canvas.getContext('2d').drawImage(sprite, 0, 0);
    return canvas;
  }
  const ctx = canvas.getContext('2d');
  pattern.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel !== '#') return;
    ctx.fillStyle = '#241b2d';
    ctx.fillRect(x + 2, y + 2, 1, 1);
  }));
  pattern.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel !== '#') return;
    ctx.fillStyle = y < pattern.length * 0.375 ? palette[0] : y < pattern.length * 0.625 ? palette[1] : palette[2];
    ctx.fillRect(x + 1, y + 1, 1, 1);
  }));
  return canvas;
}
