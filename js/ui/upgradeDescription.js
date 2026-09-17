// Show the resulting level's real stats, rather than promising increases that
// do not happen on every level (for example garlic's slow or missile count).
import { t } from './i18n.js';

export function upgradeDescription(item, stats = item.stats) {
  const damage = `${t('Daño:')} ${stats.damage}`;
  const cooldown = `${t('Recarga:')} ${stats.cooldownMs / 1000} s`;
  const improvement = (field, increased, base) => t(stats[field] > item.stats[field] ? increased : base);
  switch (item.id) {
    case 'garlic':
      return `${damage}\n${improvement('radius', 'Más alcance', 'Daña a enemigos cercanos')}\n${improvement('slowPercent', 'Mayor ralentización', 'Ralentiza enemigos')}`;
    case 'whip':
      return `${damage} · ${improvement('range', 'Más alcance', 'Ataque cercano')}${stats.knockbackCm > 0 ? `\n${t('Empuja enemigos')}` : ''}${stats.bothSides ? ` · ${t('Ambos lados')}` : ''}\n${cooldown}`;
    case 'magic_wand':
      return `${damage}\n${t('Proyectiles:')} ${stats.count} · ${t('Perforación:')} ${stats.pierce}\n${cooldown}`;
    case 'pierce_ray':
      return `${damage}\n${improvement('length', 'Más alcance', 'Atraviesa enemigos')} · ${improvement('width', 'Rayo más ancho', 'Ataque en línea')}\n${cooldown}`;
    case 'missile':
      return `${damage} · ${t('Misiles:')} ${stats.count}\n${improvement('explodeRadius', 'Explosión más grande', 'Explota al impactar')}\n${cooldown}`;
    case 'ult_pierce_shot':
      return `${damage}\n${t('Proyectiles:')} ${stats.count} · ${t('Perforación total')}\n${cooldown}`;
    case 'ult_wave':
      return `${damage}\n${improvement('maxRadius', 'Onda más grande', 'Daña a tu alrededor')}\n${cooldown}`;
    case 'ult_orbit_laser':
      return `${damage} · ${t('Haces:')} ${stats.beams}\n${improvement('length', 'Más alcance', 'Gira a tu alrededor')}${stats.width > item.stats.width ? ` · ${t('Láser más grueso')}` : ''}\n${t('Duración:')} ${stats.durationMs / 1000} s · ${cooldown}`;
    default:
      return `${damage}\n${cooldown}`;
  }
}
