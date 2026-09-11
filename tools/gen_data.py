# Сгенерировать данные Database Sandbox из seed.py.
import json, sys
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
(ROOT / "src" / "data" / "dataset.js").write_text(
    "export const DATASET = " + json.dumps(data, ensure_ascii=False) + "\n", encoding="utf-8")

print("src/data/dataset.js обновлён")
