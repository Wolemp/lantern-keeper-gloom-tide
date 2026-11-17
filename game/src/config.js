// Every tuning number of Lantern Keeper lives here, so balance changes touch one file.

export const VIEW = { w: 1280, h: 720 };
export const ARENA_MARGIN = 22;

export const COLORS = {
  night: '#07041a',
  nightSoft: '#130a33',
  amber: '#ffc15a',
  amberHot: '#fff0b8',
  ember: '#ff7a3d',
  teal: '#5ff2d4',
  violet: '#8a5cff',
  gloom: '#3b2070',
  gloomEdge: '#a77bff',
  eye: '#ff4fa3',
  danger: '#ff3d6e',
  text: '#f6ecff',
  dim: '#9d8cc4',
};

export const LANTERN = {
  x: VIEW.w / 2,
  y: VIEW.h / 2,
  radius: 34,
  maxHp: 24,
  lightRadius: 250,
  slowFactor: 0.62,
  repairPerWave: 8,
};

export const PLAYER = {
  radius: 12,
  speed: 270,
  maxHp: 5,
  invulnTime: 1.0,
  fireInterval: 0.24,
  boltSpeed: 760,
  boltLife: 0.85,
  boltDamage: 1,
  dashSpeed: 900,
  dashTime: 0.15,
  dashCooldown: 1.25,
  pickupRadius: 70,
  novaCost: 24,
  novaRadius: 330,
  novaDamage: 6,
};

// Gloom that haunts the arena. `cost` is what the wave director spends to spawn one.
export const ENEMY_TYPES = {
  moth: { hp: 2, speed: 100, radius: 10, cost: 1, score: 10, unlock: 1, sparks: 1 },
  stalker: { hp: 4, speed: 122, radius: 13, cost: 2, score: 20, unlock: 2, sparks: 2 },
  spitter: { hp: 4, speed: 72, radius: 14, cost: 3, score: 30, unlock: 3, sparks: 2, shotInterval: 2.2, shotSpeed: 235, keepRange: 300 },
  brute: { hp: 16, speed: 58, radius: 24, cost: 6, score: 80, unlock: 4, sparks: 5 },
  wraith: { hp: 5, speed: 90, radius: 13, cost: 4, score: 50, unlock: 6, sparks: 3, windup: 0.7, dashTime: 0.45, dashSpeed: 560 },
  maw: { hp: 52, speed: 34, radius: 48, cost: 0, score: 600, unlock: 99, sparks: 24, burstInterval: 3.2, summonInterval: 9 },
};

export const WAVES = {
  baseBudget: 7,
  budgetPerWave: 3.1,
  hpGrowth: 0.1,
  spawnGap: 0.55,
  bossEvery: 5,
  bossHpPerRound: 30,
  clearDelay: 1.4,
};

export const SCORE = {
  comboWindow: 2.6,
  comboCap: 8,
  waveBonus: 100,
};

export const STORAGE_KEY = 'lantern-keeper-gloom-tide-best';
