# AGENTS.md — IT Study Lab

## Что это

IT Study Lab — browser-first интерактивная песочница для студентов и будущих программистов.

Основной продукт — **Sandbox**. Пользователь выбирает технологический runtime, свободно вводит команды/код и наблюдает результат. **Tests / Practice** — отдельный образовательный слой для проверки знаний и не должен диктовать архитектуру рабочего пространства.

Главное правило: **real runtime where possible**. Если технологию можно безопасно выполнить в браузере через WASM/JS runtime, используем реальное исполнение. Симуляторы применяем там, где настоящий runtime для статического hosting не подходит.

## Текущий source of truth

Приложение — обычное React-приложение (Vite + React 19). Legacy vanilla JS удалён; React собирается из корня (`index.html` → `src/main.jsx`).

- `index.html` — entry Vite, `<div id="root">` + `/src/main.jsx`.
- `src/main.jsx` — точка монтирования React.
- `src/App.jsx` — layout (header + rail + режимы), регистрация Service Worker.
- `src/state/app-store.jsx` — React Context: весь стор приложения (навигация, режимы, sandbox, tests, designer, синхронизация с URL) + экземпляр `runtime`.
- `src/runtime/` — ES-модули рантайм-слоя: `lab-engine.js`, `runtime.js` (`LabRuntime`), `sqlite-engine.js`, `pglite-engine.js`, `workbench.js`.
- `src/data/` — данные как ES-модули: `courses.js` (метаданные 4 курсов), `lectures/` — содержимое лекций, по файлу на курс (`databases.js`, `programming.js`, `operating-systems.js`, `software-products.js`), `tasks.js`/`dataset.js` (контент Tests + датасет).
- `src/design/er-designer.js` — ER Designer как императивный canvas-виджет (монтируется React-обёрткой `DesignerOverlay`).
- `src/components/` — `AppHeader.jsx`, `AppModal.jsx`, `shared/` (LabRail, ResultTable, ConnectionStatus), `database/` (DatabaseSandbox, DatabaseStudio, DesignerOverlay), `programming/` (ProgrammingSandbox), `lectures/` (LecturesView), `tests/` (TestsView).
- `src/static/` — статические ассеты: `css/`, `icons/`, `manifest.webmanifest`, `service-worker.js`. `prepare-public.js` копирует их в `public/` перед `vite build`. React-ассеты идут через Vite (`public/vendor/...` для PGlite/Pyodide).
- `seed.py` — исходные учебные данные; `tools/gen_data.py` генерирует `src/data/dataset.js`.
- `dist/` — генерируемый результат Vite; вручную не редактировать.

## Текущие runtimes

### SQLite

`SqliteEngine` использует sql.js/WASM и работает полностью локально, включая standalone `file://`.

### PostgreSQL

`PGliteEngine` использует `@electric-sql/pglite`. PGlite ставится через npm и копируется во время сборки в `dist/vendor/pglite`. Не заменять это внешним CDN без отдельного решения: GitHub Pages должен оставаться самодостаточным.

## Sandbox-first UX

Навигация приложения единая для всех четырёх предметов (DB, Code, OS, Dev):
левый rail выбирает предмет (курс), верхние вкладки `Лекции / Тесты /
Песочница` работают внутри выбранного курса. Курс — единственный источник
истины: `nav.course` определяет и лекции, и содержимое песочницы/tests
(через маппинг course → lab). Для курсов без готового runtime (OS, Dev)
в песочнице и tests показывается общий placeholder `PlannedModule`, а не
редирект в лекции. URL кодирует `?course=` во всех режимах; старый
`?lab=` принимается для совместимости.

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

Lectures — отдельный data-driven режим. Текущий каталог: базы данных, программирование IT-систем, операционные системы и специальные программные продукты. Контент курса не встраивать в `app.js`: метаданные курсов в `src/data/courses.js`, лекции — в отдельных файлах `src/data/lectures/<курс>.js`.

Курсы «Базы данных» и «Программирование IT-систем» имеют наполненные лекции. Пока Programming Sandbox не реализован, действия из лекций программирования не должны открывать Database Sandbox или SQL Tests.

## Runtime API

Базовый контракт находится в `src/runtime/lab-engine.js`, диспетчер — в `src/runtime/runtime.js`.

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

1. Programming Sandbox — JavaScript и Python/Pyodide.
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

`npm run build` = `node prepare-public.js && vite build`:

1. `prepare-public.js` копирует учебные данные и кладёт локальные PGlite и Pyodide в `public/vendor/` (из зафиксированных npm-зависимостей), чтобы GitHub Pages оставался самодостаточным.
2. `vite build` собирает React-приложение из `index.html` в `dist/` (хешерованные ассеты в `dist/assets/`).

Для локального HTTP запуска:

```bash
python3 -m http.server 8000 -d dist
```

Для разработки: `npm run dev` (Vite dev server с HMR).

## GitHub Pages

`.github/workflows/build-static.yml` собирает `dist/`, загружает downloadable artifact и публикует `dist/` через GitHub Pages.

Core-функциональность должна оставаться совместимой со статическим hosting. Не добавлять обязательный backend для Sandbox.

## ER Designer

`src/design/er-designer.js` — императивный canvas-виджет, экспортирует `openDesigner(task|null)` и `closeDesigner()`. React-обёртка `src/components/database/DesignerOverlay.jsx` монтирует его по состоянию `designer.open` в сторе; кнопка закрытия внутри overlay диспатчит событие `it-study-lab:designer-close`, чтобы синхронизировать стор.

- `openDesigner(null)` — свободное проектирование из Sandbox.
- `openDesigner(task)` — проектирование в контексте Tests.
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
dist/vendor/pyodide/pyodide.mjs
dist/service-worker.js
```

Для UI-проверки предпочтителен browser smoke test: открыть Sandbox, выполнить SQLite запрос, переключиться на PostgreSQL и выполнить запрос, затем открыть Tests и проверить одно задание.
