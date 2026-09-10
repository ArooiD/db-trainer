# IT Study Lab

**IT Study Lab** — браузерная интерактивная песочница для будущих программистов и студентов IT-направлений.

Главный сценарий проекта — **свободная работа с технологией**, а не прохождение тестов. Студент выбирает runtime, пишет команды или код, запускает их и наблюдает реальный результат. Проверка знаний вынесена в отдельный режим **Tests / Practice**.

Принцип платформы: **real runtime where possible**. Если технологию можно безопасно запустить в браузере через WebAssembly или JavaScript runtime, IT Study Lab использует настоящее исполнение вместо текстовой имитации.

## Сейчас доступно

Первый рабочий модуль — **Базы данных**:

| Runtime | Технология | Что можно делать |
| --- | --- | --- |
| SQLite | sql.js / WASM | свободно выполнять SQL, менять данные и схему, экспериментировать офлайн |
| PostgreSQL | PGlite / WASM | работать с PostgreSQL прямо в браузере без отдельного сервера |

PGlite загружается локально из Pages-сборки, без внешнего CDN.

Приложение оформлено как **PWA**: его можно установить с GitHub Pages на компьютер или мобильное устройство. После первого открытия основной интерфейс и SQLite runtime доступны без сети; ресурсы PostgreSQL/PGlite сохраняются локально после первой загрузки.

## Два независимых режима

### Sandbox

Sandbox открывается по умолчанию и является основной частью продукта.

В Database Sandbox можно:

- выбрать SQLite или PostgreSQL;
- выполнять многострочные SQL-запросы;
- запускать запрос по `Ctrl/Cmd + Enter`;
- изменять данные и схему базы;
- смотреть результат выполнения;
- просматривать историю команд;
- повторно открывать запрос из истории;
- смотреть учебную схему;
- открыть ER Designer;
- сбросить runtime в исходное состояние.

Состояние runtime живёт между командами, поэтому это именно интерактивная рабочая среда, а не форма «ввести ответ и проверить».

### Tests / Practice

Старые SQL-задания сохранены как отдельный блок проверки знаний.

В этом режиме:

- есть формулировка задания, подсказка и пример решения;
- запрос студента сравнивается с результатом эталонного решения;
- тестовое окружение сбрасывается между проверками;
- прогресс и черновики сохраняются локально.

Tests не ограничивают Sandbox и в будущем смогут использовать те же runtimes для экзаменов и лабораторных сценариев.

## Архитектура

```text
IT Study Lab
│
├── Sandbox                         основной продукт
│   └── WorkbenchSession
│       └── LabRuntime
│           ├── SqliteEngine
│           ├── PGliteEngine
│           └── future engines
│
└── Tests / Practice                слой проверки знаний
    └── tasks + validators
```

`LabRuntime` отвечает за регистрацию и переключение движков. `WorkbenchSession` добавляет поверх runtime интерактивную сессию и историю команд.

```text
input
  ↓
Workbench
  ↓
LabRuntime
  ↓
Engine
  ↓
result / state
  ↓
UI
```

Для будущего Python это будет `code → Python runtime → stdout/files`; для Linux — `command → terminal runtime → stdout/processes/filesystem`; для Docker — `Dockerfile/CLI → container simulator → layers/network/volumes`.

## Направления Sandbox

```text
IT Study Lab
├── Базы данных
│   ├── SQLite
│   └── PostgreSQL / PGlite
│
├── Программирование
│   ├── Python / Pyodide
│   └── JavaScript
│
├── Операционные системы
│   └── Linux terminal / filesystem / processes
│
└── Специальные программные продукты
    └── Docker / Compose / Git / CI/CD
```

Тяжёлые runtimes должны загружаться лениво: пользователь базы данных не должен скачивать Linux image или Pyodide.

## Структура текущего приложения

```text
.github/workflows/       build + GitHub Pages
web/                     источник браузерного приложения
  css/
  js/
    engines/             runtime adapters
    workbench.js         универсальная интерактивная сессия
    app.js               Sandbox + Tests shell
    db.js                совместимый DB facade
    data.js              учебный dataset
    tasks.js             SQL Tests / Practice
    design.js            ER Designer
  vendor/                browser assets
build_dist.js            собирает dist/ и добавляет PGlite
build_inline.js          автономная SQLite-сборка
seed.py                  исходные данные учебной БД
tools/                   генераторы
```

`dist/` и `dist-standalone/` — генерируемые результаты сборки и руками не редактируются.

## Локальный запуск

```bash
npm install
npm run build
python3 -m http.server 8000 -d dist
```

После этого откройте `http://localhost:8000`.

## GitHub Pages

Push в `main` автоматически собирает приложение и публикует каталог `dist/` в GitHub Pages.

PWA-файлы (`manifest.webmanifest`, `service-worker.js`, иконки) находятся в `web/` и автоматически попадают в `dist/`. Относительные URL сохраняют работу как на корневом домене, так и по адресу проекта `/db-trainer/`.

```text
push main
  → npm install
  → npm run build
  → dist/
  → GitHub Pages
```

Standalone-версия `dist-standalone/index.html` содержит SQLite и может работать локально через `file://`. PostgreSQL/PGlite требует обычную HTTP/Pages-сборку.

## Следующий приоритет

Следующий runtime для Sandbox — **программирование**: сначала Python через Pyodide, затем JavaScript. После этого — Linux terminal и Docker/Compose laboratory environment.

Tests, курсы, skill tree и экзамены должны развиваться как дополнительный образовательный слой поверх работающих песочниц, а не заменять их.
