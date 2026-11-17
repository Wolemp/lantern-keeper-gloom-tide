// A small seeded random source (mulberry32) and the few helpers the game needs from it.
// `?seed=N` in the address makes a run repeatable; otherwise the clock seeds it.

export function createRandom(seed) {
  let a = (seed >>> 0) || 1;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (lo, hi) => lo + next() * (hi - lo);
  return {
    next,
    range,
    int: (lo, hi) => Math.floor(range(lo, hi + 1)),
    chance: (p) => next() < p,
    pick: (list) => list[Math.floor(next() * list.length)],
    angle: () => next() * Math.PI * 2,
    shuffle(list) {
      const copy = list.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

export function seedFromAddress() {
  const raw = new URLSearchParams(location.search).get('seed');
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : Date.now();
}
