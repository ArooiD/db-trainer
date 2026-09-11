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
  const { nav, artifactsOpen, setArtifactsOpen } = useApp();
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
    if (!artifactsOpen) return;
    refresh();
    usage().then(setStorage).catch(() => {});
    navigator.storage?.persisted?.().then((v) => setPersisted(!!v)).catch(() => {});
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
    <div className="modal artifacts-modal" onClick={(e) => { if (e.target === e.currentTarget) setArtifactsOpen(false); }}>
      <div className="modal-body artifacts-body">
        <button className="modal-close" onClick={() => setArtifactsOpen(false)}>✕</button>
        <h3>{T.title}</h3>
        <p className="artifacts-subtitle">{T.subtitle}</p>

        {!supported ? (
          <div className="artifacts-load-error">{T.loadError}</div>
        ) : (
          <>
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
              <div className="art-toolbar-right">
                <span className="art-count">{items.length} {T.count}</span>
                <button className="art-chip" onClick={refresh}>{T.refresh}</button>
              </div>
            </div>

            {err && <div className="artifacts-load-error">{err}</div>}
            {loading && <div className="art-loading">…</div>}

            {!loading && visible.length === 0 && (
              <div className="artifacts-empty"><span>{T.empty}</span></div>
            )}

            <div className="art-grid">
              {visible.map((record) => (
                <article key={record.id} className="art-card">
                  <button className="art-card-open" onClick={() => openViewer(record)}>
                    <span className="art-icon">{kindIcon(record.primary)}</span>
                    <span className="art-main">
                      <strong>{record.title || record.primary.split("/").pop()}</strong>
                      <small className="art-path">{record.primary}</small>
                    </span>
                  </button>
                  <div className="art-badges">
                    <span className="art-badge type">{record.type}</span>
                    <span className="art-badge course">{record.course}</span>
                    <span className="art-badge files">{record.files.length} {T.files}</span>
                    <span className="art-badge time">{formatWhen(record.updatedAt)}</span>
                  </div>
                  <div className="art-actions">
                    <button className="art-link" onClick={() => openViewer(record)}>{T.open}</button>
                    <button className="art-link danger" onClick={() => onDelete(record)}>{T.delete}</button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {notice && <div className="art-notice">{notice}</div>}
      </div>

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
    </div>
  );
}
