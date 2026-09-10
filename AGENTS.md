# AGENTS.md — IT Study Lab

## Что это

IT Study Lab — browser-first интерактивная песочница для студентов и будущих программистов.

Основной продукт — **Sandbox**. Пользователь выбирает технологический runtime, свободно вводит команды/код и наблюдает результат. **Tests / Practice** — отдельный образовательный слой для проверки знаний и не должен диктовать архитектуру рабочего пространства.

Главное правило: **real runtime where possible**. Если технологию можно безопасно выполнить в браузере через WASM/JS runtime, используем реальное исполнение. Симуляторы применяем там, где настоящий runtime для статического hosting не подходит.

## Текущий source of truth

- `web/` — исходники браузерного приложения.
- `web/index.html` — shell Sandbox + Tests.
- `web/js/app.js` — orchestration UI.
- `web/js/workbench.js` — универсальная интерактивная сессия, история запусков и bridge к runtime.
- `web/js/engines/` — технологические adapters.
- `web/js/db.js` — совместимый DB facade над `LabRuntime`.
- `web/js/tasks.js` — только контент блока SQL Tests / Practice.
- `web/js/lectures.js` — каталог курсов и контент вкладки Lectures.
- `web/js/design.js` — ER Designer.
- `web/js/data.js` — browser dataset.
- `seed.py` — исходные учебные данные.
- `dist/`, `dist-standalone/` — генерируемые результаты; вручную не редактировать.

## Текущие runtimes

### SQLite

`SqliteEngine` использует sql.js/WASM и работает полностью локально, включая standalone `file://`.

### PostgreSQL

`PGliteEngine` использует `@electric-sql/pglite`. PGlite ставится через npm и копируется во время сборки в `dist/vendor/pglite`. Не заменять это внешним CDN без отдельного решения: GitHub Pages должен оставаться самодостаточным.

## Sandbox-first UX

При открытии приложения пользователь должен попадать в Sandbox, а не в список заданий.

Database Sandbox должен предоставлять:

- выбор runtime;
- постоянное поле SQL input;
- `Run` и `Ctrl/Cmd + Enter`;
- сохранение черновика отдельно для каждого engine;
- историю выполнений отдельно для каждого engine;
- результат команды;
- schema inspector;
- ER Designer;
- reset runtime.

Sandbox сохраняет состояние между командами. Например `CREATE TABLE`, затем `INSERT`, затем `SELECT` должны выполняться в одной рабочей сессии до явного reset.

### Database IDE layout

Database Sandbox визуально строится как браузерная SQL IDE, а не как набор учебных карточек:

- компактная панель модулей слева;
- вкладка открытого результата сверху;
- data grid в основной рабочей области;
- дерево таблиц и структура выбранной таблицы справа;
- SQL console и история запусков в нижней панели;
- двойной клик по таблице открывает её данные через `SELECT * ... LIMIT 100`.
- ERD поддерживает pan рабочей области и drag отдельных таблиц.

Образовательные пояснения не должны отнимать основное пространство у редактора, таблицы результатов и дерева объектов.

## Tests / Practice

Tests — отдельная вкладка.

Текущие SQL-тесты используют `window.DB_TASKS`. Задание содержит `id`, `level`, `title`, `description`, `hint`, `solution`, `ordered`.

При проверке теста runtime должен быть изолирован от свободной Sandbox-сессии настолько, насколько это позволяет текущая реализация. Перед выполнением пользовательского решения и эталонного solution база сбрасывается к reference dataset.

Не превращать Sandbox обратно в интерфейс «введи ответ → сравни с solution».

## Lectures

Lectures — отдельный data-driven режим. Текущий каталог: базы данных, программирование IT-систем, операционные системы и специальные программные продукты. Контент курса не встраивать в `app.js`: описания и лекции хранятся в `web/js/lectures.js`.

## Runtime API

Текущий базовый контракт находится в `web/js/engines/lab-engine.js`, диспетчер — в `runtime.js`.

Новые движки должны подключаться через общий runtime и не требовать переписывания shell.

Целевые типы capability:

```text
sql
terminal
filesystem
network
processes
graphics
persistentStorage
snapshot
stdin
interrupt
metrics
```

Следующие расширения API должны быть совместимы с идеей:

```text
init(options)
execute(command, options)
stdin(data)
interrupt()
reset(options)
snapshot()
restore(snapshot)
filesystem()
metrics()
destroy()
```

Не добавлять SQL-specific методы в общий `LabRuntime`, если это можно выразить generic API или capability конкретного движка.

## Следующие модули

Приоритет после Database Sandbox:

1. Programming Sandbox — Python/Pyodide, затем browser JavaScript.
2. Operating Systems Sandbox — terminal, filesystem, processes/signals, позже Linux runtime/simulator.
3. Software Sandbox — Dockerfile/Compose/container model, Git и CI/CD.

Тяжёлые runtimes загружать лениво. Открытие Database Sandbox не должно тянуть Pyodide, Linux image или другие будущие WASM assets.

## Архитектурная граница

```text
Sandbox UI
   ↓
WorkbenchSession
   ↓
LabRuntime
   ↓
Engine
   ↓
Result / State
```

Отдельно:

```text
Tests / Labs / Exams
   ↓
Task content + Validator
   ↓
тот же LabRuntime / Engine
```

То есть testing framework использует runtimes, но не является ядром продукта.

## Сборка

```bash
npm install
npm run build
```

`npm run build`:

1. `build_dist.js` копирует `web/` в `dist/` и добавляет локальный PGlite runtime.
2. `build_inline.js` делает `dist-standalone/index.html` с SQLite.

Для локального HTTP запуска:

```bash
python3 -m http.server 8000 -d dist
```

## GitHub Pages

`.github/workflows/build-static.yml` собирает `dist/`, загружает downloadable artifact и публикует `dist/` через GitHub Pages.

Core-функциональность должна оставаться совместимой со статическим hosting. Не добавлять обязательный backend для Sandbox.

## ER Designer

`web/js/design.js` предоставляет `window.Designer.open(task|null)`.

- `open(null)` — свободное проектирование из Sandbox.
- `open(task)` — проектирование в контексте Tests.
- `.hidden` должен сохранять `!important`, потому что fullscreen/modal компоненты используют собственный `display`.

## Что не делать

- Не смешивать свободную песочницу с обязательной системой заданий.
- Не делать backend обязательным для базового продукта.
- Не хранить новые тяжёлые runtime assets в исходном Git tree, если они могут ставиться на build step из зафиксированной зависимости.
- Не использовать внешний CDN для критического runtime без необходимости.
- Не править `dist/` вручную.
- Не загружать все будущие runtimes при старте приложения.

## Проверка перед merge/push

Минимально:

```bash
npm install
npm run build
```

Проверить наличие:

```text
dist/index.html
dist/vendor/pglite/index.js
dist-standalone/index.html
```

Для UI-проверки предпочтителен browser smoke test: открыть Sandbox, выполнить SQLite запрос, переключиться на PostgreSQL и выполнить запрос, затем открыть Tests и проверить одно задание.
