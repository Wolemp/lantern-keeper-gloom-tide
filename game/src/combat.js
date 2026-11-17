// Everything that touches: bolts hitting gloom, gloom orbs hitting the player or the lantern,
// enemies draining the lantern, sparks flowing to the player, the nova blast and the lantern's aura.
import { ARENA_MARGIN, COLORS, ENEMY_TYPES, VIEW } from './config.js';
import { burst, floatText, shake } from './effects.js';
import { damageEnemy } from './enemies.js';
import { hurtPlayer } from './player.js';

const LANTERN_DPS = { moth: 1.5, stalker: 1.2, spitter: 0, brute: 4.5, wraith: 2.2, maw: 3.5 };

function hitLantern(world, audio, amount) {
  const l = world.lantern;
  if (world.mode === 'over') return;
  l.hp = Math.max(0, l.hp - amount);
  l.flash = 1;
  world.comboHold = 0;
  if (world.lanternSound <= 0) {
    audio.sfx.lanternHit();
    world.lanternSound = 0.25;
  }
}

export function updateCombat(world, dt, audio) {
  const p = world.player;
  const l = world.lantern;
  world.lanternSound = Math.max(0, world.lanternSound - dt);
  l.flash = Math.max(0, l.flash - dt * 4);
  world.comboTimer = Math.max(0, world.comboTimer - dt);
  if (world.comboTimer === 0) world.combo = 0;

  updateBolts(world, dt, audio);
  updateOrbs(world, dt, audio);
  updateContacts(world, dt, audio);
  updateSparks(world, dt, audio);
  updateAura(world, dt, audio);
  updateTrail(world, dt, audio);
  applyNova(world, audio);

  // Standing close to the lantern recharges the dash faster: a reason to fight near it.
  const near = Math.hypot(p.x - l.x, p.y - l.y) < l.lightRadius * 0.55;
  p.dashTimer = Math.max(0, p.dashTimer - (near ? dt * 0.6 : 0));
}

function updateBolts(world, dt, audio) {
  const bolts = world.bolts;
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let dead = b.life <= 0;

    if (b.x < ARENA_MARGIN || b.x > VIEW.w - ARENA_MARGIN) {
      if (b.bounce > 0) {
        b.bounce -= 1;
        b.vx = -b.vx;
        b.x = Math.min(VIEW.w - ARENA_MARGIN, Math.max(ARENA_MARGIN, b.x));
        b.hit.clear();
      } else dead = true;
    }
    if (b.y < ARENA_MARGIN || b.y > VIEW.h - ARENA_MARGIN) {
      if (b.bounce > 0) {
        b.bounce -= 1;
        b.vy = -b.vy;
        b.y = Math.min(VIEW.h - ARENA_MARGIN, Math.max(ARENA_MARGIN, b.y));
        b.hit.clear();
      } else dead = true;
    }

    if (!dead) {
      for (const o of world.orbs) {
        if (!o.dead && Math.hypot(o.x - b.x, o.y - b.y) < o.radius + 6) {
          o.dead = true;
          burst(world, o.x, o.y, { count: 6, color: COLORS.eye, speed: 120, life: 0.3, size: 2.5 });
          dead = true;
          break;
        }
      }
    }

    if (!dead) {
      for (const e of world.enemies) {
        if (b.hit.has(e)) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + 6) {
          b.hit.add(e);
          damageEnemy(world, e, b.damage, audio, Math.atan2(b.vy, b.vx));
          if (b.pierce > 0) b.pierce -= 1;
          else {
            dead = true;
            break;
          }
        }
      }
    }
    if (dead) bolts.splice(i, 1);
  }
}

function updateOrbs(world, dt, audio) {
  const p = world.player;
  const l = world.lantern;
  for (let i = world.orbs.length - 1; i >= 0; i--) {
    const o = world.orbs[i];
    o.life -= dt;
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    let dead = o.dead || o.life <= 0 || o.x < -40 || o.x > VIEW.w + 40 || o.y < -40 || o.y > VIEW.h + 40;
    if (!dead && Math.hypot(o.x - p.x, o.y - p.y) < o.radius + p.radius * 0.8) {
      if (hurtPlayer(world, audio, 1)) dead = true;
    }
    if (!dead && Math.hypot(o.x - l.x, o.y - l.y) < o.radius + l.radius) {
      hitLantern(world, audio, 1.6);
      burst(world, o.x, o.y, { count: 8, color: COLORS.amber, speed: 150, life: 0.4, size: 3 });
      shake(world, 3);
      dead = true;
    }
    if (dead) world.orbs.splice(i, 1);
  }
}

function updateContacts(world, dt, audio) {
  const p = world.player;
  const l = world.lantern;
  for (const e of world.enemies) {
    const dps = LANTERN_DPS[e.type] || 0;
    const dl = Math.hypot(e.x - l.x, e.y - l.y);
    if (dps > 0 && dl < l.radius + e.radius * 0.85) {
      hitLantern(world, audio, dps * dt);
      if (e.type === 'moth' || e.type === 'brute' || e.type === 'maw') {
        const k = 1 - Math.exp(-8 * dt);
        e.vx -= e.vx * k;
        e.vy -= e.vy * k;
      }
      if (world.rng.chance(dt * 6)) burst(world, e.x, e.y, { count: 1, color: COLORS.amber, speed: 80, life: 0.4, size: 3 });
    }
    const dp = Math.hypot(e.x - p.x, e.y - p.y);
    if (dp < e.radius * 0.85 + p.radius * 0.8 && e.type !== 'spitter') {
      if (hurtPlayer(world, audio, e.type === 'maw' ? 2 : 1)) {
        const nx = (e.x - p.x) / (dp || 1);
        const ny = (e.y - p.y) / (dp || 1);
        if (e.type !== 'maw') {
          e.vx = nx * 320;
          e.vy = ny * 320;
        }
        p.vx = -nx * 420;
        p.vy = -ny * 420;
      }
    }
  }
}

function updateSparks(world, dt, audio) {
  const p = world.player;
  const need = p.novaCost;
  for (let i = world.sparks.length - 1; i >= 0; i--) {
    const s = world.sparks[i];
    s.age += dt;
    s.life -= dt;
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < p.pickupRadius && s.age > 0.25) {
      const pull = 900 * (1 - d / p.pickupRadius) + 200;
      s.vx += (dx / d) * pull * dt;
      s.vy += (dy / d) * pull * dt;
    }
    s.vx *= 1 - 2.5 * dt;
    s.vy *= 1 - 2.5 * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (d < 16 && s.age > 0.2) {
      world.sparks.splice(i, 1);
      if (p.charge < need) p.charge += 1;
      world.score += 1;
      world.sparkStreak = Math.min(12, world.sparkStreak + 1);
      world.sparkStreakTimer = 0.4;
      audio.sfx.spark(world.sparkStreak);
      continue;
    }
    if (s.life <= 0) world.sparks.splice(i, 1);
  }
  world.sparkStreakTimer = Math.max(0, world.sparkStreakTimer - dt);
  if (world.sparkStreakTimer === 0) world.sparkStreak = 0;
}

function updateAura(world, dt, audio) {
  const p = world.player;
  const l = world.lantern;
  world.zaps = world.zaps.filter((z) => (z.life -= dt) > 0);
  if (p.auraPower <= 0) return;
  world.auraTimer -= dt;
  if (world.auraTimer > 0) return;
  let best = null;
  let bestD = Infinity;
  for (const e of world.enemies) {
    const d = Math.hypot(e.x - l.x, e.y - l.y);
    if (d < l.lightRadius && d < bestD) {
      best = e;
      bestD = d;
    }
  }
  if (!best) return;
  world.auraTimer = 1.5 / (0.6 + p.auraPower * 0.6);
  world.zaps.push({ x1: l.x, y1: l.y - 8, x2: best.x, y2: best.y, life: 0.18 });
  damageEnemy(world, best, 1 + Math.floor(p.auraPower / 2), audio);
}

function updateTrail(world, dt, audio) {
  const trail = world.trail;
  for (let i = trail.length - 1; i >= 0; i--) {
    trail[i].life -= dt;
    if (trail[i].life <= 0) trail.splice(i, 1);
  }
  if (trail.length === 0) return;
  for (const e of world.enemies) {
    e.trailCool = Math.max(0, (e.trailCool || 0) - dt);
    if (e.trailCool > 0) continue;
    for (const t of trail) {
      if (Math.hypot(e.x - t.x, e.y - t.y) < e.radius + 14) {
        e.trailCool = 0.35;
        damageEnemy(world, e, 1, audio);
        break;
      }
    }
  }
}

function applyNova(world, audio) {
  const blast = world.novaBlast;
  if (!blast) return;
  world.novaBlast = null;
  for (const e of world.enemies.slice()) {
    const d = Math.hypot(e.x - blast.x, e.y - blast.y);
    if (d < blast.radius + e.radius) {
      const dmg = Math.max(2, Math.round(blast.damage * (1 - 0.5 * (d / blast.radius))));
      if (e.type !== 'maw') {
        e.vx += ((e.x - blast.x) / (d || 1)) * 500;
        e.vy += ((e.y - blast.y) / (d || 1)) * 500;
      }
      damageEnemy(world, e, dmg, audio);
    }
  }
  floatText(world, blast.x, blast.y - 40, 'NOVA!', { color: COLORS.teal, size: 28, life: 0.9 });
}

export function totalThreat(world) {
  return world.enemies.reduce((sum, e) => sum + ENEMY_TYPES[e.type].cost, 0);
}
