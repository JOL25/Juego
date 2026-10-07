import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { createStaticServer } from './dev-server.js';

const report = { webkit: [], realSdk: null, limitations: 'WebKit on Windows and emulated touch are not physical iPhone/Safari tests', failures: [] };
const server = await createStaticServer({ port: 0 });
const origin = `http://127.0.0.1:${server.address().port}`;
await mkdir('qa', { recursive: true });
let browser;
try {
  browser = await webkit.launch({ headless: true });
  for (const profile of [
    { name: 'webkit-desktop', width: 907, height: 510, touch: false },
    { name: 'webkit-iphone-viewport', width: 390, height: 844, touch: true },
    { name: 'webkit-tablet-iframe', width: 768, height: 1024, touch: true, iframe: true },
  ]) {
    const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch });
    await context.route('**/sdk.crazygames.com/**', route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/${profile.iframe ? 'scripts/qa/iframe.html' : 'crazygames/juego/index.html'}`);
    const frame = profile.iframe ? page.frames().find(candidate => candidate.url().endsWith('/crazygames/juego/index.html')) : page.mainFrame();
    assert.ok(frame);
    await frame.waitForFunction(() => document.getElementById('game-canvas')?.dataset.ready === 'true');
    const menu = await frame.locator('#screen-menu .panel').boundingBox();
    assert.ok(menu.x >= 0 && menu.y >= 0 && menu.x + menu.width <= profile.width && menu.y + menu.height <= profile.height);
    await frame.locator('#btn-options').click();
    await frame.locator('#language-select').selectOption('es');
    await frame.locator('#sound-volume').evaluate(input => { input.value = '37'; input.dispatchEvent(new Event('input')); });
    await frame.locator('#btn-options-back').click();
    await frame.locator('#btn-start').click();
    await frame.evaluate(() => { CircleVsGeometry.getGameInstance().player.invulnTimer = 600000; });
    await frame.waitForFunction(() => !document.getElementById('tutorial-hint').hidden);
    assert.match(await frame.locator('#tutorial-hint').textContent(), /disparan solas/);
    if (profile.touch) {
      await frame.locator('#btn-dash-touch').tap();
      await frame.waitForFunction(() => CircleVsGeometry.getGameInstance().player.dashCharges === 0);
      await frame.evaluate(() => { const g=CircleVsGeometry.getGameInstance();g.player.level=5;g.player.ultimate=new CircleVsGeometry.ultimates.SuperPierceShot();g.gameplayUI.update(); });
      await frame.locator('#btn-ultimate-touch').tap();
      await frame.waitForFunction(() => CircleVsGeometry.getGameInstance().player.ultimate.cooldownTimer > 0);
    } else {
      const start = await frame.evaluate(() => CircleVsGeometry.getGameInstance().player.x);
      await page.keyboard.down('KeyD');
      await frame.waitForFunction(x => CircleVsGeometry.getGameInstance().player.x > x, start);
      await page.keyboard.up('KeyD');
    }
    await page.screenshot({ path: `qa/${profile.name}.png` });
    await frame.locator('#btn-pause-touch').click();
    assert.equal(await frame.evaluate(() => CircleVsGeometry.getGameInstance().state), 'paused');
    await frame.locator('#btn-resume').click();
    await frame.evaluate(() => {const g=CircleVsGeometry.getGameInstance();g.levelUpSystem.addLevels(1,g);});
    await frame.locator('.levelup-card').last().click();
    await frame.waitForFunction(() => CircleVsGeometry.getGameInstance().state === 'playing');
    await frame.evaluate(() => {
      Storage.prototype.getItem=()=>{throw Error('Denied')};Storage.prototype.setItem=()=>{throw Error('Denied')};
      const g=CircleVsGeometry.getGameInstance();g.player.survivalTime=999;g._handleGameOver();
    });
    assert.equal(await frame.locator('#screen-gameover').isVisible(), true);
    await frame.locator('#btn-restart-gameover').click();
    await frame.waitForFunction(() => CircleVsGeometry.getGameInstance().state === 'playing');
    assert.equal(await frame.evaluate(() => CircleVsGeometry.getGameInstance().sound.volume), 0.37);
    assert.deepEqual(errors, []);
    report.webkit.push({ ...profile, passed: true, checks: 'Menu, language, volume, gameplay, action input, pause, upgrade, denied storage and retry' });
    console.log(`Passed ${profile.name}`);
    await context.close();
  }
  await browser.close();
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 907, height: 510 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/crazygames/juego/index.html`);
  await page.waitForFunction(() => document.getElementById('game-canvas')?.dataset.ready === 'true');
  report.realSdk = await page.evaluate(() => {
    const g=CircleVsGeometry.getGameInstance();
    return {loaded:!!window.CrazyGames?.SDK,ready:g.portal.ready,environment:window.CrazyGames?.SDK?.environment};
  });
  assert.equal(report.realSdk.ready, true, 'Real SDK failed initialization; see qa/engines.json');
  assert.equal(report.realSdk.environment, 'local');
  await page.locator('#btn-start').click();
  await page.evaluate(() => {
    const g=CircleVsGeometry.getGameInstance();g.player.survivalTime=12;g._handleGameOver();
    window.__adStates=[];const notify=g.portal.onAdState;
    g.portal.onAdState=(...state)=>{window.__adStates.push(state);notify(...state);};
  });
  await page.locator('#btn-restart-gameover').click();
  await page.waitForFunction(() => CircleVsGeometry.getGameInstance().state === 'playing', null, { timeout: 20000 });
  report.realSdk.adStates = await page.evaluate(() => window.__adStates);
  report.realSdk.retryPassed = true;
  assert.equal(await page.evaluate(() => CircleVsGeometry.getGameInstance().portal.adPending), false);
  assert.equal(await page.evaluate(() => CircleVsGeometry.getGameInstance().sound.suspended), false);
  assert.deepEqual(errors, []);
  console.log('Passed real CrazyGames SDK v3 initialization and local ad/retry flow');
} catch (error) {
  report.failures.push(error.stack || String(error));
  throw error;
} finally {
  await writeFile('qa/engines.json', `${JSON.stringify(report, null, 2)}\n`);
  if (browser) await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}
