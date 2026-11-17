// The gloom: how each kind of enemy is created, how it moves and attacks, and what happens when it dies.
import { ARENA_MARGIN, COLORS, ENEMY_TYPES, SCORE, VIEW, WAVES } from './config.js';
import { burst, floatText, ring, shake, showBanner } from './effects.js';

export function spawnEnemy(world, type, x, y) {
  const def = ENEMY_TYPES[type];
  const scale = type === 'maw' ? 1 : 1 + WAVES.hpGrowth * (world.wave - 1);
  const hp = type === 'maw' ? def.hp + WAVES.bossHpPerRound * Math.floor(world.wave / WAVES.bossEvery - 1) : Math.ceil(def.hp * scale);
  const enemy = {
    type,
    x, y,
    vx: 0, vy: 0,
    hp, maxHp: hp,
    radius: def.radius,
    age: 0,
    flash: 0,
    state: 'move',
    timer: 0,
    shotTimer: world.rng.range(0.6, def.shotInterval || 2),
    burstTimer: def.burstInterval || 0,
    summonTimer: def.summonInterval || 0,
    seed: world.rng.next() * 100,
    dir: world.rng.chance(0.5) ? 1 : -1,
    aim: { x: 0, y: 0 },
    cooldown: 0,
  };
  world.enemies.push(enemy);
  return enemy;
}

export function edgeSpawnPoint(world) {
  const side = world.rng.int(0, 3);
  const m = 36;
  if (side === 0) return { x: world.rng.range(0, VIEW.w), y: -m };
  if (side === 1) return { x: VIEW.w + m, y: world.rng.range(0, VIEW.h) };
  if (side === 2) return { x: world.rng.range(0, VIEW.w), y: VIEW.h + m };
  return { x: -m, y: world.rng.range(0, VIEW.h) };
}

function steer(e, tx, ty, speed, dt, turn = 6) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const d = Math.hypot(dx, dy) || 1;
  const k = 1 - Math.exp(-turn * dt);
  e.vx += ((dx / d) * speed - e.vx) * k;
  e.vy += ((dy / d) * speed - e.vy) * k;
}

function lightSlow(world, e) {
  const l = world.lantern;
  const d = Math.hypot(e.x - l.x, e.y - l.y);
  return d < l.lightRadius ? l.slowFactor : 1;
}

function fireOrb(world, audio, from, tx, ty, speed, radius = 7) {
  const dx = tx - from.x;
  const dy = ty - from.y;
  const d = Math.hypot(dx, dy) || 1;
  world.orbs.push({ x: from.x, y: from.y, vx: (dx / d) * speed, vy: (dy / d) * speed, radius, life: 6 });
  audio.sfx.spit();
}

export function updateEnemies(world, dt, audio) {
  const p = world.player;
  const l = world.lantern;
  for (const e of world.enemies) {
    const def = ENEMY_TYPES[e.type];
    e.age += dt;
    e.flash = Math.max(0, e.flash - dt * 6);
    e.cooldown = Math.max(0, e.cooldown - dt);
    const speed = def.speed * lightSlow(world, e);

    if (e.type === 'moth') {
      const wobble = Math.sin(e.age * 7 + e.seed) * 0.5;
      const a = Math.atan2(l.y - e.y, l.x - e.x) + wobble * 0.5;
      steer(e, e.x + Math.cos(a) * 100, e.y + Math.sin(a) * 100, speed, dt, 5);
    } else if (e.type === 'stalker') {
      steer(e, p.x, p.y, speed, dt, 4);
    } else if (e.type === 'spitter') {
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      if (d > def.keepRange + 40) steer(e, p.x, p.y, speed, dt, 3);
      else if (d < def.keepRange - 80) steer(e, e.x - Math.cos(a) * 100, e.y - Math.sin(a) * 100, speed, dt, 3);
      else steer(e, e.x + Math.cos(a + e.dir * Math.PI / 2) * 100, e.y + Math.sin(a + e.dir * Math.PI / 2) * 100, speed * 0.7, dt, 3);
      e.shotTimer -= dt;
      if (e.shotTimer <= 0) {
        e.shotTimer = def.shotInterval;
        fireOrb(world, audio, e, p.x, p.y, def.shotSpeed);
        burst(world, e.x, e.y, { count: 6, color: COLORS.eye, speed: 120, life: 0.3, size: 2.5 });
      }
    } else if (e.type === 'brute') {
      steer(e, l.x, l.y, speed, dt, 2.5);
    } else if (e.type === 'wraith') {
      updateWraith(world, e, dt, def, speed);
    } else if (e.type === 'maw') {
      updateMaw(world, e, dt, def, speed, audio);
    }

    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }
  separate(world.enemies);
}

function updateWraith(world, e, dt, def, speed) {
  const p = world.player;
  e.timer += dt;
  if (e.state === 'move') {
    const a = Math.atan2(e.y - p.y, e.x - p.x) + e.dir * 0.5;
    steer(e, p.x + Math.cos(a) * 250, p.y + Math.sin(a) * 250, speed, dt, 3);
    if (e.timer > 2.2 && e.cooldown <= 0) {
      e.state = 'windup';
      e.timer = 0;
      e.aim = { x: p.x, y: p.y };
    }
  } else if (e.state === 'windup') {
    e.vx *= 1 - 6 * dt;
    e.vy *= 1 - 6 * dt;
    e.aim = { x: p.x, y: p.y };
    if (e.timer >= def.windup) {
      e.state = 'dash';
      e.timer = 0;
      const d = Math.hypot(e.aim.x - e.x, e.aim.y - e.y) || 1;
      e.vx = ((e.aim.x - e.x) / d) * def.dashSpeed;
      e.vy = ((e.aim.y - e.y) / d) * def.dashSpeed;
    }
  } else {
    if (e.timer >= def.dashTime) {
      e.state = 'move';
      e.timer = 0;
      e.cooldown = 1.2;
      e.dir = -e.dir;
    }
  }
}

function updateMaw(world, e, dt, def, speed, audio) {
  const l = world.lantern;
  const enraged = e.hp < e.maxHp * 0.5;
  const d = Math.hypot(l.x - e.x, l.y - e.y);
  if (d > l.radius + e.radius + 20) steer(e, l.x, l.y, speed * (enraged ? 1.5 : 1), dt, 1.5);
  else {
    e.vx *= 1 - 3 * dt;
    e.vy *= 1 - 3 * dt;
  }
  e.burstTimer -= dt;
  if (e.burstTimer <= 0) {
    e.burstTimer = def.burstInterval * (enraged ? 0.65 : 1);
    const count = enraged ? 13 : 9;
    const offset = world.rng.angle();
    for (let i = 0; i < count; i++) {
      const a = offset + (i / count) * Math.PI * 2;
      world.orbs.push({ x: e.x, y: e.y, vx: Math.cos(a) * 165, vy: Math.sin(a) * 165, radius: 8, life: 7 });
    }
    ring(world, e.x, e.y, { radius: 90, color: COLORS.eye, life: 0.5, width: 5 });
    audio.sfx.spit();
    shake(world, 4);
  }
  e.summonTimer -= dt;
  if (e.summonTimer <= 0) {
    e.summonTimer = def.summonInterval;
    for (let i = 0; i < 4; i++) {
      const a = world.rng.angle();
      spawnEnemy(world, 'moth', e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60);
    }
    burst(world, e.x, e.y, { count: 24, color: COLORS.violet, speed: 200, life: 0.6, size: 3.5 });
  }
}

function separate(list) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = (a.radius + b.radius) * 0.85;
      const d2 = dx * dx + dy * dy;
      if (d2 < min * min && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const push = (min - d) * 0.5;
        const nx = dx / d;
        const ny = dy / d;
        if (a.type !== 'maw') { a.x -= nx * push; a.y -= ny * push; }
        if (b.type !== 'maw') { b.x += nx * push; b.y += ny * push; }
      }
    }
  }
}

export function damageEnemy(world, e, amount, audio, angle = 0) {
  e.hp -= amount;
  e.flash = 1;
  world.stats.hits += 1;
  burst(world, e.x, e.y, { count: 4, color: COLORS.amberHot, speed: 140, life: 0.3, size: 2.2, spread: 1.2, angle });
  if (e.hp <= 0) {
    killEnemy(world, e, audio);
    return true;
  }
  audio.sfx.hit();
  return false;
}

export function killEnemy(world, e, audio) {
  const def = ENEMY_TYPES[e.type];
  const idx = world.enemies.indexOf(e);
  if (idx >= 0) world.enemies.splice(idx, 1);

  world.combo += 1;
  world.comboTimer = SCORE.comboWindow;
  world.stats.bestCombo = Math.max(world.stats.bestCombo, world.combo);
  const mult = comboMultiplier(world);
  const points = def.score * mult;
  world.score += points;
  world.kills += 1;
  floatText(world, e.x, e.y - e.radius, '+' + points, { color: mult > 1 ? COLORS.teal : COLORS.amberHot, size: 16 + Math.min(10, mult * 2) });

  const sparkCount = def.sparks;
  for (let i = 0; i < sparkCount; i++) {
    const a = world.rng.angle();
    const s = world.rng.range(40, 160);
    world.sparks.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 9, age: 0 });
  }
  burst(world, e.x, e.y, { count: 8 + Math.round(e.radius / 2), color: e.type === 'maw' ? COLORS.eye : COLORS.violet, speed: 200, life: 0.55, size: 3.5 });
  ring(world, e.x, e.y, { radius: e.radius * 2.2, color: COLORS.gloomEdge, life: 0.3, width: 3 });
  shake(world, e.type === 'maw' ? 16 : e.radius > 20 ? 7 : 2.5);
  audio.sfx.kill();

  if (e.type === 'brute') {
    for (let i = 0; i < 3; i++) {
      const a = world.rng.angle();
      const child = spawnEnemy(world, 'moth', e.x + Math.cos(a) * 16, e.y + Math.sin(a) * 16);
      child.vx = Math.cos(a) * 180;
      child.vy = Math.sin(a) * 180;
    }
  }
  if (e.type === 'maw') {
    world.orbs.length = 0;
    world.score += 500;
    showBanner(world, 'The Eclipse Maw falls', '+500', 2.4);
    world.flash = 0.6;
  }
}

export function comboMultiplier(world) {
  return 1 + Math.min(SCORE.comboCap - 1, Math.floor(world.combo / 3));
}

export function clampToArena(e) {
  e.x = Math.min(VIEW.w - ARENA_MARGIN, Math.max(ARENA_MARGIN, e.x));
  e.y = Math.min(VIEW.h - ARENA_MARGIN, Math.max(ARENA_MARGIN, e.y));
}
