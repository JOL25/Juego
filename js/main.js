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

  const soundButton = document.getElementById('btn-sound');
  const updateSoundButton = () => {
    soundButton.textContent = game.sound.muted ? 'Sonido: OFF' : 'Sonido: ON';
    soundButton.setAttribute('aria-pressed', String(!game.sound.muted));
  };
  updateSoundButton();
  soundButton.addEventListener('click', () => {
    game.sound.unlock();
    game.sound.setMuted(!game.sound.muted);
    updateSoundButton();
  });
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
