// Thin async wrapper over the Origin Private File System (OPFS).
// OPFS is a real per-origin directory tree persisted on the user's disk;
// it survives reloads/restarts and works offline. Emscripten-based engines
// (Pyodide, sql.js, PGlite via opfs-ahp, DuckDB, v86) can mount this same root,
// which is what turns OPFS into the shared backend of the artifact bus.
//
// All paths are POSIX-like ("artifacts/code/script.py"). Leading slashes are
// stripped; "." and ".." are rejected to keep writes inside the origin root.

const ROOT = () => navigator.storage.getDirectory();

export function isSupported() {
  return typeof navigator !== "undefined" && !!navigator.storage && typeof navigator.storage.getDirectory === "function";
}

export async function requestPersistence() {
  if (!navigator.storage || !navigator.storage.persist) return false;
  try {
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function usage() {
  if (!navigator.storage?.estimate) return { usage: 0, quota: 0 };
  const { usage: used = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage: used, quota };
}

function normalize(path) {
  return String(path)
    .split("/")
    .map((seg) => seg.trim())
    .filter((seg) => seg && seg !== "." && seg !== "..")
    .join("/");
}

export function joinPath(...parts) {
  return normalize(parts.filter(Boolean).join("/"));
}

// Walk to the directory handle for a path; with create=true mkdir the missing hops.
async function resolveDir(path, create) {
  let dir = await ROOT();
  const segs = normalize(path).split("/").filter(Boolean);
  for (const seg of segs) {
    dir = await dir.getDirectoryHandle(seg, { create: !!create });
  }
  return dir;
}

// Return the file handle only if every parent directory already exists.
async function resolveFile(path, create) {
  const full = normalize(path);
  const idx = full.lastIndexOf("/");
  const parent = idx === -1 ? "" : full.slice(0, idx);
  const name = idx === -1 ? full : full.slice(idx + 1);
  if (!name) throw new Error(`Invalid path: ${path}`);
  const dir = await resolveDir(parent, create);
  return dir.getFileHandle(name, { create: !!create });
}

export async function ensureDir(path) {
  await resolveDir(path, true);
}

export async function writeFile(path, data) {
  const handle = await resolveFile(path, true);
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
  return stat(path);
}

export async function writeText(path, text) {
  return writeFile(path, new Blob([text], { type: "text/plain;charset=utf-8" }));
}

export async function readFile(path) {
  const handle = await resolveFile(path, false);
  return handle.getFile();
}

export async function readText(path) {
  const file = await readFile(path);
  return file.text();
}

export async function exists(path) {
  try {
    await resolveFile(path, false);
    return true;
  } catch {
    try {
      await resolveDir(path, false);
      return true;
    } catch {
      return false;
    }
  }
}

export async function stat(path) {
  const handle = await resolveFile(path, false);
  const file = await handle.getFile();
  return { name: file.name, size: file.size, type: file.type, lastModified: file.lastModified };
}

export async function removeFile(path) {
  const full = normalize(path);
  const idx = full.lastIndexOf("/");
  const parent = idx === -1 ? "" : full.slice(0, idx);
  const name = idx === -1 ? full : full.slice(idx + 1);
  const dir = await resolveDir(parent, false);
  await dir.removeEntry(name);
}

// List immediate children of a directory. Missing dir => [].
export async function list(path) {
  const entries = [];
  let dir;
  try {
    dir = await resolveDir(path, false);
  } catch {
    return entries;
  }
  for await (const [name, handle] of dir.entries()) {
    const isDir = handle.kind === "directory";
    const item = { name, path: joinPath(path, name), kind: isDir ? "dir" : "file" };
    if (!isDir) {
      const file = await handle.getFile();
      item.size = file.size;
      item.type = file.type;
      item.lastModified = file.lastModified;
    }
    entries.push(item);
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}
