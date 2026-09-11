# PacCraft

A mobile maze-chase game made for Max — Pac-Man-style gem gobbling mixed with Minecraft-style digging, building and crafting. It's a web app / PWA: it runs in any phone browser, installs to the home screen, and works offline.

## How it plays

- **Gobble every gem** in the maze to clear the level. Four cube monsters chase you — **Rumble** (chases you), **Sly** (cuts you off), **Frost** (flanks), and **Mudge** (brave from afar, shy up close).
- **Power Crystals** (purple) turn the monsters blue for a few seconds — bonk them for 200 → 400 → 800 → 1600 points.
- **Dig!** Push into a wall (or tap DIG) to mine it and make a shortcut. The bedrock edge and the monster cage can't be dug. Harder blocks (stone, ores) take longer; better pickaxes dig faster.
- **Ores** (coal, iron, gold, diamond) give points and are saved to spend at the **Crafting Table**.
- **Build a wall:** the block button drops a plank block behind you; monsters bump into it (it crumbles after a while, or they chew through if trapped). Digging walls refills your blocks.
- **TNT:** craft it, drop it, run. Blasts a 3×3 area and bonks monsters. Never hurts you.
- **Snacks** appear under the cage twice a level: points + a heart.
- **7 worlds** that repeat with harder layouts: Grassy Meadow, Deep Forest, Sunny Desert, Snowy Peaks, Dark Caves, Lava Caves, Crystal Caverns. Every level number always has the same maze, so Max can learn them.
- **Easy / Normal / Hard.** Easy = slower monsters, 5 hearts, long power-ups (the default).

### Crafting Table (progress is kept even after Game Over)

| Upgrade | Levels | What it does |
|---|---|---|
| Pickaxe | Stone → Iron → Diamond | Digs 1.6× / 2.5× / 4× faster |
| Speedy Boots | 3 | +6% run speed each |
| Extra Heart | 2 | +1 heart every level |
| Crystal Power | 3 | Monsters stay scared +1.5 s each |
| Block Bag | 3 | Carry 3 more blocks, start levels with extras |
| Gem Magnet | 1 | Also collects gems next to you |
| TNT | carry 5 | Consumable |

### Hero & Build mode

- **Hero:** name, hat (miner helmet, cap, none — plus knight, crown and diamond helmet you unlock with ores), shirt, pants, hair, skin.
- **Build:** paint your own maze with any block (mirror-drawing on by default), place Power Crystals and your start spot, pick a world theme, then **Test** it. Saved levels live under Play → My Levels.

### Controls

- Phone: the joystick (or swipe anywhere on the maze), **DIG**, **block**, **TNT** buttons. Settings has left-handed mode, swipe-only mode and "dig by pushing".
- Keyboard: arrows/WASD move · Space dig · B block · T TNT · P pause.

## Play / install

- **Hosted:** open the GitHub Pages URL on the phone. Android Chrome: menu → *Install app* (or *Add to Home screen*). iPhone Safari: Share → *Add to Home Screen*. It launches full-screen and works offline.
- **Single file:** `dist/paccraft.html` is the whole game in one file — double-click it on a computer, or send it anywhere.
- **Locally:** `npx serve .` (or `python -m http.server 8080`) and open the printed URL.

## Project layout

```
index.html            app shell (all screens)
src/world.js          blocks, biomes, seeded RNG, symmetric maze generator, custom levels
src/game.js           rules + simulation: movement, monster AI, digging, blocks, TNT, power, scoring
src/textures.js       all pixel art, drawn in code (blocks, hero, monsters, items, icons, bitmap font)
src/render.js         canvas renderer: 3/4-view blocks, sprites, particles, lighting
src/audio.js          synthesized sound effects + original procedural chiptune per world
src/builder.js        level editor
src/app.js            menus, save data, input, HUD, crafting, hero, settings, game loop
src/style.css         mobile-first styles
sw.js                 service worker (offline) — bump CACHE on every release
manifest.webmanifest  PWA manifest
icons/                app icons (rendered from the game's own art: npm run icons)
tests/sim.test.js     maze invariants (560 mazes) + long headless play simulations
tests/bot.js          balance bot: clear rates per difficulty
tools/build.js        builds dist/paccraft.html and dist/artifact.html
```

No framework and no build step needed to run it. Node is only used for tests and the single-file bundle.

## Updating the hosted game

1. Change files, then `node tests/sim.test.js` and `node tools/build.js`.
2. Bump the version in **two** places: `CACHE` in `sw.js` (e.g. `paccraft-v1.1.1`) and `VERSION` in `src/app.js` (shown in Settings).
3. Upload to the repo **in this order**: `src/` → `dist/` → root files, with `sw.js` last (so phones never cache a half-uploaded release). GitHub Pages redeploys in about a minute.
4. On the phone: next time PacCraft is opened online it downloads the update in the background and shows an **Update ready!** button on the menus (hidden during play). Tap **Update** → it saves progress, switches to the new version and reloads. Saved ores, upgrades, hats and built levels are kept (they live in the phone's browser storage, tied to the site address — don't rename the repo).

Versions shipped before the button existed (v1.0.0, listed in `LEGACY` in `sw.js`) switch to the new version automatically on the next open-and-reopen.

## Tuning

- Speeds, hearts, power-up length, monster release timing and scatter/chase phases: `DIFF` at the top of `src/game.js`.
- Crafting recipes and costs: `RECIPES` in `src/app.js`. Hat prices: `HAT_COST`.
- Worlds, block mixes and ore rates: `BIOMES` in `src/world.js`.

## Credits

Game design, code and all pixel art/sound are original to this project. Fonts: Bungee and Rubik (SIL Open Font License, see `fonts/`). PacCraft is a fan-made family game inspired by classic maze-chase and block-building games; it isn't affiliated with or endorsed by the makers of Pac-Man or Minecraft.
