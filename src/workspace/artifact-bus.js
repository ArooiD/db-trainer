// Public API of the artifact bus.
//
// Cross-course flow, all on one OPFS root + one IndexedDB registry:
//   Code  -> publishArtifact({course:"programming", type:"code", files:[...], primary})
//   AI    -> listArtifacts({type:"code"}) -> readArtifactText(primary)
//   DB    -> a .csv/.parquet artifact is read directly from OPFS by the engine.
//
// A "publication" is just: write bytes to OPFS + record metadata in the registry.

import { joinPath, writeFile, writeText, readFile, readText, removeFile, ensureDir } from "./filesystem.js";
import * as registry from "./registry.js";

export const ARTIFACT_ROOT = "artifacts";

export function artifactDir(course, id) {
  return joinPath(ARTIFACT_ROOT, course, id);
}

// Persist a new artifact: files go to OPFS, metadata to IndexedDB.
// `files` is a map of { relativeName: Blob | string | ArrayBuffer }.
export async function publishArtifact({ course, type, title, description, tags, files, primary, meta, id }) {
  const id_ = id || registry.makeId();
  const dir = artifactDir(course, id_);
  await ensureDir(dir);
  const written = [];
  for (const [name, data] of Object.entries(files)) {
    const path = joinPath(dir, name);
    await writeFile(path, data);
    written.push(path);
  }
  const record = registry.makeRecord({
    id: id_,
    course,
    type,
    title,
    description,
    tags,
    files: written,
    primary: primary ? joinPath(dir, primary) : written[0] || "",
    meta
  });
  await registry.put(record);
  return record;
}

export function getArtifact(id) {
  return registry.get(id);
}

export function listArtifacts(filter) {
  return registry.query(filter);
}

export async function readArtifactFile(id, path) {
  const record = await registry.get(id);
  if (!record) throw new Error("Artifact not found");
  const target = path || record.primary;
  if (!target) throw new Error("Artifact has no primary file");
  return readFile(target);
}

export function readArtifactText(id, path) {
  return readArtifactFile(id, path).then((file) => file.text());
}

export async function updateArtifactText(id, text, path) {
  const record = await registry.get(id);
  if (!record) throw new Error("Artifact not found");
  const target = path || record.primary;
  await writeText(target, text);
  record.updatedAt = Date.now();
  await registry.put(record);
  return record;
}

export async function deleteArtifact(id) {
  const record = await registry.get(id);
  if (!record) return;
  for (const path of record.files) {
    try { await removeFile(path); } catch { /* already gone */ }
  }
  await registry.remove(id);
}

// Read every artifact of a course as { record, text } for the artifacts panel.
export async function exportCourseBundle(course) {
  const records = await listArtifacts({ course });
  const out = [];
  for (const record of records) {
    let text = "";
    try { text = await readArtifactText(record.id); } catch { /* binary */ }
    out.push({ record, text });
  }
  return out;
}
