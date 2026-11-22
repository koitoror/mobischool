import { useState } from "react";
import { importedStaff, importedGuardians } from "./peopleData";
import { Card, Button, Field, Badge } from "./components/OperationsUI";
import Icon from "./components/Icon";
export default function PeopleDirectory({ staff }: { staff: boolean }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState("");
  const all = staff
    ? importedStaff
    : importedGuardians.map((name, i) => ({
        id: "GUARDIAN-" + (i + 1),
        name,
        role: "Guardian",
        department: "Not supplied",
        designation: "Not supplied",
      }));
  const filtered = all.filter((r) =>
    [r.name, r.role, r.id].some((v) => v.toLowerCase().includes(q.toLowerCase())),
  );
  const r = all.find((r) => r.id === detail);
  return (
    <div className="op">
      <div className="op-heading">
        <div>
          <div className="op-eyebrow">PEOPLE / PROVIDED CSV NAMES</div>
          <h1>{staff ? "Staff directory" : "Guardian directory"}</h1>
          <p>Names from the supplied CSV · contact details and usernames excluded.</p>
        </div>
        <Badge>{all.length} imported names</Badge>
      </div>
      <div className="op-notice">
        <Icon name="shield" />
        <span>
          {staff
            ? "Teacher selectors use these staff names. Academic assignments remain illustrative."
            : "No guardian-to-student links were supplied. No family relationships or active accounts have been inferred."}
        </span>
      </div>
      <Card
        title={staff ? "Institution staff" : "Guardians"}
        sub="Provided names · not a live identity or account service"
      >
        <div className="op-toolbar">
          <label className="op-search">
            <Icon name="search" />
            <input
              aria-label="Search imported people"
              placeholder="Search name or role..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
        <div className="op-table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  "Name",
                  ...(staff
                    ? ["Role", "Department", "Designation"]
                    : ["Linked students", "Account status"]),
                  "",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice((page - 1) * 25, page * 25).map((r) => (
                <tr key={r.id}>
                  <td>
                    <button className="op-person" onClick={() => setDetail(r.id)}>
                      <span className="op-avatar">
                        {r.name
                          .split(" ")
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")}
                      </span>
                      {r.name}
                    </button>
                  </td>
                  {staff ? (
                    <>
                      <td>{r.role}</td>
                      <td>{r.department || "Not supplied"}</td>
                      <td>{r.designation || "Not supplied"}</td>
                    </>
                  ) : (
                    <>
                      <td>Not linked</td>
                      <td>Not provided</td>
                    </>
                  )}
                  <td>
                    <Button onClick={() => setDetail(r.id)}>View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="op-empty">
              No names match your search.<Button onClick={() => setQ("")}>Clear search</Button>
            </div>
          )}
        </div>
        <div className="op-pagination">
          <span>{filtered.length} matching names</span>
          <div>
            <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <span>{page}</span>
            <Button disabled={page * 25 >= filtered.length} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      </Card>
      {r && (
        <div className="op-overlay" onClick={() => setDetail("")}>
          <aside
            className="op-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Imported person details"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <div>
                <small>PROVIDED CSV / NAME RECORD</small>
                <h2>{r.name}</h2>
              </div>
              <button aria-label="Close person details" onClick={() => setDetail("")}>
                <Icon name="close" />
              </button>
            </header>
            <div className="op-drawer-body">
              <Badge>{r.role}</Badge>
              <p className="op-description">
                Names are supplied data; all academic and operational activity is simulated. Private
                contact details and usernames have not been copied into the app.
              </p>
              {staff ? (
                <>
                  <Field
                    label="Department"
                    value={r.department || "Not supplied"}
                    onChange={() => {}}
                  />
                  <Field
                    label="Designation"
                    value={r.designation || "Not supplied"}
                    onChange={() => {}}
                  />
                </>
              ) : (
                <div className="op-notice">
                  Verified student relationships have not been supplied.
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
