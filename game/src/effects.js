// Short-lived visual effects: particles, expanding rings, floating text, screen shake.
// They live on the world so the renderer can draw them and the update loop can age them.

export function burst(world, x, y, { count = 10, color = '#ffc15a', speed = 160, life = 0.5, size = 3, spread = Math.PI * 2, angle = 0 } = {}) {
  const rng = world.rng;
  for (let i = 0; i < count; i++) {
    const a = angle + (rng.next() - 0.5) * spread;
    const s = speed * (0.35 + rng.next() * 0.65);
    world.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: life * (0.6 + rng.next() * 0.6),
      max: life,
      size: size * (0.6 + rng.next() * 0.8),
      color,
    });
  }
  if (world.particles.length > 900) world.particles.splice(0, world.particles.length - 900);
}

export function ring(world, x, y, { radius = 120, color = '#ffc15a', life = 0.45, width = 4 } = {}) {
  world.rings.push({ x, y, radius, color, life, max: life, width });
}

export function floatText(world, x, y, text, { color = '#f6ecff', size = 18, life = 0.9 } = {}) {
  world.texts.push({ x, y, text, color, size, life, max: life });
}

export function shake(world, amount) {
  world.shake = Math.min(18, Math.max(world.shake, amount));
}

export function showBanner(world, title, subtitle = '', life = 2.2) {
  world.banner = { title, subtitle, life, max: life };
}

export function updateEffects(world, dt) {
  const { particles, rings, texts } = world;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2.2 * dt;
    p.vy *= 1 - 2.2 * dt;
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].life -= dt;
    if (rings[i].life <= 0) rings.splice(i, 1);
  }
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.life -= dt;
    t.y -= 34 * dt;
    if (t.life <= 0) texts.splice(i, 1);
  }
  world.shake = Math.max(0, world.shake - 40 * dt);
  world.flash = Math.max(0, world.flash - 2.5 * dt);
  if (world.banner) {
    world.banner.life -= dt;
    if (world.banner.life <= 0) world.banner = null;
  }
}
