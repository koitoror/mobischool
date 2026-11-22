import type { ReactNode } from "react";
import { Button } from "./OperationsUI";
import useDialogFocus from "./useDialogFocus";
export function AssessmentTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div
      className="op-table-wrap"
      tabIndex={0}
      role="region"
      aria-label="Source records table, scroll horizontally when needed"
    >
      <table>
        <caption className="sr-only">Source records</caption>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="op-empty">
          <strong>No matching assessment records</strong>
          <p>Create a record or clear the filters. No marks or outcomes are fabricated.</p>
        </div>
      )}
    </div>
  );
}
export function AssessmentDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useDialogFocus(true, onClose);
  return (
    <div className="op-overlay">
      <aside className="op-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <strong>{title}</strong>
          <Button onClick={onClose} icon="close">
            Close
          </Button>
        </header>
        <div className="op-drawer-body">{children}</div>
        <footer>Simulation only · changes reset on reload</footer>
      </aside>
    </div>
  );
}
