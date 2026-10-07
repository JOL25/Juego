import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { createStaticServer } from './dev-server.js';

const delay = milliseconds => new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds));
const artifactDir = resolve('qa');
const profiles = [
  { name: 'desktop', width: 907, height: 510 },
  { name: 'small-desktop', width: 640, height: 360 },
  { name: 'android-portrait-viewport', width: 360, height: 800, touch: true },
  { name: 'android-landscape-viewport', width: 800, height: 360, touch: true },
  { name: 'iphone-viewport', width: 390, height: 844, touch: true },
  { name: 'small-phone-viewport', width: 320, height: 568, touch: true },
  { name: 'tablet-portrait-viewport', width: 768, height: 1024, touch: true },
  { name: 'tablet-landscape-viewport', width: 1024, height: 768, touch: true },
  { name: 'desktop-iframe', width: 821, height: 462, iframe: true },
  { name: 'mobile-iframe', width: 360, height: 800, touch: true, iframe: true },
];

// Models the documented SDK callbacks, including Basic Launch / adblock errors.
const fakeSdk = `(() => {
  window.__portalEvents = [];
  window.__adMode = 'error';
  window.CrazyGames = {SDK: {
    environment: 'local', init: async () => {},
    user: {systemInfo: {locale: 'en-US', device: {type: 'desktop'}}},
    data: {getItem: key => localStorage.getItem(key), setItem: (key,value) => localStorage.setItem(key,value)},
    game: Object.fromEntries(['loadingStart','loadingStop','gameplayStart','gameplayStop'].map(name => [name, () => window.__portalEvents.push(name)])),
    ad: {requestAd: (_, callbacks) => {
      window.__adCallbacks = callbacks;
      if (window.__adMode === 'error') callbacks.adError({code:'adsDisabled'});
      if (window.__adMode === 'throw') throw Error('Ad unavailable');
      if (window.__adMode === 'reject') return Promise.reject(Error('Ad unavailable'));
    }}
  }};
})();`;

async function run() {
  await mkdir(artifactDir, { recursive: true });
  const server = await createStaticServer({ port: 0 });
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const report = { engine: 'Chromium (Edge headless)', deviceTesting: 'Viewport and touch emulation; not physical Android/iOS or Safari',
    profiles: [], portal: {}, physicalDevices: 'Pending manual validation', failures: [] };
  try {
    browser = await chromium.launch(process.env.NIGHTFALL_BROWSER_PATH
      ? { executablePath: process.env.NIGHTFALL_BROWSER_PATH, headless: true } : { channel: 'msedge', headless: true });
    let context;
    let client;
    const runtimeErrors = [];
    const gameEval = expression => client.evaluate(`(() => {
      const context = document.getElementById('game-frame')?.contentWindow || window;
      return context.eval(${JSON.stringify(expression)});
    })()`);
    const waitFor = async expression => {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (await gameEval(expression)) return;
        await delay(50);
      }
      const details = await gameEval(`(() => {const g=window.CircleVsGeometry?.getGameInstance();return {state:g?.state,charges:g?.player.dashCharges,joystick:g?.input.joystick,focused:document.hasFocus(),active:document.activeElement?.id};})()`);
      const host = await client.evaluate(`(() => {const f=document.getElementById('game-frame');const r=f?.getBoundingClientRect();return {width:innerWidth,height:innerHeight,viewport:{width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale,offsetTop:visualViewport.offsetTop},frame:r&&{x:r.x,y:r.y,width:r.width,height:r.height},hit:document.elementFromPoint(65,innerHeight-100)?.tagName};})()`);
      throw new Error(`Timed out: ${expression}; ${JSON.stringify({details,host})}`);
    };
    const shot = async name => {
      const screenshot = await client.send('Page.captureScreenshot', { format: 'png' });
      await writeFile(join(artifactDir, `${name}.png`), Buffer.from(screenshot.data, 'base64'));
    };

    for (const profile of profiles) {
      const requestedProfile = process.argv.find(arg => arg.startsWith('--profile='))?.slice(10);
      if (requestedProfile && profile.name !== requestedProfile) continue;
      // Each profile gets its own input state, cookies and storage.
      if (context) await context.close();
      context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: !!profile.touch, hasTouch: !!profile.touch });
      await context.addInitScript({ content: fakeSdk });
      await context.route('**/sdk.crazygames.com/**', route => route.abort());
      const page = await context.newPage();
      page.on('pageerror', error => runtimeErrors.push(error.message));
      const session = await context.newCDPSession(page);
      client = { send: (method, params) => session.send(method, params), evaluate: expression => page.evaluate(expression) };
      await page.goto(`${origin}/${profile.iframe ? 'scripts/qa/iframe.html' : 'crazygames/juego/index.html'}`);
      await waitFor("document.readyState === 'complete' && document.getElementById('game-canvas')?.dataset.ready === 'true' && CircleVsGeometry.getGameInstance().state === 'menu'");
      await client.send('Page.bringToFront');
      await client.evaluate("document.getElementById('game-frame')?.focus()");
      // Wait for the new iframe's compositor hit-test data after navigation.
      await delay(150);
      const menu = await gameEval(`(() => {
        const panel=document.querySelector('#screen-menu .panel'), rect=panel.getBoundingClientRect();
        return {width:innerWidth,height:innerHeight,panel:{x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom},touch:CircleVsGeometry.getGameInstance().touchControls};
      })()`);
      assert.equal(menu.touch, !!profile.touch, profile.name);
      assert.ok(menu.panel.x >= 0 && menu.panel.y >= 0 && menu.panel.right <= menu.width && menu.panel.bottom <= menu.height, `${profile.name}: menu clipped`);
      await gameEval("(() => { const g=CircleVsGeometry.getGameInstance();g.start();g.player.invulnTimer=600000;g.gameplayUI.update(); })()");
      await waitFor("CircleVsGeometry.getGameInstance().player.survivalTime > 0");
      assert.equal(await gameEval("!document.getElementById('tutorial-hint').hidden"), true, `${profile.name}: first-play help`);
      if (profile.touch) {
        const getButton = id => gameEval(`(() => {const r=document.getElementById(${JSON.stringify(id)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height,bottom:r.bottom,right:r.right};})()`);
        const dash = await getButton('btn-dash-touch');
        assert.ok(dash.width >= 44 && dash.height >= 44 && dash.bottom <= menu.height && dash.right <= menu.width);
        assert.equal(await gameEval("document.getElementById('btn-ultimate-touch').disabled"), true);
        const joystick = { id: 1, x: 65, y: menu.height - 100 };
        const moving = { ...joystick, x: 105 };
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [joystick] });
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [moving] });
        const start = await gameEval("CircleVsGeometry.getGameInstance().player.x");
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [moving, { id: 2, x: dash.x, y: dash.y }] });
        await waitFor("CircleVsGeometry.getGameInstance().player.dashCharges === 0");
        assert.equal(await gameEval("CircleVsGeometry.getGameInstance().input.joystick.active"), true);
        assert.ok(await gameEval("CircleVsGeometry.getGameInstance().player.x") > start);
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await gameEval("(() => {const g=CircleVsGeometry.getGameInstance();g.player.level=5;g.player.ultimate=new CircleVsGeometry.ultimates.SuperPierceShot();g.gameplayUI.update();})()");
        const ultimate = await getButton('btn-ultimate-touch');
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [joystick] });
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [moving] });
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [moving, { id: 2, x: ultimate.x, y: ultimate.y }] });
        await waitFor("CircleVsGeometry.getGameInstance().player.ultimate.cooldownTimer > 0");
        assert.equal(await gameEval("CircleVsGeometry.getGameInstance().input.joystick.active"), true);
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        // Also support pressing an action first, then moving with a non-primary finger.
        await gameEval("(() => {const g=CircleVsGeometry.getGameInstance();g.player.dashCharges=1;g.player.dashActive=0;g.gameplayUI.update();})()");
        const actionFinger = { id: 1, x: dash.x, y: dash.y };
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [actionFinger] });
        await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [actionFinger, { ...joystick, id: 2 }] });
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [actionFinger, { ...moving, id: 2 }] });
        assert.equal(await gameEval("CircleVsGeometry.getGameInstance().input.joystick.active"), true);
        assert.ok(await gameEval("CircleVsGeometry.getGameInstance().input.getMoveVector().x") > 0);
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        assert.equal(await gameEval("CircleVsGeometry.getGameInstance().input.joystick.active"), false);
      }
      await shot(profile.name);
      await gameEval("(() => {const g=CircleVsGeometry.getGameInstance();g.levelUpSystem.addLevels(1,g);})()");
      await delay(350);
      const choices = await gameEval(`(() => {
        const panel=document.querySelector('#screen-levelup .panel'), rect=panel.getBoundingClientRect();
        const cards=[...document.querySelectorAll('.levelup-card')];
        cards.at(-1).scrollIntoView({block:'nearest'});
        return {panelVisible:rect.x>=0&&rect.y>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight,
          cards:cards.length, buttonVisible:cards.at(-1).getBoundingClientRect().bottom<=innerHeight};
      })()`);
      assert.ok(choices.panelVisible && choices.buttonVisible && choices.cards > 0, `${profile.name}: upgrade choices clipped`);
      await gameEval("document.querySelector('.levelup-card:last-child').click()");
      await waitFor("CircleVsGeometry.getGameInstance().state === 'playing'");
      report.profiles.push({ ...profile, passed: true, multitouch: profile.touch ? 'Movement + dash and movement + ultimate passed' : 'Not applicable', menu, choices });
      console.log(`Passed ${profile.name}`);
    }

    // Run portal regressions in the last profile, which is inside an iframe.
    await gameEval("(() => {const g=CircleVsGeometry.getGameInstance();g._handleGameOver();window.__adMode='hold';document.getElementById('btn-restart-gameover').click();})()");
    assert.equal(await gameEval("CircleVsGeometry.getGameInstance().portal.adPending"), true,
      JSON.stringify(await gameEval("({ready:CircleVsGeometry.getGameInstance().portal.ready,sdk:!!window.CrazyGames,mode:window.__adMode,state:CircleVsGeometry.getGameInstance().state})")));
    assert.equal(await gameEval("document.getElementById('ad-overlay').hidden"), false);
    const before = await gameEval("CircleVsGeometry.getGameInstance().player.survivalTime");
    await gameEval("window.__adCallbacks.adStarted()");
    assert.equal(await gameEval("CircleVsGeometry.getGameInstance().sound.suspended"), true);
    await delay(100);
    assert.equal(await gameEval("CircleVsGeometry.getGameInstance().player.survivalTime"), before);
    await gameEval("window.__adCallbacks.adFinished()");
    await waitFor("CircleVsGeometry.getGameInstance().state === 'playing'");
    assert.equal(await gameEval("CircleVsGeometry.getGameInstance().sound.suspended"), false);
    report.portal.completedAd = 'Pause, UI lock, mute and restart passed';
    for (const mode of ['error', 'throw', 'reject']) {
      await gameEval(`(() => {const g=CircleVsGeometry.getGameInstance();g._handleGameOver();window.__adMode=${JSON.stringify(mode)};document.getElementById('btn-restart-gameover').click();})()`);
      await waitFor("CircleVsGeometry.getGameInstance().state === 'playing'");
      assert.equal(await gameEval("CircleVsGeometry.getGameInstance().portal.adPending"), false);
    }
    report.portal.unavailableAds = 'Disabled, thrown and rejected requests allow retry';
    await gameEval(`(() => {
      Storage.prototype.getItem=()=>{throw Error('Storage denied')};Storage.prototype.setItem=()=>{throw Error('Storage denied')};
      const g=CircleVsGeometry.getGameInstance();g.player.survivalTime=5000;g._handleGameOver();
    })()`);
    assert.equal(await gameEval("document.getElementById('screen-gameover').classList.contains('hidden')"), false);
    await gameEval("document.getElementById('btn-restart-gameover').click()");
    await waitFor("CircleVsGeometry.getGameInstance().state === 'playing'");
    report.portal.blockedStorage = 'Game over and retry passed in iframe with storage denied';
    report.portal.events = await gameEval("window.__portalEvents");
    assert.ok(report.portal.events.includes('gameplayStart') && report.portal.events.includes('gameplayStop'));

    // Full update + Canvas rendering benchmark. This is this machine's result, not mobile FPS.
    report.performance = await gameEval(`(async () => {
      const {createWeapon,WEAPON_CLASSES,PASSIVE_DEFS}=await import('/js/weapons/registry.js');
      const g=CircleVsGeometry.getGameInstance();g.start();g.onboarding.introDone=true;
      g.player.weapons=Object.keys(WEAPON_CLASSES).map(id=>{const weapon=createWeapon(id);weapon.level=weapon.maxLevel;return weapon;});
      for(const def of PASSIVE_DEFS){g.player.passives.push({id:def.id,level:def.maxLevel});def.apply(g.player,def.maxLevel);}
      const types=g.spawner._availableTypes(600);for(let i=0;i<260;i++)g._spawnEnemy(types[i%types.length],(i%20-10)*50,(Math.floor(i/20)-6)*50,1000,1,false);
      g.player.invulnTimer=600000;for(let i=0;i<120;i++)g._update(1/60);
      for(let i=0;i<200;i++){const angle=i*Math.PI*2/200;g.spawnProjectile({x:g.player.x+Math.cos(angle)*250,y:g.player.y+Math.sin(angle)*250,vx:Math.cos(angle)*180,vy:Math.sin(angle)*180,damage:1,radius:3,pierce:5,lifespan:10,color:'#83cfe5'});}
      for(let i=0;i<30;i++)g.spawnDeathBurst(g.player.x,g.player.y,'#fff');
      g.player.ultimate=new CircleVsGeometry.ultimates.OrbitLaser();g.player.ultimate.level=5;g.player.ultimate.tryActivate(g);
      const peak={enemies:g.enemyPool.activeCount,projectiles:g.projectilePool.activeCount,particles:g.particlePool.activeCount};
      const start=performance.now();
      for(let i=0;i<120;i++){g._update(1/60);peak.enemies=Math.max(peak.enemies,g.enemyPool.activeCount);peak.projectiles=Math.max(peak.projectiles,g.projectilePool.activeCount);peak.particles=Math.max(peak.particles,g.particlePool.activeCount);g._render();if(g.state==='level_up')g.levelUpSystem.applyChoice(g.levelUpSystem.buildOptions(g.player)[0],g);}
      return {frames:120,loadout:'Five maximum-level weapons, five passives and orbit ultimate',peak,averageUpdateAndRenderMs:(performance.now()-start)/120,device:'Host computer, Chromium headless'};
    })()`);
    assert.ok(Number.isFinite(report.performance.averageUpdateAndRenderMs));
    assert.deepEqual(runtimeErrors, []);
    console.log('Portal and blocked-storage regressions passed');
  } catch (error) {
    report.failures.push(error.stack || String(error));
    throw error;
  } finally {
    await writeFile(join(artifactDir, 'validation.json'), `${JSON.stringify(report, null, 2)}\n`);
    if (browser) await browser.close();
    await new Promise(resolveClose => server.close(resolveClose));
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
