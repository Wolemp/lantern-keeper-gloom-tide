// How each kind of gloom looks. Bodies are drawn under the darkness layer, eyes on top of it,
// so a gloom far from any light is only a pair of glowing eyes.
import { COLORS } from './config.js';

function facing(e, player) {
  if (e.type === 'stalker' || e.type === 'spitter') return Math.atan2(player.y - e.y, player.x - e.x);
  const speed = Math.hypot(e.vx, e.vy);
  return speed > 8 ? Math.atan2(e.vy, e.vx) : 0;
}

function bodyPaint(ctx, e) {
  ctx.fillStyle = e.flash > 0 ? '#fff4ff' : COLORS.gloom;
  ctx.strokeStyle = e.flash > 0 ? '#ffffff' : COLORS.gloomEdge;
  ctx.lineWidth = 2;
}

export function drawEnemyBody(ctx, e, player) {
  const a = facing(e, player);
  ctx.save();
  ctx.translate(e.x, e.y);
  bodyPaint(ctx, e);
  if (e.type === 'moth') {
    const flap = Math.sin(e.age * 32 + e.seed) * 0.6;
    ctx.rotate(a);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(1, side);
      ctx.rotate(0.5 + flap * 0.4);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-6, 15, -16, 17);
      ctx.quadraticCurveTo(-12, 6, 0, 0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (e.type === 'stalker') {
    const spikes = 9;
    ctx.rotate(e.age * 0.8);
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? e.radius + 4 : e.radius - 3;
      const ang = (i / (spikes * 2)) * Math.PI * 2;
      ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (e.type === 'spitter') {
    const bob = Math.sin(e.age * 4 + e.seed) * 2;
    ctx.translate(0, bob);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 7, 4);
      ctx.quadraticCurveTo(i * 10 + Math.sin(e.age * 5 + i) * 4, 16, i * 6, 24);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (e.type === 'brute') {
    ctx.rotate(a * 0.15);
    ctx.beginPath();
    ctx.roundRect(-e.radius, -e.radius * 0.85, e.radius * 2, e.radius * 1.7, 10);
    ctx.fill();
    ctx.stroke();
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * e.radius * 0.5, -e.radius * 0.8);
      ctx.lineTo(side * e.radius * 0.95, -e.radius * 1.4);
      ctx.lineTo(side * e.radius * 0.8, -e.radius * 0.6);
      ctx.fill();
      ctx.stroke();
    }
  } else if (e.type === 'wraith') {
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -e.radius * 1.4);
    ctx.quadraticCurveTo(e.radius, -e.radius * 0.2, e.radius * 0.8, e.radius * 1.5);
    ctx.lineTo(e.radius * 0.3, e.radius * 1.1);
    ctx.lineTo(0, e.radius * 1.6);
    ctx.lineTo(-e.radius * 0.3, e.radius * 1.1);
    ctx.lineTo(-e.radius * 0.8, e.radius * 1.5);
    ctx.quadraticCurveTo(-e.radius, -e.radius * 0.2, 0, -e.radius * 1.4);
    ctx.fill();
    ctx.stroke();
  } else if (e.type === 'maw') {
    const pulse = 1 + Math.sin(e.age * 2) * 0.03;
    ctx.scale(pulse, pulse);
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fillStyle = e.flash > 0 ? '#fff4ff' : '#0d0620';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = e.flash > 0 ? '#ffffff' : COLORS.violet;
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + e.age * 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * e.radius, Math.sin(ang) * e.radius);
      ctx.lineTo(Math.cos(ang) * (e.radius + 14 + Math.sin(e.age * 3 + i) * 5), Math.sin(ang) * (e.radius + 14 + Math.sin(e.age * 3 + i) * 5));
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawEnemyEyes(ctx, e, player) {
  const a = facing(e, player);
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = e.type === 'maw' ? '#ffb0d8' : COLORS.eye;
  ctx.shadowColor = COLORS.eye;
  ctx.shadowBlur = e.type === 'maw' ? 30 : 10;
  const eye = (x, y, rw, rh) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  const fx = Math.cos(a);
  const fy = Math.sin(a);
  const px = -fy;
  const py = fx;
  if (e.type === 'moth') {
    eye(fx * 5 + px * 3, fy * 5 + py * 3, 2, 2);
    eye(fx * 5 - px * 3, fy * 5 - py * 3, 2, 2);
  } else if (e.type === 'stalker') {
    eye(fx * 4 + px * 5, fy * 4 + py * 5, 3.2, 2);
    eye(fx * 4 - px * 5, fy * 4 - py * 5, 3.2, 2);
  } else if (e.type === 'spitter') {
    eye(fx * 4, fy * 4 - 4, 5, 5);
    ctx.fillStyle = '#ffd0f0';
    eye(fx * 4, fy * 4 - 4, 1.8, 1.8);
  } else if (e.type === 'brute') {
    eye(-9, -4, 4, 3);
    eye(9, -4, 4, 3);
  } else if (e.type === 'wraith') {
    eye(-5, -e.radius * 0.5, 2.6, 1.6);
    eye(5, -e.radius * 0.5, 2.6, 1.6);
  } else if (e.type === 'maw') {
    eye(0, 0, 18, 12);
    ctx.fillStyle = '#220018';
    eye(Math.cos(a) * 5, Math.sin(a) * 4, 6, 9);
  }
  ctx.restore();

  if (e.type === 'wraith' && e.state === 'windup') {
    ctx.save();
    ctx.strokeStyle = e.locked ? 'rgba(255,240,240,0.95)' : 'rgba(255,61,110,' + (0.35 + 0.4 * Math.sin(e.timer * 40)) + ')';
    ctx.lineWidth = e.locked ? 5 : 3;
    ctx.setLineDash(e.locked ? [] : [10, 8]);
    ctx.beginPath();
    ctx.moveTo(e.x, e.y);
    const dx = e.aim.x - e.x;
    const dy = e.aim.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    ctx.lineTo(e.x + (dx / d) * 360, e.y + (dy / d) * 360);
    ctx.stroke();
    ctx.restore();
  }
}
