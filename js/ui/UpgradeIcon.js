// Tiny code-native sprites: no emoji fonts or external image downloads.
const PATTERNS = {
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

export function createUpgradeIcon(option) {
  const id = option.id || option.weapon?.id || option.def?.id || option.kind;
  const shapes = {
    garlic: 'garlic', missile: 'missile', whip: 'whip',
    ult_wave: 'wave', ult_orbit_laser: 'orbit',
    'ultimate-upgrade': 'orbit', heart: 'heart', heal: 'heart',
    armor: 'shield', tome: 'book', boots: 'boot', amulet: 'magnet',
  };
  const pattern = PATTERNS[shapes[id] || 'bolt'];
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 10;
  canvas.className = 'levelup-icon';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  pattern.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel !== '#') return;
    ctx.fillStyle = '#590e1b';
    ctx.fillRect(x + 2, y + 2, 1, 1);
  }));
  pattern.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel !== '#') return;
    ctx.fillStyle = y < 3 ? '#ffc0c3' : y < 5 ? '#f45c68' : '#b8273c';
    ctx.fillRect(x + 1, y + 1, 1, 1);
  }));
  return canvas;
}
