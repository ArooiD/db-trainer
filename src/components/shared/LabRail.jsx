const modules = [
  { id: "database", course: "databases", icon: "▦", label: "DB", title: "Базы данных" },
  { id: "programming", course: "programming", icon: "⌘", label: "Code", title: "Программирование" },
  { id: null, course: "operating-systems", icon: "›_", label: "OS", title: "Операционные системы" },
  { id: null, course: "software-products", icon: "◫", label: "Dev", title: "Специальные программные продукты" }
];

export default function LabRail({ active }) {
  return (
    <aside className="ide-activity-bar" aria-label="Навигация по предметам">
      {modules.map((item) => (
        <button
          key={item.course}
          className={`activity-button${item.id === active ? " active" : ""}`}
          {...(item.id ? { "data-open-lab": item.id } : { "data-open-course": item.course })}
          data-course={item.course}
          title={item.title}
        >
          <span>{item.icon}</span><small>{item.label}</small>
        </button>
      ))}
    </aside>
  );
}
