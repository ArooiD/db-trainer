const fs = require("fs");
const path = require("path");

const root = __dirname;
const source = path.join(root, "web");
const publicDir = path.join(root, "public");

fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(publicDir, { recursive: true });

for (const entry of fs.readdirSync(source)) {
  if (entry === "index.html") continue;
  fs.cpSync(path.join(source, entry), path.join(publicDir, entry), { recursive: true });
}

fs.cpSync(path.join(root, "node_modules", "@electric-sql", "pglite", "dist"), path.join(publicDir, "vendor", "pglite"), { recursive: true });
fs.cpSync(path.join(root, "node_modules", "pyodide"), path.join(publicDir, "vendor", "pyodide"), { recursive: true });

console.log("Подготовлены браузерные runtime: PGlite и Pyodide.");
