// All sound is synthesised with the Web Audio API: no sound files, nothing to load.
// The context starts on the first key press or click, as browsers require.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let nextNoteTime = 0;
  let step = 0;
  let intensity = 0;

  const SCALE = [0, 3, 5, 7, 10, 12, 15, 17];
  const ROOT = 110;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return false;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.22;
    musicGain.connect(master);
    nextNoteTime = ctx.currentTime + 0.1;
    return true;
  }

  function tone({ freq, to = freq, dur = 0.12, type = 'square', vol = 0.2, delay = 0, bus = master }) {
    if (!ensure()) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise({ dur = 0.15, vol = 0.2, cutoff = 1800, delay = 0 }) {
    if (!ensure()) return;
    const t = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t);
  }

  const sfx = {
    shoot: () => tone({ freq: 880, to: 520, dur: 0.07, type: 'triangle', vol: 0.09 }),
    hit: () => tone({ freq: 300, to: 180, dur: 0.05, type: 'square', vol: 0.07 }),
    kill: () => {
      noise({ dur: 0.18, vol: 0.14, cutoff: 2600 });
      tone({ freq: 220, to: 90, dur: 0.16, type: 'sawtooth', vol: 0.08 });
    },
    spark: (pitch = 0) => tone({ freq: 780 * Math.pow(1.06, pitch), to: 1500, dur: 0.07, type: 'sine', vol: 0.09 }),
    dash: () => {
      noise({ dur: 0.16, vol: 0.1, cutoff: 5200 });
      tone({ freq: 240, to: 700, dur: 0.14, type: 'sine', vol: 0.1 });
    },
    hurt: () => {
      tone({ freq: 160, to: 55, dur: 0.35, type: 'sawtooth', vol: 0.22 });
      noise({ dur: 0.25, vol: 0.18, cutoff: 900 });
    },
    lanternHit: () => tone({ freq: 110, to: 70, dur: 0.2, type: 'square', vol: 0.1 }),
    nova: () => {
      tone({ freq: 140, to: 900, dur: 0.5, type: 'sawtooth', vol: 0.16 });
      tone({ freq: 280, to: 1400, dur: 0.5, type: 'sine', vol: 0.12 });
      noise({ dur: 0.5, vol: 0.2, cutoff: 6000 });
    },
    novaReady: () => {
      tone({ freq: 660, dur: 0.12, type: 'sine', vol: 0.12 });
      tone({ freq: 990, dur: 0.2, type: 'sine', vol: 0.12, delay: 0.1 });
    },
    waveStart: () => {
      tone({ freq: 196, to: 196, dur: 0.3, type: 'triangle', vol: 0.16 });
      tone({ freq: 294, to: 294, dur: 0.4, type: 'triangle', vol: 0.14, delay: 0.14 });
    },
    waveClear: () => {
      [392, 494, 587, 784].forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.14, delay: i * 0.09 }));
    },
    pick: () => {
      [523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.14, type: 'sine', vol: 0.14, delay: i * 0.06 }));
    },
    boss: () => {
      tone({ freq: 70, to: 40, dur: 1.2, type: 'sawtooth', vol: 0.26 });
      noise({ dur: 1.0, vol: 0.2, cutoff: 700 });
    },
    spit: () => tone({ freq: 420, to: 240, dur: 0.12, type: 'sine', vol: 0.08 }),
    gameOver: () => {
      [330, 247, 196, 147].forEach((f, i) => tone({ freq: f, dur: 0.5, type: 'triangle', vol: 0.17, delay: i * 0.22 }));
    },
    click: () => tone({ freq: 600, to: 800, dur: 0.05, type: 'square', vol: 0.06 }),
  };

  // A slow minor arpeggio that grows busier with `intensity` (0 calm .. 1 boss).
  function scheduleMusic() {
    if (!ctx) return;
    while (nextNoteTime < ctx.currentTime + 0.4) {
      const bar = Math.floor(step / 8) % 4;
      const rootShift = [0, -2, -4, -5][bar];
      const degree = [0, 2, 4, 2, 5, 4, 2, 1][step % 8];
      const freq = ROOT * Math.pow(2, (SCALE[degree] + rootShift) / 12);
      const t = nextNoteTime;
      if (intensity > 0.05 || step % 2 === 0) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq * 2;
        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        osc.connect(g);
        g.connect(musicGain);
        osc.start(t);
        osc.stop(t + 0.4);
      }
      if (step % 4 === 0) {
        const bass = ctx.createOscillator();
        const g = ctx.createGain();
        bass.type = 'sine';
        bass.frequency.value = ROOT * Math.pow(2, rootShift / 12) / 2;
        g.gain.setValueAtTime(0.9, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        bass.connect(g);
        g.connect(musicGain);
        bass.start(t);
        bass.stop(t + 0.95);
      }
      step++;
      nextNoteTime += 0.26 - intensity * 0.07;
    }
  }

  return {
    sfx,
    unlock: ensure,
    update(level) {
      intensity = level;
      scheduleMusic();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.55;
      return muted;
    },
    isMuted: () => muted,
  };
}
