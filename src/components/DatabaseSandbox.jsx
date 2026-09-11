import LabRail from "./shared/LabRail.jsx";
import DatabaseTabs from "./database/DatabaseTabs.jsx";
import DatabaseWorkbench from "./database/DatabaseWorkbench.jsx";
import DatabaseInspector from "./database/DatabaseInspector.jsx";

export default function DatabaseSandbox() {
  return (
    <div id="database-sandbox" className="database-ide">
      <LabRail active="database" />
      <main className="ide-main">
        <DatabaseTabs />
        <div className="ide-workspace"><DatabaseWorkbench /><DatabaseInspector /></div>
        <div className="ide-statusbar"><span>● <strong id="ide-engine-label">SQLite</strong></span><span>browser runtime</span><span className="statusbar-spacer" /><span>IT Study Lab</span></div>
      </main>
    </div>
  );
}
