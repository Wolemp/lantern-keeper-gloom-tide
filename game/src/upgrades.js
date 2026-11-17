// The boons offered between waves. Each card changes the player's numbers or the lantern's.
export const UPGRADES = [
  {
    id: 'twin',
    name: 'Twin Flame',
    max: 3,
    icon: 'twin',
    text: (n) => 'Fire ' + (n + 2) + ' bolts at once in a fan',
    apply: (w) => { w.player.boltCount += 1; },
  },
  {
    id: 'wick',
    name: 'Quick Wick',
    max: 4,
    icon: 'speed',
    text: () => 'Shoot 22% faster',
    apply: (w) => { w.player.fireInterval *= 0.78; },
  },
  {
    id: 'wax',
    name: 'Hot Wax',
    max: 3,
    icon: 'power',
    text: () => 'Bolts hit for +1 damage',
    apply: (w) => { w.player.boltDamage += 1; },
  },
  {
    id: 'glass',
    name: 'Piercing Glow',
    max: 3,
    icon: 'pierce',
    text: () => 'Bolts pass through one more enemy',
    apply: (w) => { w.player.pierce += 1; },
  },
  {
    id: 'ricochet',
    name: 'Mirror Moss',
    max: 2,
    icon: 'bounce',
    text: () => 'Bolts bounce off the arena walls',
    apply: (w) => { w.player.bounce += 1; },
  },
  {
    id: 'feet',
    name: 'Fleet Feet',
    max: 3,
    icon: 'boots',
    text: () => 'Move 12% faster',
    apply: (w) => { w.player.speed *= 1.12; },
  },
  {
    id: 'afterimage',
    name: 'Afterimage',
    max: 3,
    icon: 'dash',
    text: (n) => (n === 0 ? 'Dash leaves a burning trail, dash 20% faster to recharge' : 'Dash recharges 20% faster'),
    apply: (w) => { w.player.dashTrail = true; w.player.dashCooldown *= 0.8; },
  },
  {
    id: 'oil',
    name: 'Lantern Oil',
    max: 3,
    icon: 'oil',
    text: () => 'Lantern holds +8 flame and heals 8 now',
    apply: (w) => { w.lantern.maxHp += 8; w.lantern.hp = Math.min(w.lantern.maxHp, w.lantern.hp + 8); },
  },
  {
    id: 'heart',
    name: 'Warm Heart',
    max: 3,
    icon: 'heart',
    text: () => '+1 max life and heal 1 life',
    apply: (w) => { w.player.maxHp += 1; w.player.hp = Math.min(w.player.maxHp, w.player.hp + 1); },
  },
  {
    id: 'aura',
    name: 'Radiant Aura',
    max: 3,
    icon: 'aura',
    text: (n) => (n === 0 ? 'The lantern zaps gloom that enters its light' : 'Lantern zaps faster and harder'),
    apply: (w) => { w.player.auraPower += 1; },
  },
  {
    id: 'dawn',
    name: 'Slow Dawn',
    max: 2,
    icon: 'sun',
    text: () => 'Wider light that slows gloom more',
    apply: (w) => { w.lantern.lightRadius += 45; w.lantern.slowFactor = Math.max(0.3, w.lantern.slowFactor - 0.12); },
  },
  {
    id: 'magnet',
    name: 'Spark Magnet',
    max: 2,
    icon: 'magnet',
    text: () => 'Sparks fly to you from much farther',
    apply: (w) => { w.player.pickupRadius += 55; },
  },
  {
    id: 'nova',
    name: 'Supernova',
    max: 3,
    icon: 'nova',
    text: () => 'Nova needs 5 fewer sparks and hits harder',
    apply: (w) => { w.player.novaCost = Math.max(10, w.player.novaCost - 5); w.player.novaPower += 0.35; },
  },
];

export function levelOf(world, id) {
  return world.taken[id] || 0;
}

export function rollChoices(world, count = 3) {
  const open = UPGRADES.filter((u) => levelOf(world, u.id) < u.max);
  return world.rng.shuffle(open).slice(0, count);
}

export function applyUpgrade(world, upgrade) {
  upgrade.apply(world);
  world.taken[upgrade.id] = levelOf(world, upgrade.id) + 1;
}

export function describeLevel(upgrade, world) {
  return upgrade.text(levelOf(world, upgrade.id));
}
