import { createContext, useContext, useState, type ReactNode } from "react";
import { accessDefaults, type SavedReport, type ReportRow, type Filters } from "./reportsModel";
import { Button } from "./components/OperationsUI";
function useStore() {
  const [saved, setSaved] = useState<SavedReport[]>([]),
    [recent, setRecent] = useState<string[]>([]),
    [activity, setActivity] = useState<ReportRow[]>([]),
    [role, setRole] = useState("School Administrator"),
    [permissions, setPermissions] = useState(accessDefaults);
  const [returnContext, setReturnContext] = useState<{
    page: string;
    filters: Filters;
    columns: (keyof ReportRow)[];
    sort: string;
  } | null>(null);
  const log = (action: string, route: string) =>
    setActivity((old) => [
      {
        id: crypto.randomUUID(),
        label: action,
        date: new Date().toISOString(),
        session: "All",
        grade: "",
        section: "",
        category: "Reports",
        status: "Simulated",
        actor: role,
        value: null,
        detail: "Browser-memory activity; not an authentication log",
        route,
        entity: "Report",
      },
      ...old,
    ]);
  return {
    saved,
    setSaved,
    recent,
    setRecent,
    activity,
    log,
    role,
    setRole,
    permissions,
    setPermissions,
    returnContext,
    setReturnContext,
  };
}
const Context = createContext<ReturnType<typeof useStore> | null>(null);
export function ReportsProvider({ children }: { children: ReactNode }) {
  return <Context.Provider value={useStore()}>{children}</Context.Provider>;
}
export function useReports() {
  const x = useContext(Context);
  if (!x) throw Error("ReportsProvider required");
  return x;
}
export function ReportReturnBar({
  page,
  navigate,
}: {
  page: string;
  navigate: (p: string) => void;
}) {
  const r = useReports();
  return r.returnContext && page !== r.returnContext.page ? (
    <div className="report-toolbar" aria-label="Originating report context">
      <Button onClick={() => navigate(r.returnContext!.page)}>Return to originating report</Button>
      <span>
        {r.returnContext.page} · {r.returnContext.filters.session} ·{" "}
        {r.returnContext.filters.from || "All dates"}–{r.returnContext.filters.to || "All dates"}
      </span>
    </div>
  ) : null;
}
