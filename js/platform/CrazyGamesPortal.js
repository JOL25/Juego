import { storage } from '../storage.js';

export const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

// The offline build never loads the SDK. Portal builds opt in via a meta tag.
export async function loadCrazyGamesSDK(document, host = globalThis, timeoutMs = 5000) {
  if (host.CrazyGames?.SDK) return host.CrazyGames.SDK;
  if (!document.querySelector('meta[name="game-portal"][content="crazygames"]')) return null;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      script.onload = script.onerror = null;
      resolve(host.CrazyGames?.SDK ?? null);
    };
    const timer = setTimeout(finish, timeoutMs);
    script.src = SDK_URL;
    script.async = true;
    script.onload = finish;
    script.onerror = finish;
    document.head.appendChild(script);
  });
}

export class CrazyGamesPortal {
  constructor({ sdk = null, store = storage, initTimeoutMs = 5000 } = {}) {
    this.sdk = sdk;
    this.store = store;
    this.initTimeoutMs = initTimeoutMs;
    this.ready = false;
    this.playing = false;
    this.reportedPlaying = false;
    this.adPending = false;
    this.adStarted = false;
    this.onAdState = () => {};
  }

  async init() {
    if (!this.sdk) return false;
    let timer;
    try {
      await Promise.race([
        Promise.resolve().then(() => this.sdk.init()),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('SDK initialization timeout')), this.initTimeoutMs); }),
      ]);
      if (!['local', 'crazygames'].includes(this.sdk.environment)) return false;
      this.ready = true;
      try { if (this.sdk.data) this.store.useBackend(this.sdk.data); } catch { /* Optional cloud saving. */ }
      this._syncGameplay();
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  get systemInfo() {
    if (!this.ready) return null;
    try { return this.sdk.user?.systemInfo ?? null; } catch { return null; }
  }

  loadingStart() { this._event('loadingStart'); }
  loadingStop() { this._event('loadingStop'); }

  setGameplay(playing) {
    this.playing = playing;
    this._syncGameplay();
  }

  _event(name) {
    if (!this.ready) return;
    try { this.sdk.game?.[name]?.(); } catch { /* A portal failure cannot stop the game. */ }
  }

  _syncGameplay() {
    const playing = this.playing && !this.adPending;
    if (!this.ready || playing === this.reportedPlaying) return;
    this._event(playing ? 'gameplayStart' : 'gameplayStop');
    this.reportedPlaying = playing;
  }

  requestMidgame() {
    // Only called on retry after game over, never during active gameplay.
    if (!this.ready || !this.sdk.ad?.requestAd || this.playing) return Promise.resolve(false);
    if (this.adPending) return this.adPromise;
    this.adPending = true;
    this._syncGameplay();
    this.onAdState(true, false);
    this.adPromise = new Promise((resolve) => {
      let settled = false;
      const finish = (shown) => {
        if (settled) return;
        settled = true;
        this.adPending = false;
        this.adStarted = false;
        this.onAdState(false, false);
        this._syncGameplay();
        resolve(shown);
      };
      const callbacks = {
        adStarted: () => {
          if (settled) return;
          this.adStarted = true;
          this.onAdState(true, true);
        },
        adFinished: () => finish(true),
        adError: () => finish(false),
      };
      try {
        const request = this.sdk.ad.requestAd('midgame', callbacks);
        // SDK versions may also reject a Promise rather than calling adError.
        request?.catch?.(() => finish(false));
      } catch { finish(false); }
    });
    return this.adPromise;
  }
}
