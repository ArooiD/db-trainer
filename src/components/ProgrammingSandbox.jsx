import { ProgramEditor, ProgramOutput, ProgramSidebar, ProgramToolbar } from "./programming/ProgramWorkspace.jsx";

export default function ProgrammingSandbox() {
  return (
    <div id="programming-sandbox" className="programming-ide hidden">
      <main className="ide-main">
        <div className="ide-document-tabs"><button className="ide-document-tab active"><span className="tab-table-icon">⌘</span><span id="program-file-name">main.js</span></button><button className="ide-new-tab" title="Новый файл">＋</button><div className="ide-runtime-caption"><span id="program-language">JavaScript / Browser</span><small id="program-status">JavaScript готов</small></div></div>
        <div className="program-workspace"><section className="program-center"><ProgramToolbar /><ProgramEditor /><ProgramOutput /></section><ProgramSidebar /></div>
        <div className="ide-statusbar"><span>● <strong>Programming</strong></span><span>JavaScript · Python / Pyodide</span><span className="statusbar-spacer" /><span>IT Study Lab</span></div>
      </main>
    </div>
  );
}
