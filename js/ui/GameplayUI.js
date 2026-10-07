import { DASH, ULTIMATE } from '../config.js';
import { STATE } from '../core/GameState.js';
import { t } from './i18n.js';

const HINTS = {
  move: ['Muévete con WASD o flechas. Tus armas disparan solas.', 'Arrastra para moverte. Tus armas disparan solas.'],
  xp: ['Recoge las gemas azules para subir de nivel y elegir mejoras.'],
  dash: ['Usa Espacio o Shift para esquivar con el dash.', 'Pulsa DASH para esquivar sin soltar el joystick.'],
  ultimate: ['¡Definitiva lista! Pulsa Q, E o R para activarla.', '¡Definitiva lista! Pulsa el botón ULT.'],
};

export class GameplayUI {
  constructor(game, { touch = false } = {}) {
    this.game = game;
    this.touch = touch;
    this.wrap = document.getElementById('game-wrap');
    this.controls = document.getElementById('touch-controls');
    this.dash = document.getElementById('btn-dash-touch');
    this.ultimate = document.getElementById('btn-ultimate-touch');
    this.dashStatus = document.getElementById('dash-status');
    this.ultimateStatus = document.getElementById('ultimate-status');
    this.hint = document.getElementById('tutorial-hint');
    this.pause = document.getElementById('btn-pause-touch');
    this.dashHint = document.getElementById('hint-dash');
    this.ultimateHint = document.getElementById('hint-ultimate');
    this.bindAction(this.dash, () => game.input.queueDash());
    this.bindAction(this.ultimate, () => game.input.queueUltimate());
    game.canvas.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch') this.setTouch(true);
    });
    this.setTouch(touch);
  }

  setTouch(touch) {
    this.touch = touch;
    this.game.touchControls = touch;
    this.wrap.dataset.touch = String(touch);
  }

  bindAction(button, action) {
    const activate = () => {
      if (button.disabled || this.game.state !== STATE.PLAYING || this.game.portal?.adPending) return;
      this.game.sound.unlock();
      action();
    };
    // A second finger can activate an action without ending joystick pointer capture.
    button.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      activate();
    });
    button.addEventListener('click', (event) => {
      // Keyboard/assistive clicks; pointer actions already ran on pointerdown.
      if (event.detail === 0) activate();
    });
  }

  update() {
    const { game } = this;
    const playing = game.state === STATE.PLAYING && !game.portal?.adPending;
    this.controls.hidden = !this.touch || !playing;
    this.pause.hidden = !playing;
    this.text(this.dashHint, t(this.touch ? 'Botón DASH' : 'Espacio o Shift'));
    this.text(this.ultimateHint, t(this.touch ? 'Botón ULT (nivel 5)' : 'Q, E o R (se desbloquea al nivel 5)'));
    const player = game.player;
    this.dash.disabled = !playing || player.dashCharges <= 0 || player.dashActive > 0;
    this.text(this.dashStatus, player.dashCharges > 0
      ? `${player.dashCharges}/${player.dashMaxCharges}`
      : `${Math.max(0, (DASH.rechargeMs - player.dashRecharge) / 1000).toFixed(1)}s`);
    const ultimate = player.ultimate;
    this.ultimate.disabled = !playing || !ultimate?.isReady();
    this.text(this.ultimateStatus, !ultimate ? `Lv.${ULTIMATE.unlockLevel}`
      : ultimate.isReady() ? t('Listo')
        : `${Math.max(0, ultimate.cooldownTimer / 1000).toFixed(1)}s`);
    const hint = HINTS[game.onboarding.message];
    this.hint.hidden = !playing || !hint;
    if (hint) this.text(this.hint, t(hint[this.touch && hint.length > 1 ? 1 : 0]));
  }

  text(element, value) {
    if (element.textContent !== value) element.textContent = value;
  }
}
