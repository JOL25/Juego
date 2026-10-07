import { storage } from '../storage.js';

const INTRO_KEY = 'geometry_tutorial_intro';
const ULTIMATE_KEY = 'geometry_tutorial_ultimate';

export class Onboarding {
  constructor(store = storage) {
    this.store = store;
    this.reset();
  }

  reset() {
    this.elapsed = 0;
    this.introDone = this.store.getItem(INTRO_KEY) === 'done';
    this.ultimateDone = this.store.getItem(ULTIMATE_KEY) === 'done';
    this.ultimateElapsed = 0;
    this.message = null;
  }

  update(dt, player, ultimateActivated = false) {
    this.elapsed += dt;
    this.message = null;
    if (!this.ultimateDone && player.ultimate) {
      this.ultimateElapsed += dt;
      if (ultimateActivated || this.ultimateElapsed >= 7) {
        this.ultimateDone = true;
        this.store.setItem(ULTIMATE_KEY, 'done');
      } else {
        this.message = 'ultimate';
        return;
      }
    }
    if (this.introDone) return;
    if (this.elapsed < 5) this.message = 'move';
    else if (this.elapsed < 11) this.message = 'xp';
    else if (this.elapsed < 18) this.message = 'dash';
    else {
      this.introDone = true;
      this.store.setItem(INTRO_KEY, 'done');
    }
  }
}
