const DATABASE_NAME = "qadri-poster-maker-file-handles";
const STORE_NAME = "handles";
const HANDLE_ID = "current-project";

function openDatabase(indexedDB = globalThis.indexedDB) {
  return new Promise((resolve, reject) => {
    if (!indexedDB) { reject(new Error("IndexedDB is unavailable.")); return; }
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open project file handle storage."));
  });
}

export async function storeProjectFileHandle(handle, indexedDB = globalThis.indexedDB) {
  const database = await openDatabase(indexedDB);
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put({ id: HANDLE_ID, handle });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Could not save the file handle."));
      transaction.onabort = () => reject(transaction.error || new Error("Saving the file handle was canceled."));
    });
  } finally { database.close(); }
}

export async function restoreProjectFileHandle(indexedDB = globalThis.indexedDB) {
  const database = await openDatabase(indexedDB);
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(HANDLE_ID);
      request.onsuccess = () => resolve(request.result?.handle ?? null);
      request.onerror = () => reject(request.error || new Error("Could not read the stored file handle."));
    });
  } finally { database.close(); }
}
