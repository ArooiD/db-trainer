export default function ResultTable({ result, fallback }) {
  if (!result) return <div className="empty">{fallback || "—"}</div>;
  if (result.error) return <div className="empty result-error">{result.error}</div>;
  if (!result.columns || result.columns.length === 0) {
    return <div className="empty">Команда выполнена. Табличного результата нет.</div>;
  }
  if (!result.rows || result.rows.length === 0) {
    return <div className="empty">0 строк</div>;
  }

  return (
    <>
      <table>
        <thead>
          <tr>
            <th className="row-number-head"></th>
            {result.columns.map((column) => (
              <th key={column}>
                <span className="column-type">◇</span>{column}<span className="column-filter">▽</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <td className="row-number">{rowIndex + 1}</td>
              {row.map((value, cellIndex) => (
                <td key={cellIndex}>
                  {value === null ? <span className="null-value">NULL</span> : String(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {result.truncated && <div className="empty">Показаны первые 500 строк</div>}
    </>
  );
}
