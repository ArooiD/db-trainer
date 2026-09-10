#!/usr/bin/env python3
"""SQL-тренажёр: лёгкий HTTP-сервер на стандартной библиотеке Python.

Эндпоинты:
  GET  /                -> index.html (и статика из этой папки)
  GET  /api/schema      -> описание схемы БД (для модального окна)
  POST /api/execute     -> {sql: "..."} выполняет запрос на свежей копии БД
                           и возвращает {columns, rows} или {error}

Сервер не хранит состояние: каждое /api/execute создаёт новую in-memory БД,
поэтому любые (в т.ч. изменяющие) запросы пользователя безопасны и не влияют
на последующие проверки.
"""
import json
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import seed

ROOT = Path(__file__).parent.resolve()
MAX_ROWS = 500

SCHEMA_DOC = """
Таблица `departments` — отделы компании.
  id INTEGER PK, name TEXT, budget REAL

Таблица `employees` — сотрудники.
  id INTEGER PK, first_name TEXT, last_name TEXT, email TEXT,
  department_id INTEGER -> departments.id (может быть NULL),
  salary REAL, hired_at TEXT ('ГГГГ-ММ-ДД'), is_active INTEGER (1 = работает)

Таблица `projects` — проекты.
  id INTEGER PK, name TEXT, department_id INTEGER -> departments.id,
  started_at TEXT, finished_at TEXT (NULL = проект ещё идёт)

Таблица `assignments` — работы сотрудников над проектами.
  id INTEGER PK, employee_id INTEGER -> employees.id,
  project_id INTEGER -> projects.id, role TEXT, hours INTEGER
""".strip()


def build_db():
    conn = sqlite3.connect(":memory:")
    conn.executescript(seed.SCHEMA)
    conn.executemany("INSERT INTO departments VALUES (?,?,?)", seed.DEPARTMENTS)
    conn.executemany("INSERT INTO employees VALUES (?,?,?,?,?,?,?,?)", seed.EMPLOYEES)
    conn.executemany("INSERT INTO projects VALUES (?,?,?,?,?)", seed.PROJECTS)
    conn.executemany("INSERT INTO assignments VALUES (?,?,?,?,?)", seed.ASSIGNMENTS)
    conn.commit()
    return conn


def run_query(sql):
    """Выполнить SQL на свежей БД. Вернуть dict для JSON-ответа."""
    conn = build_db()
    try:
        cur = conn.execute(sql)
        rows = cur.fetchmany(MAX_ROWS + 1)
        truncated = len(rows) > MAX_ROWS
        rows = rows[:MAX_ROWS]
        columns = [d[0] for d in cur.description] if cur.description else []
        # sqlite3 может вернуть bytes — приводим к строке для JSON
        clean = [[v.decode("utf-8", "replace") if isinstance(v, bytes) else v for v in row] for row in rows]
        return {"columns": columns, "rows": clean, "truncated": truncated}
    except sqlite3.Error as exc:
        return {"error": f"{type(exc).__name__}: {exc}"}
    finally:
        conn.close()


CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, body: bytes, ctype):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, obj, code=200):
        self._send(code, json.dumps(obj, ensure_ascii=False).encode("utf-8"),
                   "application/json; charset=utf-8")

    def _static(self, path):
        rel = path.lstrip("/") or "index.html"
        target = (ROOT / rel).resolve()
        if ROOT not in target.parents and target != ROOT:
            return self._send(403, b"Forbidden", "text/plain")
        if not target.is_file():
            return self._send(404, b"Not found", "text/plain")
        ctype = CONTENT_TYPES.get(target.suffix, "application/octet-stream")
        self._send(200, target.read_bytes(), ctype)

    def do_GET(self):
        route = urlparse(self.path).path
        if route == "/api/schema":
            return self._json({"schema": SCHEMA_DOC})
        return self._static(route)

    def do_POST(self):
        route = urlparse(self.path).path
        if route != "/api/execute":
            return self._json({"error": "Unknown endpoint"}, 404)
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            return self._json({"error": "Invalid JSON body"}, 400)
        sql = (payload.get("sql") or "").strip()
        if not sql:
            return self._json({"error": "Пустой запрос"})
        return self._json(run_query(sql))

    def log_message(self, *args):
        pass  # тихий режим


def main():
    port = 12000
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"SQL Тренажёр: http://0.0.0.0:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    main()
