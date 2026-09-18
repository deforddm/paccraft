# Blockcade

A blocky mash-up arcade made for Max — four retro arcade games in one installable web app, sharing one bag of ores, one crafting table, one hero and the Lucky Mine. It runs in any phone browser, installs to the home screen, and works offline.

| Cabinet | What it is | Controls |
|---|---|---|
| **PacCraft** | Pac-Man × block-digging: gobble gems, dig tunnels, drop blocks, bonk cube monsters (the original game — everything below still applies) | joystick / swipe, DIG, block, TNT |
| **Cheetah Dash** | A speed platformer: Zip the cheetah tears over rolling block hills, loop-the-loops, springs and platforms, collecting emeralds and stomping cube monsters. Get hit and your emeralds scatter; get hit with none and you lose a life. Hold **SPIN** while standing and let go to spin-dash (breaks ore blocks, bonks monsters). Five zones that cycle harder: Meadow Hills, Sandy Dunes, Frosty Ridge, Magma Run, Crystal Rush. | ◀ ▶, JUMP, SPIN |
| **Tunnel Trouble** | Dig Dug style: dig tunnels through four dirt layers, face a monster and **PUMP** it four times to pop it (deeper = more points, flame-breathers double), or dig under a boulder so it drops on them. Ore veins in the dirt go into your bag. Rounds add monsters. | joystick, PUMP |
| **Block Breaker** | Breakout with blocks: drag to move the plank paddle, tap to launch the slime ball. Dirt breaks in one hit, stone two, basalt three, bedrock never; ore blocks drop their ore; TNT blows up its neighbours; crystals spawn an extra ball. Power-ups: Wide, Multi-ball, Slow-mo, Fire ball, Sticky, +Life. | drag / tap (or ◀ ▶ + Space) |
| **Cube Invaders** | Space Invaders: rows of Mudge, Sly and Frost march down the night sky. Shoot arrows from behind plank shields, and catch the ore blocks that fall when you hit a carrier or Rumble the raider zooming across the top. | ◀ ▶ (or drag), SHOOT (or tap) |
| **Creek Crossing** | Frogger: hop across five rails of runaway minecarts, ride logs, ice floes and diving lily pads over the creek, and fill the five burrows on the far bank. An ore bonus wanders between empty burrows. | joystick / swipe / tap |
| **Slime Snake** | Snake: a growing slime gobbles emeralds, grabs the ore blocks that pop up for a few seconds, and must dodge the cobble and its own tail. Every 10 emeralds = a level and a coal. | joystick / swipe |
| **Block Stack** | A falling-block puzzle built from real blocks. Slide, spin and drop the pieces; fill rows to clear them. Ore blocks hidden in the pieces go into your bag when their row clears; a four-row clear adds an iron. | joystick, SPIN, DROP (or drag / tap / swipe down) |

Each cabinet keeps its own best score. Ores earned anywhere spend anywhere — at the Crafting Table (PacCraft upgrades), on hats and the wolf, and in the Lucky Mine.

**The wolf** — once adopted on the Hero screen (5 gold + 3 iron), Max's wolf tags along in every cabinet: trotting behind the hero, running under the paddle, waiting on the creek bank, chasing the snake's tail, cheering beside the stack. Tap it on the arcade sign to make it bark. It never touches gameplay.

## PacCraft

## How it plays

- **Gobble every gem** in the maze to clear the level. Four cube monsters chase you — **Rumble** (chases you), **Sly** (cuts you off), **Frost** (flanks), and **Mudge** (brave from afar, shy up close).
- **Power Crystals** (purple) turn the monsters blue for a few seconds — bonk them for 200 → 400 → 800 → 1600 points.
- **Dig!** Push into a wall (or tap DIG) to mine it and make a shortcut. The bedrock edge and the monster cage can't be dug. Harder blocks (stone, ores) take longer; better pickaxes dig faster.
- **Ores** (coal, iron, gold, diamond and rare **ember**) give points and are saved to spend at the **Crafting Table**. Ember Ore hides in the Lava Caves (and rarely in the Dark Caves and Crystal Caverns); it's the toughest block in the game, so bring a good pickaxe.
- **Build a wall:** the block button drops a plank block behind you; monsters bump into it (it crumbles after a while, or they chew through if trapped). Digging walls refills your blocks.
- **TNT:** craft it, drop it, run. Blasts a 3×3 area and bonks monsters. Never hurts you.
- **Snacks** appear under the cage twice a level: points + a heart.
- **7 worlds** that repeat with harder layouts: Grassy Meadow, Deep Forest, Sunny Desert, Snowy Peaks, Dark Caves, Lava Caves, Crystal Caverns. Every level number always has the same maze, so Max can learn them.
- **Easy / Normal / Hard.** Easy = slower monsters, 5 hearts, long power-ups (the default).

### Crafting Table (progress is kept even after Game Over)

| Upgrade | Levels | What it does |
|---|---|---|
| Pickaxe | Stone → Iron → Diamond → Emberite | Digs 1.6× / 2.5× / 4× / 6× faster |
| Speedy Boots | 4 (4th = Emberite Boots) | +6% run speed each |
| Emberite Armor | 2 | Soaks up one monster hit per charge each level, then a moment of invincibility |
| Extra Heart | 2 | +1 heart every level |
| Crystal Power | 3 | Monsters stay scared +1.5 s each |
| Block Bag | 3 | Carry 3 more blocks, start levels with extras |
| Gem Magnet | 1 | Also collects gems next to you |
| TNT | carry 5 | Consumable |

### Lucky Mine (between levels)

From the Level Clear or Game Over screen, **Lucky Mine** lets you bet ores (3 coal, 2 iron, 2 gold, 1 diamond or 1 ember) on two booths:

- **Boom Blocks** — nine stone blocks hide six ore prizes and three Boom Blocks. Dig one at a time; ore goes in your bag, and you can **Take it!** whenever you like — but a Boom Block blows up the whole bag. Digging every safe block banks it all automatically.
- **Ore Slots** — three reels. Any pair returns your stake, three of your stake ore pays 3×, three of the next ore up pays a bigger prize, and three Power Crystals is the 10× jackpot.

Both booths pay back a little less than they take over time (roughly 85–90% with sensible play, less if you keep digging), so it's a gamble rather than a farm. Tables: `BOOM_PRIZES`, `SLOT_ODDS` and `SLOT_BIG` in `src/app.js`.

### Hero & Build mode

- **Hero:** name, hat (miner helmet, cap, none — plus knight, crown, diamond and emberite helmets you unlock with ores), shirt, pants, hair, skin.
- **Pet:** a blocky wolf (adopt for 5 gold + 3 iron) that trots along the hero's own trail about a tile behind, sits when he stands still and wears a collar matching his shirt. Purely cosmetic — it's drawn by the renderer only, so monsters, gems and collisions never see it.
- **Build:** paint your own maze with any block (mirror-drawing on by default), place Power Crystals and your start spot, pick a world theme, then **Test** it. Saved levels live under Play → My Levels.

### Controls

- Phone: the joystick (or swipe anywhere on the maze), **DIG**, **block**, **TNT** buttons. Settings has left-handed mode, swipe-only mode and "dig by pushing".
- Keyboard: arrows/WASD move · Space dig · B block · T TNT · P pause.

## Play / install

- **Hosted:** open the GitHub Pages URL on the phone. Android Chrome: menu → *Install app* (or *Add to Home screen*). iPhone Safari: Share → *Add to Home Screen*. It launches full-screen and works offline.
- **Single file:** `dist/blockcade.html` is the whole arcade in one file — double-click it on a computer, or send it anywhere.
- **Locally:** `npx serve .` (or `python -m http.server 8080`) and open the printed URL.

## Project layout

```
index.html            app shell (arcade hub + all screens)
src/cab.js            shared cabinet runtime for the canvas games: scaling, joystick/buttons/drag/keyboard, pause, game over, ore rewards
src/games/dash.js     Cheetah Dash (level generator, physics, loops, Zip's sprites)
src/games/digger.js   Tunnel Trouble
src/games/breaker.js  Block Breaker
src/games/invaders.js Cube Invaders
src/games/crossing.js Creek Crossing
src/games/snake.js    Slime Snake
src/games/stack.js    Block Stack
src/pet.js            the wolf companion helper used by every cabinet
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
tools/build.js        builds dist/blockcade.html and dist/artifact.html
```

No framework and no build step needed to run it. Node is only used for tests and the single-file bundle.

## Updating the hosted game

1. Change files, then `node tests/sim.test.js` and `node tools/build.js`.
2. Bump the version in **two** places: `CACHE` in `sw.js` (e.g. `paccraft-v1.1.1`) and `VERSION` in `src/app.js` (shown in Settings).
3. Upload to the repo **in this order**: `src/` → `dist/` → root files, with `sw.js` last (so phones never cache a half-uploaded release). GitHub Pages redeploys in about a minute.
4. On the phone: next time PacCraft is opened online it downloads the update in the background and shows an **Update ready!** button on the menus (hidden during play). Tap **Update** → it saves progress, switches to the new version and reloads. Saved ores, upgrades, hats and built levels are kept (they live in the phone's browser storage, tied to the site address — don't rename the repo).

Versions shipped before the button existed (v1.0.0, listed in `LEGACY` in `sw.js`) switch to the new version automatically on the next open-and-reopen.

## Tuning

- Speeds, hearts, power-up length, monster release timing, scatter/chase phases and pickaxe speeds (`PICK_SPEED`): the top of `src/game.js`.
- Crafting recipes and costs: `RECIPES` in `src/app.js`. Hat prices: `HAT_COST`.
- Worlds, block mixes and ore rates: `BIOMES` in `src/world.js`.

## Credits

Game design, code and all pixel art/sound are original to this project. Fonts: Bungee and Rubik (SIL Open Font License, see `fonts/`). PacCraft is a fan-made family game inspired by classic maze-chase and block-building games; it isn't affiliated with or endorsed by the makers of Pac-Man or Minecraft.
