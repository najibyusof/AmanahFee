/**
 * Secure storage wrapper.
 * Primary: cordova-plugin-secure-storage (Android Keystore-backed encrypted store).
 * Fallbacks: in-memory (browser dev) — never plain localStorage for the token.
 */
const STORE_NAME = 'ClassPay';
let ss = null;
let mode = 'pending'; // 'secure' | 'memory'
const mem = new Map();

export const storage = {
  get mode() { return mode; },

  init() {
    return new Promise((resolve) => {
      try {
        const S = (window.cordova && window.cordova.plugins && window.cordova.plugins.SecureStorage)
          || window.SecureStorage;
        if (window.cordova && S) {
          ss = new S(
            () => { mode = 'secure'; resolve(); },
            () => { mode = 'memory'; resolve(); },
            STORE_NAME,
          );
        } else {
          mode = 'memory';
          resolve();
        }
      } catch (e) {
        mode = 'memory';
        resolve();
      }
    });
  },

  get(key) {
    return new Promise((resolve) => {
      if (mode === 'secure' && ss) {
        ss.get((v) => resolve(v), () => resolve(null), key);
      } else {
        resolve(mem.has(key) ? mem.get(key) : null);
      }
    });
  },

  set(key, value) {
    return new Promise((resolve) => {
      if (mode === 'secure' && ss) {
        ss.set(() => resolve(true), () => resolve(false), key, String(value ?? ''));
      } else {
        mem.set(key, String(value ?? ''));
        resolve(true);
      }
    });
  },

  remove(key) {
    return new Promise((resolve) => {
      if (mode === 'secure' && ss) {
        ss.remove(() => resolve(true), () => resolve(false), key);
      } else {
        mem.delete(key);
        resolve(true);
      }
    });
  },
};
