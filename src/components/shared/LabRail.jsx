const modules = {
  database: { icon: "▦", label: "DB", title: "Базы данных" },
  programming: { icon: "⌘", label: "Code", title: "Программирование" }
};

export default function LabRail({ active }) {
  return (
    <aside className="ide-activity-bar" aria-label="Лаборатории">
      {Object.entries(modules).map(([id, item]) => (
        <button key={id} className={`activity-button${id === active ? " active" : ""}`} data-open-lab={id} title={item.title}>
          <span>{item.icon}</span><small>{item.label}</small>
        </button>
      ))}
      <button className="activity-button" data-future-module data-title="Операционные системы" data-description="Интерактивный Linux terminal, файловая система, процессы и сигналы." title="Операционные системы"><span>›_</span><small>OS</small></button>
      <button className="activity-button" data-future-module data-title="Специальные программные продукты" data-description="Dockerfile, Compose, контейнеры, сети, volumes и CI/CD." title="Docker / Software"><span>◫</span><small>Dev</small></button>
    </aside>
  );
}
