// ============================================================
// MENU MANAGER — all DOM overlay screens live here. The canvas
// only ever renders gameplay + HUD; anything clickable/text-heavy
// (menus, level-up cards, game over stats) is plain DOM, which is
// simpler to lay out, style, and make accessible than canvas UI.
// ============================================================

import { createUpgradeIcon } from './UpgradeIcon.js';

export class MenuManager {
  constructor() {
    this.screens = {
      menu: document.getElementById('screen-menu'),
      levelup: document.getElementById('screen-levelup'),
      pause: document.getElementById('screen-pause'),
      gameover: document.getElementById('screen-gameover'),
    };
    this.levelupOptionsEl = document.getElementById('levelup-options');
    this.gameoverStatsEl = document.getElementById('gameover-stats');
    this.levelupAnimations = [];
    this.levelupVersion = 0;
    this.picking = false;
  }

  hideAll() {
    this.levelupVersion += 1;
    this.picking = false;
    for (const animation of this.levelupAnimations) animation.cancel();
    this.levelupAnimations = [];
    for (const el of Object.values(this.screens)) el.classList.add('hidden');
  }

  showMenu() {
    this.hideAll();
    this.screens.menu.classList.remove('hidden');
  }

  showPause() {
    this.hideAll();
    this.screens.pause.classList.remove('hidden');
  }

  /**
   * @param options array of { title, icon, description, onPick }
   */
  showLevelUp(options) {
    this.hideAll();
    this.screens.levelup.classList.remove('hidden');
    this.levelupOptionsEl.innerHTML = '';

    options.forEach((opt) => {
      const card = document.createElement('button');
      card.className = 'levelup-card';
      card.innerHTML = `
        ${opt.tag ? `<div class="levelup-tag">${opt.tag}</div>` : ''}
        <div class="levelup-title">${opt.title}</div>
        <div class="levelup-desc">${opt.description}</div>
      `;
      card.insertBefore(createUpgradeIcon(opt), card.querySelector('.levelup-title'));
      card.addEventListener('click', async () => {
        if (this.picking) return;
        this.picking = true;
        const version = this.levelupVersion;
        for (const button of this.levelupOptionsEl.children) button.disabled = true;
        await this.animateLevelUp(true);
        if (version === this.levelupVersion) opt.onPick();
      });
      this.levelupOptionsEl.appendChild(card);
    });
    this.animateLevelUp(false);
  }

  animateLevelUp(leaving) {
    const screen = this.screens.levelup;
    const panel = screen.querySelector('.panel');
    // Start the exit from the current position even if a card is picked during entry.
    const opacity = getComputedStyle(screen).opacity;
    const transform = getComputedStyle(panel).transform;
    for (const animation of this.levelupAnimations) animation.cancel();
    this.levelupAnimations = [];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !panel.animate) {
      return Promise.resolve();
    }
    const timing = { duration: leaving ? 220 : 320, easing: leaving ? 'ease-in' : 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'both' };
    this.levelupAnimations = [
      screen.animate(leaving ? [{ opacity }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }], timing),
      panel.animate(leaving
        ? [{ transform }, { transform: 'translateY(70px)' }]
        : [{ transform: 'translateY(90px)' }, { transform: 'translateY(0)' }], timing),
    ];
    return Promise.all(this.levelupAnimations.map((animation) => animation.finished.catch(() => {})));
  }

  showGameOver({ level, time, kills, isHighScore }) {
    this.hideAll();
    this.screens.gameover.classList.remove('hidden');
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60).toString().padStart(2, '0');
    this.gameoverStatsEl.innerHTML = `
      ${isHighScore ? '<div class="new-best">New best time!</div>' : ''}
      <div class="stat-row"><span>Survived</span><strong>${mins}:${secs}</strong></div>
      <div class="stat-row"><span>Level reached</span><strong>${level}</strong></div>
      <div class="stat-row"><span>Enemies slain</span><strong>${kills}</strong></div>
    `;
  }
}
