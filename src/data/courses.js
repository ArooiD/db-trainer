// Каталог учебных курсов IT Study Lab.
// Метаданные курса живут здесь; содержимое лекций вынесено в ./lectures/*.js —
// по одному файлу на курс, чтобы контент можно было пополнять независимо от интерфейса.

import { DB_LECTURES } from "./lectures/databases.js";
import { DEV_LECTURES } from "./lectures/programming.js";
import { OS_LECTURES } from "./lectures/operating-systems.js";
import { OPS_LECTURES } from "./lectures/software-products.js";

export const COURSES = [
  {
    id: "databases",
    code: "DB",
    title: "Базы данных",
    description: "Реляционная модель, SQL, проектирование схем и производительность запросов.",
    status: "available",
    runtime: "SQLite · PostgreSQL / PGlite",
    accent: "#4f9cf9",
    lectures: DB_LECTURES
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
    lectures: DEV_LECTURES
  },
  {
    id: "operating-systems",
    code: "OS",
    title: "Операционные системы",
    description: "Linux, процессы, память, файловые системы и системные интерфейсы.",
    status: "planned",
    runtime: "Linux sandbox / v86",
    accent: "#38d39f",
    lectures: OS_LECTURES
  },
  {
    id: "software-products",
    code: "DevOps",
    title: "DevOps и эксплуатация",
    description: "Docker, Compose, Git, CI/CD и эксплуатация программных систем.",
    status: "planned",
    runtime: "Container Lab Engine",
    accent: "#ffb454",
    lectures: OPS_LECTURES
  }
];
