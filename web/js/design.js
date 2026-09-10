// Режим проектирования БД: canvas-редактор ER-диаграммы.
// Таблицы: создавать, таскать, редактировать колонки (имя/тип/PK), связывать
// FK перетаскиванием с «точкой» на правой стороне колонки. Пан — ЛКМ по фону,
// зум — колесо. Модель автосохраняется в localStorage (по заданию), справа —
// панель редактирования и готовый CREATE TABLE.

(function () {
  const COLORS = {
    bg: "#0b1120", grid: "#141d33", node: "#171e2e", nodeBorder: "#2b3450",
    header: "#4f8cff", text: "#e6ebf5", muted: "#8a97b3",
    pk: "#ffcc66", fk: "#38d39f", link: "#4f8cff", linkHi: "#38d39f",
    sel: "#4f8cff",
  };
  const ROW_H = 24, HEAD_H = 32, PAD = 12, DOT_R = 6;
  const TYPES = ["INTEGER", "TEXT", "REAL", "DATE", "BOOLEAN"];
  const FONT = '13px "SF Mono", Consolas, monospace';

  let overlay, canvas, ctx, stage, side;
  let model = null;
  let view = { x: 0, y: 0, k: 1 };
  let hover = null, selectedId = null, drag = null, linkDrag = null;
  let dirty = true, raf = null, taskCtx = null, ro = null;
  let seq = 0;

  // ---------- утилиты ----------
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const uid = () => "t" + Date.now().toString(36) + (seq++).toString(36);
  const tableById = (id) => model.tables.find((t) => t.id === id);
  const pkOf = (t) => (t.columns.find((c) => c.pk) || t.columns[0] || { name: "id" }).name;
  const storeKey = () => "sqltr.design." + (taskCtx && taskCtx.id ? taskCtx.id : "sandbox");

  function save() { try { localStorage.setItem(storeKey(), JSON.stringify(model)); } catch {} }
  function load() { try { return JSON.parse(localStorage.getItem(storeKey()) || "null"); } catch { return null; } }

  function nodeName(name) {
    let n = name, i = 2;
    const taken = (s) => model.tables.some((t) => t.name === s);
    while (taken(n)) n = name + "_" + i++;
    return n;
  }

  function autoPlace(w, h) {
    for (let i = 0; i < 60; i++) {
      const x = 60 + (i % 3) * 300, y = 60 + Math.floor(i / 3) * 240;
      const clash = model.tables.some((t) => {
        const n = nodeSize(t);
        return Math.abs(n.x - x) < (n.w + w) / 2 && Math.abs(n.y - y) < (n.h + h) / 2;
      });
      if (!clash) return { x, y };
    }
    return { x: 60, y: 60 };
  }

  function nodeSize(t) {
    ctx.font = FONT;
    const w = Math.max(
      180,
      ...t.columns.map((c) => ctx.measureText(c.name + "  " + c.type).width + 84)
    );
    return { x: t.x, y: t.y, w: Math.round(w), h: HEAD_H + t.columns.length * ROW_H + PAD };
  }

  // ---------- модель ----------
  function newTable(name) {
    const t = { id: uid(), name: nodeName(name || "table_" + (model.tables.length + 1)), x: 0, y: 0,
      columns: [{ name: "id", type: "INTEGER", pk: true, fk: null }] };
    const s = { w: 200, h: HEAD_H + ROW_H + PAD };
    const p = autoPlace(s.w, s.h);
    t.x = p.x; t.y = p.y;
    model.tables.push(t);
    selectedId = t.id;
    save(); dirty = true; renderSide();
    return t;
  }

  function removeTable(id) {
    model.tables = model.tables.filter((t) => t.id !== id);
    model.tables.forEach((t) => t.columns.forEach((c) => {
      if (c.fk && !tableById(c.fk.tableId)) c.fk = null;
    }));
    if (selectedId === id) selectedId = null;
    save(); dirty = true; renderSide();
  }

  function removeColumn(t, idx) {
    const removed = t.columns[idx];
    t.columns.splice(idx, 1);
    model.tables.forEach((o) => o.columns.forEach((c) => {
      if (c.fk && c.fk.tableId === t.id && c.fk.column === removed.name) c.fk = null;
    }));
    save(); dirty = true; renderSide();
  }

  function addColumn(t) {
    t.columns.push({ name: "column_" + (t.columns.length + 1), type: "TEXT", pk: false, fk: null });
    save(); dirty = true; renderSide();
  }

  function connect(fromTableId, toTableId) {
    if (fromTableId === toTableId) return;
    const src = tableById(fromTableId), dst = tableById(toTableId);
    const base = dst.name + "_id";
    let name = base, i = 2;
    while (src.columns.some((c) => c.name === name)) name = base + "_" + i++;
    src.columns.push({ name, type: "INTEGER", pk: false, fk: { tableId: dst.id, column: pkOf(dst) } });
    save(); dirty = true; renderSide();
  }

  // ---------- генератор CREATE TABLE ----------
  function genDDL() {
    const byId = Object.fromEntries(model.tables.map((t) => [t.id, t]));
    const seen = new Set(), order = [];
    function visit(t, stack) {
      if (seen.has(t.id) || stack.has(t.id)) return;
      stack.add(t.id);
      t.columns.forEach((c) => { if (c.fk && byId[c.fk.tableId]) visit(byId[c.fk.tableId], stack); });
      stack.delete(t.id);
      seen.add(t.id); order.push(t);
    }
    model.tables.forEach((t) => visit(t, new Set()));
    const parts = order.map((t) => {
      const cols = t.columns.map((c) => {
        let line = "  " + c.name + " " + (c.type || "TEXT");
        if (c.pk) line += " PRIMARY KEY";
        return line;
      });
      t.columns.filter((c) => c.fk && byId[c.fk.tableId]).forEach((c) => {
        cols.push("  FOREIGN KEY (" + c.name + ") REFERENCES " + byId[c.fk.tableId].name + "(" + c.fk.column + ")");
      });
      return "CREATE TABLE " + t.name + " (\n" + cols.join(",\n") + "\n);";
    });
    return parts.join("\n\n");
  }

  // ---------- отрисовка ----------
  function roundRect(x, y, w, h, r, topOnly) {
    ctx.beginPath();
    if (topOnly) {
      ctx.moveTo(x, y + h); ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r); ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h); ctx.closePath();
    } else {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
  }

  function toWorld(px, py) { return { x: (px - view.x) / view.k, y: (py - view.y) / view.k }; }

  function rowY(t, i) { return t.y + HEAD_H + i * ROW_H + ROW_H / 2; }

  function hitTest(w) {
    for (let i = model.tables.length - 1; i >= 0; i--) {
      const t = model.tables[i], n = nodeSize(t);
      if (w.x >= n.x && w.x <= n.x + n.w && w.y >= n.y && w.y <= n.y + n.h) {
        const idx = Math.floor((w.y - n.y - HEAD_H) / ROW_H);
        const onDot = w.x >= n.x + n.w - 18 && idx >= 0 && idx < t.columns.length;
        return { table: t, row: idx, dot: onDot };
      }
    }
    return null;
  }

  function drawLink(c, t) {
    const a = nodeSize(tableById(c.fk.tableId));
    const src = nodeSize(t);
    const dstCol = tableById(c.fk.tableId).columns.findIndex((x) => x.name === c.fk.column);
    const ax = src.x + src.w, ay = rowY(t, t.columns.indexOf(c));
    const bx = a.x, by = dstCol >= 0 ? rowY(tableById(c.fk.tableId), dstCol) : a.y + HEAD_H / 2;
    const hi = hover === t.id || hover === c.fk.tableId || selectedId === t.id || selectedId === c.fk.tableId;
    const dx = Math.max(40, Math.abs(bx - ax) * 0.5);
    ctx.strokeStyle = hi ? COLORS.linkHi : COLORS.link;
    ctx.lineWidth = hi ? 2.4 : 1.5;
    ctx.beginPath(); ctx.moveTo(ax, ay);
    ctx.bezierCurveTo(ax + dx, ay, bx - dx, by, bx, by); ctx.stroke();
    ctx.fillStyle = hi ? COLORS.linkHi : COLORS.link;
    [{ x: ax, y: ay }, { x: bx, y: by }].forEach((p) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    });
  }

  function drawTable(t) {
    const n = nodeSize(t);
    const active = hover === t.id || selectedId === t.id;
    ctx.fillStyle = COLORS.node;
    ctx.strokeStyle = selectedId === t.id ? COLORS.sel : active ? COLORS.header : COLORS.nodeBorder;
    ctx.lineWidth = selectedId === t.id ? 2.2 : 1;
    roundRect(n.x, n.y, n.w, n.h, 9); ctx.fill(); ctx.stroke();

    ctx.fillStyle = COLORS.header;
    roundRect(n.x, n.y, n.w, HEAD_H, 9, true); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = 'bold 13px system-ui, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(t.name, n.x + PAD, n.y + HEAD_H / 2);

    ctx.font = FONT;
    t.columns.forEach((c, i) => {
      const y = rowY(t, i);
      ctx.textAlign = "left"; ctx.fillStyle = COLORS.text;
      ctx.fillText(c.name, n.x + PAD, y);
      ctx.textAlign = "right"; ctx.fillStyle = COLORS.muted;
      ctx.fillText(c.type, n.x + n.w - PAD - 22, y);
      if (c.pk) { ctx.fillStyle = COLORS.pk; ctx.fillText("PK", n.x + n.w - PAD - 16, y); }
      else if (c.fk) { ctx.fillStyle = COLORS.fk; ctx.fillText("FK", n.x + n.w - PAD - 16, y); }
      // точка для рисования связи
      if (c.pk || !c.fk) {
        ctx.fillStyle = COLORS.fk;
        ctx.beginPath(); ctx.arc(n.x + n.w - 7, y, DOT_R / 1.6, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.textAlign = "left";
  }

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr, h = canvas.height / dpr;
    ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(view.x, view.y); ctx.scale(view.k, view.k);

    const g = 26;
    ctx.fillStyle = COLORS.grid;
    const x0 = Math.floor(-view.x / view.k / g) * g, y0 = Math.floor(-view.y / view.k / g) * g;
    for (let gx = x0; gx < x0 + w / view.k + g; gx += g)
      for (let gy = y0; gy < y0 + h / view.k + g; gy += g) ctx.fillRect(gx, gy, 1.2, 1.2);

    model.tables.forEach((t) => t.columns.forEach((c) => { if (c.fk) drawLink(c, t); }));
    model.tables.forEach(drawTable);

    if (linkDrag) {
      const t = tableById(linkDrag.fromTableId), n = nodeSize(t);
      const ay = rowY(t, linkDrag.row);
      ctx.strokeStyle = COLORS.linkHi; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(n.x + n.w - 7, ay); ctx.lineTo(linkDrag.wx, linkDrag.wy); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    ctx.fillStyle = COLORS.muted;
    ctx.font = '12px system-ui, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = "alphabetic";
    ctx.fillText("таблицу — таскать · точку колонки → на другую таблицу — связь FK · фон — панорама · колесо — масштаб", 12, h - 10);
  }

  function loop() { if (dirty) { dirty = false; draw(); } raf = requestAnimationFrame(loop); }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = stage.getBoundingClientRect();
    canvas.width = Math.max(1, r.width * dpr);
    canvas.height = Math.max(1, r.height * dpr);
    canvas.style.width = r.width + "px";
    canvas.style.height = r.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dirty = true;
  }

  function fit() {
    if (!model.tables.length) { view = { x: 40, y: 40, k: 1 }; dirty = true; return; }
    const r = stage.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    model.tables.forEach((t) => {
      const n = nodeSize(t);
      minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h);
    });
    const p = 46, k = Math.min((r.width - p * 2) / (maxX - minX), (r.height - p * 2) / (maxY - minY), 1.3);
    view.k = Math.max(0.3, k);
    view.x = (r.width - (maxX - minX) * view.k) / 2 - minX * view.k;
    view.y = (r.height - (maxY - minY) * view.k) / 2 - minY * view.k;
    dirty = true;
  }

  // ---------- панель ----------
  function renderSide() {
    const sel = selectedId && tableById(selectedId);
    let html = `<h3>Проектирование</h3>
      <div class="designer-task">${taskCtx ? esc(taskCtx.title) + " — " + esc(taskCtx.description) : "Свободный набросок схемы."}</div>
      <div class="dtoolbar">
        <button id="d-add" class="primary">＋ Таблица</button>
        <button id="d-fit" class="ghost">⌖ Вписать</button>
        <button id="d-clear" class="ghost danger">✕ Очистить</button>
      </div>
      <div class="tlist">`;
    html += model.tables.map((t) =>
      `<button class="tlist-item ${t.id === selectedId ? "active" : ""}" data-id="${t.id}">${esc(t.name)}</button>`
    ).join("") || '<div class="hint">Пока пусто — создайте первую таблицу.</div>';
    html += "</div>";

    if (sel) {
      html += `<h3 style="margin-top:10px">Таблица</h3>
        <div class="col-row" style="grid-template-columns:1fr"><input id="d-tname" value="${esc(sel.name)}" spellcheck="false" /></div>
        <h3 style="margin-top:10px">Колонки</h3>`;
      html += sel.columns.map((c, i) => `
        <div class="col-row" data-i="${i}">
          <input class="c-name" value="${esc(c.name)}" spellcheck="false" title="имя" />
          <select class="c-type">${TYPES.map((tp) => `<option ${c.type === tp ? "selected" : ""}>${tp}</option>`).join("")}</select>
          <input class="c-pk" type="checkbox" ${c.pk ? "checked" : ""} title="PRIMARY KEY" />
          <button class="c-del ghost danger" title="удалить колонку">✕</button>
        </div>
        ${c.fk ? `<div class="hint fk-hint">FK → ${esc((tableById(c.fk.tableId) || { name: "?" }).name)}(${esc(c.fk.column)})</div>` : ""}
      `).join("");
      html += `<div class="dtoolbar"><button id="d-addcol" class="ghost">＋ Колонка</button>
        <button id="d-del" class="ghost danger">Удалить таблицу</button></div>`;
    } else {
      html += '<div class="hint">Выберите таблицу (клик по ней или по списку), чтобы редактировать.</div>';
    }

    html += `<h3 style="margin-top:10px">SQL (CREATE TABLE)</h3>
      <div class="sql-out" id="d-sql">${esc(genDDL()) || "-- добавьте таблицы"}</div>
      <div class="dtoolbar">
        <button id="d-copy" class="ghost">📋 Копировать SQL</button>
        <button id="d-json" class="ghost">💾 Сохранить JSON</button>
        <button id="d-load" class="ghost">📂 Загрузить JSON</button>
      </div>
      <input type="file" id="d-file" accept="application/json" class="hidden" />`;
    side.innerHTML = html;
    wireSide();
  }

  function refreshSql() {
    const el = document.getElementById("d-sql");
    if (el) el.textContent = genDDL() || "-- добавьте таблицы";
  }

  function wireSide() {
    const $ = (id) => document.getElementById(id);
    $("d-add").onclick = () => newTable();
    $("d-fit").onclick = fit;
    $("d-clear").onclick = () => {
      if (confirm("Удалить все таблицы этого наброска?")) { model = { tables: [] }; selectedId = null; save(); dirty = true; renderSide(); }
    };
    side.querySelectorAll(".tlist-item").forEach((b) => {
      b.onclick = () => { selectedId = b.dataset.id; dirty = true; renderSide(); };
    });
    if (selectedId && tableById(selectedId)) {
      const sel = tableById(selectedId);
      $("d-tname").oninput = (e) => { sel.name = nodeName(e.target.value.trim() || "table"); save(); refreshSql(); dirty = true; };
      $("d-addcol").onclick = () => addColumn(sel);
      $("d-del").onclick = () => removeTable(sel.id);
      side.querySelectorAll(".col-row").forEach((row) => {
        const i = Number(row.dataset.i), c = sel.columns[i];
        if (!c) return;
        row.querySelector(".c-name").oninput = (e) => {
          const old = c.name; c.name = e.target.value.trim() || "col";
          model.tables.forEach((t) => t.columns.forEach((o) => {
            if (o.fk && o.fk.tableId === sel.id && o.fk.column === old) o.fk.column = c.name;
          }));
          save(); refreshSql(); dirty = true;
        };
        row.querySelector(".c-type").onchange = (e) => { c.type = e.target.value; save(); refreshSql(); dirty = true; };
        row.querySelector(".c-pk").onchange = (e) => {
          c.pk = e.target.checked;
          if (c.pk) sel.columns.forEach((o) => { if (o !== c) o.pk = false; });
          save(); refreshSql(); dirty = true;
        };
        row.querySelector(".c-del").onclick = () => removeColumn(sel, i);
      });
    }
    $("d-copy").onclick = async () => {
      const text = genDDL();
      try { await navigator.clipboard.writeText(text); }
      catch {
        const ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); ta.remove();
      }
      $("d-copy").textContent = "✓ Скопировано";
      setTimeout(() => ($("d-copy").textContent = "📋 Копировать SQL"), 1200);
    };
    $("d-json").onclick = () => {
      const blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "schema-" + (taskCtx ? taskCtx.id : "sketch") + ".json";
      a.click(); URL.revokeObjectURL(a.href);
    };
    $("d-load").onclick = () => $("d-file").click();
    $("d-file").onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const m = JSON.parse(r.result);
          if (!m.tables || !Array.isArray(m.tables)) throw new Error("bad");
          model = m; selectedId = null; save(); dirty = true; renderSide(); fit();
        } catch { alert("Файл не похож на сохранённую схему."); }
      };
      r.readAsText(f);
    };
  }

  // ---------- события canvas ----------
  function wireCanvas() {
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return toWorld(e.clientX - r.left, e.clientY - r.top);
    };
    canvas.addEventListener("mousedown", (e) => {
      const p = pos(e);
      const hit = hitTest(p);
      if (hit && hit.dot) {
        linkDrag = { fromTableId: hit.table.id, row: hit.row, wx: p.x, wy: p.y };
        selectedId = hit.table.id;
        save(); dirty = true; renderSide();
      } else if (hit) {
        drag = { type: "node", t: hit.table, dx: p.x - hit.table.x, dy: p.y - hit.table.y, moved: false };
        selectedId = hit.table.id;
        dirty = true; renderSide();
      } else {
        drag = { type: "pan", sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
      }
      canvas.style.cursor = "grabbing";
    });
    window.addEventListener("mousemove", (e) => {
      if (!overlay || overlay.classList.contains("hidden")) return;
      const p = pos(e);
      if (linkDrag) { linkDrag.wx = p.x; linkDrag.wy = p.y; dirty = true; return; }
      if (drag) {
        if (drag.type === "node") {
          drag.t.x = p.x - drag.dx; drag.t.y = p.y - drag.dy; drag.moved = true; dirty = true;
        } else {
          view.x = drag.vx + (e.clientX - drag.sx);
          view.y = drag.vy + (e.clientY - drag.sy);
          dirty = true;
        }
      } else {
        const hit = hitTest(p);
        const h = hit ? hit.table.id : null;
        if (h !== hover) { hover = h; dirty = true; }
        canvas.style.cursor = hit && hit.dot ? "crosshair" : hit ? "grab" : "default";
      }
    });
    window.addEventListener("mouseup", (e) => {
      if (linkDrag) {
        const p = pos(e);
        const hit = hitTest(p);
        if (hit && hit.table.id !== linkDrag.fromTableId) connect(linkDrag.fromTableId, hit.table.id);
        linkDrag = null; dirty = true;
      } else if (drag) {
        if (drag.type === "node" && drag.moved) save();
      }
      drag = null;
      if (canvas) canvas.style.cursor = "default";
    });
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const f = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const k2 = Math.min(2.5, Math.max(0.3, view.k * f));
      view.x = mx - (mx - view.x) * (k2 / view.k);
      view.y = my - (my - view.y) * (k2 / view.k);
      view.k = k2; dirty = true;
    }, { passive: false });
  }

  // ---------- жизненный цикл ----------
  function ensureDom() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.id = "designer";
    overlay.className = "designer hidden";
    overlay.innerHTML = `
      <div class="designer-bar">
        <div class="brand">🛠 Проектирование схемы</div>
        <button id="d-close" class="ghost">✕ Закрыть</button>
      </div>
      <div class="designer-inner">
        <div class="designer-stage" id="d-stage"><canvas id="d-canvas"></canvas></div>
        <aside class="designer-side" id="d-side"></aside>
      </div>`;
    document.body.appendChild(overlay);
    stage = document.getElementById("d-stage");
    canvas = document.getElementById("d-canvas");
    side = document.getElementById("d-side");
    ctx = canvas.getContext("2d");
    document.getElementById("d-close").onclick = close;
    wireCanvas();
    ro = new ResizeObserver(resize);
    ro.observe(stage);
  }

  function open(task) {
    ensureDom();
    taskCtx = task && task.id ? { id: task.id, title: task.title, description: task.description } : null;
    model = load() || { tables: [] };
    model.tables.forEach((t) => t.columns.forEach((c) => { if (!("fk" in c)) c.fk = null; }));
    selectedId = model.tables.length ? model.tables[0].id : null;
    overlay.classList.remove("hidden");
    resize(); fit(); renderSide();
    if (!raf) loop();
  }

  function close() {
    overlay.classList.add("hidden");
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  window.Designer = { open, close };
})();
