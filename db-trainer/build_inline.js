// Собрать ОДИН самодостаточный dist-standalone/index.html: всё (CSS, JS,
// движок SQLite WASM в base64, данные, задания) вшито внутрь. Ноль внешних
// запросов, ноль сервера — открывается двойным кликом где угодно.
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "web");
const OUTDIR = path.join(__dirname, "dist-standalone");
const OUT = path.join(OUTDIR, "index.html");

const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");

const css = read("css/style.css");
// Порядок важен: движок -> бинарник -> данные -> задания -> обёртка БД -> UI.
const scripts = [
  "vendor/sql-wasm.js",
  "vendor/sql-binary.js",
  "js/data.js",
  "js/tasks.js",
  "js/db.js",
  "js/app.js",
].map(read);

for (const s of scripts) {
  if (s.includes("</script>")) {
    console.error("Файл содержит </script> — инлайн небезопасен, правь билдер.");
    process.exit(1);
  }
}

// Берём каркас из web/index.html, вырезаем <link> и внешние <script src>.
let html = read("index.html");
html = html.replace(/\s*<link rel="stylesheet"[^>]*>/, "");
html = html.replace(/(\s*<script src=[^>]*><\/script>)+/, "");

const inlined =
  `\n  <style>\n${css}\n  </style>\n` +
  scripts.map((s) => `\n  <script>\n${s}\n  </script>\n`).join("");

html = html.replace("</body>", inlined + "\n</body>");

fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(OUT, html, "utf8");

const bytes = Buffer.byteLength(html);
const localRefs = (html.match(/(src|href)="(?!https?:)[^"]+"/g) || []);
console.log(`dist-standalone/index.html собран: ${(bytes / 1024).toFixed(0)} КБ`);
console.log("локальных ссылок на файлы осталось:", localRefs.length, localRefs);
