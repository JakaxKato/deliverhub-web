export function installBrowser() {
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.localStorage;
  const entries = new Map();
  const storage = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: (key) => entries.delete(key),
    clear: () => entries.clear(),
  };
  const browser = new EventTarget();
  browser.location = { pathname: "/", href: "/" };
  globalThis.window = browser;
  globalThis.localStorage = storage;

  function emitStorage(key, storageArea = storage) {
    const event = new Event("storage");
    Object.defineProperties(event, { key: { value: key }, storageArea: { value: storageArea } });
    browser.dispatchEvent(event);
  }

  return {
    browser,
    storage,
    emitStorage,
    switchToken: (token) => {
      if (token === null) storage.removeItem("nodewave_token");
      else storage.setItem("nodewave_token", token);
      emitStorage("nodewave_token");
    },
    restore: () => {
      globalThis.window = originalWindow;
      globalThis.localStorage = originalStorage;
    },
  };
}
