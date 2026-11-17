// Keyboard and mouse state, read once per frame by the game loop.
// `toGame` converts a window pixel position into the 1280x720 game space.

const MOVE_KEYS = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
};

const BLOCKED_DEFAULTS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

export function createInput(canvas, toGame) {
  const held = new Set();
  const tapped = new Set();
  const mouse = { x: 640, y: 200, down: false, clicked: false, rightClicked: false, moved: false };

  window.addEventListener('keydown', (e) => {
    if (BLOCKED_DEFAULTS.has(e.code)) e.preventDefault();
    if (!e.repeat) tapped.add(e.code);
    held.add(e.code);
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => {
    held.clear();
    mouse.down = false;
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = toGame(e.clientX, e.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.moved = true;
  });
  canvas.addEventListener('pointerdown', (e) => {
    const p = toGame(e.clientX, e.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    if (e.button === 2) {
      mouse.rightClicked = true;
    } else {
      mouse.down = true;
      mouse.clicked = true;
    }
  });
  window.addEventListener('pointerup', (e) => {
    if (e.button !== 2) mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const anyHeld = (codes) => codes.some((c) => held.has(c));

  return {
    mouse,
    axis() {
      const x = (anyHeld(MOVE_KEYS.right) ? 1 : 0) - (anyHeld(MOVE_KEYS.left) ? 1 : 0);
      const y = (anyHeld(MOVE_KEYS.down) ? 1 : 0) - (anyHeld(MOVE_KEYS.up) ? 1 : 0);
      return { x, y };
    },
    isHeld: (code) => held.has(code),
    wasTapped: (...codes) => codes.some((c) => tapped.has(c)),
    endFrame() {
      tapped.clear();
      mouse.clicked = false;
      mouse.rightClicked = false;
      mouse.moved = false;
    },
  };
}
