// The heads-up display and every full-screen menu: title, boon choice, pause and game over.
import { COLORS, VIEW } from './config.js';
import { comboMultiplier } from './enemies.js';
import { describeLevel, levelOf } from './upgrades.js';

const FONT = 'system-ui, "Segoe UI", sans-serif';

function label(ctx, text, x, y, { size = 16, color = COLORS.text, align = 'left', weight = 700, shadow = true } = {}) {
  ctx.font = weight + ' ' + size + 'px ' + FONT;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (shadow) {
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(5,3,16,0.85)';
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function bar(ctx, x, y, w, h, ratio, fill, back = 'rgba(5,3,16,0.7)') {
  ctx.fillStyle = back;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  const fw = Math.max(0, Math.min(1, ratio)) * (w - 4);
  if (fw > 0) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, Math.max(h - 4, fw), h - 4, (h - 4) / 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(246,236,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.stroke();
}

function heart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 20, size / 20);
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.bezierCurveTo(-14, -2, -8, -12, 0, -5);
  ctx.bezierCurveTo(8, -12, 14, -2, 0, 7);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = COLORS.danger;
    ctx.shadowColor = COLORS.danger;
    ctx.shadowBlur = 10;
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(255,61,110,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawHud(ctx, world, game, t) {
  const p = world.player;
  const l = world.lantern;
  const lr = l.hp / l.maxHp;

  label(ctx, 'LANTERN', 28, 34, { size: 14, color: COLORS.amber });
  bar(ctx, 28, 42, 300, 18, lr, lr > 0.4 ? COLORS.amber : lr > 0.2 ? COLORS.ember : COLORS.danger);
  label(ctx, Math.ceil(l.hp) + ' / ' + l.maxHp, 322, 34, { size: 13, align: 'right', color: COLORS.dim });
  if (lr < 0.3 && Math.floor(t * 4) % 2 === 0) label(ctx, 'THE FLAME IS FADING', 28, 82, { size: 14, color: COLORS.danger });

  for (let i = 0; i < p.maxHp; i++) heart(ctx, 42 + i * 30, 102, 22, i < p.hp);

  label(ctx, 'WAVE ' + world.wave, VIEW.w / 2, 38, { size: 26, align: 'center', color: COLORS.amberHot, weight: 800 });
  const left = game.threatLeft();
  label(ctx, left > 0 ? left + ' gloom left' : 'Clear!', VIEW.w / 2, 60, { size: 14, align: 'center', color: COLORS.dim });

  const boss = world.enemies.find((e) => e.type === 'maw');
  if (boss) {
    label(ctx, 'THE ECLIPSE MAW', VIEW.w / 2, 86, { size: 13, align: 'center', color: COLORS.eye });
    bar(ctx, VIEW.w / 2 - 190, 92, 380, 14, boss.hp / boss.maxHp, COLORS.eye);
  }

  label(ctx, String(Math.floor(world.score)).padStart(6, '0'), VIEW.w - 28, 40, { size: 34, align: 'right', weight: 800, color: COLORS.text });
  label(ctx, 'BEST ' + Math.max(game.best, Math.floor(world.score)), VIEW.w - 28, 62, { size: 14, align: 'right', color: COLORS.dim });
  if (world.combo > 1) {
    const mult = comboMultiplier(world);
    const pulse = 1 + Math.max(0, world.comboTimer - 2.3) * 0.5;
    label(ctx, 'COMBO ' + world.combo, VIEW.w - 28, 90, { size: 16 * pulse, align: 'right', color: COLORS.teal });
    label(ctx, 'x' + mult + ' score', VIEW.w - 28, 110, { size: 14, align: 'right', color: mult > 1 ? COLORS.teal : COLORS.dim });
    bar(ctx, VIEW.w - 168, 118, 140, 7, world.comboTimer / 2.6, COLORS.teal);
  }

  // Dash and nova read-outs, bottom left.
  const dashReady = p.dashTimer <= 0;
  label(ctx, 'DASH  [Space]', 28, VIEW.h - 58, { size: 13, color: dashReady ? COLORS.amberHot : COLORS.dim });
  bar(ctx, 28, VIEW.h - 50, 170, 10, dashReady ? 1 : 1 - p.dashTimer / p.dashCooldown, dashReady ? COLORS.amberHot : COLORS.dim);
  const nr = Math.min(1, p.charge / p.novaCost);
  label(ctx, nr >= 1 ? 'NOVA READY  [E / right click]' : 'NOVA  ' + p.charge + '/' + p.novaCost + ' sparks', 28, VIEW.h - 26, { size: 13, color: nr >= 1 ? COLORS.teal : COLORS.dim });
  bar(ctx, 28, VIEW.h - 18, 170, 10, nr, nr >= 1 && Math.floor(t * 6) % 2 === 0 ? '#e8fffa' : COLORS.teal);

  if (world.wave <= 1 && world.time < 14) {
    ctx.globalAlpha = Math.min(1, (14 - world.time) / 2);
    label(ctx, 'WASD move   |   Mouse aim + hold click to shoot   |   Space dash   |   Right click nova', VIEW.w / 2, VIEW.h - 22, { size: 15, align: 'center', color: COLORS.amberHot });
    ctx.globalAlpha = 1;
  }

  if (world.banner) {
    const b = world.banner;
    const k = b.life / b.max;
    ctx.globalAlpha = Math.min(1, k * 3, (1 - k) * 6 + 0.2);
    label(ctx, b.title, VIEW.w / 2, VIEW.h / 2 - 150, { size: 54, align: 'center', color: COLORS.amberHot, weight: 800 });
    if (b.subtitle) label(ctx, b.subtitle, VIEW.w / 2, VIEW.h / 2 - 112, { size: 22, align: 'center', color: COLORS.text });
    ctx.globalAlpha = 1;
  }
  if (game.muted) label(ctx, 'MUTED', VIEW.w - 28, VIEW.h - 22, { size: 13, align: 'right', color: COLORS.dim });
}

function dim(ctx, alpha) {
  ctx.fillStyle = 'rgba(5,3,16,' + alpha + ')';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
}

function button(ctx, text, cx, cy, w, h, t) {
  const glow = 0.5 + 0.5 * Math.sin(t * 4);
  ctx.save();
  ctx.shadowColor = COLORS.amber;
  ctx.shadowBlur = 12 + glow * 14;
  ctx.fillStyle = 'rgba(255,193,90,0.16)';
  ctx.strokeStyle = COLORS.amber;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 14);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  label(ctx, text, cx, cy + 8, { size: 24, align: 'center', color: COLORS.amberHot, weight: 800 });
}

export function drawTitle(ctx, game, t) {
  dim(ctx, 0.45);
  label(ctx, 'LANTERN KEEPER', VIEW.w / 2, 156, { size: 84, align: 'center', color: COLORS.amberHot, weight: 900 });
  label(ctx, 'G L O O M   T I D E', VIEW.w / 2, 208, { size: 30, align: 'center', color: COLORS.teal, weight: 800 });
  label(ctx, 'Night falls. Gloom crawls toward the last lantern. Keep it burning.', VIEW.w / 2, 252, { size: 20, align: 'center', color: COLORS.text, weight: 500 });

  const rows = [
    ['WASD / arrows', 'move'],
    ['Mouse', 'aim, hold left click to shoot'],
    ['Space', 'dash (you cannot be hurt mid-dash)'],
    ['E / right click', 'light nova, charged by collecting sparks'],
    ['P / Esc  |  M', 'pause  |  mute'],
  ];
  rows.forEach((r, i) => {
    label(ctx, r[0], VIEW.w / 2 - 20, 332 + i * 34, { size: 19, align: 'right', color: COLORS.amber });
    label(ctx, r[1], VIEW.w / 2 + 4, 332 + i * 34, { size: 19, align: 'left', color: COLORS.text, weight: 500 });
  });
  button(ctx, 'LIGHT THE LANTERN  (Enter)', VIEW.w / 2, 560, 440, 64, t);
  if (game.best > 0) label(ctx, 'Best score ' + game.best, VIEW.w / 2, 640, { size: 20, align: 'center', color: COLORS.dim });
}

export function drawPause(ctx) {
  dim(ctx, 0.6);
  label(ctx, 'PAUSED', VIEW.w / 2, VIEW.h / 2 - 10, { size: 64, align: 'center', color: COLORS.amberHot, weight: 800 });
  label(ctx, 'P or Esc to continue   |   R to restart', VIEW.w / 2, VIEW.h / 2 + 34, { size: 20, align: 'center', color: COLORS.text, weight: 500 });
}

export const CARD = { w: 300, h: 330, gap: 36, y: 250 };

export function cardRect(index, count) {
  const total = count * CARD.w + (count - 1) * CARD.gap;
  return { x: (VIEW.w - total) / 2 + index * (CARD.w + CARD.gap), y: CARD.y, w: CARD.w, h: CARD.h };
}

function drawIcon(ctx, name, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = COLORS.amberHot;
  ctx.fillStyle = COLORS.amber;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const dot = (x, y, r = 6) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  const line = (x1, y1, x2, y2) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  if (name === 'twin') {
    line(-s, 0, s, -s * 0.5);
    line(-s, 0, s, 0);
    line(-s, 0, s, s * 0.5);
    dot(-s, 0, 8);
  } else if (name === 'speed') {
    line(-s, -s * 0.5, s, -s * 0.5);
    line(-s * 0.6, 0, s, 0);
    line(-s, s * 0.5, s, s * 0.5);
  } else if (name === 'power') {
    dot(0, 0, s * 0.75);
    ctx.fillStyle = '#fff';
    dot(0, 0, s * 0.35);
  } else if (name === 'pierce') {
    line(-s, 0, s, 0);
    ctx.beginPath();
    ctx.arc(-s * 0.2, 0, s * 0.5, -1, 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s * 0.4, 0, s * 0.5, -1, 1);
    ctx.stroke();
  } else if (name === 'bounce') {
    ctx.beginPath();
    ctx.moveTo(-s, s * 0.6);
    ctx.lineTo(-s * 0.2, -s * 0.5);
    ctx.lineTo(s * 0.5, s * 0.6);
    ctx.lineTo(s, -s * 0.2);
    ctx.stroke();
  } else if (name === 'boots') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s);
    ctx.lineTo(-s * 0.5, s * 0.3);
    ctx.lineTo(s, s * 0.3);
    ctx.lineTo(s, s * 0.8);
    ctx.lineTo(-s * 0.5, s * 0.8);
    ctx.stroke();
  } else if (name === 'dash') {
    dot(s * 0.6, 0, 8);
    ctx.globalAlpha = 0.6;
    dot(0, 0, 6);
    ctx.globalAlpha = 0.3;
    dot(-s * 0.6, 0, 5);
  } else if (name === 'oil') {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s, 0, s * 0.7, s, 0, s);
    ctx.bezierCurveTo(-s * 0.7, s, -s, 0, 0, -s);
    ctx.fill();
  } else if (name === 'heart') {
    heart(ctx, 0, 0, s * 2.4, true);
  } else if (name === 'aura') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s);
    ctx.lineTo(s * 0.3, -s * 0.1);
    ctx.lineTo(-s * 0.2, s * 0.1);
    ctx.lineTo(s * 0.3, s);
    ctx.stroke();
  } else if (name === 'sun') {
    dot(0, 0, s * 0.4);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      line(Math.cos(a) * s * 0.65, Math.sin(a) * s * 0.65, Math.cos(a) * s, Math.sin(a) * s);
    }
  } else if (name === 'magnet') {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.7, Math.PI, 0);
    ctx.lineTo(s * 0.7, s * 0.6);
    ctx.moveTo(-s * 0.7, 0);
    ctx.lineTo(-s * 0.7, s * 0.6);
    ctx.stroke();
  } else if (name === 'nova') {
    ctx.strokeStyle = COLORS.teal;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawUpgradeMenu(ctx, game, world, t) {
  dim(ctx, 0.62);
  label(ctx, 'WAVE ' + world.wave + ' CLEARED', VIEW.w / 2, 120, { size: 22, align: 'center', color: COLORS.teal, weight: 800 });
  label(ctx, 'Choose a boon', VIEW.w / 2, 178, { size: 52, align: 'center', color: COLORS.amberHot, weight: 900 });
  label(ctx, 'The lantern is repaired a little. Press 1, 2 or 3, or click a card.', VIEW.w / 2, 214, { size: 17, align: 'center', color: COLORS.dim, weight: 500 });

  game.choices.forEach((u, i) => {
    const r = cardRect(i, game.choices.length);
    const hot = game.hoverCard === i;
    const lift = hot ? -10 : 0;
    ctx.save();
    ctx.translate(0, lift);
    ctx.shadowColor = hot ? COLORS.amber : 'rgba(138,92,255,0.6)';
    ctx.shadowBlur = hot ? 30 : 14;
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, hot ? '#3a2370' : '#2a1858');
    g.addColorStop(1, '#150a34');
    ctx.fillStyle = g;
    ctx.strokeStyle = hot ? COLORS.amber : COLORS.gloomEdge;
    ctx.lineWidth = hot ? 4 : 2.5;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 18);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(0, lift);
    label(ctx, '[' + (i + 1) + ']', r.x + 18, r.y + 34, { size: 18, color: COLORS.dim });
    drawIcon(ctx, u.icon, r.x + r.w / 2, r.y + 96, 30);
    label(ctx, u.name, r.x + r.w / 2, r.y + 176, { size: 26, align: 'center', color: COLORS.amberHot, weight: 800 });
    const lvl = levelOf(world, u.id);
    for (let k = 0; k < u.max; k++) {
      ctx.fillStyle = k < lvl ? COLORS.amber : k === lvl ? COLORS.teal : 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2 + (k - (u.max - 1) / 2) * 20, r.y + 198, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    wrapText(ctx, describeLevel(u, world), r.x + r.w / 2, r.y + 240, r.w - 44, 24);
    ctx.restore();
  });
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  ctx.font = '500 17px ' + FONT;
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      label(ctx, line, cx, yy, { size: 17, align: 'center', color: COLORS.text, weight: 500, shadow: false });
      line = w;
      yy += lineH;
    } else line = test;
  }
  if (line) label(ctx, line, cx, yy, { size: 17, align: 'center', color: COLORS.text, weight: 500, shadow: false });
}

export function drawGameOver(ctx, game, world, t) {
  dim(ctx, 0.7);
  const reason = world.lantern.hp <= 0 ? 'THE LANTERN WENT OUT' : 'YOUR LIGHT FADED';
  label(ctx, reason, VIEW.w / 2, 168, { size: 62, align: 'center', color: COLORS.danger, weight: 900 });
  label(ctx, 'You held the dark back until wave ' + world.wave + '.', VIEW.w / 2, 210, { size: 22, align: 'center', color: COLORS.text, weight: 500 });
  const score = Math.floor(world.score);
  label(ctx, String(score), VIEW.w / 2, 306, { size: 88, align: 'center', color: COLORS.amberHot, weight: 900 });
  label(ctx, game.newBest ? 'NEW BEST SCORE!' : 'Best ' + game.best, VIEW.w / 2, 340, { size: 22, align: 'center', color: game.newBest ? COLORS.teal : COLORS.dim, weight: 800 });
  const acc = world.stats.shots ? Math.round((world.stats.hits / world.stats.shots) * 100) : 0;
  const rows = [
    ['Gloom banished', world.kills],
    ['Best combo', world.stats.bestCombo],
    ['Boons taken', Object.values(world.taken).reduce((a, b) => a + b, 0)],
    ['Hits taken', world.stats.hurt],
    ['Aim', acc + '%'],
  ];
  rows.forEach((r, i) => {
    const x = VIEW.w / 2 - 330 + i * 165;
    label(ctx, String(r[1]), x + 82, 420, { size: 34, align: 'center', color: COLORS.text, weight: 800 });
    label(ctx, r[0], x + 82, 446, { size: 14, align: 'center', color: COLORS.dim, weight: 500 });
  });
  button(ctx, 'TRY AGAIN  (Enter)', VIEW.w / 2, 560, 380, 64, t);
  label(ctx, 'Wave 5 and every fifth wave after it brings the Eclipse Maw.', VIEW.w / 2, 640, { size: 16, align: 'center', color: COLORS.dim, weight: 500 });
}
