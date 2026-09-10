// Собрать dist/ из web/: просто копирует статику.
// Данные (js/data.js) и встроенный wasm (vendor/sql-binary.js) генерируются
// отдельно: node tools/gen-data.js (после правки данных) — см. README.
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "web");
const OUT = path.join(__dirname, "dist");

function copyDir(src, out) {
  fs.mkdirSync(out, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(out, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
copyDir(SRC, OUT);

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(dir, e.name));
    else files.push(path.relative(OUT, path.join(dir, e.name)));
  }
})(OUT);
console.log(`dist собран: ${files.length} файлов`);
files.sort().forEach((f) => console.log("  " + f));
