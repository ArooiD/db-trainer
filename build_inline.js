// Собрать ОДИН самодостаточный dist-standalone/index.html для SQLite Lab.
// PostgreSQL/PGlite остаётся доступен в обычной dist/ сборке (GitHub Pages),
// поскольку runtime состоит из нескольких файлов и загружается как ES module.
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "web");
const OUTDIR = path.join(__dirname, "dist-standalone");
const OUT = path.join(OUTDIR, "index.html");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");

const css = ["css/style.css", "css/lab.css", "css/database-studio.css"].map(read).join("\n");
const scripts = [
  "vendor/sql-wasm.js",
  "vendor/sql-binary.js",
  "js/data.js",
  "js/tasks.js",
  "js/engines/lab-engine.js",
  "js/engines/runtime.js",
  "js/engines/sqlite-engine.js",
  "js/engines/pglite-engine.js",
  "js/db.js",
  "js/workbench.js",
  "js/design.js",
  "js/app.js",
  "js/database-studio.js",
].map(read);

for (const s of scripts) {
  if (s.includes("</script>")) {
    console.error("Файл содержит </script> — инлайн небезопасен, правь билдер.");
    process.exit(1);
  }
}

let html = read("index.html");
html = html.replace(/\s*<link rel="stylesheet"[^>]*>/g, "");
html = html.replace(/\s*<link rel="(?:manifest|icon|apple-touch-icon)"[^>]*>/g, "");
html = html.replace(/\s*<script src=[^>]*><\/script>/g, "");

const inlined =
  `\n  <style>\n${css}\n  </style>\n` +
  scripts.map((s) => `\n  <script>\n${s}\n  </script>\n`).join("");

html = html.replace("</body>", inlined + "\n</body>");
fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(OUT, html, "utf8");

const bytes = Buffer.byteLength(html);
const localRefs = html.match(/(src|href)="(?!https?:)[^"]+"/g) || [];
console.log(`dist-standalone/index.html собран: ${(bytes / 1024).toFixed(0)} КБ`);
console.log("локальных ссылок на файлы осталось:", localRefs.length, localRefs);
console.log("standalone: SQLite доступен офлайн; PostgreSQL Lab требует dist/ + HTTP.");
