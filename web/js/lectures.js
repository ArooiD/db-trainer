// Data-driven catalog for the Lectures mode.
window.IT_STUDY_COURSES = [
  {
    id: "databases",
    code: "DB",
    title: "Базы данных",
    description: "Реляционная модель, SQL, проектирование схем и производительность запросов.",
    status: "available",
    runtime: "SQLite · PostgreSQL / PGlite",
    accent: "#4f9cf9",
    lectures: [
      {
        id: "db-relational-model",
        title: "Реляционная модель",
        duration: "18 мин",
        level: "Основы",
        summary: "Таблицы, строки, столбцы, ключи и ограничения целостности.",
        theory: [
          "Реляционная база представляет данные как набор связанных таблиц.",
          "Первичный ключ однозначно определяет строку, внешний ключ связывает таблицы.",
          "Ограничения NOT NULL, UNIQUE, CHECK и FOREIGN KEY защищают данные от некорректных состояний."
        ],
        practice: "Откройте ER Diagram и найдите первичные и внешние ключи учебной схемы."
      },
      {
        id: "db-select",
        title: "SELECT и фильтрация",
        duration: "24 мин",
        level: "Основы",
        summary: "Выборка данных, WHERE, ORDER BY, LIMIT и выражения.",
        theory: [
          "SELECT определяет набор возвращаемых столбцов и вычисляемых выражений.",
          "WHERE фильтрует строки до сортировки и ограничения результата.",
          "ORDER BY делает порядок результата явным, а LIMIT ограничивает объём выборки."
        ],
        practice: "Выберите активных сотрудников и отсортируйте их по зарплате."
      },
      {
        id: "db-joins",
        title: "JOIN и связи",
        duration: "28 мин",
        level: "Средний",
        summary: "INNER/LEFT JOIN, условия соединения и чтение связанных данных.",
        theory: [
          "JOIN объединяет строки нескольких таблиц по логическому условию.",
          "INNER JOIN оставляет совпавшие строки, LEFT JOIN сохраняет все строки левой таблицы.",
          "Связи на ERD помогают определить ключи, которые должны участвовать в ON."
        ],
        practice: "Выведите сотрудников вместе с названиями их отделов."
      },
      {
        id: "db-indexes",
        title: "Индексы и план запроса",
        duration: "32 мин",
        level: "Продвинутый",
        summary: "Назначение индексов, селективность и стоимость выполнения.",
        theory: [
          "Индекс ускоряет поиск ценой дополнительного места и стоимости записи.",
          "Полезность индекса зависит от селективности условия и объёма таблицы.",
          "Сравнивать варианты следует на одинаковых данных и с помощью плана выполнения."
        ],
        practice: "Откройте Load Lab и сравните запрос до и после создания индекса."
      }
    ]
  },
  {
    id: "programming",
    code: "DEV",
    title: "Программирование IT-систем",
    description: "Алгоритмы, Python, JavaScript и устройство прикладных программ.",
    status: "planned",
    runtime: "Python / Pyodide · Browser JavaScript",
    accent: "#9b8cff",
    lectures: [
      { id: "dev-algorithms", title: "Алгоритмы и структуры данных", duration: "план", level: "Основы", summary: "Переменные, ветвления, циклы, функции и структуры данных." },
      { id: "dev-python", title: "Python в браузере", duration: "план", level: "Средний", summary: "Pyodide, модули, файлы, stdout и воспроизводимое выполнение." },
      { id: "dev-web", title: "JavaScript и Web API", duration: "план", level: "Средний", summary: "Событийная модель, DOM, асинхронность и браузерные API." }
    ]
  },
  {
    id: "operating-systems",
    code: "OS",
    title: "Операционные системы",
    description: "Linux, процессы, память, файловые системы и системные интерфейсы.",
    status: "planned",
    runtime: "Linux sandbox / v86",
    accent: "#38d39f",
    lectures: [
      { id: "os-processes", title: "Процессы и потоки", duration: "план", level: "Основы", summary: "Состояния процессов, планирование, сигналы и IPC." },
      { id: "os-memory", title: "Память и адресное пространство", duration: "план", level: "Средний", summary: "Страницы, виртуальная память, heap, stack и mmap." },
      { id: "os-filesystems", title: "Файловые системы Linux", duration: "план", level: "Средний", summary: "Файлы, inode, права, mount и виртуальные файловые системы." }
    ]
  },
  {
    id: "software-products",
    code: "OPS",
    title: "Специальные программные продукты",
    description: "Docker, Compose, Git, CI/CD и эксплуатация программных систем.",
    status: "planned",
    runtime: "Container Lab Engine",
    accent: "#ffb454",
    lectures: [
      { id: "ops-containers", title: "Контейнеры и образы", duration: "план", level: "Основы", summary: "Namespaces, cgroups, слои образа и жизненный цикл контейнера." },
      { id: "ops-compose", title: "Docker Compose", duration: "план", level: "Средний", summary: "Сервисы, сети, volumes, зависимости и healthcheck." },
      { id: "ops-cicd", title: "Git и CI/CD", duration: "план", level: "Средний", summary: "Ветки, pipeline, артефакты, окружения и доставка изменений." }
    ]
  }
];
