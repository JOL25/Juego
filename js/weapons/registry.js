// ============================================================
// WEAPON REGISTRY — single place that knows every weapon class.
// Adding a new weapon = write the class + add one line here.
// ============================================================

import { MagicWand } from './MagicWand.js';
import { Whip } from './Whip.js';
import { GarlicAura } from './GarlicAura.js';
import { PierceRay } from './PierceRay.js';
import { Missile } from './Missile.js';
import { PASSIVE_DEFS } from './Passives.js';
import { createUltimate, listUltimates, ULTIMATE_CLASSES } from './Ultimates.js';

export const WEAPON_CLASSES = {
  magic_wand: MagicWand,
  whip: Whip,
  garlic: GarlicAura,
  pierce_ray: PierceRay,
  missile: Missile,
};

export function createWeapon(id) {
  const Cls = WEAPON_CLASSES[id];
  if (!Cls) throw new Error(`Unknown weapon id: ${id}`);
  return new Cls();
}

export function getPassiveDef(id) {
  return PASSIVE_DEFS.find((p) => p.id === id);
}

export { PASSIVE_DEFS, createUltimate, listUltimates, ULTIMATE_CLASSES };
