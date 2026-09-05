# Nightfall Survivors

Endless top-down survival shooter (Vampire Survivors–like), built with vanilla
HTML5 Canvas + ES modules — no build step, no external game framework.

## Run it locally

Browsers block `import` in files opened via `file://`, so serve the folder
over HTTP. The project includes a dependency-free development server:

```bash
npm start
# open http://127.0.0.1:8080
```

Alternatively, Python can serve the same files:

```bash
cd vs-clone
python3 -m http.server 8080
# open http://localhost:8080
```

In VS Code, the **Run Nightfall Survivors** launch configuration starts the
development server automatically before opening Edge.

## Tests

The gameplay rules use Node's built-in test runner and require no external dependencies:

```bash
npm test
```

On machines with Microsoft Edge or Chromium installed, the browser smoke test
also verifies the complete start/pause/level-up/game-over flow:

```bash
npm run test:browser
```

## Architecture

```
index.html          Canvas + DOM overlay screens (menu/level-up/pause/gameover)
style.css            Theme + overlay screen styling
js/
  config.js          ALL tunable numbers (balance lives here, not scattered in code)
  utils.js            Pure math helpers + generic object Pool
  input.js            Keyboard + pointer joystick → movement and one-shot actions
  main.js              Boots Game, wires the non-canvas DOM buttons

  core/
    Game.js            Main loop + coordinator + public API (spawnX, damageEnemy, ...)
    GameState.js       Shared game-state constants
    FixedStepClock.js  Stable 60 Hz simulation with frame-spike protection
    Camera.js           World <-> screen coordinate conversion, follows the player

  entities/
    Player.js           Movement, HP, XP/leveling, weapon & passive inventory
    Enemy.js             Pooled. Enemy archetypes (ENEMY_TYPES) live at the top of this file
    Projectile.js        Pooled. Straight-line or homing
    Pickup.js             Pooled. XP gems + heals, magnet-pulled toward the player
    Particle.js           Pooled. Death sparks + floating damage numbers

  systems/
    Spawner.js            Endless difficulty curve: spawn rate/HP/speed scale with survival time
    CollisionSystem.js     Circle-vs-circle resolution: projectiles↔enemies, enemy↔player, pickups↔player
    LevelUpSystem.js       Builds and applies weighted progression choices
    SpatialGrid.js         Nearby-enemy lookup for broad-phase combat collisions

  rendering/
    WorldRenderer.js       Draws the world, entities, projectiles, and effects

  weapons/
    Weapon.js              Base class: cooldown timer + leveling, subclasses implement fire()
    MagicWand.js, Whip.js, GarlicAura.js, PierceRay.js, Missile.js   Auto-weapons
    Passives.js             Stat-boosting items (max HP, speed, armor, magnet, lifesteal)
    registry.js              Single place mapping weapon ids → classes (add new weapons here)

  ui/
    HUD.js                  Canvas-drawn HP/XP bars, timer, kill count, weapon icons
    MenuManager.js           DOM overlay screens (menu/level-up/pause/game over)

tests/                       Gameplay, timing, input, spatial-grid, and collision rules
```

### Why this split

- **Object pooling** (`utils.js: Pool`) — enemies, projectiles, pickups, and
  particles are pre-allocated and reused instead of created/GC'd every frame.
  This is what keeps a bullet-heaven game smooth once dozens of enemies and
  projectiles are on screen at once.
- **`Game` is the API boundary** — weapons and the collision system never
  reach into pools directly; they call `game.spawnProjectile(...)`,
  `game.damageEnemy(...)`, etc. That keeps every cross-system rule (e.g. "on
  kill: spawn XP gem + particles + increment kill count") in exactly one
  place.
- **Config-driven balance** — every damage number, cooldown, spawn rate, and
  difficulty ramp lives in `config.js` or a weapon's `LEVELS` array, so
  balancing the game is editing data, not code.
- **Canvas for gameplay, DOM for menus** — the HUD renders on canvas (fast,
  always in sync with the camera), but the main menu / level-up picker /
  pause / game-over screens are plain DOM. Buttons, hover states, and text
  layout are simpler and more accessible in DOM than hand-rolled canvas UI.

## Adding content

- **New weapon**: create `js/weapons/MyWeapon.js` extending `Weapon`,
  define a `LEVELS` array, implement `fire(game)`, then add one line to
  `weapons/registry.js`. It will automatically show up as a level-up option.
- **New enemy type**: add an entry to `ENEMY_TYPES` in `entities/Enemy.js`
  (color, hp, speed, damage, xp value, spawn weight, `minMinute` gate).
- **New passive**: add an entry to `PASSIVE_DEFS` in `weapons/Passives.js`.

## Publishing to CrazyGames

1. Zip the contents of this folder (not the folder itself — `index.html`
   should be at the zip's root).
2. In the CrazyGames developer dashboard, upload the zip as an HTML5 build
   and set `index.html` as the entry point.
3. Recommended next steps before submitting:
   - Integrate the [CrazyGames SDK](https://docs.crazygames.com/sdk/html5/)
     for loading screen (`sdk.game.loadingStart()` / `loadingStop()`),
     gameplay state (`sdk.game.gameplayStart()` / `gameplayStop()`), and
     optional midroll ads on game-over.
   - Confirm the game plays fully offline after load (no runtime calls to
     third-party APIs other than the CrazyGames SDK) — this project already
     satisfies that except for the Google Fonts `<link>` in `index.html`,
     which you may want to self-host for reliability.
   - Test the touch joystick on an actual mobile device; CrazyGames traffic
     skews heavily mobile.
