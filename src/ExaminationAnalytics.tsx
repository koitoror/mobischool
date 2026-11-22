import { useState } from "react";
import { useExamination } from "./ExaminationContext";
import { Button, Card, Field, Badge } from "./components/OperationsUI";
import { AssessmentTable as Table, AssessmentDialog as Dialog } from "./components/AssessmentUI";
import { assessPopulation, type Assessment } from "./examAnalytics";
import type { Filters } from "./reportsModel";
import { gradeFor } from "./examinationModel";
export default function ExaminationAnalytics({
  filters,
  navigate,
}: {
  filters: Filters;
  navigate: (p: string) => void;
}) {
  const x = useExamination(),
    [group, setGroup] = useState("All"),
    [subject, setSubject] = useState("All"),
    [context, setContext] = useState("All recorded states"),
    [tab, setTab] = useState("Overview"),
    [q, setQ] = useState(""),
    [status, setStatus] = useState("All"),
    [page, setPage] = useState(1),
    [detail, setDetail] = useState<Assessment>(),
    [metric, setMetric] = useState(""),
    [visible, setVisible] = useState(true);
  const scope = { ...filters, group, subject, context },
    a = assessPopulation(x.students, x.groups, x.exams, x.scores, scope);
  const rows = a.pairs.filter(
    (p) =>
      (status === "All" || p.status === status) &&
      (!filters.query ||
        `${p.name} ${p.reference}`.toLowerCase().includes(filters.query.toLowerCase())) &&
      `${p.name} ${p.subject} ${p.reference}`.toLowerCase().includes(q.toLowerCase()),
  );
  const fmt = (n: number | null) => (n === null ? "Unavailable" : n.toFixed(1) + "%");
  const outcomes = [...new Set(a.pairs.map((p) => p.student))].map((id) => {
    const components = a.pairs.filter((p) => p.student === id);
    if (components.some((p) => p.status !== "Complete")) return "Incomplete";
    const results = components.map((p) => {
      const score = x.scores.find((s) => s.exam === p.exam && s.student === p.student);
      if (!score) return null;
      const rule = score.status === "Published" ? score.passingGradesSnapshot : x.passingGrades;
      const grade =
        score.status === "Published"
          ? score.grade
          : gradeFor(Number(score.value), p.maximum, x.bands).grade;
      return rule?.length && grade ? rule.includes(grade) : null;
    });
    return results.some((v) => v === null)
      ? "Unavailable"
      : results.every(Boolean)
        ? "Passed"
        : "Failed";
  });
  const passed = outcomes.filter((o) => o === "Passed").length,
    failed = outcomes.filter((o) => o === "Failed").length,
    classifiable = passed + failed;
  const open = (p: Assessment) => {
    setMetric("");
    setDetail(p);
  };
  const toMarks = (p: Assessment) => {
    x.setSelectedExam(p.exam);
    navigate("Exam Result");
  };
  const table = (list: Assessment[]) => (
    <Table
      headers={[
        "Student / identifier",
        "Class / section",
        "Group / subject",
        "Component",
        ...(visible ? ["Maximum", "Marks / state", "Missing status"] : []),
        "Actions",
      ]}
      rows={list.map((p) => [
        `${p.name} · ${p.reference}`,
        `${p.grade} / ${p.section}`,
        `${p.group} / ${p.subject}`,
        p.component,
        ...(visible
          ? [p.maximum, `${p.value === null ? "Not recorded" : p.value} / ${p.state}`, p.status]
          : []),
        <Button onClick={() => open(p)}>Inspect assessment {p.name}</Button>,
      ])}
    />
  );
  const metrics: [string, string][] = [
    ["Eligible Students", String(a.eligible)],
    ["Students Assessed", String(a.assessed)],
    ["Complete Results", String(a.complete)],
    ["Missing Marks", String(a.missing)],
    ["Incomplete Results", String(a.incomplete)],
    ["Passed", classifiable ? String(passed) : "Unavailable"],
    ["Failed", classifiable ? String(failed) : "Unavailable"],
    ["Pass Rate", classifiable ? ((passed / classifiable) * 100).toFixed(1) + "%" : "Unavailable"],
    ["Mean Score", fmt(a.mean)],
    ["Highest Score", fmt(a.high)],
    ["Lowest Score", fmt(a.low)],
  ];
  return (
    <section aria-label="Examination analytics">
      <Card
        title="Examination context & snapshots"
        sub="Report scope is exam-group end date, not publication date. Eligible roster is current session enrollment, not an immutable historical roster."
      >
        <div className="report-filters">
          <Field
            label="Exam group"
            value={group}
            options={["All", ...x.groups.map((g) => g.id)]}
            onChange={(v) => {
              setGroup(v);
              setPage(1);
            }}
          />
          <Field
            label="Subject"
            value={subject}
            options={["All", ...new Set(x.exams.map((e) => e.subject))]}
            onChange={(v) => {
              setSubject(v);
              setPage(1);
            }}
          />
          <Field
            label="Result context"
            value={context}
            options={["All recorded states", "Draft", "Reviewed", "Published"]}
            onChange={(v) => {
              setContext(v);
              setPage(1);
            }}
          />
          <Button
            onClick={() => {
              setGroup("All");
              setSubject("All");
              setContext("All recorded states");
              setStatus("All");
              setQ("");
              setPage(1);
            }}
          >
            Reset examination context
          </Button>
        </div>
        <p className="report-pad">
          {filters.session} · {filters.grade} / {filters.section} · {context}. Current grading
          version {x.scaleVersion}. Published grades/percentages are read as stored; historical
          published revisions are not stored. New publications capture timestamp and grading bands.
          Older records may lack these fields.
        </p>
      </Card>
      <div className="report-toolbar" role="group" aria-label="Examination report views">
        {["Overview", "Missing marks", "Pass / fail", "Subjects", "Classes"].map((t) => (
          <Button
            key={t}
            disabled={tab === t}
            onClick={() => {
              setTab(t);
              setPage(1);
            }}
          >
            {t}
          </Button>
        ))}
      </div>
      {tab === "Overview" ? (
        <>
          <div className="report-kpis">
            {metrics.map(([title, value]) => (
              <Card key={title} title={title}>
                <div className="report-kpi">
                  <Button onClick={() => setMetric(title)}>
                    {value} · Explain {title}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <div role="status" className="report-pad">
            Eligible: {a.eligible} unique students · assessed: {a.assessed} with at least one valid
            entry · complete: {a.complete} with every required component valid · partial:{" "}
            {a.partial} · invalid entries: {a.invalid}. Missing entries are never zero.
          </div>
        </>
      ) : tab === "Pass / fail" ? (
        <Card
          title={
            x.passingGrades ? "School-configured pass/fail rule" : "Pass/fail rule unavailable"
          }
        >
          <div className="report-pad">
            {x.passingGrades ? (
              <p>
                Current scheme: {x.schemeName}. Passing labels: {x.passingGrades.join(", ")}. Every
                required component must pass. Published results use only their captured rule; older
                snapshots without it remain unclassifiable.
              </p>
            ) : (
              <p>
                The existing school grading bands assign labels but do not define which labels pass.
                No universal percentage is assumed. Pass-rate numerator and denominator are
                unavailable until an explicit school rule is captured with the result.
              </p>
            )}
            <p>
              Potential denominator: {a.complete} complete students; excluded incomplete:{" "}
              {a.incomplete}. Actual classifiable denominator: {classifiable}. Passed {passed};
              failed {failed}. Exemptions are not supported by this source model.
            </p>
            <Table
              headers={["Published grade snapshot", "Assessment records"]}
              rows={Object.entries(
                a.pairs
                  .filter((p) => p.state === "Published" && p.status === "Complete")
                  .reduce<Record<string, number>>((v, p) => {
                    v[p.gradeSnapshot] = (v[p.gradeSnapshot] || 0) + 1;
                    return v;
                  }, {}),
              ).map(([g, n]) => [
                <Button
                  onClick={() => {
                    setQ("");
                    setMetric("Grade " + g);
                  }}
                >
                  {g}
                </Button>,
                n,
              ])}
            />
          </div>
        </Card>
      ) : tab === "Subjects" || tab === "Classes" ? (
        <Card
          title={tab === "Subjects" ? "Performance by subject" : "Performance by class / section"}
          sub="Mean is an unweighted average of valid component percentages, not a student rank. Different structures may not be comparable."
        >
          <Table
            headers={[
              "Scope",
              "Eligible",
              "Assessed",
              "Complete",
              "Missing entries",
              "Mean",
              "Highest",
              "Lowest",
              "Pass rate",
              "Actions",
            ]}
            rows={[
              ...new Set(
                a.pairs.map((p) => (tab === "Subjects" ? p.subject : `${p.grade} / ${p.section}`)),
              ),
            ].map((label) => {
              const pairs = a.pairs.filter(
                  (p) => (tab === "Subjects" ? p.subject : `${p.grade} / ${p.section}`) === label,
                ),
                ids = [...new Set(pairs.map((p) => p.student))],
                values = pairs.filter((p) => p.percentage !== null).map((p) => p.percentage!);
              return [
                label,
                ids.length,
                ids.filter((id) => pairs.some((p) => p.student === id && p.status === "Complete"))
                  .length,
                ids.filter((id) =>
                  pairs.filter((p) => p.student === id).every((p) => p.status === "Complete"),
                ).length,
                pairs.filter((p) => p.status === "Not entered").length,
                fmt(values.length ? values.reduce((n, v) => n + v, 0) / values.length : null),
                fmt(values.length ? Math.max(...values) : null),
                fmt(values.length ? Math.min(...values) : null),
                "Unavailable",
                <Button
                  onClick={() => setMetric((tab === "Subjects" ? "Subject " : "Class ") + label)}
                >
                  Inspect scope
                </Button>,
              ];
            })}
          />
        </Card>
      ) : (
        <>
          <div className="report-filters">
            <Field
              label="Search missing marks"
              value={q}
              onChange={(v) => {
                setQ(v);
                setPage(1);
              }}
            />
            <Field
              label="Missing mark status"
              value={status}
              options={["All", "Not entered", "Invalid", "Complete"]}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            />
            <Button onClick={() => setVisible(!visible)}>
              {visible ? "Hide assessment columns" : "Show assessment columns"}
            </Button>
          </div>
          {table(
            [...rows].sort((a, b) => a.name.localeCompare(b.name)).slice((page - 1) * 8, page * 8),
          )}
          <div className="report-toolbar">
            <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous assessments
            </Button>
            <span role="status">
              Page {page} · {rows.length} assessments
            </span>
            <Button disabled={page * 8 >= rows.length} onClick={() => setPage(page + 1)}>
              Next assessments
            </Button>
            <Button onClick={() => setMetric("Missing register export")}>
              Preview missing-mark export
            </Button>
          </div>
        </>
      )}
      {metric && (
        <Dialog title="Examination calculation & contributors" onClose={() => setMetric("")}>
          <strong>{metric}</strong>
          <p>
            Session {filters.session}; exam group {group}; subject {subject}; class {filters.grade};
            section {filters.section}; end-date period {filters.from || "All"}–{filters.to || "All"}
            . Population: {a.eligible}; assessed {a.assessed}; complete {a.complete}; incomplete{" "}
            {a.incomplete}; missing required entries {a.missing}. Complete requires all components;
            assessed requires at least one valid mark. Partial students remain in the eligible
            denominator.
          </p>
          <p>
            Pass/fail: unavailable, no configured classification rule. No historical revisions or
            exemptions are inferred. These are exact assessment pairs, not newly created score
            records.
          </p>
          {table(
            a.pairs.filter((p) =>
              metric === "Missing Marks"
                ? p.status === "Not entered"
                : metric === "Students Assessed"
                  ? p.status === "Complete"
                  : metric === "Complete Results" || metric === "Incomplete Results"
                    ? a.pairs
                        .filter((v) => v.student === p.student)
                        .every((v) => v.status === "Complete") ===
                      (metric === "Complete Results")
                    : ["Passed", "Failed", "Pass Rate"].includes(metric)
                      ? false
                      : metric === "Mean Score"
                        ? p.status === "Complete" && p.percentage !== null
                        : metric === "Highest Score" || metric === "Lowest Score"
                          ? p.percentage !== null &&
                            p.percentage === (metric === "Highest Score" ? a.high : a.low)
                          : metric === "Missing register export"
                            ? rows.some((v) => v.id === p.id)
                            : metric.startsWith("Grade ")
                              ? p.gradeSnapshot === metric.slice(6)
                              : metric.startsWith("Subject ")
                                ? p.subject === metric.slice(8)
                                : metric.startsWith("Class ")
                                  ? `${p.grade} / ${p.section}` === metric.slice(6)
                                  : true,
            ),
          )}
          <p>Export preview only; no file generated.</p>
        </Dialog>
      )}
      {detail && (
        <Dialog title="Exact assessment source" onClose={() => setDetail(undefined)}>
          <strong>
            {detail.name} · {detail.id}
          </strong>
          <Badge>{detail.status}</Badge>
          <p>
            {detail.group} / {detail.subject} / {detail.component} · maximum {detail.maximum}; marks{" "}
            {detail.value ?? "Not recorded"}.
          </p>
          <p>
            {detail.state === "Published"
              ? "Published Snapshot"
              : detail.state === "Reviewed"
                ? "Reviewed Draft"
                : "Live Draft"}{" "}
            · grade {detail.gradeSnapshot} · stored scale {detail.scale} · publication{" "}
            {detail.publishedAt}. No immutable revision archive is available.
          </p>
          <p>
            Examiner: {x.sittings.find((s) => s.exam === detail.exam)?.teacher || "Not assigned"}
          </p>
          {detail.history.map((h, i) => (
            <p key={i}>{h}</p>
          ))}
          <Button onClick={() => toMarks(detail)}>Open exact exam marks context</Button>
        </Dialog>
      )}
    </section>
  );
}
