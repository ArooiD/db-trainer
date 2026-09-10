# SQL Тренажёр

Веб-тренажёр для изучения SQL (SQLite) на примерах базы «сотрудники — отделы —
проекты». SQLite выполняется прямо в браузере (sql.js/WASM) — сервер не нужен,
интернет не нужен, устанавливать нечего.

## Студентам: один файл

Скачайте `dist-standalone/index.html` и откройте двойным щелчком. Всё —
интерфейс, задания, данные и движок SQLite — внутри этого одного файла,
никаких запросов наружу он не делает. Работает офлайн в любом современном
браузере.

## Запасной вариант: папка dist/

Если по какой-то причине нужен вариант с раздельными файлами — скачайте папку
`dist/` целиком и откройте `dist/index.html`. Движок SQLite грузится там
отдельным `.wasm`, и некоторые браузеры блокируют такую загрузку по `file://`;
тогда поднимите из папки `dist/` любой раздатчик статики (это не сервер
приложения, а просто раздача файлов) и откройте http://localhost:8000:

```bash
python3 -m http.server 8000
npx serve
php -S localhost:8000
```

Важно: `dist/index.html` в одиночку не работает — нужна вся папка `dist/`.
Прогресс и черновики в обоих случаях хранятся в `localStorage` браузера.

## Что внутри dist/

- `index.html` — точка входа.
- `js/app.js` — интерфейс и сравнение результатов;
  `js/db.js` — обёртка над sql.js (init + выполнение SQL);
  `js/data.js` — схема и данные учебной базы;
  `js/tasks.js` — задания.
- `vendor/sql-wasm.js` + `vendor/sql-wasm.wasm` — SQLite (WASM).
- `vendor/sql-binary.js` — тот же wasm, вшитый base64 (нужен для работы по `file://`).

## Как собрать из исходников

```bash
python3 tools/gen_data.py    # перегенерировать js/data.js и vendor из seed.py + wasm
node build_dist.js           # собрать папку dist/ из web/
node build_inline.js         # собрать dist-standalone/index.html (один файл)
```

`build_inline.js` берёт каркас из `web/index.html`, вырезает из него `<link>` и
внешние `<script src>` и вшивает содержимое CSS и JS-файлов (в порядке: движок →
бинарник wasm → данные → задания → обёртка БД → UI). Перед вшиванием проверяется,
что ни один файл не содержит `</script>` — иначе инлайн сломал бы разметку.

Единые источники: схема и данные — `seed.py`; задания — `js/tasks.js`;
логика сравнения — `web/js/app.js`. `dist/` — только сборка, руками не правится.

## Альтернатива: Python-сервер (для разработки)

```bash
python3 app.py              # http://localhost:12000
python3 build_single.py     # единый файл dist-python/sql-trainer.py
```

`app.py` выполняет SQL через стандартный `sqlite3` (POST `/api/execute` на свежей
копии БД, поэтому `INSERT/UPDATE/DELETE` студента безопасны). `build_single.py`
собирает `dist-python/sql-trainer.py` — один файл на stdlib (`python3 sql-trainer.py`).

## Сравнение результатов

- Числа: `150000` и `150000.0` равны, дробные сверяются с точностью 1e-6.
- `NULL` совпадает с `NULL`.
- Имена колонок и `AS`-алиасы не учитываются — сравниваются только значения.
- Для сортировок (`ordered: true`) важен порядок строк; для остальных
  сравнение идёт как по мультимножеству строк (порядок не важен).

## Как добавить задание

Добавьте объект в массив `window.DB_TASKS` в `js/tasks.js`:

```js
{
  id: 'l2-08', level: 2, title: 'Моя задача',
  description: 'Текст с `подсветкой` колонок.',
  hint: 'Короткая подсказка.',
  solution: 'SELECT ...;',
  ordered: false, // true, если важен порядок строк
}
```

`level` — номер уровня (1–7, названия в `LEVEL_NAMES`). После правки пересоберите
сборки: `python3 tools/gen_data.py && node build_dist.js && node build_inline.js`.

## Как изменить данные

Правьте `seed.py` (таблицы `DEPARTMENTS`, `EMPLOYEES`, `PROJECTS`,
`ASSIGNMENTS`), затем пересоберите:
`python3 tools/gen_data.py && node build_dist.js && node build_inline.js`.
