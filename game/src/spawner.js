// The wave director. It spends a budget on enemy kinds, spawns them from the edges in a trickle,
// and tells the game when a wave is cleared. Every fifth wave is a boss wave.
import { ENEMY_TYPES, WAVES } from './config.js';
import { edgeSpawnPoint, spawnEnemy } from './enemies.js';
import { showBanner } from './effects.js';

export function isBossWave(wave) {
  return wave > 0 && wave % WAVES.bossEvery === 0;
}

function buildQueue(world) {
  const wave = world.wave;
  const rng = world.rng;
  let budget = WAVES.baseBudget + WAVES.budgetPerWave * (wave - 1);
  if (isBossWave(wave)) budget *= 0.55;
  const kinds = Object.keys(ENEMY_TYPES).filter((k) => k !== 'maw' && ENEMY_TYPES[k].unlock <= wave);
  const queue = [];
  while (budget >= 1) {
    const affordable = kinds.filter((k) => ENEMY_TYPES[k].cost <= budget);
    if (affordable.length === 0) break;
    // Cheap enemies are common; newer kinds are weighted up so a fresh threat shows quickly.
    const weights = affordable.map((k) => (ENEMY_TYPES[k].unlock === wave ? 3.5 : 3 / ENEMY_TYPES[k].cost + 0.4));
    let roll = rng.next() * weights.reduce((a, b) => a + b, 0);
    let pick = affordable[affordable.length - 1];
    for (let i = 0; i < affordable.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        pick = affordable[i];
        break;
      }
    }
    queue.push(pick);
    budget -= ENEMY_TYPES[pick].cost;
  }
  if (isBossWave(wave)) queue.unshift('maw');
  return queue;
}

export function startWave(world, audio) {
  world.wave += 1;
  const s = world.spawner;
  s.queue = buildQueue(world);
  s.phase = 'spawning';
  s.timer = 1.2;
  s.clearTimer = 0;
  if (isBossWave(world.wave)) {
    showBanner(world, 'Wave ' + world.wave, 'The Eclipse Maw rises', 2.6);
    audio.sfx.boss();
  } else {
    const omen = isBossWave(world.wave + 1);
    showBanner(world, 'Wave ' + world.wave, world.wave === 1 ? 'Keep the lantern lit' : omen ? 'The sky is darkening. Something vast is coming' : '', omen ? 2.6 : 1.8);
    audio.sfx.waveStart();
    if (omen) audio.sfx.omen();
  }
}

// Returns true on the frame the wave is cleared.
export function updateSpawner(world, dt) {
  const s = world.spawner;
  if (s.phase === 'spawning') {
    s.timer -= dt;
    if (s.timer <= 0 && s.queue.length > 0) {
      const type = s.queue.shift();
      const pt = edgeSpawnPoint(world);
      spawnEnemy(world, type, pt.x, pt.y);
      const rush = Math.max(0.28, WAVES.spawnGap - world.wave * 0.02);
      s.timer = type === 'maw' ? 2.5 : rush * world.rng.range(0.6, 1.4);
    }
    if (s.queue.length === 0) s.phase = 'fighting';
  } else if (s.phase === 'fighting') {
    if (world.enemies.length === 0 && world.orbs.length < 1) {
      s.phase = 'cleared';
      s.clearTimer = WAVES.clearDelay;
    }
  } else if (s.phase === 'cleared') {
    s.clearTimer -= dt;
    if (s.clearTimer <= 0) {
      s.phase = 'idle';
      return true;
    }
  }
  return false;
}

export function threatLeft(world) {
  return world.spawner.queue.length + world.enemies.length;
}
