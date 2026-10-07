# Circle vs Geometry

A geometric arena survival shooter: a lone circle fights polygon hordes with vector weapons, built with vanilla
HTML5 Canvas + ES modules — no build step, no external game framework.

## Run it locally

For a standalone version, double-click `jugar.html`. It contains the JavaScript
and CSS and works without a server or internet connection, using system fonts.
You can copy this single file to another computer to play.

After changing the source files, regenerate it with:

```bash
npm install
npm run build
```

`jugar.html` is generated; edit `index.html`, `style.css`, and `js/` instead.
Changes are included the next time you run `npm run build`. To verify the
standalone game in Edge or Chromium, run `npm run test:standalone`.

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

## Sound

Original 8-bit effects accompany projectile hits, enemy defeats, XP gems,
level-up choices, map pickups (including healing), ray attacks, rocket launches
and explosions, and each of the three ultimate activations. Audio is synthesized
locally using Web Audio and works offline in `jugar.html`. Click **Empezar** to
enable playback; the **Sonido** slider adjusts volume from 0% to 100% and remembers your preference.
Volume and simultaneous voice limits are in `AUDIO` in `js/config.js`.
Repeated combat/pickup effects are throttled to keep large hordes comfortable.

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

1. Run `./scripts/package-crazygames.ps1` in PowerShell. Upload only
   `crazygames/circle-vs-geometry.zip`; it contains one `index.html` at its root.
2. Select the **Progress Save** toggle in the portal because the CrazyGames build
   uses the SDK Data module for records, preferences and completed tutorial hints.
3. Test the uploaded build in the portal preview before submission, including
   Basic Launch (ads disabled). Monetization is enabled by the portal only after
   selection for Full Launch.

The dedicated build uses the [CrazyGames SDK v3](https://docs.crazygames.com/sdk/intro/),
initializes before play, reports loading and gameplay transitions (including pause,
upgrade selection and game over), and requests a midgame ad on game-over retry.
It blocks gameplay and menus while requesting/showing an ad, mutes only when the
ad starts, restores the player's volume, and handles unfilled/disabled ads.
If SDK loading/initialization fails, the game still works. The generic source and
`jugar.html` stay self-contained and do not load a portal SDK.

Touch controls support movement plus DASH/ULT with two fingers, show charges and
cooldowns, and adapt to phones/tablets. First-play hints explain movement, auto-fire,
XP and dash, with a separate hint on first ultimate acquisition. Completed hints
are remembered where storage is available; denied storage falls back to the session.

## Browser and device validation

```bash
npm test
npm run test:browser
npm run test:standalone
npm run test:devices
npx playwright install webkit
npm run test:engines
```

Device QA uses Edge with isolated desktop/mobile/tablet contexts, real protocol
multi-touch events, iframe checks, SDK callback regressions and a full-combat
benchmark. Engine QA adds WebKit on Windows and the real SDK's localhost ad flow.
Reports and screenshots are saved in `qa/`. These are emulation/engine tests;
physical Android, iPhone Safari, safe areas, interruptions and production portal
ads still need manual validation. See [qa/VALIDACION.md](qa/VALIDACION.md).

## Geometry identity and encounter schedule

Weapons: Vector Cannon, Arc Slash, Repulsion Field, Prism Ray, Polygon Missile.
Passive upgrades: Vital Core, Velocity Vector, Polygon Shell, Attraction Field, Energy Recycle.
The generic/offline build starts in English. CrazyGames uses the SDK locale with
an English fallback; both languages remain available in Options. Volume is saved
when persistent storage is available.
The shared web and standalone versions omit the custom fullscreen button so the host platform controls fullscreen.
Internal weapon IDs and module names remain stable for compatibility.

| Time | Event |
| --- | --- |
| 0:00 | Triangles |
| 0:45 | Squares |
| 1:30 | First elite |
| 2:00 | Special power-ups and mystery announcement |
| 2:30 | Diamonds |
| 4:00 | Second, stronger elite |
| 5:00 | Pentagons |
| 7:00 | Hexagons |

Elite squares repeat every 150 seconds after the first. Each wave gains an additional
50% of base health on top of the normal time scaling and elite multiplier.
Special power-ups refill every 90 seconds when missing.
