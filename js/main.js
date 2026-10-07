// ============================================================
// MAIN — bootstraps the Game instance and wires up the DOM
// buttons that live outside the canvas (menus, pause, restart).
// ============================================================

import { Game } from './core/Game.js';
import { getLanguage, setLanguage, bindStaticTranslations } from './ui/i18n.js';
import { GameplayUI } from './ui/GameplayUI.js';
import { CrazyGamesPortal, loadCrazyGamesSDK } from './platform/CrazyGamesPortal.js';

let gameInstance = null;

export function getGameInstance() {
  return gameInstance;
}

window.addEventListener('DOMContentLoaded', async () => {
  const translateStatic = bindStaticTranslations();
  translateStatic();
  const startButton = document.getElementById('btn-start');
  startButton.disabled = true;
  const sdk = await loadCrazyGamesSDK(document, window);
  const portal = new CrazyGamesPortal({ sdk });
  await portal.init();
  const systemInfo = portal.systemInfo;
  if (systemInfo?.locale) setLanguage(systemInfo.locale.toLowerCase().startsWith('es') ? 'es' : 'en');
  translateStatic();
  portal.loadingStart();
  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas, { portal });
  game.pageHidden = document.hidden;
  gameInstance = game;
  const touch = ['mobile', 'tablet'].includes(systemInfo?.device?.type)
    || navigator.maxTouchPoints > 0 || window.matchMedia('(any-pointer: coarse)').matches;
  game.gameplayUI = new GameplayUI(game, { touch });
  const wrap = document.getElementById('game-wrap');
  const resize = () => {
    game.resize(wrap.clientWidth, wrap.clientHeight);
    const safeStyle = getComputedStyle(document.getElementById('screen-menu'));
    game.safeArea = { top: parseFloat(safeStyle.paddingTop) || 0,
      bottom: parseFloat(safeStyle.paddingBottom) || 0, right: parseFloat(safeStyle.paddingRight) || 0,
      left: parseFloat(safeStyle.paddingLeft) || 0 };
  };
  resize();
  canvas.dataset.ready = 'true';
  game.gameplayUI.update();
  startButton.disabled = false;
  portal.loadingStop();
  window.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(wrap);
  document.addEventListener('fullscreenchange', resize);

  const soundVolume = document.getElementById('sound-volume');
  const soundPercent = document.getElementById('sound-percent');
  const updateSoundVolume = () => {
    const percent = Math.round(game.sound.volume * 100);
    soundVolume.value = String(percent);
    soundVolume.style.setProperty('--volume', `${percent}%`);
    soundPercent.value = `${percent}%`;
    soundVolume.setAttribute('aria-valuetext', `${percent}%`);
  };
  updateSoundVolume();
  const languageSelect = document.getElementById('language-select');
  languageSelect.value = getLanguage();
  languageSelect.addEventListener('change', () => {
    setLanguage(languageSelect.value);
    translateStatic();
    updateSoundVolume();
  });
  languageSelect.addEventListener('keydown', (event) => event.stopPropagation());
  languageSelect.addEventListener('keyup', (event) => event.stopPropagation());
  languageSelect.addEventListener('focus', () => game.input.reset());
  document.getElementById('btn-options').addEventListener('click', () => game.menu.showOptions());
  document.getElementById('btn-pause-options').addEventListener('click', () => game.menu.showOptions());
  document.getElementById('btn-options-back').addEventListener('click', () => {
    if (game.state === 'paused') game.menu.showPause();
    else game.menu.showMenu();
  });
  soundVolume.addEventListener('input', () => {
    game.sound.unlock();
    game.sound.setVolume(Number(soundVolume.value) / 100);
    updateSoundVolume();
  });
  // Arrow keys adjust volume without moving the player.
  soundVolume.addEventListener('keydown', (event) => event.stopPropagation());
  soundVolume.addEventListener('keyup', (event) => event.stopPropagation());
  soundVolume.addEventListener('focus', () => game.input.reset());
  window.addEventListener('pointerdown', () => game.sound.unlock());
  window.addEventListener('keydown', () => game.sound.unlock());
  document.addEventListener('visibilitychange', () => {
    game.pageHidden = document.hidden;
    if (document.hidden) {
      game.sound.stopAll();
      if (game.state === 'playing') game.togglePause();
    } else if (game.state === 'playing' && !portal.adPending) {
      // An async upgrade choice may have finished while the page was hidden.
      game.togglePause();
    }
    portal.setGameplay(!document.hidden && game.state === 'playing');
  });
  // iOS requires a completed touch gesture to resume interrupted audio.
  window.addEventListener('touchend', () => game.sound.unlock(), { passive: true });
  window.addEventListener('blur', () => {
    if (!portal.adPending && game.state === 'playing') game.togglePause();
  });

  const adOverlay = document.getElementById('ad-overlay');
  const adStatus = document.getElementById('ad-status');
  portal.onAdState = (pending, started) => {
    game.input.reset();
    game.clock.reset();
    game._lastTimestamp = null;
    game.sound.setSuspended(started);
    adOverlay.hidden = !pending;
    adStatus.textContent = started ? (getLanguage() === 'es' ? 'Anuncio en curso…' : 'Ad playing…')
      : (getLanguage() === 'es' ? 'Preparando anuncio…' : 'Preparing ad…');
    for (const screen of Object.values(game.menu.screens)) screen.inert = pending;
    if (!pending && document.hidden && game.state === 'playing') game.togglePause();
    game.gameplayUI.update();
  };

  document.getElementById('btn-start').addEventListener('click', () => game.start());
  document.getElementById('btn-resume').addEventListener('click', () => game.togglePause());
  document.getElementById('btn-restart-pause').addEventListener('click', () => game.start());
  let retrying = false;
  document.getElementById('btn-restart-gameover').addEventListener('click', async () => {
    if (retrying || game.state !== 'game_over') return;
    retrying = true;
    try {
      if (portal.ready) await portal.requestMidgame();
      game.start();
      if (document.hidden) game.togglePause();
    } finally { retrying = false; }
  });

  const pauseBtn = document.getElementById('btn-pause-touch');
  pauseBtn.addEventListener('click', () => game.togglePause());
});
