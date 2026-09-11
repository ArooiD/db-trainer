# Сгенерировать данные Database Sandbox из seed.py.
import base64, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import seed

data = {
    "schema": seed.SCHEMA,
    "tables": {
        "departments": {"columns": ["id", "name", "budget"], "rows": seed.DEPARTMENTS},
        "employees": {"columns": ["id", "first_name", "last_name", "email",
                                  "department_id", "salary", "hired_at", "is_active"],
                      "rows": seed.EMPLOYEES},
        "projects": {"columns": ["id", "name", "department_id", "started_at", "finished_at"],
                     "rows": seed.PROJECTS},
        "assignments": {"columns": ["id", "employee_id", "project_id", "role", "hours"],
                        "rows": seed.ASSIGNMENTS},
    },
}
(ROOT / "web" / "js" / "data.js").write_text(
    "window.DB_DATA = " + json.dumps(data, ensure_ascii=False) + ";\n", encoding="utf-8")

wasm = ROOT / "web" / "vendor" / "sql-wasm.wasm"
if wasm.is_file():
    b64 = base64.b64encode(wasm.read_bytes()).decode()
    (ROOT / "web" / "vendor" / "sql-binary.js").write_text(
        'window.SQL_WASM_B64 = "' + b64 + '";\n', encoding="utf-8")

print("web/js/data.js и web/vendor/sql-binary.js обновлены")
