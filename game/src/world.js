// The state of one run: the lantern, the player, every entity list, score and the wave counter.
import { LANTERN } from './config.js';
import { createPlayer } from './player.js';

export function createWorld(rng) {
  return {
    rng,
    mode: 'playing',
    time: 0,
    wave: 0,
    player: createPlayer(),
    lantern: {
      x: LANTERN.x,
      y: LANTERN.y,
      radius: LANTERN.radius,
      hp: LANTERN.maxHp,
      maxHp: LANTERN.maxHp,
      lightRadius: LANTERN.lightRadius,
      slowFactor: LANTERN.slowFactor,
      flash: 0,
    },
    enemies: [],
    bolts: [],
    orbs: [],
    sparks: [],
    particles: [],
    rings: [],
    texts: [],
    zaps: [],
    trail: [],
    novaBlast: null,
    banner: null,
    score: 0,
    kills: 0,
    combo: 0,
    comboTimer: 0,
    sparkStreak: 0,
    sparkStreakTimer: 0,
    lanternSound: 0,
    auraTimer: 0,
    shake: 0,
    flash: 0,
    taken: {},
    spawner: { phase: 'idle', queue: [], timer: 0, clearTimer: 0 },
    stats: { shots: 0, hits: 0, hurt: 0, bestCombo: 0 },
  };
}
