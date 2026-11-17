// Draws the world: the night ground, the lantern, the player, gloom, bolts, sparks and effects.
// A darkness layer covers the arena and light is cut out of it around the lantern, player, bolts and sparks.
import { ARENA_MARGIN, COLORS, VIEW } from './config.js';
import { drawEnemyBody, drawEnemyEyes } from './enemyart.js';

export function createRenderer() {
  const dark = document.createElement('canvas');
  dark.width = VIEW.w;
  dark.height = VIEW.h;
  const dctx = dark.getContext('2d');
  const specks = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 150; i++) specks.push({ x: rnd() * VIEW.w, y: rnd() * VIEW.h, r: 0.6 + rnd() * 1.6, tw: rnd() * 6 });

  function drawGround(ctx, t) {
    const g = ctx.createRadialGradient(VIEW.w / 2, VIEW.h / 2, 60, VIEW.w / 2, VIEW.h / 2, 760);
    g.addColorStop(0, '#34206a');
    g.addColorStop(1, COLORS.night);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    for (const s of specks) {
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(t * 1.5 + s.tw);
      ctx.fillStyle = '#b9a6ff';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(138,92,255,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(ARENA_MARGIN - 8, ARENA_MARGIN - 8, VIEW.w - ARENA_MARGIN * 2 + 16, VIEW.h - ARENA_MARGIN * 2 + 16, 26);
    ctx.stroke();
  }

  function drawLightPool(ctx, world, t) {
    const l = world.lantern;
    const flicker = 1 + Math.sin(t * 9) * 0.012 + Math.sin(t * 23) * 0.008;
    const r = l.lightRadius * flicker;
    const g = ctx.createRadialGradient(l.x, l.y, 10, l.x, l.y, r);
    g.addColorStop(0, 'rgba(255,193,90,0.30)');
    g.addColorStop(0.6, 'rgba(255,140,60,0.10)');
    g.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l.x, l.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(t * 0.12);
    ctx.strokeStyle = 'rgba(255,193,90,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 14]);
    ctx.beginPath();
    ctx.arc(0, 0, l.lightRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawLantern(ctx, world, t) {
    const l = world.lantern;
    const ratio = l.hp / l.maxHp;
    ctx.save();
    ctx.translate(l.x, l.y);
    const base = ctx.createRadialGradient(0, 4, 4, 0, 4, l.radius + 6);
    base.addColorStop(0, '#5a4a86');
    base.addColorStop(1, '#241649');
    ctx.fillStyle = base;
    ctx.strokeStyle = l.flash > 0 ? '#ffffff' : '#8a7bd0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 4, l.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t * 0.2;
      ctx.fillStyle = 'rgba(255,193,90,' + (0.3 + 0.7 * ratio) + ')';
      ctx.fillRect(Math.cos(a) * (l.radius - 7) - 2, 4 + Math.sin(a) * (l.radius - 7) - 2, 4, 4);
    }
    // The flame shrinks and reddens as the lantern is drained.
    const size = 0.45 + 0.75 * ratio;
    const sway = Math.sin(t * 8) * 2;
    const hot = ratio > 0.4 ? '#fff0b8' : '#ffd0a0';
    const outer = ratio > 0.4 ? COLORS.amber : ratio > 0.2 ? COLORS.ember : COLORS.danger;
    ctx.shadowColor = outer;
    ctx.shadowBlur = 26;
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.moveTo(0, 22 * size);
    ctx.bezierCurveTo(-24 * size, 6 * size, -10 * size, -14 * size, sway, -34 * size);
    ctx.bezierCurveTo(10 * size, -14 * size, 24 * size, 6 * size, 0, 22 * size);
    ctx.fill();
    ctx.fillStyle = hot;
    ctx.beginPath();
    ctx.moveTo(0, 18 * size);
    ctx.bezierCurveTo(-12 * size, 6 * size, -5 * size, -6 * size, sway * 0.6, -18 * size);
    ctx.bezierCurveTo(5 * size, -6 * size, 12 * size, 6 * size, 0, 18 * size);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer(ctx, world, t) {
    const p = world.player;
    const blink = p.invuln > 0 && Math.floor(t * 18) % 2 === 0 && p.dashLeft <= 0;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (blink) ctx.globalAlpha = 0.35;
    const flap = Math.sin(t * 40) * 0.5;
    ctx.rotate(p.angle);
    ctx.fillStyle = 'rgba(180,255,240,0.55)';
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(1, side);
      ctx.rotate(0.9 + flap * 0.4);
      ctx.beginPath();
      ctx.ellipse(-8, 6, 13, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowColor = COLORS.amber;
    ctx.shadowBlur = 24;
    ctx.fillStyle = COLORS.amberHot;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8f3d';
    ctx.beginPath();
    ctx.arc(-4, 0, p.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#3a1d57';
    ctx.beginPath();
    ctx.arc(5, -3, 1.8, 0, Math.PI * 2);
    ctx.arc(5, 3, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.amberHot;
    ctx.fillRect(14, -2, 8, 4);
    ctx.restore();

    // Nova charge ring, filling as sparks are collected.
    const charge = Math.min(1, p.charge / p.novaCost);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(95,242,212,0.18)';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = charge >= 1 ? '#c8fff3' : COLORS.teal;
    ctx.shadowColor = COLORS.teal;
    ctx.shadowBlur = charge >= 1 ? 18 : 6;
    ctx.beginPath();
    ctx.arc(0, 0, 24, -Math.PI / 2, -Math.PI / 2 + charge * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawBolts(ctx, world) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of world.bolts) {
      const a = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(a);
      const g = ctx.createLinearGradient(-26, 0, 8, 0);
      g.addColorStop(0, 'rgba(255,193,90,0)');
      g.addColorStop(1, 'rgba(255,240,184,1)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(-8, 0, 18, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(4, 0, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawSparksAndOrbs(ctx, world, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of world.sparks) {
      const fade = s.life < 2 ? (Math.sin(t * 30) > 0 ? 1 : 0.3) : 1;
      ctx.globalAlpha = fade;
      ctx.fillStyle = COLORS.teal;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4.2 + Math.sin(t * 8 + s.x) * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8fffa';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const o of world.orbs) {
      const g = ctx.createRadialGradient(o.x, o.y, 1, o.x, o.y, o.radius * 2.4);
      g.addColorStop(0, '#ffe0f4');
      g.addColorStop(0.35, COLORS.eye);
      g.addColorStop(1, 'rgba(255,79,163,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTrail(ctx, world) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const t of world.trail) {
      const k = t.life / t.max;
      const g = ctx.createRadialGradient(t.x, t.y, 1, t.x, t.y, 18);
      g.addColorStop(0, 'rgba(255,190,90,' + 0.55 * k + ')');
      g.addColorStop(1, 'rgba(255,100,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function applyDarkness(ctx, world, t) {
    const l = world.lantern;
    const p = world.player;
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, VIEW.w, VIEW.h);
    dctx.fillStyle = 'rgba(8,4,24,0.6)';
    dctx.fillRect(0, 0, VIEW.w, VIEW.h);
    dctx.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => {
      const g = dctx.createRadialGradient(x, y, r * 0.1, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,' + a + ')');
      g.addColorStop(0.55, 'rgba(0,0,0,' + a * 0.6 + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g;
      dctx.beginPath();
      dctx.arc(x, y, r, 0, Math.PI * 2);
      dctx.fill();
    };
    const flicker = 1 + Math.sin(t * 9) * 0.015 + Math.sin(t * 23) * 0.01;
    hole(l.x, l.y, l.lightRadius * 1.25 * flicker, 1);
    hole(p.x, p.y, 200, 0.9);
    for (const b of world.bolts) hole(b.x, b.y, 52, 0.7);
    for (const s of world.sparks) hole(s.x, s.y, 36, 0.6);
    for (const o of world.orbs) hole(o.x, o.y, 44, 0.5);
    for (const r of world.rings) hole(r.x, r.y, r.radius * 0.8, 0.5 * (r.life / r.max));
    ctx.drawImage(dark, 0, 0);
  }

  function drawEffects(ctx, world) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of world.particles) {
      const k = Math.max(0, p.life / p.max);
      ctx.globalAlpha = k;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * k), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const r of world.rings) {
      const k = 1 - r.life / r.max;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - k * 0.6);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius * (0.15 + 0.85 * Math.sqrt(k)), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const z of world.zaps) {
      ctx.strokeStyle = '#fff0b8';
      ctx.shadowColor = COLORS.amber;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(z.x1, z.y1);
      const mx = (z.x1 + z.x2) / 2 + Math.sin(z.life * 90) * 14;
      const my = (z.y1 + z.y2) / 2 + Math.cos(z.life * 70) * 14;
      ctx.lineTo(mx, my);
      ctx.lineTo(z.x2, z.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTexts(ctx, world) {
    ctx.textAlign = 'center';
    for (const t of world.texts) {
      ctx.globalAlpha = Math.min(1, t.life / (t.max * 0.5));
      ctx.font = '800 ' + t.size + 'px system-ui, sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(5,3,16,0.8)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawWorld(ctx, world, input, t) {
    ctx.save();
    if (world.shake > 0) ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
    drawGround(ctx, t);
    drawLightPool(ctx, world, t);
    drawTrail(ctx, world);
    drawSparksAndOrbs(ctx, world, t);
    for (const e of world.enemies) drawEnemyBody(ctx, e, world.player);
    drawLantern(ctx, world, t);
    drawPlayer(ctx, world, t);
    drawBolts(ctx, world);
    applyDarkness(ctx, world, t);
    for (const e of world.enemies) drawEnemyEyes(ctx, e, world.player);
    drawSparksAndOrbs(ctx, { sparks: world.sparks, orbs: world.orbs }, t);
    drawEffects(ctx, world);
    drawTexts(ctx, world);
    if (input) drawCrosshair(ctx, input.mouse, world.player, t);
    if (world.flash > 0) {
      ctx.fillStyle = 'rgba(255,240,220,' + Math.min(0.6, world.flash) + ')';
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    }
    ctx.restore();
  }

  function drawCrosshair(ctx, m, p, t) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.strokeStyle = 'rgba(255,240,184,0.9)';
    ctx.lineWidth = 2;
    ctx.rotate(t * 0.8);
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.moveTo(Math.cos(a) * 13, Math.sin(a) * 13);
      ctx.lineTo(Math.cos(a) * 19, Math.sin(a) * 19);
    }
    ctx.stroke();
    ctx.restore();
  }

  return { drawWorld, drawGround };
}
