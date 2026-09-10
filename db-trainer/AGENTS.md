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

## Не делать
- Не возвращать WASM/CDN-вариант (sql.js) — песочница и юзер-окружение не имеют доступа к внешним CDN; нужен чистый stdlib backend.
- Не конвертировать `tasks.js` в Python регулярками: Cyrillic + кавычки ломают простой regex-конвертер; держим задания в JS.
