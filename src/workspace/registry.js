// Artifact registry stored in IndexedDB.
//
// The registry is the metadata index of the artifact bus; the actual bytes live
// as files under OPFS at path `artifacts/<course>/<artifactId>/<file>`. An entry
// describes WHAT an artifact is and WHERE its primary file sits, so any course
// can discover and consume another course's artifact through a stable contract.

const DB_NAME = "it-study-lab";
const DB_VERSION = 1;
const STORE = "artifacts";

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("course", "course", { unique: false });
        store.createIndex("type", "type", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function tx(mode, run) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    const result = run(store);
    transaction.oncomplete = () => resolve(result && "result" in result ? result.result : result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }));
}

export function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// A registry record. `files` lists the OPFS paths that belong to the artifact;
// `primary` is the file other courses should open by default.
export function makeRecord({ id, course, type, title, description, tags, files, primary, meta }) {
  const now = Date.now();
  return {
    id: id || makeId(),
    course,
    type,
    title: title || "",
    description: description || "",
    tags: Array.isArray(tags) ? tags : [],
    files: Array.isArray(files) ? files : [],
    primary: primary || files?.[0] || "",
    meta: meta || {},
    createdAt: now,
    updatedAt: now
  };
}

export function put(record) {
  record.updatedAt = Date.now();
  return tx("readwrite", (store) => store.put(record));
}

export function get(id) {
  return tx("readonly", (store) => store.get(id));
}

export function remove(id) {
  return tx("readwrite", (store) => store.delete(id));
}

export function all() {
  return tx("readonly", (store) => store.getAll());
}

// List artifacts filtered by course and/or type. Empty filter means "any".
export async function query({ course = "", type = "" } = {}) {
  const items = await all();
  return items
    .filter((item) => (!course || item.course === course) && (!type || item.type === type))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
