# IT Study Lab

**IT Study Lab** — интерактивная браузерная лабораторная среда для подготовки студентов по IT-дисциплинам. Проект строится вокруг принципа **real runtime where possible**: если технологию можно безопасно запустить прямо в браузере через WebAssembly, задания выполняются в настоящем или максимально близком к настоящему runtime, а не в текстовой имитации.

Сейчас первым полноценным модулем является **«Базы данных»**.

## Текущие лабораторные движки

| Движок | Технология | Назначение |
| --- | --- | --- |
| SQLite | sql.js / WASM | быстрые SQL-задания, полностью офлайн |
| PostgreSQL | PGlite / WASM | PostgreSQL-задания и будущие лабораторные работы по DDL, индексам, транзакциям и диагностике |

Движок выбирается прямо в интерфейсе. SQLite загружается сразу, PostgreSQL/PGlite — лениво при первом выборе.

## Архитектура runtime

В `web/js/engines/` находится общий слой исполнения:

```text
LabEngine
   │
   ├── SqliteEngine      -> sql.js / WASM
   ├── PGliteEngine      -> PostgreSQL / PGlite / WASM
   └── будущие движки    -> Redis-like, Python, shell, Docker analyzer...

LabRuntime
   ├── register(engine)
   ├── use(engineId)
   ├── execute(command)
   ├── reset()
   └── schemaDoc()
```

`window.DB` оставлен как совместимый фасад над `LabRuntime`, поэтому существующий SQL-модуль и дизайнер схемы не зависят от конкретного движка.

## Базы данных

Текущий учебный набор использует базу «сотрудники — отделы — проекты» и включает уровни:

- основы `SELECT`;
- `WHERE` и фильтрацию;
- сортировку и лимиты;
- агрегаты и `GROUP BY`;
- `JOIN`;
- подзапросы;
- `CASE` и условия;
- свободную SQL-песочницу;
- визуальный режим проектирования схемы.

Результат запроса студента сравнивается с результатом эталонного решения, поэтому запрос не обязан текстово совпадать с примером.

## GitHub Pages

`main` автоматически собирается и публикуется через GitHub Actions. Публикуется каталог `dist/`.

```text
push main
   -> npm install
   -> npm run build
   -> dist/
   -> GitHub Pages
```

PGlite устанавливается как npm-зависимость и при сборке копируется в `dist/vendor/pglite`, поэтому опубликованный PostgreSQL Lab не зависит от стороннего CDN.

## Локальный запуск

```bash
npm install
npm run build
python3 -m http.server 8000 -d dist
```

После этого откройте `http://localhost:8000`.

## Standalone

`npm run build` также создаёт `dist-standalone/index.html`.

Этот файл полностью автономно запускает **SQLite Lab** по `file://`. PostgreSQL/PGlite использует многокомпонентный ES-module runtime и поэтому доступен в обычной `dist/`-сборке через HTTP/GitHub Pages.

## Структура

```text
.github/workflows/       CI/CD и GitHub Pages
web/                     исходники браузерного приложения
  css/
  js/
    engines/             LabEngine, LabRuntime и технологические adapters
    app.js               UI модуля баз данных
    db.js                совместимый фасад runtime
    data.js              учебная БД
    tasks.js             SQL-задания
  vendor/                 статические browser-зависимости исходного модуля
build_dist.js            сборка dist/ + локальный PGlite runtime
build_inline.js          сборка автономного SQLite HTML
seed.py                  исходные данные учебной БД
tools/                   генераторы данных
```

`dist/` и `dist-standalone/` являются результатами сборки и руками не редактируются.

## Направление развития

Целевая структура IT Study Lab:

```text
IT Study Lab
├── Базы данных
│   ├── SQLite
│   ├── PostgreSQL
│   ├── проектирование
│   ├── транзакции
│   ├── индексы
│   └── диагностика
├── Программирование IT-систем
│   ├── Python runtime
│   ├── JavaScript runtime
│   └── API / debugging labs
├── Операционные системы
│   ├── shell lab
│   ├── процессы
│   ├── память
│   └── файловые системы
└── Специальные программные продукты
    ├── Docker / Compose
    ├── Git
    ├── CI/CD
    └── инфраструктурные лабораторные работы
```

Следующие движки должны подключаться через тот же `LabEngine` API, чтобы учебный контент и UI не зависели от конкретной технологии исполнения.

## PGlite

PostgreSQL Lab использует [`@electric-sql/pglite`](https://github.com/electric-sql/pglite) от Electric SQL — PostgreSQL, скомпилированный в WebAssembly. Версия зависимости зафиксирована в `package.json`.
