(function () {
  const DB_NAME = 'soho-marks-demo';
  const DB_VERSION = 1;
  let dbPromise = null;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
          if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return dbPromise;
  }

  function tx(store, mode) {
    return open().then(db => db.transaction(store, mode).objectStore(store));
  }

  async function get(key) {
    const store = await tx('kv', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function set(key, value) {
    const store = await tx('kv', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function putBlob(id, blob) {
    const store = await tx('blobs', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(blob, id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function getBlob(id) {
    const store = await tx('blobs', 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function state() {
    let current = await get('state');
    if (!current) {
      current = await fetch('data/seed.demo.json').then(response => response.json());
      await set('state', current);
    }
    return current;
  }

  async function save(current) {
    current.updatedAt = new Date().toISOString();
    await set('state', current);
  }

  function identity() {
    try {
      return JSON.parse(localStorage.getItem('soho-demo-identity') || 'null');
    } catch {
      return null;
    }
  }

  function setIdentity(value) {
    localStorage.setItem('soho-demo-identity', JSON.stringify(value));
  }

  window.DemoStore = { state, save, getBlob, putBlob, identity, setIdentity };
})();
