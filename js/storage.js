// Storage is optional in private browsing and third-party iframes.
// Keep a session fallback even when a browser or cloud write is denied.
export class SafeStorage {
  constructor(getLocal = () => globalThis.localStorage) {
    this.getLocal = getLocal;
    this.memory = new Map();
    this.written = new Set();
    this.backend = null;
  }

  getItem(key) {
    if (this.written.has(key)) return this.memory.get(key);
    for (const getStore of this.backend ? [() => this.backend] : [this.getLocal]) {
      try {
        const value = getStore()?.getItem(key);
        if (value != null) {
          this.memory.set(key, String(value));
          return String(value);
        }
      } catch { /* Try the next store. */ }
    }
    return this.memory.get(key) ?? null;
  }

  setItem(key, value) {
    const text = String(value);
    this.memory.set(key, text);
    this.written.add(key);
    for (const getStore of this.backend ? [() => this.backend] : [this.getLocal]) {
      try { getStore()?.setItem(key, text); } catch { /* Session fallback. */ }
    }
  }

  useBackend(backend) {
    this.backend = backend;
  }
}

export const storage = new SafeStorage();
