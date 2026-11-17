// The game loop and its states: title, playing, boon choice, paused and game over.
import { createAudio } from './audio.js';
import { updateCombat, totalThreat } from './combat.js';
import { LANTERN, SCORE, STORAGE_KEY, VIEW, WAVES } from './config.js';
import { floatText, updateEffects, burst } from './effects.js';
import { spawnEnemy, updateEnemies } from './enemies.js';
import { drawGameOver, drawHud, drawPause, drawTitle, drawUpgradeMenu, cardRect } from './hud.js';
import { createInput } from './input.js';
import { updatePlayer } from './player.js';
import { createRandom, seedFromAddress } from './random.js';
import { createRenderer } from './render.js';
import { isBossWave, startWave, threatLeft, updateSpawner } from './spawner.js';
import { applyUpgrade, rollChoices } from './upgrades.js';
import { createWorld } from './world.js';

function loadBest() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Storage can be blocked; the best score then lasts only for this page.
  }
}

export function createGame(canvas, statusEl) {
  const rng = createRandom(seedFromAddress());
  const audio = createAudio();
  const renderer = createRenderer();
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, ox: 0, oy: 0 };

  const toGame = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    const px = (cx - r.left) * (canvas.width / r.width);
    const py = (cy - r.top) * (canvas.height / r.height);
    return { x: (px - view.ox) / view.scale, y: (py - view.oy) / view.scale };
  };
  const input = createInput(canvas, toGame);

  const game = {
    mode: 'title',
    world: createWorld(rng),
    best: loadBest(),
    newBest: false,
    choices: [],
    hoverCard: -1,
    muted: false,
    clock: 0,
    threatLeft: () => 0,
    input,
    audio,
  };
  game.threatLeft = () => threatLeft(game.world);

  function say(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function setupTitleScene() {
    const w = createWorld(rng);
    w.wave = 1;
    for (let i = 0; i < 5; i++) spawnEnemy(w, i % 2 ? 'moth' : 'stalker', 0, 0).seed = i * 1.3;
    game.world = w;
  }

  function animateTitleScene(dt) {
    const w = game.world;
    w.enemies.forEach((e, i) => {
      const a = game.clock * (0.25 + i * 0.03) + i * 1.25;
      const r = 300 + (i % 3) * 38;
      e.x = LANTERN.x + Math.cos(a) * r * 1.35;
      e.y = LANTERN.y + Math.sin(a) * r * 0.62;
      e.vx = -Math.sin(a) * 40;
      e.vy = Math.cos(a) * 20;
      e.age += dt;
    });
    if (rng.chance(dt * 6)) burst(w, LANTERN.x + rng.range(-30, 30), LANTERN.y - 20, { count: 1, color: '#ffc15a', speed: 50, life: 1.6, size: 2.4, spread: 0.5, angle: -Math.PI / 2 });
    w.player.x = LANTERN.x - 150 + Math.sin(game.clock * 1.2) * 14;
    w.player.y = LANTERN.y + 130 + Math.cos(game.clock * 1.7) * 10;
    w.player.angle = -0.4;
    updateEffects(w, dt);
  }

  function startRun() {
    game.world = createWorld(rng);
    game.newBest = false;
    game.mode = 'playing';
    startWave(game.world, audio);
    audio.sfx.click();
    say('Wave 1 begins. Keep the lantern lit.');
  }

  function finishRun() {
    const w = game.world;
    game.mode = 'over';
    game.endedAt = game.clock;
    w.mode = 'over';
    const score = Math.floor(w.score);
    if (score > game.best) {
      game.best = score;
      game.newBest = true;
      saveBest(score);
    }
    audio.sfx.gameOver();
    say('Game over. Score ' + score + ', wave ' + w.wave + '. Press Enter to try again.');
  }

  function openChoices() {
    const w = game.world;
    const bonus = SCORE.waveBonus * w.wave;
    w.score += bonus;
    w.lantern.hp = Math.min(w.lantern.maxHp, w.lantern.hp + LANTERN.repairPerWave);
    w.player.hp = Math.min(w.player.maxHp, w.player.hp + 1);
    w.player.charge = Math.min(w.player.novaCost, w.player.charge + 6);
    floatText(w, w.lantern.x, w.lantern.y - 70, 'Wave bonus +' + bonus, { color: '#5ff2d4', size: 22, life: 1.4 });
    audio.sfx.waveClear();
    game.choices = rollChoices(w, 3);
    if (game.choices.length === 0) {
      startWave(w, audio);
      return;
    }
    game.mode = 'upgrade';
    game.hoverCard = -1;
    say('Wave cleared. Choose a boon with 1, 2 or 3.');
  }

  function pick(index) {
    const u = game.choices[index];
    if (!u) return;
    applyUpgrade(game.world, u);
    audio.sfx.pick();
    burst(game.world, game.world.player.x, game.world.player.y, { count: 30, color: '#ffc15a', speed: 260, life: 0.8, size: 4 });
    game.mode = 'playing';
    startWave(game.world, audio);
    say(u.name + ' taken. Wave ' + game.world.wave + ' begins.');
  }

  function updatePlaying(dt) {
    const w = game.world;
    w.time += dt;
    updatePlayer(w, dt, input, audio);
    updateEnemies(w, dt, audio);
    updateCombat(w, dt, audio);
    updateEffects(w, dt);
    if (updateSpawner(w, dt)) openChoices();
    if (w.lantern.hp <= 0 || w.player.hp <= 0) finishRun();
  }

  function update(dt) {
    game.clock += dt;
    const m = input.mouse;
    if (input.wasTapped('KeyM')) {
      game.muted = audio.toggleMute();
    }
    if (game.mode === 'title') {
      animateTitleScene(dt);
      if (input.wasTapped('Enter', 'Space') || m.clicked) {
        audio.unlock();
        startRun();
      }
    } else if (game.mode === 'playing') {
      if (input.wasTapped('KeyP', 'Escape')) game.mode = 'paused';
      else if (input.wasTapped('KeyR')) startRun();
      else updatePlaying(dt);
    } else if (game.mode === 'paused') {
      if (input.wasTapped('KeyP', 'Escape')) game.mode = 'playing';
      if (input.wasTapped('KeyR')) startRun();
    } else if (game.mode === 'upgrade') {
      updateEffects(game.world, dt);
      game.hoverCard = -1;
      game.choices.forEach((_, i) => {
        const r = cardRect(i, game.choices.length);
        if (m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y - 10 && m.y <= r.y + r.h) game.hoverCard = i;
      });
      if (input.wasTapped('Digit1', 'Numpad1')) pick(0);
      else if (input.wasTapped('Digit2', 'Numpad2')) pick(1);
      else if (input.wasTapped('Digit3', 'Numpad3')) pick(2);
      else if (m.clicked && game.hoverCard >= 0) pick(game.hoverCard);
    } else if (game.mode === 'over') {
      updateEffects(game.world, dt);
      if (input.wasTapped('Enter', 'KeyR') || (m.clicked && game.clock - game.endedAt > 0.8)) startRun();
    }
    const level = game.mode === 'playing' ? (game.world.enemies.some((e) => e.type === 'maw') ? 1 : Math.min(0.7, 0.15 + game.world.wave * 0.05)) : 0;
    audio.update(level);
    input.endFrame();
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(320, Math.floor(window.innerWidth * dpr));
    const h = Math.max(240, Math.floor(window.innerHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    view.scale = Math.min(w / VIEW.w, h / VIEW.h);
    view.ox = (w - VIEW.w * view.scale) / 2;
    view.oy = (h - VIEW.h * view.scale) / 2;
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05030d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, VIEW.w, VIEW.h);
    ctx.clip();
    const w = game.world;
    const showCursor = game.mode === 'playing';
    renderer.drawWorld(ctx, w, showCursor ? input : null, game.clock);
    if (game.mode === 'title') drawTitle(ctx, game, game.clock);
    else if (game.mode === 'playing') drawHud(ctx, w, game, game.clock);
    else if (game.mode === 'paused') {
      drawHud(ctx, w, game, game.clock);
      drawPause(ctx);
    } else if (game.mode === 'upgrade') {
      drawHud(ctx, w, game, game.clock);
      drawUpgradeMenu(ctx, game, w, game.clock);
    } else if (game.mode === 'over') drawGameOver(ctx, game, w, game.clock);
    ctx.restore();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    resize();
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  window.addEventListener('blur', () => {
    if (game.mode === 'playing') game.mode = 'paused';
  });

  game.step = (dt = 1 / 60, n = 1) => {
    for (let i = 0; i < n; i++) update(dt);
    resize();
    draw();
  };
  game.isBossWave = () => isBossWave(game.world.wave);
  game.threat = () => totalThreat(game.world);
  game.waves = WAVES;

  setupTitleScene();
  game.endedAt = 0;
  resize();
  say('Lantern Keeper: Gloom Tide. Press Enter to start.');
  requestAnimationFrame(frame);
  return game;
}
