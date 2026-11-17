// Entry point: find the canvas, start the game, and leave a handle on the page for inspection.
import { createGame } from './game.js';

const canvas = document.getElementById('stage');
const status = document.getElementById('status');
window.lanternKeeper = createGame(canvas, status);
