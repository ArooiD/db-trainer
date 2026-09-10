#!/usr/bin/env python3
"""Собрать единый самодостаточный файл тренажёра.

Студенту достаточно скачать один файл sql-trainer.py (из dist/) и запустить:
    python3 sql-trainer.py

Логика build_db/run_query берётся прямо из app.py (inspect.getsource), а схема,
данные и статические файлы — из тех же исходников, что использует многофайловая
версия. Поэтому два артефакта не расходятся.
"""
import inspect
import json
from pathlib import Path

import app
import seed

ROOT = Path(__file__).parent.resolve()
OUT = ROOT / "dist-python" / "sql-trainer.py"

STATIC_FILES = {
    "index.html": "index.html",
    "css/style.css": "css/style.css",
    "js/app.js": "js/app.js",
    "js/tasks.js": "js/tasks.js",
}


def getsource_clean(fn):
    """Исходник функции без ссылок на модуль seed (в едином файле это globals)."""
    src = inspect.getsource(fn)
    return src.replace("seed.", "")


def main():
    static = {}
    for url, path in STATIC_FILES.items():
        static[url] = (ROOT / path).read_text(encoding="utf-8")

    parts = []
    parts.append(
        '#!/usr/bin/env python3\n'
        '"""SQL Тренажёр — единый самодостаточный файл.\n\n'
        'Запуск:  python3 sql-trainer.py\n'
        'Открыть: http://localhost:12000\n\n'
        'Зависимости: только стандартная библиотека Python 3.8+.\n'
        'Сгенерировано build_single.py — правки вносите в исходники многофайловой версии.\n'
        '"""\n'
        "import json\n"
        "import sqlite3\n"
        "from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer\n"
        "from urllib.parse import urlparse\n\n"
    )

    parts.append("# ----- данные учебной базы (схлопотано из seed.py) -----\n")
    parts.append("SCHEMA = " + repr(seed.SCHEMA) + "\n")
    parts.append("DEPARTMENTS = " + repr(seed.DEPARTMENTS) + "\n")
    parts.append("EMPLOYEES = " + repr(seed.EMPLOYEES) + "\n")
    parts.append("PROJECTS = " + repr(seed.PROJECTS) + "\n")
    parts.append("ASSIGNMENTS = " + repr(seed.ASSIGNMENTS) + "\n\n")

    parts.append("SCHEMA_DOC = " + repr(app.SCHEMA_DOC) + "\n")
    parts.append("MAX_ROWS = " + repr(app.MAX_ROWS) + "\n\n")

    parts.append("# ----- логика выполнения (взята из app.py один-в-один) -----\n")
    parts.append(getsource_clean(app.build_db))
    parts.append("\n")
    parts.append(getsource_clean(app.run_query))
    parts.append("\n\n")

    parts.append("# ----- статические файлы (встроены) -----\n")
    parts.append("STATIC = " + repr(static) + "\n")
    parts.append("CONTENT_TYPES = " + repr(app.CONTENT_TYPES) + "\n\n")

    parts.append(
        'DEFAULT_PORT = 12000\n\n\n'
        'class Handler(BaseHTTPRequestHandler):\n'
        '    def _send(self, code, body: bytes, ctype):\n'
        '        self.send_response(code)\n'
        '        self.send_header("Content-Type", ctype)\n'
        '        self.send_header("Content-Length", str(len(body)))\n'
        '        self.send_header("Cache-Control", "no-store")\n'
        '        self.end_headers()\n'
        '        self.wfile.write(body)\n\n'
        '    def _json(self, obj, code=200):\n'
        '        self._send(code, json.dumps(obj, ensure_ascii=False).encode("utf-8"),\n'
        '                   "application/json; charset=utf-8")\n\n'
        '    def do_GET(self):\n'
        '        route = urlparse(self.path).path.lstrip("/") or "index.html"\n'
        '        if route == "api/schema":\n'
        '            return self._json({"schema": SCHEMA_DOC})\n'
        '        if route in STATIC:\n'
        '            ext = "." + route.rsplit(".", 1)[-1] if "." in route else ""\n'
        '            ctype = CONTENT_TYPES.get(ext, "application/octet-stream")\n'
        '            return self._send(200, STATIC[route].encode("utf-8"), ctype)\n'
        '        return self._send(404, b"Not found", "text/plain")\n\n'
        '    def do_POST(self):\n'
        '        route = urlparse(self.path).path.lstrip("/")\n'
        '        if route != "api/execute":\n'
        '            return self._json({"error": "Unknown endpoint"}, 404)\n'
        '        try:\n'
        '            length = int(self.headers.get("Content-Length", 0))\n'
        '            payload = json.loads(self.rfile.read(length) or b"{}")\n'
        '        except (ValueError, json.JSONDecodeError):\n'
        '            return self._json({"error": "Invalid JSON body"}, 400)\n'
        '        sql = (payload.get("sql") or "").strip()\n'
        '        if not sql:\n'
        '            return self._json({"error": "Пустой запрос"})\n'
        '        return self._json(run_query(sql))\n\n'
        '    def log_message(self, *args):\n'
        '        pass\n\n\n'
        'def main():\n'
        '    port = DEFAULT_PORT\n'
        '    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)\n'
        '    print(f"SQL Тренажёр готов: http://localhost:{port}")\n'
        '    print("Остановить: Ctrl+C")\n'
        '    try:\n'
        '        server.serve_forever()\n'
        '    except KeyboardInterrupt:\n'
        '        print("\\nОстановлено.")\n'
        '        server.shutdown()\n\n\n'
        'if __name__ == "__main__":\n'
        "    main()\n"
    )

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text("".join(parts), encoding="utf-8")
    print(f"Собрано: {OUT} ({OUT.stat().st_size} байт)")


if __name__ == "__main__":
    main()
