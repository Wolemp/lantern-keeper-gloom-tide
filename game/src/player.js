// The player: a small firefly spirit. Movement, aiming, shooting bolts, dashing, and the light nova.
import { ARENA_MARGIN, PLAYER, VIEW } from './config.js';
import { burst, ring, shake } from './effects.js';

export function createPlayer() {
  return {
    x: VIEW.w / 2 - 120,
    y: VIEW.h / 2 + 150,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    angle: 0,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    invuln: 0,
    speed: PLAYER.speed,
    fireInterval: PLAYER.fireInterval,
    fireTimer: 0,
    boltDamage: PLAYER.boltDamage,
    boltCount: 1,
    pierce: 0,
    bounce: 0,
    dashCooldown: PLAYER.dashCooldown,
    dashTimer: 0,
    dashLeft: 0,
    dashDir: { x: 1, y: 0 },
    dashTrail: false,
    pickupRadius: PLAYER.pickupRadius,
    novaCost: PLAYER.novaCost,
    novaPower: 1,
    charge: 0,
    wasNovaReady: false,
    auraPower: 0,
    flicker: 0,
  };
}

export function updatePlayer(world, dt, input, audio) {
  const p = world.player;
  const m = input.mouse;
  p.angle = Math.atan2(m.y - p.y, m.x - p.x);
  p.invuln = Math.max(0, p.invuln - dt);
  p.fireTimer = Math.max(0, p.fireTimer - dt);
  p.dashTimer = Math.max(0, p.dashTimer - dt);

  const axis = input.axis();
  const len = Math.hypot(axis.x, axis.y) || 1;
  let tx = (axis.x / len) * p.speed;
  let ty = (axis.y / len) * p.speed;

  if (p.dashLeft > 0) {
    p.dashLeft -= dt;
    tx = p.dashDir.x * PLAYER.dashSpeed;
    ty = p.dashDir.y * PLAYER.dashSpeed;
    p.vx = tx;
    p.vy = ty;
    if (world.rng.chance(0.8)) {
      burst(world, p.x, p.y, { count: 1, color: '#fff0b8', speed: 30, life: 0.35, size: 5 });
    }
    if (p.dashTrail) world.trail.push({ x: p.x, y: p.y, life: 1.6, max: 1.6 });
  } else {
    const follow = 1 - Math.exp(-16 * dt);
    p.vx += (tx - p.vx) * follow;
    p.vy += (ty - p.vy) * follow;
  }

  p.x = Math.min(VIEW.w - ARENA_MARGIN, Math.max(ARENA_MARGIN, p.x + p.vx * dt));
  p.y = Math.min(VIEW.h - ARENA_MARGIN, Math.max(ARENA_MARGIN, p.y + p.vy * dt));

  // The lantern is solid: the player slides around it.
  const dx = p.x - world.lantern.x;
  const dy = p.y - world.lantern.y;
  const d = Math.hypot(dx, dy);
  const minD = world.lantern.radius + p.radius * 0.6;
  if (d < minD && d > 0) {
    p.x = world.lantern.x + (dx / d) * minD;
    p.y = world.lantern.y + (dy / d) * minD;
  }

  if (input.wasTapped('Space', 'ShiftLeft', 'ShiftRight') && p.dashTimer <= 0 && p.dashLeft <= 0) {
    const useAim = axis.x === 0 && axis.y === 0;
    p.dashDir = useAim ? { x: Math.cos(p.angle), y: Math.sin(p.angle) } : { x: axis.x / len, y: axis.y / len };
    p.dashLeft = PLAYER.dashTime;
    p.dashTimer = p.dashCooldown;
    p.invuln = Math.max(p.invuln, PLAYER.dashTime + 0.12);
    audio.sfx.dash();
    ring(world, p.x, p.y, { radius: 46, color: '#fff0b8', life: 0.3, width: 3 });
  }

  if (m.down && p.fireTimer <= 0 && p.dashLeft <= 0) fireBolts(world, audio);

  const ready = p.charge >= p.novaCost;
  if (ready && !p.wasNovaReady) {
    audio.sfx.novaReady();
    world.texts.push({ x: p.x, y: p.y - 34, text: 'NOVA READY', color: '#5ff2d4', size: 20, life: 1.2, max: 1.2 });
  }
  p.wasNovaReady = ready;
  if ((m.rightClicked || input.wasTapped('KeyE', 'KeyQ')) && ready) releaseNova(world, audio);
}

function fireBolts(world, audio) {
  const p = world.player;
  p.fireTimer = p.fireInterval;
  const spread = 0.13;
  for (let i = 0; i < p.boltCount; i++) {
    const offset = (i - (p.boltCount - 1) / 2) * spread;
    const a = p.angle + offset + (world.rng.next() - 0.5) * 0.03;
    world.bolts.push({
      x: p.x + Math.cos(p.angle) * 16,
      y: p.y + Math.sin(p.angle) * 16,
      vx: Math.cos(a) * PLAYER.boltSpeed,
      vy: Math.sin(a) * PLAYER.boltSpeed,
      life: PLAYER.boltLife,
      damage: p.boltDamage,
      pierce: p.pierce,
      bounce: p.bounce,
      hit: new Set(),
    });
  }
  world.stats.shots += 1;
  audio.sfx.shoot();
  burst(world, p.x + Math.cos(p.angle) * 18, p.y + Math.sin(p.angle) * 18, { count: 2, color: '#fff0b8', speed: 90, life: 0.2, size: 2.2, spread: 0.7, angle: p.angle });
}

export function releaseNova(world, audio) {
  const p = world.player;
  p.charge = 0;
  p.wasNovaReady = false;
  const radius = PLAYER.novaRadius * (0.9 + 0.2 * p.novaPower);
  ring(world, p.x, p.y, { radius, color: '#5ff2d4', life: 0.6, width: 8 });
  ring(world, p.x, p.y, { radius: radius * 0.7, color: '#fff0b8', life: 0.45, width: 5 });
  burst(world, p.x, p.y, { count: 40, color: '#5ff2d4', speed: 420, life: 0.7, size: 4 });
  shake(world, 10);
  world.flash = 0.55;
  world.orbs.length = 0;
  world.novaBlast = { x: p.x, y: p.y, radius, damage: PLAYER.novaDamage * p.novaPower };
  p.invuln = Math.max(p.invuln, 0.5);
  audio.sfx.nova();
}

export function hurtPlayer(world, audio, amount = 1) {
  const p = world.player;
  if (p.invuln > 0 || world.mode === 'over') return false;
  p.hp -= amount;
  p.invuln = PLAYER.invulnTime;
  world.combo = 0;
  world.comboTimer = 0;
  world.flash = 0.35;
  world.stats.hurt += 1;
  shake(world, 9);
  burst(world, p.x, p.y, { count: 18, color: '#ff3d6e', speed: 260, life: 0.6, size: 3.5 });
  audio.sfx.hurt();
  return true;
}
