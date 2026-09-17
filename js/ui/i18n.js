const EN = {
  'Sobrevive a la horda interminable. Sube de nivel. No mires atrás.': 'Survive the endless horde. Level up. Never look back.',
  'Empezar': 'Play', 'Opciones': 'Options', 'Idioma': 'Language', 'Volver': 'Back',
  'Movimiento:': 'Movement:', 'WASD / Flechas / Joystick táctil': 'WASD / Arrow keys / Touch joystick',
  'Espacio o Shift': 'Space or Shift', 'Definitiva:': 'Ultimate:',
  'Q, E o R (se desbloquea al nivel 5)': 'Q, E or R (unlocks at level 5)',
  'Esc o P': 'Esc or P', 'Pausa:': 'Pause:', 'Pausa': 'Pause', 'Pausar': 'Pause',
  'Español': 'Spanish',
  '¡Subiste de nivel!': 'Level up!', 'Elige una mejora': 'Choose an upgrade',
  'Sonido:': 'Sound:', 'Volumen del sonido': 'Sound volume', 'Continuar': 'Resume',
  'Reiniciar': 'Restart', 'Has caído': 'Game over', 'Volver a intentar': 'Try again',
  'Salir de pantalla completa': 'Exit fullscreen', 'Pantalla completa': 'Fullscreen',
  'No se pudo activar. Puedes usar F11 en el navegador.': 'Could not enter fullscreen. You can use F11 in your browser.',
  'Súper disparo perforante': 'Super Pierce Shot', 'Onda explosiva grande': 'Explosive Wave',
  'Láser orbital': 'Orbit Laser', 'Rayo perforante': 'Pierce Ray', 'Misil': 'Missile',
  'Poción curativa': 'Healing Potion', 'Recupera 30 de vida': 'Restore 30 health',
  'Vida máxima:': 'Max health:', 'Velocidad:': 'Speed:', 'Armadura:': 'Armor:',
  'Rango de recogida:': 'Pickup range:', 'Vida al matar:': 'Health on kill:',
  'Daño:': 'Damage:', 'Recarga:': 'Cooldown:', 'Más alcance': 'Longer reach',
  'Daña a enemigos cercanos': 'Damages nearby enemies', 'Mayor ralentización': 'Stronger slow',
  'Ralentiza enemigos': 'Slows enemies', 'Ataque cercano': 'Close-range attack',
  'Empuja enemigos': 'Knocks enemies back', 'Ambos lados': 'Both sides',
  'Proyectiles:': 'Projectiles:', 'Perforación:': 'Pierce:', 'Atraviesa enemigos': 'Pierces enemies',
  'Rayo más ancho': 'Wider beam', 'Ataque en línea': 'Line attack', 'Misiles:': 'Missiles:',
  'Explosión más grande': 'Larger explosion', 'Explota al impactar': 'Explodes on impact',
  'Perforación total': 'Unlimited piercing', 'Onda más grande': 'Larger shockwave',
  'Daña a tu alrededor': 'Damages surrounding enemies', 'Haces:': 'Beams:',
  'Gira a tu alrededor': 'Rotates around you', 'Láser más grueso': 'Thicker laser',
  'Duración:': 'Duration:', 'Activar:': 'Activate:', 'Cargas:': 'Charges:', '+1 carga': '+1 charge',
  'Definitiva al Nv.': 'Ultimate at Lv.', 'Elige definitiva': 'Choose an ultimate',
  'Definitiva': 'Ultimate', 'Pasiva': 'Passive', 'Curación': 'Healing', 'Arma': 'Weapon',
  'ELEGIR': 'CHOOSE', 'Nv.': 'Lv.', 'IMAN': 'MAGNET', 'HIELO': 'FREEZE',
  'HAN EMERGIDO LOS': 'NEW ENEMIES HAVE EMERGED',
  'Triángulos': 'Triangles', 'Cuadrados': 'Squares', 'Rombos': 'Diamonds',
  'Pentágonos': 'Pentagons', 'Hexágonos': 'Hexagons',
  'Han aparecido beneficios': 'Mysterious power-ups', 'misteriosos en el mapa': 'have appeared on the map',
};
const ES = {
  'English': 'Inglés',
  'New best time!': '¡Nuevo récord!', 'Survived': 'Tiempo sobrevivido',
  'Level reached': 'Nivel alcanzado', 'Enemies slain': 'Enemigos derrotados',
  'Magic Wand': 'Varita mágica', 'Garlic Aura': 'Aura de ajo', 'Whip': 'Látigo',
  'Ancient Tome': 'Tomo antiguo', 'Swift Boots': 'Botas veloces', 'Bone Armor': 'Armadura de hueso',
  'Pull Amulet': 'Amuleto de atracción', "Vampire's Kiss": 'Beso vampírico',
};
let language = 'en';
try {
  const saved = localStorage.getItem('vs_clone_language');
  if (saved === 'es' || saved === 'en') language = saved;
} catch { /* Optional storage. */ }

export function getLanguage() { return language; }
export function setLanguage(value) {
  if (!['es', 'en'].includes(value)) return;
  language = value;
  try { localStorage.setItem('vs_clone_language', value); } catch { /* Optional storage. */ }
}

// Translate complete messages, never substrings inside another name or sentence.
export function t(text) {
  const dictionary = language === 'en' ? EN : ES;
  return dictionary[text] ?? text;
}

// Marked elements are updated in place, including after repeated language changes.
export function bindStaticTranslations(root = document.body) {
  return () => {
    document.documentElement.lang = language;
    for (const element of root.querySelectorAll('[data-i18n]')) {
      element.textContent = t(element.dataset.i18n);
    }
    for (const attribute of ['aria-label', 'title']) {
      for (const element of root.querySelectorAll(`[data-i18n-${attribute}]`)) {
        element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
      }
    }
  };
}
