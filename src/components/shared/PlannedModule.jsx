import { useApp } from "../../state/app-store.jsx";

// Единый placeholder для курсов, у которых режим ещё в разработке
// (OS, Dev). Показывает карточку предмета и его planned runtime.
export default function PlannedModule({ mode }) {
  const { COURSES, nav } = useApp();
  const course = COURSES.find((item) => item.id === nav.course);
  if (!course) return null;
  const modeLabel = mode === "tests" ? "тесты" : "песочница";
  return (
    <section className="product-view planned-module">
      <div className="planned-card" style={{ "--course-accent": course.accent }}>
        <span className="course-badge">{course.code}</span>
        <h2>{course.title}</h2>
        <p className="muted">{course.description}</p>
        <div className="planned-meta">
          <small>Runtime: {course.runtime}</small>
          <small>Статус: {course.status === "planned" ? "в разработке" : course.status}</small>
        </div>
        <p className="planned-note">
          {modeLabel === "тесты" ? "Практические задания" : "Интерактивная песочница"} для этого
          предмета находится в разработке. Лекции уже доступны.
        </p>
      </div>
    </section>
  );
}
