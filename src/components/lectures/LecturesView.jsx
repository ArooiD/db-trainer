import { useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useApp } from "../../state/app-store.jsx";
import { loadLectureContent } from "../../data/lecture-loader.js";

const mdComponents = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>
  ),
  img: ({ src, alt }) => (
    <img className="lecture-media" src={src} alt={alt || ""} loading="lazy" />
  )
};

function LectureBody({ content }) {
  return (
    <div className="lecture-md">
      <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>{content}</Markdown>
    </div>
  );
}

function LectureSlides({ content, meta }) {
  const slides = useMemo(
    () => content.split(/^\s*---\s*$/m).map((slide) => slide.trim()).filter(Boolean),
    [content]
  );
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [content]);
  const total = slides.length || 1;
  const current = slides[Math.min(index, total - 1)] || "";
  return (
    <div className="lecture-slides">
      <div className="slide-stage">
        <div className="lecture-md slide-active">
          <Markdown remarkPlugins={[remarkGfm]} components={mdComponents}>{current}</Markdown>
        </div>
      </div>
      <div className="slide-nav">
        <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>← Назад</button>
        <span>{Math.min(index + 1, total)} / {total}</span>
        <button onClick={() => setIndex((i) => Math.min(total - 1, i + 1))} disabled={index >= total - 1}>Далее →</button>
      </div>
    </div>
  );
}

export default function LecturesView() {
  const { COURSES, nav, selectLecture, setMode, openLab } = useApp();
  const course = COURSES.find((item) => item.id === nav.course) || COURSES[0];
  const lecture = course?.lectures.find((item) => item.id === nav.lecture) || course?.lectures[0];
  const [content, setContent] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!course || !lecture?.file) return undefined;
    let active = true;
    setContent(null);
    setError("");
    loadLectureContent(course.id, lecture.file)
      .then((text) => { if (active) setContent(text); })
      .catch((err) => { if (active) setError(err.message || "Ошибка загрузки"); });
    return () => { active = false; };
  }, [course, lecture]);

  if (!course) return null;

  const courseActions = {
    databases: (
      <>
        <button className="primary" onClick={() => { setMode("sandbox"); openLab("database"); }}>Открыть Database Sandbox</button>
        <button onClick={() => setMode("tests")}>Перейти к SQL Tests</button>
      </>
    ),
    programming: (
      <>
        <button className="primary" onClick={() => { setMode("sandbox"); openLab("programming"); }}>Открыть Programming Sandbox</button>
        <span className="lecture-runtime-status">JavaScript готов сразу · Python загружается при первом запуске</span>
      </>
    )
  };

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
                {lecture.summary && <p className="lecture-lead">{lecture.summary}</p>}

                {lecture.video && (
                  <a className="lecture-video" href={lecture.video} target="_blank" rel="noreferrer noopener">
                    <span>▶</span> Видео по теме
                  </a>
                )}

                {error && <div className="lecture-placeholder"><span>Содержание недоступно</span><p>{error}</p></div>}
                {!error && content === null && <div className="lecture-loading">Загрузка материала…</div>}
                {!error && content !== null && (
                  lecture.format === "slides"
                    ? <LectureSlides content={content} meta={lecture} />
                    : <LectureBody content={content} />
                )}

                <div className="lecture-actions">
                  {courseActions[course.id] || (
                    <span className="lecture-runtime-status">Практический runtime готовится для этого курса.</span>
                  )}
                </div>
              </article>
            )}
          </div>
        </main>
      </div>
    </section>
  );
}
