import { useApp } from "../../state/app-store.jsx";

const modules = [
  { lab: null, course: "operating-systems", icon: "\u203a_", label: "OS", title: "Операционные системы" },
  { lab: "programming", course: "programming", icon: "\u2318", label: "Code", title: "Программирование" },
  { lab: "database", course: "databases", icon: "\u25a6", label: "DB", title: "Базы данных" },
  { lab: null, course: "ai", icon: "\u2734", label: "AI", title: "Искусственный интеллект" },
  { lab: null, course: "architecture", icon: "\u25c8", label: "Arch", title: "Архитектура ПО" },
  { lab: null, course: "software-products", icon: "\u25eb", label: "DevOps", title: "DevOps и эксплуатация" }
];

export default function LabRail() {
  const { nav, openRailItem } = useApp();
  return (
    <aside className="ide-activity-bar" aria-label="Навигация по предметам">
      {modules.map((item) => {
        const active = nav.course === item.course;
        return (
          <button
            key={item.course}
            className={`activity-button${active ? " active" : ""}`}
            title={item.title}
            aria-current={active ? "page" : undefined}
            onClick={() => openRailItem(item)}
          >
            <span>{item.icon}</span><small>{item.label}</small>
          </button>
        );
      })}
    </aside>
  );
}
