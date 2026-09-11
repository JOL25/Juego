// Show the resulting level's real stats, rather than promising increases that
// do not happen on every level (for example garlic's slow or missile count).
export function upgradeDescription(item, stats = item.stats) {
  const damage = `Daño: ${stats.damage}`;
  const cooldown = `Recarga: ${stats.cooldownMs / 1000} s`;
  const improvement = (field, increased, base) => stats[field] > item.stats[field] ? increased : base;
  switch (item.id) {
    case 'garlic':
      return `${damage}\n${improvement('radius', 'Más alcance', 'Daña a enemigos cercanos')}\n${improvement('slowPercent', 'Mayor ralentización', 'Ralentiza enemigos')}`;
    case 'whip':
      return `${damage} · ${improvement('range', 'Más alcance', 'Ataque cercano')}${stats.knockbackCm > 0 ? '\nEmpuja enemigos' : ''}${stats.bothSides ? ' · Ambos lados' : ''}\n${cooldown}`;
    case 'magic_wand':
      return `${damage}\nProyectiles: ${stats.count} · Perforación: ${stats.pierce}\n${cooldown}`;
    case 'pierce_ray':
      return `${damage}\n${improvement('length', 'Más alcance', 'Atraviesa enemigos')} · ${improvement('width', 'Rayo más ancho', 'Ataque en línea')}\n${cooldown}`;
    case 'missile':
      return `${damage} · Misiles: ${stats.count}\n${improvement('explodeRadius', 'Explosión más grande', 'Explota al impactar')}\n${cooldown}`;
    case 'ult_pierce_shot':
      return `${damage}\nProyectiles: ${stats.count} · Perforación total\n${cooldown}`;
    case 'ult_wave':
      return `${damage}\n${improvement('maxRadius', 'Onda más grande', 'Daña a tu alrededor')}\n${cooldown}`;
    case 'ult_orbit_laser':
      return `${damage} · Haces: ${stats.beams}\n${improvement('length', 'Más alcance', 'Gira a tu alrededor')}${stats.width > item.stats.width ? ' · Láser más grueso' : ''}\nDuración: ${stats.durationMs / 1000} s · ${cooldown}`;
    default:
      return `${damage}\n${cooldown}`;
  }
}
