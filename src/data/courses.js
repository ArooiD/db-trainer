// Каталог учебных курсов IT Study Lab.
// Метаданные темы живут в JSON (src/static/lectures/<курс>/index.json);
// тело каждой лекции — отдельный Markdown-файл, который подгружается лениво.
// JSON импортируется здесь синхронно, чтобы навигация и валидация ?lecture=...
// работали без сетевой задержки; Markdown не бандлится и грузится из public/.

import databases from "../static/lectures/databases/index.json";
import programming from "../static/lectures/programming/index.json";
import operatingSystems from "../static/lectures/operating-systems/index.json";
import softwareProducts from "../static/lectures/software-products/index.json";
import ai from "../static/lectures/ai/index.json";
import architecture from "../static/lectures/architecture/index.json";

export const COURSES = [
  {
    id: "databases",
    code: "DB",
    title: "Базы данных",
    description: "Реляционная модель, SQL, проектирование схем и производительность запросов.",
    status: "available",
    runtime: "SQLite · PostgreSQL / PGlite",
    accent: "#4f9cf9",
    lectures: databases.lectures
  },
  {
    id: "programming",
    code: "DEV",
    title: "Программирование IT-систем",
    description: "Алгоритмы, Python, JavaScript и устройство прикладных программ.",
    status: "available",
    practiceStatus: "planned",
    runtime: "Python / Pyodide · Browser JavaScript",
    accent: "#9b8cff",
    lectures: programming.lectures
  },
  {
    id: "operating-systems",
    code: "OS",
    title: "Операционные системы",
    description: "Linux, процессы, память, файловые системы и системные интерфейсы.",
    status: "planned",
    runtime: "Linux sandbox / v86",
    accent: "#38d39f",
    lectures: operatingSystems.lectures
  },
  {
    id: "software-products",
    code: "DevOps",
    title: "DevOps и эксплуатация",
    description: "Docker, Compose, Git, CI/CD и эксплуатация программных систем.",
    status: "planned",
    runtime: "Container Lab Engine",
    accent: "#ffb454",
    lectures: softwareProducts.lectures
  },
  {
    id: "ai",
    code: "AI",
    title: "Искусственный интеллект",
    description: "ML-пайплайн, нейросети, трансформеры и практические ограничения моделей.",
    status: "planned",
    runtime: "TensorFlow.js / ONNX Runtime Web",
    accent: "#ff6ba6",
    lectures: ai.lectures
  },
  {
    id: "architecture",
    code: "ARCH",
    title: "Архитектура ПО",
    description: "Границы модулей, архитектурные стили, надёжность и принятие решений.",
    status: "planned",
    runtime: "C4-lab / ADR editor",
    accent: "#63e2d1",
    lectures: architecture.lectures
  }
];
