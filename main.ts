// Hands in Lantern Keeper: Gloom Tide. The game is the static files in game/ (open game/index.html in a
// desktop browser, no build, no network). This program copies game/ and screenshots/ to the output
// folder and writes dossier.json, the summary the judge reads, with the kit's vendored library.
//
// Run it:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play it: node serve.ts  (then open http://localhost:8080)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyFolder(name: string): void {
  const from = join(root, name);
  const to = join(outDir, name);
  mkdirSync(to, { recursive: true });
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyFolder('game');
copyFolder('screenshots');

// The limits below are the scorer's own caps for this competition.
const limits = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, limits));
console.log('wrote ' + join(outDir, 'dossier.json'));
