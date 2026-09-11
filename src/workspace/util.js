// Small display helpers for the artifacts panel (ASCII only).

export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = n / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i += 1; }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

// Minimal {0} {1} placeholder formatter; keeps UI copy out of the components.
export function fmt(pattern, ...args) {
  return String(pattern).replace(/\{(\d+)\}/g, (m, i) => (args[Number(i)] ?? m));
}

export function formatWhen(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = Date.now();
  const diff = Math.round((now - ts) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return d.toLocaleDateString();
}

export function extensionOf(path) {
  const name = String(path).split("/").pop() || "";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

const EXT_ICON = {
  py: "PY", js: "JS", jsx: "JS", ts: "TS", sql: "SQL",
  csv: "CSV", json: "{}", md: "MD", txt: "TXT", log: "LOG",
  parquet: "PQ", db: "DB", sqlite: "DB", png: "IMG", jpg: "IMG", jpeg: "IMG",
  svg: "SVG", html: "HTML", css: "CSS", wasm: "WASM"
};

export function kindIcon(path) {
  return EXT_ICON[extensionOf(path)] || "FILE";
}

export function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name || "artifact";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
