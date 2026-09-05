import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

import { createStaticServer } from './dev-server.js';

const EDGE_CANDIDATES = process.platform === 'win32'
  ? [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ]
  : process.platform === 'darwin'
    ? ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
    : ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable', '/usr/bin/chromium'];

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

async function waitForDebugPage(port, expectedUrl) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const pages = await response.json();
      const page = pages.find((candidate) => candidate.type === 'page' && candidate.url === expectedUrl);
      if (page) return page;
    } catch {
      // Edge has not opened its debugging endpoint yet.
    }
    await delay(100);
  }
  throw new Error('Edge debugging endpoint did not become ready');
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.runtimeErrors = [];

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const request = this.pending.get(message.id);
        if (!request) return;
        this.pending.delete(message.id);
        if (message.error) request.reject(new Error(message.error.message));
        else request.resolve(message.result);
        return;
      }

      if (message.method === 'Runtime.exceptionThrown') {
        const details = message.params.exceptionDetails;
        this.runtimeErrors.push(details.exception?.description || details.text);
      }
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        this.runtimeErrors.push(
          message.params.args.map((argument) => argument.value || argument.description).join(' ')
        );
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolveRequest, rejectRequest) => {
      this.pending.set(id, { resolve: resolveRequest, reject: rejectRequest });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const response = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    }
    return response.result.value;
  }
}

async function connect(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  await new Promise((resolveSocket, rejectSocket) => {
    socket.addEventListener('open', resolveSocket, { once: true });
    socket.addEventListener('error', rejectSocket, { once: true });
  });
  return { socket, client: new CdpClient(socket) };
}

async function run() {
  const browserPath = process.env.NIGHTFALL_BROWSER_PATH || EDGE_CANDIDATES.find(existsSync);
  if (!browserPath) {
    throw new Error('Microsoft Edge or Chromium was not found. Set NIGHTFALL_BROWSER_PATH to its executable.');
  }

  const server = await createStaticServer({ port: 0 });
  const serverPort = server.address().port;
  const gameUrl = `http://127.0.0.1:${serverPort}/`;
  const debugPort = 9300 + Math.floor(Math.random() * 500);
  const browserDataDir = await mkdtemp(join(tmpdir(), 'nightfall-browser-'));
  const browser = spawn(browserPath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${browserDataDir}`,
    gameUrl,
  ], { stdio: 'ignore' });

  let socket;
  try {
    const page = await waitForDebugPage(debugPort, gameUrl);
    const connection = await connect(page.webSocketDebuggerUrl);
    socket = connection.socket;
    const client = connection.client;
    await client.send('Runtime.enable');
    await delay(300);

    const initialState = await client.evaluate(`({
      ready: document.readyState,
      menuVisible: !document.getElementById('screen-menu').classList.contains('hidden'),
      canvasWidth: document.getElementById('game-canvas').width
    })`);
    if (
      !['interactive', 'complete'].includes(initialState.ready) ||
      !initialState.menuVisible ||
      initialState.canvasWidth !== 960
    ) {
      throw new Error(`Invalid initial state: ${JSON.stringify(initialState)}`);
    }

    const started = await client.evaluate(`(() => {
      document.getElementById('btn-start').click();
      return document.getElementById('screen-menu').classList.contains('hidden');
    })()`);
    if (!started) throw new Error('Start button did not enter gameplay');
    await delay(200);

    const gameplayState = await client.evaluate(`(async () => {
      const { getGameInstance } = await import('./js/main.js');
      const game = getGameInstance();
      return {
        state: game?.state,
        alive: game?.player.alive,
        weapons: game?.player.weapons.map((weapon) => weapon.id)
      };
    })()`);
    if (
      gameplayState.state !== 'playing' ||
      gameplayState.alive !== true ||
      !gameplayState.weapons.includes('magic_wand')
    ) {
      throw new Error(`Invalid gameplay state: ${JSON.stringify(gameplayState)}`);
    }

    const dashWorked = await client.evaluate(`(async () => {
      const { getGameInstance } = await import('./js/main.js');
      const game = getGameInstance();
      document.getElementById('btn-dash').click();
      await new Promise((resolve) => setTimeout(resolve, 50));
      return game.player.dashCharges === 0 && game.player.dashActive > 0;
    })()`);
    if (!dashWorked) throw new Error('Dash button did not activate dash');

    const paused = await client.evaluate(`(() => {
      document.getElementById('btn-pause-touch').click();
      return !document.getElementById('screen-pause').classList.contains('hidden');
    })()`);
    if (!paused) throw new Error('Pause button did not open the pause screen');

    const resumed = await client.evaluate(`(() => {
      document.getElementById('btn-resume').click();
      return document.getElementById('screen-pause').classList.contains('hidden');
    })()`);
    if (!resumed) throw new Error('Resume button did not return to gameplay');
    await delay(200);

    const levelUpState = await client.evaluate(`(async () => {
      const { getGameInstance } = await import('./js/main.js');
      const game = getGameInstance();
      game.player.level = 5;
      game.levelUpSystem.pendingLevelUps = 1;
      game.levelUpSystem.present(game);
      return {
        state: game.state,
        options: document.querySelectorAll('#levelup-options .levelup-card').length,
        visible: !document.getElementById('screen-levelup').classList.contains('hidden')
      };
    })()`);
    if (levelUpState.state !== 'level_up' || levelUpState.options !== 3 || !levelUpState.visible) {
      throw new Error(`Invalid level-up state: ${JSON.stringify(levelUpState)}`);
    }

    const ultimateSelected = await client.evaluate(`(async () => {
      const { getGameInstance } = await import('./js/main.js');
      const game = getGameInstance();
      document.querySelector('#levelup-options .levelup-card').click();
      return Boolean(game.player.ultimate) && game.state === 'playing';
    })()`);
    if (!ultimateSelected) throw new Error('Ultimate selection did not resume gameplay');

    const ultimateActivated = await client.evaluate(`(async () => {
      const { getGameInstance } = await import('./js/main.js');
      const game = getGameInstance();
      document.getElementById('btn-ult').click();
      await new Promise((resolve) => setTimeout(resolve, 50));
      return game.player.ultimate.cooldownTimer > 0;
    })()`);
    if (!ultimateActivated) throw new Error('Ultimate button did not activate the selected ultimate');

    const gameOverState = await client.evaluate(`(async () => {
      const { getGameInstance } = await import('./js/main.js');
      const game = getGameInstance();
      game.player.alive = false;
      game._update(1 / 60);
      return {
        state: game.state,
        visible: !document.getElementById('screen-gameover').classList.contains('hidden')
      };
    })()`);
    if (gameOverState.state !== 'game_over' || !gameOverState.visible) {
      throw new Error(`Invalid game-over state: ${JSON.stringify(gameOverState)}`);
    }

    const restarted = await client.evaluate(`(async () => {
      const { getGameInstance } = await import('./js/main.js');
      const game = getGameInstance();
      document.getElementById('btn-restart-gameover').click();
      return game.state === 'playing' && game.player.alive;
    })()`);
    if (!restarted) throw new Error('Game-over restart did not start a fresh game');

    const powerUpsWorked = await client.evaluate(`(async () => {
      const { getGameInstance } = await import('./js/main.js');
      const game = getGameInstance();
      game.player.survivalTime = 300;
      game._update(1 / 60);

      const activePowerUps = game.pickupPool.items.filter((pickup) =>
        pickup.active && (pickup.kind === 'mega_magnet' || pickup.kind === 'freeze_clock')
      );
      const kinds = activePowerUps.map((pickup) => pickup.kind).sort();
      const clock = activePowerUps.find((pickup) => pickup.kind === 'freeze_clock');
      const magnet = activePowerUps.find((pickup) => pickup.kind === 'mega_magnet');
      if (!clock || !magnet) return { kinds, freezeTimer: 0, magnetTimer: 0, xpMoved: false };

      game.player.x = clock.x;
      game.player.y = clock.y;
      game._update(1 / 60);

      game.player.x = magnet.x;
      game.player.y = magnet.y;
      game._update(1 / 60);
      game.spawnPickup(game.player.x + 1000, game.player.y, 'xp', 5);
      const xp = game.pickupPool.items.find((pickup) =>
        pickup.active && pickup.kind === 'xp' && pickup.x === game.player.x + 1000
      );
      const initialDistance = Math.abs(xp.x - game.player.x);
      game._update(1 / 60);

      return {
        kinds,
        freezeTimer: game.enemyFreezeTimer,
        magnetTimer: game.megaMagnetTimer,
        xpMoved: Math.abs(xp.x - game.player.x) < initialDistance
      };
    })()`);
    if (
      JSON.stringify(powerUpsWorked.kinds) !== JSON.stringify(['freeze_clock', 'mega_magnet']) ||
      powerUpsWorked.freezeTimer <= 9.9 ||
      powerUpsWorked.magnetTimer <= 4.9 ||
      !powerUpsWorked.xpMoved
    ) {
      throw new Error(`Power-ups did not work correctly: ${JSON.stringify(powerUpsWorked)}`);
    }

    const initialPlayerY = await client.evaluate(`(async () => {
      const { getGameInstance } = await import('./js/main.js');
      const game = getGameInstance();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      return game.player.y;
    })()`);
    await delay(150);
    const movedPlayerY = await client.evaluate(`(async () => {
      const { getGameInstance } = await import('./js/main.js');
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
      return getGameInstance().player.y;
    })()`);
    if (movedPlayerY >= initialPlayerY) throw new Error('Keyboard movement did not move the player');

    await delay(1200);
    const simulationActivity = await client.evaluate(`(async () => {
      const { getGameInstance } = await import('./js/main.js');
      const game = getGameInstance();
      return {
        survivalTime: game.player.survivalTime,
        activity: game.enemyPool.activeCount + game.pickupPool.activeCount + game.player.kills
      };
    })()`);
    if (simulationActivity.survivalTime < 1 || simulationActivity.activity < 1) {
      throw new Error(`Simulation did not advance correctly: ${JSON.stringify(simulationActivity)}`);
    }

    if (client.runtimeErrors.length > 0) {
      throw new Error(`Browser runtime errors:\n${client.runtimeErrors.join('\n')}`);
    }

    console.log(
      'Browser smoke test passed: start, movement, dash, pause, level-up, ultimate, power-ups, spawning, game over, and restart.'
    );
  } finally {
    if (socket) socket.close();
    browser.kill();
    await new Promise((resolveClose) => server.close(resolveClose));
    await rm(browserDataDir, { recursive: true, force: true }).catch(() => {});
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
