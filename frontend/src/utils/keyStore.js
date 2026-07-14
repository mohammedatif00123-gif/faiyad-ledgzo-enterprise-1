/**
 * IndexedDB storage for local E2EE private keys.
 * We use IndexedDB instead of localStorage because it can store objects natively and has larger capacity,
 * and it's slightly more obscure to typical XSS (though still accessible from the same origin).
 */

const DB_NAME = 'LedgzoE2EEStore';
const STORE_NAME = 'keys';
const DB_VERSION = 1;

let dbPromise = null;

const initDB = () => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
        }
      };
    });
  }
  return dbPromise;
};

export const storePrivateKey = async (userId, jwkKey) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put({ userId, privateKey: jwkKey, timestamp: Date.now() });

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

export const getPrivateKey = async (userId) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(userId);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.privateKey);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const deletePrivateKey = async (userId) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(userId);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};
