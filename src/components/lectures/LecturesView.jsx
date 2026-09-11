import { useApp } from "../../state/app-store.jsx";

export default function LecturesView() {
  const { COURSES, nav, selectLecture, setMode, openLab } = useApp();
  const course = COURSES.find((item) => item.id === nav.course) || COURSES[0];
  const lecture = course?.lectures.find((item) => item.id === nav.lecture) || course?.lectures[0];
  if (!course) return null;

  return (
    <section className={`product-view lectures-view${nav.mode === "lectures" ? "" : " hidden"}`}>
      <div className="lectures-shell">
        <main className="lecture-workspace">
          <div className="course-overview">
            <div>
              <span className="course-badge" style={{ "--course-accent": course.accent }}>{course.code}</span>
              <div className="course-heading">
                <small>{course.status === "available" ? "Курс доступен" : "Курс готовится"}</small>
                <h2>{course.title}</h2>
                <p>{course.description}</p>
              </div>
            </div>
            <div className="course-meta">
              <strong>{course.lectures.length}</strong><span>темы</span><small>{course.runtime}</small>
            </div>
          </div>

          <div className="lecture-content-grid">
            <nav className="lecture-list" aria-label="Темы курса">
              {course.lectures.map((item, index) => (
                <button
                  key={item.id}
                  className={`lecture-item${lecture && item.id === lecture.id ? " active" : ""}`}
                  onClick={() => selectLecture(course.id, item.id)}
                >
                  <span className="lecture-index">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.level} · {item.duration}</small>
                  </span>
                </button>
              ))}
            </nav>

            {lecture && (
              <article className="lecture-reader">
                <div className="lecture-reader-head">
                  <div>
                    <span>{lecture.level}</span>
                    <h3>{lecture.title}</h3>
                  </div>
                  <span className="lecture-duration">{lecture.duration}</span>
                </div>
                <p className="lecture-lead">{lecture.summary}</p>

                {Array.isArray(lecture.theory) ? (
                  <>
                    <div className="theory-points">
                      {lecture.theory.map((point, index) => (
                        <section key={index}><span>{index + 1}</span><p>{point}</p></section>
                      ))}
                    </div>
                    <div className="lecture-practice">
                      <small>Практическое продолжение</small>
                      <p>{lecture.practice}</p>
                    </div>
                    {course.id === "databases" && (
                      <div className="lecture-actions">
                        <button className="primary" onClick={() => { setMode("sandbox"); openLab("database"); }}>
                          Открыть Database Sandbox
                        </button>
                        <button onClick={() => setMode("tests")}>Перейти к SQL Tests</button>
                      </div>
                    )}
                    {course.id === "programming" && (
                      <div className="lecture-actions">
                        <button className="primary" onClick={() => { setMode("sandbox"); openLab("programming"); }}>
                          Открыть Programming Sandbox
                        </button>
                        <span className="lecture-runtime-status">
                          JavaScript готов сразу · Python загружается при первом запуске
                        </span>
                      </div>
                    )}
                    {!["databases", "programming"].includes(course.id) && (
                      <div className="lecture-actions">
                        <span className="lecture-runtime-status">Практический runtime готовится для этого курса.</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="lecture-placeholder">
                    <span>Содержание готовится</span>
                    <p>
                      Структура курса создана. Сюда подключаются теория, примеры, лабораторная работа
                      и runtime <strong>{course.runtime}</strong>.
                    </p>
                  </div>
                )}
              </article>
            )}
          </div>
        </main>
      </div>
    </section>
  );
}
