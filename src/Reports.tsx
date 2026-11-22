import { useEffect, useState } from "react";
import { useReports } from "./ReportsContext";
import useReportSources from "./useReportSources";
import { Button, Badge, Card, Field } from "./components/OperationsUI";
import { AssessmentTable as Table, AssessmentDialog as Dialog } from "./components/AssessmentUI";
import {
  reportPages,
  reportNames,
  defaultFilters,
  filterRows,
  filterError,
  attendanceRate,
  grouped,
  csvPreview,
  allowedReport,
  sourceNotes,
  type Filters,
  type ReportRow,
  type SavedReport,
} from "./reportsModel";
import "./reports.css";
import { reconcileFinance, reconcileRows } from "./reportReconciliation";
import ExaminationAnalytics from "./ExaminationAnalytics";
import { metricContributors, calculationEvidence } from "./reportTraceability";
import { referenceMetric, referenceExclusions } from "./reportReference";
export default function Reports({
  page,
  active,
  session,
  school,
  navigate,
  notify,
  onStudent,
}: {
  page: string;
  active: boolean;
  session: string;
  school: string;
  navigate: (p: string) => void;
  notify: (s: string) => void;
  onStudent?: (id: string) => void;
}) {
  const r = useReports(),
    sources = useReportSources(session),
    name = page.replace("Reports / ", ""),
    overview = page === "Reports Overview";
  const restored = r.returnContext?.page === page ? r.returnContext : null;
  const [draft, setDraft] = useState(restored?.filters || defaultFilters(session)),
    [filters, setFilters] = useState(restored?.filters || defaultFilters(session)),
    [dialog, setDialog] = useState(""),
    [error, setError] = useState(""),
    [state, setState] = useState("Ready"),
    [columns, setColumns] = useState<(keyof ReportRow)[]>(
      restored?.columns || ["id", "label", "category", "status", "date", "value", "detail"],
    ),
    [index, setIndex] = useState(1),
    [sort, setSort] = useState(restored?.sort || "Source order"),
    [savedName, setSavedName] = useState(""),
    [description, setDescription] = useState(""),
    [editing, setEditing] = useState(""),
    [metric, setMetric] = useState(""),
    [qa, setQa] = useState(false),
    [detail, setDetail] = useState<ReportRow>();
  useEffect(() => {
    if (active) document.title = `${name} — Reports — ${school}`;
  }, [active, name, school]);
  useEffect(() => {
    if (active && reportPages.includes(page)) {
      r.setRecent((old) => [page, ...old.filter((v) => v !== page)].slice(0, 8));
      r.log("Viewed report", page);
      setIndex(1);
    }
  }, [active, page]);
  useEffect(() => {
    if (!restored || (restored.filters.session !== session && restored.filters.session !== "All")) {
      setDraft(defaultFilters(session));
      setFilters(defaultFilters(session));
    }
  }, [session]);
  const allowed = allowedReport(name, r.role, r.permissions),
    raw = sources.rows[name] || [],
    effective = ["User Log", "Audit Trail Report"].includes(name)
      ? { ...filters, session: "All" }
      : filters;
  const filtered = allowed ? filterRows(raw, effective) : [],
    rows =
      sort === "Source order"
        ? filtered
        : [...filtered].sort((a, b) => a.label.localeCompare(b.label) * (sort === "A–Z" ? 1 : -1));
  const go = (p: string) => {
    setIndex(1);
    navigate(p);
  };
  const reset = () => {
    setDraft(defaultFilters(session));
    setFilters(defaultFilters(session));
    setError("");
    setIndex(1);
  };
  const sum = (category: string) =>
    rows.filter((v) => v.category === category).reduce((n, v) => n + (v.value ?? 0), 0);
  let metrics: [string, string][] = [
    ["Matching source records", String(rows.length)],
    ["Distinct categories", String(new Set(rows.map((v) => v.category)).size)],
    ["Undated records", String(rows.filter((v) => !v.date).length)],
    ["Missing numeric values", String(rows.filter((v) => v.value === null).length)],
  ];
  if (name === "Finance")
    metrics = [
      ["Fees expected (due cohort)", sources.finance.money(sum("Fee obligation"))],
      ["Fee collections (period)", sources.finance.money(sum("Fee collection"))],
      ["General income", sources.finance.money(sum("Income"))],
      ["Expenses", sources.finance.money(sum("Expense"))],
      ["Net general income", sources.finance.money(sum("Income") - sum("Expense"))],
      [
        "Outstanding (due cohort)",
        sources.finance.money(
          rows
            .filter((v) => v.category === "Fee obligation")
            .reduce((n, v) => {
              const o = sources.finance.ledger.obligations.find((o) => o.id === v.id);
              return (
                n +
                (o
                  ? o.amount -
                    o.discount -
                    sources.finance.ledger.payments.reduce(
                      (n, p) =>
                        n +
                        p.allocations
                          .filter((a) => a.id === o.id)
                          .reduce((n, a) => n + a.amount, 0),
                      0,
                    )
                  : 0)
              );
            }, 0),
        ),
      ],
    ];
  if (name === "Attendance")
    metrics = [
      [
        "Marked observations",
        String(rows.filter((v) => v.category === "Marked attendance").length),
      ],
      [
        "Attendance rate",
        attendanceRate(rows) === null ? "Unavailable" : attendanceRate(rows)!.toFixed(1) + "%",
      ],
      ["Absent", String(rows.filter((v) => v.status === "Absent").length)],
      ["Leave requests", String(rows.filter((v) => v.category === "Student leave").length)],
    ];
  if (name === "Examinations") {
    const published = rows.filter((v) => v.status === "Published" && v.value !== null);
    metrics = [
      ["Published results", String(published.length)],
      ["Draft / reviewed", String(rows.filter((v) => v.status !== "Published").length)],
      [
        "Published average",
        published.length
          ? (published.reduce((n, v) => n + v.value!, 0) / published.length).toFixed(1) + "%"
          : "Unavailable",
      ],
      [
        "Pass rate",
        sources.examination.passingGrades ? "See scoped analytics" : "Policy unavailable",
      ],
    ];
  }
  if (name === "Lesson Plan") {
    const topics = rows.filter((v) => v.category === "Topic"),
      complete = topics.filter((v) => v.status === "Completed").length;
    metrics = [
      ["Topics", String(topics.length)],
      ["Completed", String(complete)],
      [
        "Topic completion",
        topics.length ? ((100 * complete) / topics.length).toFixed(1) + "%" : "Unavailable",
      ],
      ["Lesson plans", String(rows.filter((v) => v.category === "Lesson plan").length)],
    ];
  }
  if (name === "Online Examinations")
    metrics = [
      ["Attempts", String(rows.length)],
      ["Submitted / evaluated", String(rows.filter((v) => v.status !== "In Progress").length)],
      ["Incomplete", String(rows.filter((v) => v.status === "In Progress").length)],
      ["Evaluated", String(rows.filter((v) => v.status === "Evaluated").length)],
    ];
  if (name === "Homework") {
    const assignments = rows.filter((v) => v.category === "Assignment" && v.status === "Published"),
      expected = assignments.reduce((n, v) => n + (v.quantity || 0), 0),
      sent = assignments.reduce((n, v) => n + (v.value || 0), 0);
    metrics = [
      ["Published assignments", String(assignments.length)],
      ["Expected submissions", String(expected)],
      ["Missing submissions", String(Math.max(0, expected - sent))],
      ["Submission rate", expected ? ((100 * sent) / expected).toFixed(1) + "%" : "Unavailable"],
    ];
  }
  if (name === "Library")
    metrics = [
      ["Catalog titles", String(rows.filter((v) => v.category === "Catalog").length)],
      ["Physical copies", String(sum("Catalog"))],
      [
        "Available copies",
        String(
          rows.filter((v) => v.category === "Catalog").reduce((n, v) => n + (v.quantity || 0), 0),
        ),
      ],
      ["Overdue loans", String(rows.filter((v) => v.status === "Overdue").length)],
    ];
  if (name === "Inventory")
    metrics = [
      ["Stock units (snapshot)", String(sum("Stock snapshot"))],
      ["Issues (signed period)", String(sum("Issue"))],
      ["Receipts (period)", String(sum("Receipt"))],
      ["Low stock items", String(rows.filter((v) => v.status === "Low stock").length)],
    ];
  if (name === "Transport")
    metrics = [
      ["Routes", String(rows.filter((v) => v.category === "Route").length)],
      ["Vehicles", String(rows.filter((v) => v.category === "Vehicle").length)],
      [
        "Active assignments",
        String(rows.filter((v) => v.category === "Assignment" && v.status === "Active").length),
      ],
      ["Passenger utilization", "Unavailable"],
    ];
  if (
    (filters.from || filters.to) &&
    name === "Inventory" &&
    !rows.some((r) => r.category === "Stock snapshot")
  ) {
    metrics = metrics.map(([title, value]) => [
      title,
      ["Stock units (snapshot)", "Low stock items"].includes(title)
        ? "Unavailable — undated current snapshot excluded"
        : value,
    ]);
  }
  if (
    (filters.from || filters.to) &&
    name === "Library" &&
    !rows.some((r) => r.category === "Catalog")
  ) {
    metrics = metrics.map(([title, value]) => [
      title,
      ["Physical copies", "Available copies"].includes(title)
        ? "Unavailable — undated catalog snapshot excluded"
        : value,
    ]);
  }
  const table = (
    <ReportDataTable
      rows={rows.slice((index - 1) * 12, index * 12)}
      columns={columns}
      onDetail={(v) => {
        setDetail(v);
        setDialog("Source record detail");
      }}
      navigate={navigate}
    />
  );
  return (
    <div className="op reports" hidden={!active}>
      <ReportPageHeader
        title={overview ? "Reports & Analytics" : name}
        school={school}
        onExport={() => setDialog("Export preview")}
        onSave={() => {
          setEditing("");
          setSavedName("");
          setDescription("");
          setDialog("Save configuration");
        }}
      />
      <div className="op-context">
        <Field label="Reports workspace" value={page} options={reportPages} onChange={go} />
        <Badge>Live prototype records</Badge>
        <Button onClick={() => setDialog("Saved reports")}>Saved reports ({r.saved.length})</Button>
        <Button onClick={() => setDialog("Access & states")}>Access & states</Button>
      </div>
      <div className="op-notice">
        Browser-memory analytics · resets on reload. No production authorization, durable audit log,
        data warehouse, background generation or scheduled report delivery.
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {name} loaded. {rows.length} matching records. Filters applied: session {filters.session},
        class {filters.grade}, section {filters.section}, status {filters.status}.
      </div>
      {!allowed ? (
        <ReportErrorState
          message="This preview role does not have access to this report."
          recover={() => setDialog("Access & states")}
        />
      ) : state === "Loading" ? (
        <ReportLoadingState recover={() => setState("Ready")} />
      ) : state === "Error" ? (
        <ReportErrorState
          message="Report source unavailable (state simulation)."
          recover={() => setState("Ready")}
        />
      ) : overview ? (
        <>
          <div className="report-overview-banner">
            <small>ONE SCHOOL. A CLEARER PICTURE.</small>
            <div className="report-title">
              From daily operations
              <br />
              to informed decisions.
            </div>
            <p>Explore the records behind the numbers. Every source, every definition, in view.</p>
          </div>
          <div className="report-kpis">
            {[
              [
                "Student registry",
                sources.rows["Student Information"].length,
                "Student Information",
              ],
              [
                "Recorded attendance",
                sources.rows.Attendance.filter((v) => v.category === "Marked attendance").length,
                "Attendance",
              ],
              ["Fee collections", sources.finance.summary().paid, "Finance"],
              [
                "Workforce",
                sources.rows["Human Resource"].filter((v) => v.category === "Staff").length,
                "Human Resource",
              ],
              [
                "Library loans",
                sources.rows.Library.filter((v) => v.category === "Loan").length,
                "Library",
              ],
              [
                "Inventory issues",
                sources.rows.Inventory.filter((v) => v.category === "Issue").length,
                "Inventory",
              ],
            ]
              .filter(([, , route]) => allowedReport(String(route), r.role, r.permissions))
              .map(([title, value, route]) => (
                <ReportKpiCard
                  key={String(title)}
                  title={String(title)}
                  value={
                    title === "Fee collections"
                      ? sources.finance.money(Number(value))
                      : String(value)
                  }
                  onClick={() => go("Reports / " + route)}
                />
              ))}
          </div>
          <div className="report-grid">
            <Card title="Reporting library" sub="15 operational views · shared source records">
              <div className="report-directory">
                {reportNames.map((n) => (
                  <Button
                    key={n}
                    disabled={!allowedReport(n, r.role, r.permissions)}
                    onClick={() => go("Reports / " + n)}
                  >
                    {n}
                    <span>
                      {n === "Hostel"
                        ? "Source not connected"
                        : `${sources.rows[n]?.length || 0} source rows`}{" "}
                      →
                    </span>
                  </Button>
                ))}
              </div>
            </Card>
            <Card title="Recently viewed & favorites" sub="Session-only; no activity is persisted">
              <div className="report-pad">
                {r.recent.map((p) => (
                  <Button key={p} onClick={() => go(p)}>
                    {p.replace("Reports / ", "")}
                  </Button>
                ))}
                {r.saved
                  .filter((s) => s.favorite)
                  .map((s) => (
                    <Button
                      key={s.id}
                      onClick={() => {
                        go(s.route);
                        setFilters(s.filters);
                        setDraft(s.filters);
                        setColumns(s.columns);
                      }}
                    >
                      {s.name}
                    </Button>
                  ))}
                <p>
                  Readiness: Hostel occupancy, transport telemetry, pass/fail rules and durable
                  security logs are not connected.
                </p>
              </div>
            </Card>
          </div>
        </>
      ) : (
        <>
          <ReportFilterBar
            draft={draft}
            setDraft={setDraft}
            rows={raw}
            session={session}
            apply={() => {
              const err = filterError(draft);
              if (err) {
                setError(err);
                return;
              }
              setFilters({ ...draft });
              setError("");
              setIndex(1);
            }}
            reset={reset}
          />
          {error && (
            <div role="alert" className="op-form-error">
              {error}
            </div>
          )}
          {name === "Examinations" && (
            <ExaminationAnalytics
              filters={filters}
              navigate={(p) => {
                r.setReturnContext({ page, filters: { ...filters }, columns: [...columns], sort });
                navigate(p);
              }}
            />
          )}
          {name === "Hostel" ? (
            <Card
              title="Hostel reporting — source not connected"
              sub="No authoritative occupancy dataset"
            >
              <div className="report-pad">
                <p>No rooms, beds, allocations or revenue metrics are fabricated.</p>
                <ul>
                  <li>Buildings, rooms and physical bed capacity</li>
                  <li>Dated student allocations and occupancy decisions</li>
                  <li>School-scoped permissions and financial links</li>
                </ul>
                <Button onClick={() => go("Reports Overview")}>Return to reporting library</Button>
              </div>
            </Card>
          ) : (
            <>
              <div className="report-kpis">
                {metrics.map(([title, value]) => (
                  <ReportKpiCard
                    key={title}
                    title={title}
                    value={value}
                    onClick={() => {
                      setMetric(title);
                      setDialog("Calculation & contributing records");
                    }}
                  />
                ))}
              </div>
              <div className="report-grid">
                <ReportChart
                  title="Status distribution"
                  rows={rows}
                  group="status"
                  onSelect={(value) => {
                    setDraft({ ...draft, status: value });
                    setFilters({ ...filters, status: value });
                  }}
                />
                <ReportChart
                  title="Category distribution"
                  rows={rows}
                  group="category"
                  onSelect={(value) => {
                    setDraft({ ...draft, category: value });
                    setFilters({ ...filters, category: value });
                  }}
                />
              </div>
              <Card
                title="Detailed source records"
                sub={`${rows.length} filtered records · ${filters.from || "All dates"} to ${filters.to || "All dates"}`}
                action={<Button onClick={() => setDialog("Columns")}>Select columns</Button>}
              >
                <div className="report-toolbar">
                  <Field
                    label="Sort rows"
                    value={sort}
                    options={["Source order", "A–Z", "Z–A"]}
                    onChange={setSort}
                  />
                  <Button onClick={() => setDialog("Print preview")}>Print preview</Button>
                </div>
                {state === "Empty" || !rows.length ? <ReportEmptyState reset={reset} /> : table}
                <div className="report-toolbar">
                  <Button disabled={index === 1} onClick={() => setIndex(index - 1)}>
                    Previous page
                  </Button>
                  <span role="status" aria-live="polite">
                    Page {index} of {Math.max(1, Math.ceil(rows.length / 12))}
                  </span>
                  <Button disabled={index * 12 >= rows.length} onClick={() => setIndex(index + 1)}>
                    Next page
                  </Button>
                </div>
              </Card>
            </>
          )}
          {name === "Finance" && (
            <FinanceReconciliation
              rows={rows}
              ledger={sources.finance.ledger}
              money={sources.finance.money}
              asOf={filters.to || "2025-02-24"}
            />
          )}
          {!!reconcileRows(rows, name).length && (
            <Card
              title="Source reconciliation"
              sub="Derived only from the currently filtered source rows"
            >
              <Table headers={["Measure", "Source value"]} rows={reconcileRows(rows, name)} />
            </Card>
          )}
          <ReportDataSourceNote text={sourceNotes[name] || "Shared source records."} />
        </>
      )}
      {dialog && active && (
        <Dialog title={dialog} onClose={() => setDialog("")}>
          {dialog === "Calculation & contributing records" ? (
            <>
              <strong>{metric}</strong>
              <p>
                Report {name} · school {school} · filters {JSON.stringify(filters)}. Returning
                closes this drawer without changing the report context.
              </p>
              <p>{calculationEvidence(metric, rows, sources.finance.ledger).formula}</p>
              <p>
                Numerator:{" "}
                {calculationEvidence(metric, rows, sources.finance.ledger).numerator ??
                  "Unavailable"}{" "}
                · denominator:{" "}
                {calculationEvidence(metric, rows, sources.finance.ledger).denominator ??
                  "Not applicable"}{" "}
                · included {metricContributors(metric, rows).length} source rows · excluded{" "}
                {rows.length - metricContributors(metric, rows).length}.
              </p>
              <p>{sourceNotes[name]}</p>
              {r.role === "School Administrator" && (
                <>
                  <Button onClick={() => setQa(!qa)}>
                    {qa ? "Hide QA reconciliation" : "Developer reconciliation"}
                  </Button>
                  {qa && (
                    <Card
                      title="Independent reference check"
                      sub="Administrator preview only. Row-projection arithmetic checks do not prove the source joins are correct."
                    >
                      <div className="report-pad">
                        {(() => {
                          const ref = referenceMetric(metric, rows, sources.finance.ledger),
                            display = metrics.find(([title]) => title === metric)?.[1] || "",
                            actual = /Unavailable|Policy unavailable/.test(display)
                              ? null
                              : Number(display.replace(/[^0-9.-]/g, "")),
                            difference =
                              actual !== null && ref.expected !== null
                                ? actual - ref.expected
                                : null;
                          return (
                            <>
                              <p>{ref.formula}</p>
                              <p>
                                Basis: {ref.basis} · unit {ref.unit}
                              </p>
                              <p>
                                Expected {ref.expected ?? "Unavailable"} · displayed {display} ·
                                difference{" "}
                                {difference === null ? "Unavailable" : difference.toFixed(4)} ·
                                status{" "}
                                {difference === null
                                  ? "NOT VERIFIED"
                                  : Math.abs(difference) <= 0.051
                                    ? "PASS"
                                    : "FAIL"}
                              </p>
                              <pre className="report-csv">
                                {JSON.stringify(
                                  {
                                    filters,
                                    included: referenceExclusions(raw, effective)
                                      .filter((r) => !r.reasons.length)
                                      .map((r) => r.id),
                                    excluded: referenceExclusions(raw, effective).filter(
                                      (r) => r.reasons.length,
                                    ),
                                  },
                                  null,
                                  2,
                                )}
                              </pre>
                            </>
                          );
                        })()}
                      </div>
                    </Card>
                  )}
                </>
              )}
              <ReportDataTable
                rows={metricContributors(metric, rows)}
                columns={columns}
                navigate={navigate}
                onDetail={(v) => {
                  setDetail(v);
                  setDialog("Source record detail");
                }}
              />
            </>
          ) : dialog === "Columns" ? (
            <ReportColumnSelector columns={columns} setColumns={setColumns} />
          ) : dialog === "Export preview" ? (
            <ReportExportDialog
              rows={rows}
              columns={columns}
              name={name}
              confirm={() => {
                r.log("Confirmed export preview", page);
                notify("Export simulation confirmed. No file was generated or downloaded.");
                setDialog("");
              }}
            />
          ) : dialog === "Print preview" ? (
            <ReportPrintPreview name={name} rows={rows} columns={columns} />
          ) : dialog === "Source record detail" && detail ? (
            <>
              <strong>{detail.label}</strong>
              {Object.entries(detail).map(([key, value]) => (
                <p key={key}>
                  <b>{key}: </b>
                  {value === null ? "Unavailable" : String(value)}
                </p>
              ))}
              <Card
                title="Exact source record & relationships"
                sub="Resolved by source ID from the current operational provider. Missing timestamps are not invented."
              >
                <pre className="report-csv">{JSON.stringify(sources.inspect(detail), null, 2)}</pre>
              </Card>
              <Button
                onClick={() => {
                  r.setReturnContext({
                    page,
                    filters: { ...filters },
                    columns: [...columns],
                    sort,
                  });
                  setDialog("");
                  navigate(detail.route);
                }}
              >
                Open operational workspace
              </Button>
              {name === "Student Information" && onStudent && (
                <Button
                  onClick={() => {
                    r.setReturnContext({
                      page,
                      filters: { ...filters },
                      columns: [...columns],
                      sort,
                    });
                    setDialog("");
                    onStudent(detail.id);
                  }}
                >
                  Open exact Student 360
                </Button>
              )}
              <p>
                Opens the existing source workspace; the reference above identifies the record.
                Audit events are read-only.
              </p>
            </>
          ) : dialog === "Save configuration" ? (
            <>
              <Field label="Saved report name" value={savedName} onChange={setSavedName} />
              <Field
                label="Saved report description"
                value={description}
                onChange={setDescription}
              />
              <p>Stores current applied filters and selected columns in memory only.</p>
              <Button
                primary
                onClick={() => {
                  if (!savedName.trim()) {
                    notify("Name the report configuration");
                    return;
                  }
                  const saved: SavedReport = {
                    id: editing || crypto.randomUUID(),
                    name: savedName.trim(),
                    description,
                    route: page,
                    filters: { ...filters },
                    columns: [...columns],
                    favorite: false,
                  };
                  r.setSaved((old) => [...old.filter((v) => v.id !== saved.id), saved]);
                  r.log("Saved report configuration", page);
                  setDialog("");
                }}
              >
                Confirm save configuration
              </Button>
            </>
          ) : dialog === "Saved reports" ? (
            <SavedReportPanel
              saved={r.saved}
              open={(s) => {
                go(s.route);
                setDraft(s.filters);
                setFilters(s.filters);
                setColumns(s.columns);
                setDialog("");
              }}
              favorite={(id) =>
                r.setSaved((old) =>
                  old.map((s) => (s.id === id ? { ...s, favorite: !s.favorite } : s)),
                )
              }
              duplicate={(s) =>
                r.setSaved((old) => [
                  ...old,
                  { ...structuredClone(s), id: crypto.randomUUID(), name: s.name + " copy" },
                ])
              }
              edit={(s) => {
                setEditing(s.id);
                setSavedName(s.name);
                setDescription(s.description);
                setFilters(s.filters);
                setDraft(s.filters);
                navigate(s.route);
                setDialog("Save configuration");
              }}
              remove={(id) => {
                if (
                  window.confirm(
                    "Delete this saved configuration? Source data will not be changed.",
                  )
                )
                  r.setSaved((old) => old.filter((s) => s.id !== id));
              }}
            />
          ) : (
            <>
              <Field
                label="Reporting preview role"
                value={r.role}
                options={Object.keys(r.permissions)}
                onChange={r.setRole}
              />
              <Field
                label="Report data state"
                value={state}
                options={["Ready", "Loading", "Empty", "Error"]}
                onChange={setState}
              />
              <p>
                Client-side recommendations only. Teacher scope is module-level, not verified
                assigned-class authorization. HR payroll is omitted for other roles.
              </p>
              {reportNames.map((n) => (
                <Button
                  key={n}
                  onClick={() =>
                    r.setPermissions((old) => ({
                      ...old,
                      [r.role]: old[r.role].includes("*")
                        ? reportNames.filter((v) => v !== n)
                        : old[r.role].includes(n)
                          ? old[r.role].filter((v) => v !== n)
                          : [...old[r.role], n],
                    }))
                  }
                >
                  {allowedReport(n, r.role, r.permissions) ? "Allowed" : "Restricted"}: {n}
                </Button>
              ))}
              <p>Settings are editable policy proposals, not secure access enforcement.</p>
            </>
          )}
        </Dialog>
      )}
    </div>
  );
}
export function ReportPageHeader({
  title,
  school,
  onExport,
  onSave,
}: {
  title: string;
  school: string;
  onExport: () => void;
  onSave: () => void;
}) {
  return (
    <div className="report-header">
      <div>
        <div className="op-eyebrow">{school} / REPORTS</div>
        <div className="report-title" role="heading" aria-level={1}>
          {title}
        </div>
        <p>Connected records. Transparent calculations. Clear next steps.</p>
      </div>
      <div className="report-toolbar">
        <Button onClick={onSave}>Save report</Button>
        <Button primary onClick={onExport}>
          Export preview
        </Button>
      </div>
    </div>
  );
}
export function ReportFilterBar({
  draft,
  setDraft,
  rows,
  session,
  apply,
  reset,
}: {
  draft: Filters;
  setDraft: (v: Filters) => void;
  rows: ReportRow[];
  session: string;
  apply: () => void;
  reset: () => void;
}) {
  return (
    <Card
      title="Report parameters"
      sub="Changes apply only after Apply filters. Date ranges exclude undated source records."
    >
      <div className="report-filters">
        <DateRangePicker filters={draft} change={setDraft} />
        <AcademicSessionSelector
          value={draft.session}
          sessions={["All", session, ...new Set(rows.map((r) => r.session))].filter(
            (v, i, a) => !!v && a.indexOf(v) === i,
          )}
          onChange={(v) => setDraft({ ...draft, session: v })}
        />
        {(["grade", "section", "category", "status", "actor"] as const).map((key) => (
          <Field
            key={key}
            label={
              key === "grade"
                ? "Class"
                : key === "actor"
                  ? "Actor / department"
                  : key[0].toUpperCase() + key.slice(1)
            }
            value={draft[key]}
            options={["All", ...new Set(rows.map((r) => r[key]).filter(Boolean))]}
            onChange={(v) => setDraft({ ...draft, [key]: v })}
          />
        ))}
        <Field
          label="Search / record reference"
          value={draft.query}
          onChange={(v) => setDraft({ ...draft, query: v })}
        />
        <Button primary onClick={apply}>
          Apply filters
        </Button>
        <Button onClick={reset}>Reset filters</Button>
      </div>
    </Card>
  );
}
export function DateRangePicker({
  filters,
  change,
}: {
  filters: Filters;
  change: (f: Filters) => void;
}) {
  return (
    <>
      <Field
        label="From date"
        error={filterError(filters) || undefined}
        value={filters.from}
        type="date"
        onChange={(v) => change({ ...filters, from: v })}
      />
      <Field
        label="To date"
        error={filterError(filters) || undefined}
        value={filters.to}
        type="date"
        onChange={(v) => change({ ...filters, to: v })}
      />
    </>
  );
}
export function AcademicSessionSelector({
  value,
  sessions,
  onChange,
}: {
  value: string;
  sessions: string[];
  onChange: (v: string) => void;
}) {
  return <Field label="Academic session" value={value} options={sessions} onChange={onChange} />;
}
export function ReportKpiCard({
  title,
  value,
  onClick,
}: {
  title: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <Card title={title}>
      <div className="report-kpi">
        {onClick ? (
          <Button ariaLabel={`Explain ${title}: ${value}`} onClick={onClick}>
            {value} →
          </Button>
        ) : (
          <strong>{value}</strong>
        )}
      </div>
    </Card>
  );
}
export function ReportChart({
  title,
  rows,
  group,
  onSelect,
}: {
  title: string;
  rows: ReportRow[];
  group: "status" | "category";
  onSelect: (v: string) => void;
}) {
  return (
    <Card title={title} sub="Counts of filtered source rows · not independent metrics">
      <div className="report-chart">
        {grouped(rows, group).map(([label, count]) => (
          <div key={label}>
            <Button onClick={() => onSelect(label)}>
              {label}: {count}
            </Button>
            <meter
              min={0}
              max={Math.max(1, rows.length)}
              value={count}
              aria-label={`${label}: ${count} of ${rows.length} rows`}
            />
          </div>
        ))}
        {!rows.length && <p>No observations to chart.</p>}
      </div>
    </Card>
  );
}
export function ReportDataTable({
  rows,
  columns,
  onDetail,
  navigate,
}: {
  rows: ReportRow[];
  columns: (keyof ReportRow)[];
  onDetail: (r: ReportRow) => void;
  navigate: (p: string) => void;
}) {
  return (
    <Table
      headers={[...columns.map((c) => (c === "value" ? "Value (source units)" : c)), "Drilldown"]}
      rows={rows.map((r) => [
        ...columns.map((c) => (r[c] === null ? "Unavailable" : String(r[c] ?? "Not recorded"))),
        <Button ariaLabel={`View source record ${r.id}: ${r.label}`} onClick={() => onDetail(r)}>
          View source record
        </Button>,
      ])}
    />
  );
}
export function ReportColumnSelector({
  columns,
  setColumns,
}: {
  columns: (keyof ReportRow)[];
  setColumns: (c: (keyof ReportRow)[]) => void;
}) {
  return (
    <>
      {(
        [
          "id",
          "label",
          "date",
          "session",
          "grade",
          "section",
          "category",
          "status",
          "actor",
          "value",
          "detail",
        ] as const
      ).map((c) => (
        <Button
          key={c}
          disabled={columns.length === 1 && columns.includes(c)}
          onClick={() =>
            setColumns(columns.includes(c) ? columns.filter((v) => v !== c) : [...columns, c])
          }
        >
          {columns.includes(c) ? "Visible" : "Hidden"}: {c}
        </Button>
      ))}
    </>
  );
}
export function ReportExportDialog({
  rows,
  columns,
  name,
  confirm,
}: {
  rows: ReportRow[];
  columns: (keyof ReportRow)[];
  name: string;
  confirm: () => void;
}) {
  return (
    <>
      <p>
        {name} · {rows.length} filtered records · {columns.length} selected columns. CSV preview
        only; no download will be created.
      </p>
      <pre className="report-csv">{csvPreview(rows, columns)}</pre>
      <Button disabled={!rows.length} primary onClick={confirm}>
        Confirm simulated export
      </Button>
      {!rows.length && <p>No records to export. Adjust the filters.</p>}
    </>
  );
}
export function ReportPrintPreview({
  name,
  rows,
  columns,
}: {
  name: string;
  rows: ReportRow[];
  columns: (keyof ReportRow)[];
}) {
  return (
    <>
      <strong className="report-title">{name}</strong>
      <p>PRINT / PDF SIMULATION · {rows.length} filtered records · no PDF or print job created</p>
      <Table
        headers={columns}
        rows={rows.map((r) => columns.map((c) => String(r[c] ?? "Unavailable")))}
      />
    </>
  );
}
export function SavedReportPanel({
  saved,
  open,
  favorite,
  duplicate,
  edit,
  remove,
}: {
  saved: SavedReport[];
  open: (s: SavedReport) => void;
  favorite: (id: string) => void;
  duplicate: (s: SavedReport) => void;
  edit: (s: SavedReport) => void;
  remove: (id: string) => void;
}) {
  return (
    <>
      {!saved.length && <p>No saved reports yet. Apply filters and choose Save report.</p>}
      {saved.map((s) => (
        <Card key={s.id} title={s.name} sub={s.description}>
          <div className="report-toolbar">
            <Button onClick={() => open(s)}>Open configuration</Button>
            <Button onClick={() => favorite(s.id)}>{s.favorite ? "Unfavorite" : "Favorite"}</Button>
            <Button onClick={() => duplicate(s)}>Duplicate configuration</Button>
            <Button onClick={() => edit(s)}>Edit configuration</Button>
            <Button danger onClick={() => remove(s.id)}>
              Delete configuration
            </Button>
          </div>
        </Card>
      ))}
    </>
  );
}
export function ReportEmptyState({ reset }: { reset: () => void }) {
  return (
    <div className="op-empty">
      <strong>No matching source records</strong>
      <p>
        Try a wider period or reset the filters. Missing data is not interpreted as zero
        performance.
      </p>
      <Button onClick={reset}>Reset report filters</Button>
    </div>
  );
}
export function ReportErrorState({ message, recover }: { message: string; recover: () => void }) {
  return (
    <Card title="Report unavailable">
      <div className="report-pad" role="alert">
        <p>{message}</p>
        <Button onClick={recover}>Review / recover report</Button>
      </div>
    </Card>
  );
}
export function ReportLoadingState({ recover }: { recover: () => void }) {
  return (
    <Card title="Loading report preview">
      <div className="report-pad" role="status">
        <div className="op-skeleton" />
        <Button onClick={recover}>Return to live records</Button>
      </div>
    </Card>
  );
}
export function ReportDataSourceNote({ text }: { text: string }) {
  return (
    <Card title="Source & calculation notes">
      <p className="report-pad">{text}</p>
    </Card>
  );
}
function FinanceReconciliation({
  rows,
  ledger,
  money,
  asOf,
}: {
  rows: ReportRow[];
  ledger: Parameters<typeof reconcileFinance>[1];
  money: (n: number) => string;
  asOf: string;
}) {
  const v = reconcileFinance(rows, ledger, asOf);
  return (
    <Card
      title="Financial reconciliation"
      sub={`Due-cohort balances use all recorded allocations; aging as of ${asOf}. Period collections are separate.`}
    >
      <div className="report-pad">
        <p>
          Expected {money(v.expected)} = allocated {money(v.paidOnCohort)} + outstanding{" "}
          {money(v.outstanding)}. Collection rate on cohort:{" "}
          {v.collectionRate === null ? "Unavailable" : v.collectionRate.toFixed(1) + "%"}.
        </p>
        <Table
          headers={["Aging bucket", "Outstanding"]}
          rows={v.aging.map(([label, value]) => [label, money(value)])}
        />
        <Table
          headers={["Payment method (period)", "Collections"]}
          rows={v.methods.map(([label, value]) => [label, money(value)])}
        />
        <Table
          headers={["Fee type allocation (period)", "Allocated"]}
          rows={v.feeTypes.map(([label, value]) => [label, money(value)])}
        />
        <Table
          headers={["Class (due cohort)", "Outstanding"]}
          rows={v.classes.map(([label, value]) => [label, money(value)])}
        />
      </div>
    </Card>
  );
}
