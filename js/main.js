// ============================================================
// MAIN — bootstraps the Game instance and wires up the DOM
// buttons that live outside the canvas (menus, pause, restart).
// ============================================================

import { Game } from './core/Game.js';

let gameInstance = null;

export function getGameInstance() {
  return gameInstance;
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas);
  gameInstance = game;

  const soundVolume = document.getElementById('sound-volume');
  const soundPercent = document.getElementById('sound-percent');
  const updateSoundVolume = () => {
    const percent = Math.round(game.sound.volume * 100);
    soundVolume.value = String(percent);
    soundPercent.value = `${percent}%`;
    soundVolume.setAttribute('aria-valuetext', `${percent}%`);
  };
  updateSoundVolume();
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
    if (document.hidden) {
      game.sound.stopAll();
      if (game.state === 'playing') game.togglePause();
    }
  });

  document.getElementById('btn-start').addEventListener('click', () => game.start());
  document.getElementById('btn-resume').addEventListener('click', () => game.togglePause());
  document.getElementById('btn-restart-pause').addEventListener('click', () => game.start());
  document.getElementById('btn-restart-gameover').addEventListener('click', () => game.start());

  const pauseBtn = document.getElementById('btn-pause-touch');
  pauseBtn.addEventListener('click', () => game.togglePause());
  document.getElementById('btn-dash').addEventListener('click', (e) => {
    e.preventDefault();
    game.input.queueDash();
  });
  document.getElementById('btn-ult').addEventListener('click', (e) => {
    e.preventDefault();
    game.input.queueUltimate();
  });
});
