// ============================================================
// MENU MANAGER — all DOM overlay screens live here. The canvas
// only ever renders gameplay + HUD; anything clickable/text-heavy
// (menus, level-up cards, game over stats) is plain DOM, which is
// simpler to lay out, style, and make accessible than canvas UI.
// ============================================================

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
  }

  hideAll() {
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
        <div class="levelup-icon">${opt.icon}</div>
        <div class="levelup-title">${opt.title}</div>
        <div class="levelup-desc">${opt.description}</div>
      `;
      card.addEventListener('click', () => opt.onPick());
      this.levelupOptionsEl.appendChild(card);
    });
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
