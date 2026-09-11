import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../state/app-store.jsx";
import { T } from "../../workspace/strings.js";
import {
  listArtifacts,
  readArtifactFile,
  deleteArtifact
} from "../../workspace/artifact-bus.js";
import { isSupported, requestPersistence, usage } from "../../workspace/filesystem.js";
import { formatBytes, formatWhen, kindIcon, downloadFile, copyText } from "../../workspace/util.js";
import { MarkdownBody, SlideDeck } from "../shared/MarkdownDoc.jsx";

const TEXT_EXT = new Set(["py", "js", "jsx", "ts", "tsx", "sql", "csv", "json", "md", "markdown", "txt", "log", "html", "css", "yml", "yaml", "sh"]);

function isTextLike(name) {
  const dot = String(name).lastIndexOf(".");
  return dot > 0 && TEXT_EXT.has(name.slice(dot + 1).toLowerCase());
}

export default function ArtifactsView() {
  const { artifactsOpen, toggleArtifacts } = useApp();
  const supported = isSupported();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("all");
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });
  const [persisted, setPersisted] = useState(false);

  const [viewer, setViewer] = useState(null);
  const [viewerBody, setViewerBody] = useState("");
  const [viewerState, setViewerState] = useState("idle"); // idle | loading | ready | binary
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    if (!supported) return;
    setLoading(true);
    try {
      const list = await listArtifacts({});
      setItems(list);
      setErr("");
    } catch (error) {
      setErr(error.message || String(error));
    } finally {
      setLoading(false);
    }
  }, [supported]);

  useEffect(() => {
    if (!artifactsOpen) return undefined;
    refresh();
    usage().then(setStorage).catch(() => {});
    navigator.storage?.persisted?.().then((v) => setPersisted(!!v)).catch(() => {});
    return undefined;
  }, [artifactsOpen, refresh]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 1800);
    return () => clearTimeout(timer);
  }, [notice]);

  async function openViewer(record) {
    setViewer(record);
    setViewerState("loading");
    setViewerBody("");
    try {
      const file = await readArtifactFile(record.id);
      if (isTextLike(record.primary)) {
        setViewerBody(await file.text());
        setViewerState("ready");
      } else {
        setViewerState("binary");
      }
    } catch (error) {
      setViewerBody(error.message || String(error));
      setViewerState("binary");
    }
  }

  async function onDownload() {
    try {
      const file = await readArtifactFile(viewer.id);
      downloadFile(file);
    } catch (error) {
      setNotice(error.message || String(error));
    }
  }

  async function onCopyPath() {
    if (await copyText(viewer.primary)) setNotice(T.copied);
  }

  async function onPersist() {
    const ok = await requestPersistence();
    setPersisted(ok);
  }

  async function onDelete(record) {
    await deleteArtifact(record.id);
    if (viewer && viewer.id === record.id) setViewer(null);
    setNotice(T.deleted);
    refresh();
  }

  if (!artifactsOpen) return null;

  const courses = [...new Set(items.map((item) => item.course))];
  const visible = filter === "all" ? items : items.filter((item) => item.course === filter);
  const pct = storage.quota ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;
  const slideMode = viewer && isTextLike(viewer.primary) && /\.(md|markdown)$/i.test(viewer.primary);

  return (
    <>
      <aside className="artifacts-dock" aria-label={T.title}>
        <div className="art-dock-head">
          <span className="art-dock-title">{T.title}</span>
          <span className="art-dock-count">{items.length}</span>
          <button className="art-dock-collapse" onClick={toggleArtifacts} title={T.title} aria-label={T.title}>›</button>
        </div>

        {!supported ? (
          <div className="artifacts-load-error">{T.loadError}</div>
        ) : (
          <div className="art-dock-body">
            <div className="artifacts-storage">
              <div className="storage-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
              <div className="storage-meta">
                <span>{T.used}: {formatBytes(storage.usage)} {T.of} {formatBytes(storage.quota)}</span>
                <button className="art-chip" onClick={onPersist} disabled={persisted}>
                  {persisted ? T.persisted : T.persist}
                </button>
              </div>
              {!persisted && <small className="art-warn">{T.notPersisted}</small>}
            </div>

            <div className="artifacts-toolbar">
              <div className="art-filters">
                <button className={`art-chip${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
                  {T.filterAll}
                </button>
                {courses.map((course) => (
                  <button key={course} className={`art-chip${filter === course ? " active" : ""}`} onClick={() => setFilter(course)}>
                    {course}
                  </button>
                ))}
              </div>
              <button className="art-chip art-refresh" onClick={refresh} title={T.refresh}>↻</button>
            </div>

            {err && <div className="artifacts-load-error">{err}</div>}
            {loading && <div className="art-loading">…</div>}

            {!loading && visible.length === 0 && (
              <div className="artifacts-empty"><span>{T.empty}</span></div>
            )}

            <div className="art-list">
              {visible.map((record) => (
                <article key={record.id} className="art-row">
                  <button className="art-row-open" onClick={() => openViewer(record)}>
                    <span className="art-icon">{kindIcon(record.primary)}</span>
                    <span className="art-main">
                      <strong>{record.title || record.primary.split("/").pop()}</strong>
                      <small className="art-path">{record.course} · {record.type} · {formatWhen(record.updatedAt)}</small>
                    </span>
                    <span className="art-row-del" role="button" tabIndex={0} title={T.delete}
                      onClick={(e) => { e.stopPropagation(); onDelete(record); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onDelete(record); } }}>✕</span>
                  </button>
                </article>
              ))}
            </div>
          </div>
        )}

        {notice && <div className="art-notice">{notice}</div>}
      </aside>

      {viewer && (
        <div className="modal viewer-modal" onClick={(e) => { if (e.target === e.currentTarget) setViewer(null); }}>
          <div className="modal-body viewer-body">
            <button className="modal-close" onClick={() => setViewer(null)}>✕</button>
            <div className="viewer-head">
              <div>
                <h4>{viewer.title || viewer.primary.split("/").pop()}</h4>
                <div className="art-badges">
                  <span className="art-badge type">{viewer.type}</span>
                  <span className="art-badge course">{viewer.course}</span>
                </div>
              </div>
              <div className="viewer-actions">
                <button className="art-link" onClick={onCopyPath}>{T.copy}</button>
                <button className="art-link" onClick={onDownload}>{T.download}</button>
              </div>
            </div>
            {viewerState === "loading" && <div className="art-loading">…</div>}
            {viewerState === "binary" && <div className="artifacts-empty"><span>{T.binaryPreview}</span></div>}
            {viewerState === "ready" && (slideMode
              ? <SlideDeck content={viewerBody} />
              : <MarkdownBody content={viewerBody} />)}
          </div>
        </div>
      )}
    </>
  );
}
