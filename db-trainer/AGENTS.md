# AGENTS.md — SQL Тренажёр

## Что это
Одностраничный веб-тренажёр SQL (диалект SQLite) на базе stdlib Python. Без внешних зависимостей и интернета.

## Команды
- Запуск: `python3 app.py` → http://localhost:12000 (порт в `main()` в `app.py`).
- Быстрая проверка решений (все 37 эталонов должны выполняться без ошибок):
  ```
  node -e "global.window={};require('./js/tasks.js');require('fs').writeFileSync('/tmp/sols.json',JSON.stringify(global.window.DB_TASKS.map(x=>x.solution)))"
  python3 -c "import json,urllib.request;[print(json.loads(urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:12000/api/execute',data=json.dumps({'sql':s}).encode(),headers={'Content-Type':'application/json'})).read()).get('error','OK')) for s in json.load(open('/tmp/sols.json'))]"
  ```

## Архитектура (важные решения)
- **Единый источник заданий**: `js/tasks.js` (`window.DB_TASKS`). Правильный ответ НЕ хранится в задаче как ожидаемая таблица — вместо этого в задаче есть эталонный `solution`; при проверке фронтенд два раза вызывает `POST /api/execute` (запрос пользователя и `solution`) и сравнивает результаты.
- **Безопасное выполнение**: `/api/execute` строит новую in-memory SQLite на каждый запрос, поэтому DML/DDL пользователя изолированы и сбрасываются.
- **Данные/схема**: только `seed.py` (сервер строит из неё БД). `app.py` использует `seed.SCHEMA/DEPARTMENTS/EMPLOYEES/PROJECTS/ASSIGNMENTS`.
- **Сравнение результатов** (`resultsMatch`/`normalizeCell`/`rowKey` в `js/app.js`): игнорируются имена колонок и алиасы; `150000 == 150000.0`; `NULL` совпадает с `NULL`; дробные сверяются с точностью 1e-6; флаг `ordered` в задаче управляет учётом порядка строк.

## Изменение
- Новое задание → объект в `DB_TASKS` (`id, level, title, description, hint, solution, ordered`). `description` поддерживает `код` через backticks. Названия уровней в `LEVEL_NAMES` в `app.js`.
- Данные/схема → `seed.py`, затем перезапуск сервера.

## Браузерная версия (основная для студентов)
- `web/` — исходники статического приложения; `node build_dist.js` копирует в `dist/`.
- Студент открывает `dist/index.html`. SQLite — sql.js (WASM) прямо в браузере, сервер не нужен.
- `web/js/db.js`: `initSqlJs({ wasmBinary })` (глобал из `vendor/sql-wasm.js`); выполнение через `db.exec` (`{columns, values}`; sql.js отдаёт NULL как `undefined` → конвертим в `null` в executeSQL).
- `vendor/sql-binary.js` — base64 от `sql-wasm.wasm`, чтобы работало по `file://` без fetch. Если в конкретной среде `file://` всё же режет wasm — поднять `python3 -m http.server` в `dist/`.
- Единый источник: задания `js/tasks.js` (копируется в `web/js/` через `tools/gen_data.py`), данные `seed.py` → `web/js/data.js`.
- Проверка сборки в Node (тот же путь base64→Uint8Array→initSqlJs→db.exec): прогон всех решений через `dist/vendor/sql-wasm.js`.

## Не делать
- Не тянуть sql.js/WASM с внешнего CDN в рантайме — берём **vendored** файлы из `web/vendor/` (CDN может быть недоступен офлайн); при необходимости обновить — скачать и закоммитить в `web/vendor/`, затем `tools/gen_data.py` для base64-версии.
- Не конвертировать `tasks.js` в Python регулярками: кириллица + кавычки ломают простой regex-конвертер; держим задания в JS.

## Один файл dist-standalone/index.html
- `node build_inline.js` — самый простой для студента вариант: всё вшито в один index.html (CSS, JS, wasm в base64), ноль внешних запросов, гарантированно работает по file://.
- Механизм: из web/index.html вырезаются `<link>` и `<script src>`, содержимое файлов вшивается в `<style>`/`<script>` в порядке: движок (sql-wasm.js), бинарник (sql-binary.js), данные, задания, обёртка БД (db.js), UI (app.js). Билдер проверяет отсутствие `</script>` в файлах перед инлайном.
- Пересборка после правок: `python3 tools/gen_data.py && node build_dist.js && node build_inline.js`.
