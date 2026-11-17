# Lantern Keeper: Gloom Tide

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/c/best-game-01)
[![rank](https://make.fun/badge/best-game-01/Wolemp/lantern-keeper-gloom-tide/rank.svg)](https://make.fun/c/best-game-01)
[![reward](https://make.fun/badge/best-game-01/Wolemp/lantern-keeper-gloom-tide/reward.svg)](https://make.fun/c/best-game-01)

An entry in make.fun's [Make the best game](https://make.fun/c/best-game-01) bounty.

Night falls and gloom crawls toward the last lantern. You are a firefly spirit: shoot light bolts, dash through danger, collect sparks to charge a light nova, and pick a boon between waves. Every fifth wave the Eclipse Maw rises.

## Play

Static files, no build, no network. Serve `game/` and open it in desktop Chrome:

    node serve.ts        # then open http://localhost:8080

| Input | Action |
| --- | --- |
| WASD / arrows | move |
| Mouse, hold left click | aim and shoot |
| Space | dash (invulnerable while dashing) |
| E / right click | light nova (24 sparks) |
| P / Esc, M | pause, mute |

## Layout

- `game/index.html`: the page and canvas
- `game/src/`: one file per job: `config` (tuning), `world` (run state), `player`, `enemies`, `combat`, `spawner` (wave director), `upgrades` (boons), `effects`, `render`, `enemyart`, `hud` (HUD and menus), `audio` (synthesised sound), `input`, `random`, `game` (loop and states), `main`
- `main.ts`: hands the game in (copies `game/` and `screenshots/`, writes `dossier.json`)

All art is drawn in code and all sound is synthesised with Web Audio.
