import { useApp } from "../../state/app-store.jsx";

const modules = [
  { lab: "database", course: "databases", icon: "▦", label: "DB", title: "Базы данных" },
  { lab: "programming", course: "programming", icon: "⌘", label: "Code", title: "Программирование" },
  { lab: null, course: "operating-systems", icon: "›_", label: "OS", title: "Операционные системы" },
  { lab: null, course: "software-products", icon: "◫", label: "Dev", title: "Специальные программные продукты" }
];

export default function LabRail() {
  const { nav, openRailItem } = useApp();
  return (
    <aside className="ide-activity-bar" aria-label="Навигация по предметам">
      {modules.map((item) => {
        const active = nav.mode === "lectures"
          ? nav.course === item.course
          : Boolean(item.lab) && nav.lab === item.lab;
        return (
          <button
            key={item.course}
            className={`activity-button${active ? " active" : ""}`}
            title={item.title}
            onClick={() => openRailItem(item)}
          >
            <span>{item.icon}</span><small>{item.label}</small>
          </button>
        );
      })}
    </aside>
  );
}
