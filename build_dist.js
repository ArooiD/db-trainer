// Собрать dist/ из web/ и добавить локальные browser runtimes.
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "web");
const OUT = path.join(__dirname, "dist");
const PGLITE_SRC = path.join(
  __dirname,
  "node_modules",
  "@electric-sql",
  "pglite",
  "dist"
);
const PGLITE_PACKAGE = path.join(
  __dirname,
  "node_modules",
  "@electric-sql",
  "pglite"
);

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

if (!fs.existsSync(PGLITE_SRC)) {
  throw new Error(
    "PGlite dependency is missing. Run `npm install` before `npm run build`."
  );
}

const pgliteOut = path.join(OUT, "vendor", "pglite");
copyDir(PGLITE_SRC, pgliteOut);
for (const licenseName of ["LICENSE", "POSTGRES-LICENSE", "NOTICE"]) {
  const source = path.join(PGLITE_PACKAGE, licenseName);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(pgliteOut, licenseName));
}

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(dir, e.name));
    else files.push(path.relative(OUT, path.join(dir, e.name)));
  }
})(OUT);

console.log(`dist собран: ${files.length} файлов`);
console.log(`PGlite runtime: ${path.relative(__dirname, pgliteOut)}`);
files.sort().forEach((f) => console.log("  " + f));
