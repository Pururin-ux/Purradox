// Browser tabs share one origin lock. Keep the critical section synchronous:
// network requests, rendering and user input must never hold the lock.
let insideWrite = false;
const lockName = "purradox-progress-write";

function run(operation) {
  insideWrite = true;
  try { return { value: operation() }; }
  finally { insideWrite = false; }
}

let coordinator;
function indexedWrite(database, operation) {
  if (!coordinator) {
    coordinator = new Promise((resolve, reject) => {
      const request = database.open(lockName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore("writers");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch(error => { coordinator = undefined; throw error; });
  }
  return coordinator.then(db => new Promise((resolve, reject) => {
    const txn = db.transaction("writers", "readwrite");
    const ready = txn.objectStore("writers").get(0);
    ready.onsuccess = () => {
      try { resolve(run(operation).value); } catch (error) { reject(error); }
    };
    txn.onabort = () => reject(txn.error);
    ready.onerror = () => reject(ready.error);
  }));
}

export function withProgressWrite(operation) {
  if (insideWrite) return operation();
  const browser = globalThis.window;
  if (browser?.navigator?.locks) {
    return browser.navigator.locks.request(lockName, () => run(operation)).then(result => result.value);
  }
  if (browser?.indexedDB) return indexedWrite(browser.indexedDB, operation);
  // In-memory hosts and older storage implementations retain the guarded
  // synchronous save path. No browser-wide lock is available in those hosts.
  return operation();
}
