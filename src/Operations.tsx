import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useOperations } from "./OperationsContext";
import { useFinance } from "./FinanceContext";
import { Button, Badge, Card, Field } from "./components/OperationsUI";
import { AssessmentDialog } from "./components/AssessmentUI";
import {
  inventoryPages,
  transportPages,
  operationsPages,
  balance,
  movementError,
  itemError,
  referenceError,
  routeError,
  vehicleError,
  assignmentError,
  type Movement,
  type Item,
  type Category,
  type Store,
  type Supplier,
  type Route,
  type Vehicle,
  type Assignment,
} from "./operationsModel";
import "./operations.css";
const uid = (p: string) => p + "-" + crypto.randomUUID().slice(0, 8),
  days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="op-table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="op-empty">
          <strong>No matching operational records</strong>
          <p>Create a record or adjust the current filters. No transaction has been fabricated.</p>
        </div>
      )}
    </div>
  );
}
export default function Operations({
  page,
  active,
  school,
  navigate,
  onDirty,
  notify,
}: {
  page: string;
  active: boolean;
  school: string;
  navigate: (p: string) => void;
  onDirty: (b: boolean) => void;
  notify: (s: string) => void;
}) {
  const x = useOperations(),
    finance = useFinance(),
    m = x.metrics(),
    isInv = inventoryPages.includes(page);
  const [dialog, setDialog] = useState(""),
    [f, setF] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("All"),
    [sort, setSort] = useState("A–Z"),
    [selected, setSelected] = useState<string[]>([]),
    [index, setIndex] = useState(1),
    [state, setState] = useState("Ready"),
    [detail, setDetail] = useState(true);
  const canInventory = ["Administrator", "Inventory Officer"].includes(x.role),
    canTransport = ["Administrator", "Transport Officer"].includes(x.role);
  const close = () => {
    if (dirty && !window.confirm("Discard unsaved operational changes?")) return;
    setDialog("");
    setDirty(false);
    setError("");
  };
  useEffect(() => {
    setDialog("");
    setDirty(false);
    setError("");
    setQ("");
    setFilter("All");
    setSelected([]);
    setIndex(1);
    setState("Ready");
  }, [page, active]);
  useEffect(() => {
    if (active) onDirty(dirty);
  }, [active, dirty, onDirty]);
  const open = (d: string, form: Record<string, string> = {}) => {
    setDialog(d);
    setF(form);
    setError("");
    setDirty(false);
  };
  const go = (p: string) => {
    if (dirty && !window.confirm("Discard unsaved operational changes?")) return;
    setDirty(false);
    navigate(p);
  };
  const set = (k: string, v: string) => {
    setF((old) => ({ ...old, [k]: v }));
    setDirty(true);
  };
  const field = (
    label: string,
    key: string,
    options?: string[],
    type = "text",
    required = false,
  ) => (
    <Field
      label={label}
      value={f[key] || ""}
      options={options}
      type={type}
      required={required}
      onChange={(v) => set(key, v)}
    />
  );
  const assert = (message: string) => {
    if (message) throw Error(message);
  };
  const save = (fn: () => void) => {
    try {
      fn();
      setDialog("");
      setDirty(false);
      setError("");
      notify("Saved in local simulation only · no live institutional transaction");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const acts = (...nodes: ReactNode[]) => (
    <div className="op-inline">
      {nodes.map((n, i) => (
        <Fragment key={i}>{n}</Fragment>
      ))}
    </div>
  );
  const stats = (rows: [string, string, string][]) => (
    <div className="ops-stats">
      {rows.map(([label, value, dest]) => (
        <Button key={label} onClick={() => go(dest)}>
          <span>
            {label}
            <strong>{value}</strong>
            <small>Shared {isInv ? "ledger" : "transport"} records</small>
          </span>
        </Button>
      ))}
    </div>
  );
  const toolbar = (options: string[]) => (
    <div className="ops-filters">
      <Field
        label="Search operational records"
        value={q}
        onChange={(v) => {
          setQ(v);
          setIndex(1);
        }}
      />
      <Field
        label="Record filter"
        value={filter}
        options={["All", ...options]}
        onChange={(v) => {
          setFilter(v);
          setIndex(1);
        }}
      />
      <Field label="Sort" value={sort} options={["A–Z", "Z–A"]} onChange={setSort} />
      <Button onClick={() => setDetail((v) => !v)}>
        {detail ? "Hide" : "Show"} detail columns
      </Button>
    </div>
  );
  const sorted = <T extends { name: string }>(r: T[]) =>
    [...r].sort((a, b) =>
      sort === "A–Z" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
    );
  const paged = (headers: string[], rows: ReactNode[][]) => (
    <>
      <Table
        headers={headers}
        rows={rows.slice(
          (Math.min(index, Math.max(1, Math.ceil(rows.length / 10))) - 1) * 10,
          Math.min(index, Math.max(1, Math.ceil(rows.length / 10))) * 10,
        )}
      />
      <div className="ops-pad op-inline">
        <span>
          {rows.length} records · page {Math.min(index, Math.max(1, Math.ceil(rows.length / 10)))}
        </span>
        <Button disabled={index <= 1} onClick={() => setIndex((i) => i - 1)}>
          Previous
        </Button>
        <Button disabled={index * 10 >= rows.length} onClick={() => setIndex((i) => i + 1)}>
          Next
        </Button>
      </div>
    </>
  );
  const tick = (id: string) =>
    setSelected((old) => (old.includes(id) ? old.filter((v) => v !== id) : [...old, id]));
  const item = (v?: Item) =>
    open(
      "Item editor",
      v
        ? {
            ...v,
            minimum: String(v.minimum),
            unitCost: String(v.unitCost),
            track: String(v.track),
            returnable: String(v.returnable),
            history: "",
          }
        : {
            category: x.categories.find((c) => c.status === "Active")?.id || "",
            store: x.stores.find((s) => s.status === "Active")?.id || "",
            supplier: x.suppliers.find((s) => s.status === "Active")?.id || "",
            unit: "unit",
            minimum: "0",
            unitCost: "0",
            track: "true",
            classification: "Consumable",
            returnable: "false",
            status: "Active",
          },
    );
  const movement = (kind: string) =>
    open("Stock transaction", {
      kind,
      item: x.items.find((i) => i.status === "Active")?.id || "",
      store: x.stores.find((s) => s.status === "Active")?.id || "",
      quantity: "1",
      unitCost: "0",
      date: x.today,
      reference: "",
      party:
        kind === "Receipt"
          ? x.suppliers.find((s) => s.status === "Active")?.id || ""
          : x.workforce.staff.find((s) => s.status === "Active")?.id || "",
      notes: "",
    });
  const issue = () =>
    open("Issue item", {
      kind: "Issue",
      item: x.items.find((i) => i.status === "Active")?.id || "",
      store: x.stores.find((s) => s.status === "Active")?.id || "",
      quantity: "1",
      date: x.today,
      recipientType: "Staff",
      party: x.workforce.staff.find((s) => s.status === "Active")?.id || "",
      purpose: "",
      notes: "",
      returnable: "false",
    });
  const reference = (type: string, v?: Category | Store | Supplier) =>
    open(
      type + " editor",
      v
        ? {
            ...v,
            categories: "categories" in v ? v.categories.join(",") : "",
            track: "track" in v ? String(v.track) : "",
            history: "",
          }
        : { status: "Active", track: "true" },
    );
  const editRoute = (v?: Route) =>
    open(
      "Route editor",
      v
        ? {
            ...v,
            stops: v.stops.join("\n"),
            days: v.days.join(","),
            students: v.students.join(","),
            capacity: String(v.capacity),
            history: "",
          }
        : {
            type: "School bus",
            stops: "",
            days: "Monday,Tuesday,Wednesday,Thursday,Friday",
            capacity: "0",
            status: "Active",
            students: "",
          },
    );
  const editVehicle = (v?: Vehicle) =>
    open(
      "Vehicle editor",
      v
        ? { ...v, year: String(v.year), capacity: String(v.capacity), history: "" }
        : {
            type: "School bus",
            year: String(new Date().getFullYear()),
            capacity: "1",
            status: "Available",
            insurance: "",
            inspection: "",
            service: "",
            nextService: "",
            condition: "Not supplied",
          },
    );
  const assignment = (v?: Assignment, routeId?: string) =>
    open(
      "Vehicle assignment",
      v
        ? { ...v, days: v.days.join(","), history: "" }
        : {
            route: routeId || x.routes.find((r) => r.status === "Active")?.id || "",
            vehicle: x.vehicles.find((v) => v.status === "Available")?.id || "",
            driver: x.workforce.staff.find((s) => s.status === "Active")?.id || "",
            start: x.today,
            end: "",
            days: "Monday,Tuesday,Wednesday,Thursday,Friday",
            status: "Active",
            notes: "",
          },
    );
  const itemRows = sorted(
    x.items.filter(
      (i) =>
        `${i.name} ${i.sku} ${i.barcode}`.toLowerCase().includes(q.toLowerCase()) &&
        (filter === "All" ||
          filter === i.status ||
          filter === x.categories.find((c) => c.id === i.category)?.name),
    ),
  );
  const movementRows = x.movements.filter(
    (v) =>
      `${x.items.find((i) => i.id === v.item)?.name} ${v.reference} ${v.kind}`
        .toLowerCase()
        .includes(q.toLowerCase()) &&
      (filter === "All" || filter === v.kind),
  );
  const routes = sorted(
    x.routes.filter(
      (r) =>
        `${r.name} ${r.code}`.toLowerCase().includes(q.toLowerCase()) &&
        (filter === "All" || filter === r.status || filter === r.type),
    ),
  );
  const vehicles = sorted(
    x.vehicles.filter(
      (v) =>
        `${v.name} ${v.registration}`.toLowerCase().includes(q.toLowerCase()) &&
        (filter === "All" || filter === v.status || filter === v.type),
    ),
  );
  const currentIssue = x.items.find((i) => i.id === f.item),
    currentStore = x.stores.find((s) => s.id === f.store),
    available =
      currentIssue && currentStore ? balance(x.movements, currentIssue.id, currentStore.id) : 0;
  const recipients =
    f.recipientType === "Student"
      ? x.students
      : f.recipientType === "Department"
        ? x.workforce.departments.map((d, i) => ({ id: "DEP-" + i, name: d, status: "Active" }))
        : x.workforce.staff;
  return (
    <div className="op ops" hidden={!active}>
      <div className="op-heading">
        <div>
          <div className="op-eyebrow">OPERATIONS / {isInv ? "INVENTORY" : "TRANSPORT"}</div>
          <div className="ops-title" role="heading" aria-level={1}>
            {page === "Inventory"
              ? "Inventory Overview"
              : page === "Transport"
                ? "Transport Overview"
                : page}
          </div>
          <p>
            {isInv
              ? "One stock ledger. Every movement reconciled."
              : "Routes, fleet and assignments with explicit operational constraints."}
          </p>
        </div>
        <div className="op-heading-actions">
          <Button icon="settings" onClick={() => open("Preview controls")}>
            Preview controls
          </Button>
          <Button
            primary
            icon="plus"
            disabled={isInv ? !canInventory : !canTransport}
            onClick={() => (isInv ? item() : editVehicle())}
          >
            {isInv ? "Add item" : "Add vehicle"}
          </Button>
        </div>
      </div>
      <div className="op-context">
        <Field label="Operations workspace" value={page} options={operationsPages} onChange={go} />
        <span>
          {school} · as of {x.today}
        </span>
        <Badge>Illustrative Data</Badge>
        <span>Simulation · resets on reload</span>
      </div>
      <div className="ops-tabs">
        {(isInv ? inventoryPages : transportPages).map((p) => (
          <Button key={p} disabled={p === page} onClick={() => go(p)}>
            {p === "Inventory" || p === "Transport" ? "Overview" : p}
          </Button>
        ))}
      </div>
      <div className="op-notice">
        No persistent stock ledger, procurement, supplier transaction, GPS, telemetry, transport
        notification or production authorization is connected.
      </div>
      {state !== "Ready" ? (
        <Card title={state} sub="Operational exception preview">
          <div className="op-empty">
            {state === "Loading" ? (
              <div className="op-skeleton" />
            ) : (
              <strong>
                {state === "Restricted"
                  ? "Access restricted"
                  : state === "Error"
                    ? "Operational records could not be loaded"
                    : "No operational records"}
              </strong>
            )}
            <Button onClick={() => setState("Ready")}>Return to sample records</Button>
          </div>
        </Card>
      ) : (
        <>
          {page === "Inventory" ? (
            <>
              <div className="ops-stats-wrap">
                {stats([
                  ["Inventory items", String(m.items), "Add Item"],
                  ["Stock units", String(m.units), "Add Item Stock"],
                  ["Estimated stock value", finance.money(m.value), "Add Item"],
                  ["Low stock", String(m.low), "Add Item"],
                  ["Out of stock", String(m.out), "Issue Item"],
                  ["Issues today", String(m.issues), "Issue Item"],
                ])}
              </div>
              <div className="ops-grid">
                <Card title="Stock by category" sub="Current ledger quantity and estimated value">
                  {x.categories.map((c) => {
                    const items = x.items.filter((i) => i.category === c.id);
                    return (
                      <Button key={c.id} onClick={() => go("Add Item")}>
                        <span>
                          {c.name}: {items.reduce((n, i) => n + balance(x.movements, i.id), 0)}{" "}
                          units ·{" "}
                          {finance.money(
                            items.reduce((n, i) => n + balance(x.movements, i.id) * i.unitCost, 0),
                          )}
                        </span>
                      </Button>
                    );
                  })}
                </Card>
                <Card
                  title="Low-stock watchlist"
                  sub="At or below each item’s configured reorder threshold"
                >
                  <Table
                    headers={["Item", "Balance", "Reorder", "Action"]}
                    rows={x.items
                      .filter((i) => balance(x.movements, i.id) <= i.minimum)
                      .map((i) => [
                        i.name,
                        balance(x.movements, i.id),
                        i.minimum,
                        <Button onClick={() => go("Add Item Stock")}>Replenish</Button>,
                      ])}
                  />
                </Card>
              </div>
              <Card
                title="Recent stock movements"
                sub="Opening balance, receipts, issues, adjustments and valid returns share one ledger."
              >
                <Table
                  headers={["Reference", "Item", "Store", "Movement", "Quantity", "Value", "Date"]}
                  rows={x.movements
                    .slice(0, 8)
                    .map((v) => [
                      v.reference,
                      x.items.find((i) => i.id === v.item)?.name,
                      x.stores.find((s) => s.id === v.store)?.name,
                      v.kind,
                      v.quantity,
                      finance.money(Math.abs(v.quantity) * v.unitCost),
                      v.date,
                    ])}
                />
              </Card>
            </>
          ) : page === "Issue Item" ? (
            <Card
              title="Issue item"
              sub="Selection → stock validation → after-balance preview → explicit confirmation → issue slip"
              action={
                <Button disabled={!canInventory} onClick={issue}>
                  Issue stock
                </Button>
              }
            >
              {toolbar(["Issue", "Return"])}
              {paged(
                ["Reference", "Item / store", "Recipient", "Quantity", "Date", "Actions"],
                movementRows
                  .filter((v) => ["Issue", "Return"].includes(v.kind))
                  .map((v) => [
                    v.reference,
                    `${x.items.find((i) => i.id === v.item)?.name} / ${x.stores.find((s) => s.id === v.store)?.name}`,
                    v.party,
                    v.quantity,
                    v.date,
                    acts(
                      <Button onClick={() => open("Movement detail", { id: v.id })}>
                        Slip / history
                      </Button>,
                      <Button
                        disabled={
                          !canInventory ||
                          v.kind !== "Issue" ||
                          !x.items.find((i) => i.id === v.item)?.returnable
                        }
                        onClick={() =>
                          open("Return issue", {
                            id: v.id,
                            quantity: String(Math.abs(v.quantity)),
                            date: x.today,
                            reference: "",
                            notes: "Returned item",
                          })
                        }
                      >
                        Return
                      </Button>,
                      <Button
                        disabled={!canInventory}
                        onClick={() => open("Correction request", { id: v.id, reason: "" })}
                      >
                        Correction preview
                      </Button>,
                    ),
                  ]),
              )}
            </Card>
          ) : page === "Add Item Stock" ? (
            <Card
              title="Stock receipts and adjustments"
              sub="Every confirmed change writes a signed movement to the same balance ledger."
              action={acts(
                <Button disabled={!canInventory} onClick={() => movement("Receipt")}>
                  Receive stock
                </Button>,
                <Button disabled={!canInventory} onClick={() => movement("Adjustment")}>
                  Adjust stock
                </Button>,
              )}
            >
              {toolbar(["Opening balance", "Receipt", "Adjustment"])}
              {paged(
                [
                  "Reference",
                  "Item / store",
                  "Type",
                  "Quantity",
                  "Unit cost",
                  "Date",
                  "Actor",
                  "Action",
                ],
                movementRows.map((v) => [
                  v.reference,
                  `${x.items.find((i) => i.id === v.item)?.name} / ${x.stores.find((s) => s.id === v.store)?.name}`,
                  v.kind,
                  v.quantity,
                  finance.money(v.unitCost),
                  v.date,
                  v.actor,
                  <Button onClick={() => open("Movement detail", { id: v.id })}>Audit</Button>,
                ]),
              )}
            </Card>
          ) : page === "Add Item" ? (
            <Card
              title="Inventory item registry"
              sub="SKU/barcode uniqueness and stock-aware archive safeguards"
              action={
                <Button disabled={!canInventory} onClick={() => item()}>
                  Add item
                </Button>
              }
            >
              {toolbar(["Active", "Archived", ...x.categories.map((c) => c.name)])}
              <div className="ops-pad">
                {acts(
                  <Button
                    disabled={!selected.length || !canInventory}
                    onClick={() => open("Archive items", { reason: "" })}
                  >
                    Archive selected ({selected.length})
                  </Button>,
                  <Button onClick={() => setSelected([])}>Clear</Button>,
                )}
              </div>
              {paged(
                [
                  "Select",
                  "Item / SKU",
                  "Category",
                  ...(detail ? ["Store / supplier", "Unit value"] : []),
                  "Stock / reorder",
                  "Status",
                  "Actions",
                ],
                itemRows.map((i) => [
                  <Button onClick={() => tick(i.id)}>
                    {selected.includes(i.id) ? "Selected" : "Select"}
                  </Button>,
                  `${i.name} / ${i.sku}`,
                  x.categories.find((c) => c.id === i.category)?.name,
                  ...(detail
                    ? [
                        `${x.stores.find((s) => s.id === i.store)?.name} / ${x.suppliers.find((s) => s.id === i.supplier)?.name || "None"}`,
                        finance.money(i.unitCost),
                      ]
                    : []),
                  `${balance(x.movements, i.id)} / ${i.minimum}`,
                  i.status,
                  acts(
                    <Button onClick={() => open("Item detail", { id: i.id })}>Details</Button>,
                    <Button disabled={!canInventory} onClick={() => item(i)}>
                      Edit
                    </Button>,
                  ),
                ]),
              )}
            </Card>
          ) : ["Item Category", "Item Store", "Item Supplier"].includes(page) ? (
            (() => {
              const type = page.replace("Item ", ""),
                records =
                  type === "Category" ? x.categories : type === "Store" ? x.stores : x.suppliers;
              return (
                <Card
                  title={page + " registry"}
                  sub="Configurable school reference records; real contracts are not implied."
                  action={
                    <Button disabled={!canInventory} onClick={() => reference(type)}>
                      Add {type.toLowerCase()}
                    </Button>
                  }
                >
                  {toolbar(["Active", "Inactive", "Archived"])}
                  {paged(
                    [
                      "Name / code",
                      ...(detail
                        ? [
                            type === "Store"
                              ? "Location / responsible"
                              : type === "Supplier"
                                ? "Contact / terms"
                                : "Description",
                          ]
                        : []),
                      "Usage / stock",
                      "Status",
                      "Actions",
                    ],
                    records
                      .filter(
                        (r) =>
                          `${r.name} ${r.code}`.toLowerCase().includes(q.toLowerCase()) &&
                          (filter === "All" || filter === r.status),
                      )
                      .map((r) => [
                        `${r.name} / ${r.code}`,
                        ...(detail
                          ? [
                              type === "Store"
                                ? `${(r as Store).location} / ${x.workforce.staff.find((s) => s.id === (r as Store).responsible)?.name || "Unassigned"}`
                                : type === "Supplier"
                                  ? `${(r as Supplier).contact} / ${(r as Supplier).terms}`
                                  : (r as Category).description,
                            ]
                          : []),
                        type === "Category"
                          ? `${x.items.filter((i) => i.category === r.id).length} items`
                          : type === "Store"
                            ? `${x.items.filter((i) => balance(x.movements, i.id, r.id) !== 0).length} items · ${x.items.reduce((n, i) => n + balance(x.movements, i.id, r.id), 0)} units`
                            : `${x.items.filter((i) => i.supplier === r.id).length} items`,
                        r.status,
                        acts(
                          <Button onClick={() => open(type + " detail", { id: r.id })}>
                            Details
                          </Button>,
                          <Button disabled={!canInventory} onClick={() => reference(type, r)}>
                            Edit
                          </Button>,
                        ),
                      ]),
                  )}
                </Card>
              );
            })()
          ) : page === "Transport" ? (
            <>
              <div className="ops-stats-wrap">
                {stats([
                  ["Total vehicles", String(m.vehicles), "Vehicles"],
                  ["Active vehicles", String(m.activeVehicles), "Vehicles"],
                  ["Maintenance", String(m.maintenance), "Vehicles"],
                  ["Routes", String(x.routes.length), "Routes"],
                  ["Active assignments", String(m.activeAssignments), "Assign Vehicle"],
                  [
                    "Unassigned vehicles",
                    String(x.vehicles.filter((v) => v.status === "Available").length),
                    "Assign Vehicle",
                  ],
                ])}
              </div>
              <div className="ops-grid">
                <Card title="Fleet status" sub="Expiry and service dates are operator-entered">
                  <Table
                    headers={["Vehicle", "Status", "Capacity", "Inspection", "Service"]}
                    rows={x.vehicles.map((v) => [
                      v.name,
                      v.status,
                      v.capacity,
                      v.inspection || "Not configured",
                      v.nextService || "Not configured",
                    ])}
                  />
                </Card>
                <Card title="Route coverage" sub="Schematic records · no GPS or live schedule">
                  <Table
                    headers={["Route", "Stops", "Requirement", "Assignment"]}
                    rows={x.routes.map((r) => [
                      r.name,
                      r.stops.length,
                      r.capacity,
                      x.assignments.find((a) => a.route === r.id && a.status === "Active")?.id ||
                        "Unassigned",
                    ])}
                  />
                </Card>
              </div>
            </>
          ) : page === "Routes" ? (
            <Card
              title="Transport route registry"
              sub="Ordered stops and timetable context; no mapping service is connected."
              action={
                <Button disabled={!canTransport} onClick={() => editRoute()}>
                  Add route
                </Button>
              }
            >
              {toolbar(["Active", "Inactive", "Archived", "School bus", "Staff transport"])}
              {paged(
                [
                  "Route / code",
                  "Endpoints",
                  ...(detail ? ["Ordered stops / times", "Days"] : []),
                  "Capacity",
                  "Assignment",
                  "Status",
                  "Actions",
                ],
                routes.map((r) => [
                  `${r.name} / ${r.code}`,
                  `${r.start} → ${r.end}`,
                  ...(detail
                    ? [`${r.stops.join(" → ")} · ${r.pickup} / ${r.dropoff}`, r.days.join(", ")]
                    : []),
                  r.capacity,
                  x.assignments.find((a) => a.route === r.id && a.status === "Active")?.id ||
                    "Unassigned",
                  r.status,
                  acts(
                    <Button onClick={() => open("Route detail", { id: r.id })}>Details</Button>,
                    <Button disabled={!canTransport} onClick={() => editRoute(r)}>
                      Edit
                    </Button>,
                    <Button disabled={!canTransport} onClick={() => assignment(undefined, r.id)}>
                      Assign
                    </Button>,
                  ),
                ]),
              )}
            </Card>
          ) : page === "Vehicles" ? (
            <Card
              title="Fleet registry"
              sub="Availability, maintenance and expiry context; no telemetry."
              action={
                <Button disabled={!canTransport} onClick={() => editVehicle()}>
                  Add vehicle
                </Button>
              }
            >
              {toolbar([
                "Available",
                "Assigned",
                "Maintenance",
                "Out of service",
                "Retired",
                "School bus",
                "Minibus",
                "Van",
              ])}
              {paged(
                [
                  "Vehicle / registration",
                  "Type",
                  ...(detail ? ["Make / model", "Inspection / insurance"] : []),
                  "Capacity",
                  "Status",
                  "Assignment",
                  "Actions",
                ],
                vehicles.map((v) => [
                  `${v.name} / ${v.registration}`,
                  v.type,
                  ...(detail
                    ? [`${v.make} / ${v.model}`, `${v.inspection || "—"} / ${v.insurance || "—"}`]
                    : []),
                  v.capacity,
                  v.status,
                  x.assignments.find((a) => a.vehicle === v.id && a.status === "Active")?.id ||
                    "Unassigned",
                  acts(
                    <Button onClick={() => open("Vehicle detail", { id: v.id })}>Details</Button>,
                    <Button disabled={!canTransport} onClick={() => editVehicle(v)}>
                      Edit
                    </Button>,
                  ),
                ]),
              )}
            </Card>
          ) : (
            <Card
              title="Vehicle assignment register"
              sub="Active route + eligible vehicle + active shared staff driver + capacity and overlap checks"
              action={
                <Button disabled={!canTransport} onClick={() => assignment()}>
                  Assign vehicle
                </Button>
              }
            >
              {toolbar(["Active", "Ended", "Cancelled"])}
              {paged(
                ["Assignment", "Route", "Vehicle", "Driver", "Period / days", "Status", "Actions"],
                x.assignments
                  .filter((a) => filter === "All" || a.status === filter)
                  .map((a) => [
                    a.id,
                    x.routes.find((r) => r.id === a.route)?.name,
                    x.vehicles.find((v) => v.id === a.vehicle)?.name,
                    x.workforce.staff.find((s) => s.id === a.driver)?.name,
                    `${a.start} → ${a.end || "Open"} · ${a.days.join(", ")}`,
                    a.status,
                    acts(
                      <Button onClick={() => open("Assignment detail", { id: a.id })}>
                        Details
                      </Button>,
                      <Button
                        disabled={!canTransport || a.status !== "Active"}
                        onClick={() => assignment(a)}
                      >
                        Reassign
                      </Button>,
                      <Button
                        disabled={!canTransport || a.status !== "Active"}
                        onClick={() =>
                          open("End assignment", { id: a.id, date: x.today, reason: "" })
                        }
                      >
                        Unassign
                      </Button>,
                    ),
                  ]),
              )}
            </Card>
          )}
        </>
      )}
      <div className="op-footnote">
        <span>
          {dirty ? "Unsaved changes" : "Local prototype state"} · {x.role} preview
        </span>
        <span>
          {isInv
            ? `Display currency ${finance.currency} · no ledger posting`
            : "No live transport service"}
        </span>
      </div>
      {dialog && active && (
        <AssessmentDialog title={dialog} onClose={close}>
          {dialog === "Preview controls" ? (
            <>
              <Field
                label="Preview role"
                value={x.role}
                options={[
                  "Administrator",
                  "Inventory Officer",
                  "Transport Officer",
                  "Auditor",
                  "General staff",
                ]}
                onChange={x.setRole}
              />
              <Field
                label="Data state"
                value={state}
                options={["Ready", "Loading", "Empty", "Error", "Restricted"]}
                onChange={setState}
              />
              <p>These are UI proposals, not authentication or backend authorization.</p>
            </>
          ) : dialog === "Issue item" ? (
            <form
              className="ops-fields"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  assert(!canInventory ? "Restricted role." : "");
                  assert(!currentIssue || !currentStore ? "Choose item and store." : "");
                  assert(
                    !Number.isInteger(Number(f.quantity)) || Number(f.quantity) <= 0
                      ? "Issue quantity must be a positive whole number."
                      : "",
                  );
                  assert(
                    !f.party || !f.purpose?.trim() ? "Recipient and purpose are required." : "",
                  );
                  assert(
                    Number(f.quantity) > available ? "Insufficient stock for this issue." : "",
                  );
                  setDialog("Confirm issue");
                  setDirty(false);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {field(
                "Store",
                "store",
                x.stores.filter((s) => s.status === "Active").map((s) => s.id),
              )}
              {field(
                "Item",
                "item",
                x.items.filter((i) => i.status === "Active").map((i) => i.id),
              )}
              <p>
                SKU: {currentIssue?.sku} · Available {available} {currentIssue?.unit} · after issue{" "}
                {available - Number(f.quantity || 0)}
              </p>
              {field("Recipient type", "recipientType", ["Staff", "Student", "Department"])}
              {field(
                "Recipient",
                "party",
                recipients.filter((r) => r.status === "Active").map((r) => r.id),
              )}
              {field("Quantity to issue", "quantity", undefined, "number", true)}
              {field("Issue date", "date", undefined, "date", true)}
              {field("Purpose", "purpose", undefined, "textarea", true)}
              {field("Notes", "notes", undefined, "textarea")}
              {currentIssue?.returnable &&
                field("Return expected", "returnable", ["false", "true"])}
              <Button primary type="submit">
                Preview stock issue
              </Button>
            </form>
          ) : dialog === "Confirm issue" ? (
            <>
              <p>
                {currentIssue?.name} · {currentStore?.name} · {f.quantity} units · balance{" "}
                {available} → {available - Number(f.quantity)}.
              </p>
              <p>
                Recipient: {f.recipientType} / {f.party}. Issued by {x.role} preview. No procurement
                or Finance posting.
              </p>
              <Button
                primary
                disabled={!canInventory}
                onClick={() =>
                  save(() => {
                    const mov: Movement = {
                      id: uid("MOV"),
                      item: f.item,
                      store: f.store,
                      kind: "Issue",
                      quantity: -Number(f.quantity),
                      unitCost: currentIssue?.unitCost || 0,
                      date: f.date,
                      reference: uid("ISSUE"),
                      party: f.party,
                      notes: `${f.purpose}; ${f.notes || ""}`,
                      actor: x.role,
                      reversalOf: "",
                      history: [
                        x.stamp(
                          `Confirmed issue; ${available} → ${available - Number(f.quantity)}`,
                        ),
                      ],
                    };
                    assert(movementError(mov, x.movements, x.items, x.stores));
                    x.setMovements((old) => [mov, ...old]);
                  })
                }
              >
                Confirm issue (simulation)
              </Button>
            </>
          ) : dialog === "Stock transaction" ? (
            <form
              className="ops-fields"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  assert(!canInventory ? "Restricted role." : "");
                  const signed =
                    f.kind === "Adjustment" ? Number(f.quantity) : Math.abs(Number(f.quantity));
                  const mov: Movement = {
                    id: uid("MOV"),
                    item: f.item,
                    store: f.store,
                    kind: f.kind,
                    quantity: signed,
                    unitCost: Math.round(Number(f.unitCost || 0) * 100),
                    date: f.date,
                    reference: f.reference,
                    party: f.party,
                    notes: f.notes || "",
                    actor: x.role,
                    reversalOf: "",
                    history: [],
                  };
                  assert(movementError(mov, x.movements, x.items, x.stores));
                  setDialog("Confirm stock transaction");
                  setDirty(false);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {field("Transaction type", "kind", ["Receipt", "Adjustment"])}
              {field(
                "Store",
                "store",
                x.stores.filter((s) => s.status === "Active").map((s) => s.id),
              )}
              {field(
                "Item",
                "item",
                x.items.filter((i) => i.status === "Active").map((i) => i.id),
              )}
              <p>
                Current balance: {available}. For adjustment, enter a signed change (for example
                -2), not the desired final balance.
              </p>
              {field(
                f.kind === "Adjustment" ? "Signed quantity adjustment" : "Quantity received",
                "quantity",
                undefined,
                "number",
                true,
              )}
              {field(
                "Supplier / authorized party",
                "party",
                f.kind === "Receipt"
                  ? x.suppliers.filter((s) => s.status === "Active").map((s) => s.id)
                  : x.workforce.staff.filter((s) => s.status === "Active").map((s) => s.id),
              )}
              {field("Unique reference", "reference", undefined, "text", true)}
              {field("Unit cost", "unitCost", undefined, "number")}
              {field("Receipt / adjustment date", "date", undefined, "date", true)}
              {field(
                f.kind === "Adjustment" ? "Adjustment reason" : "Notes",
                "notes",
                undefined,
                "textarea",
                f.kind === "Adjustment",
              )}
              <Button primary type="submit">
                Preview stock transaction
              </Button>
            </form>
          ) : dialog === "Confirm stock transaction" ? (
            <>
              <p>
                {f.kind} · {x.items.find((i) => i.id === f.item)?.name} · current {available} →{" "}
                {available + Number(f.quantity)}. Cost:{" "}
                {finance.money(
                  Math.abs(Number(f.quantity)) * Math.round(Number(f.unitCost || 0) * 100),
                )}
                .
              </p>
              <Button
                primary
                disabled={!canInventory}
                onClick={() =>
                  save(() => {
                    const mov: Movement = {
                      id: uid("MOV"),
                      item: f.item,
                      store: f.store,
                      kind: f.kind,
                      quantity: Number(f.quantity),
                      unitCost: Math.round(Number(f.unitCost || 0) * 100),
                      date: f.date,
                      reference: f.reference,
                      party: f.party,
                      notes: f.notes || "",
                      actor: x.role,
                      reversalOf: "",
                      history: [
                        x.stamp(
                          `Confirmed ${f.kind}; ${available} → ${available + Number(f.quantity)}`,
                        ),
                      ],
                    };
                    assert(movementError(mov, x.movements, x.items, x.stores));
                    x.setMovements((old) => [mov, ...old]);
                  })
                }
              >
                Confirm transaction
              </Button>
            </>
          ) : dialog === "Return issue" ? (
            <>
              {field("Return quantity", "quantity", undefined, "number", true)}
              {field("Return date", "date", undefined, "date", true)}
              {field("Unique return reference", "reference", undefined, "text", true)}
              {field("Return condition / notes", "notes", undefined, "textarea", true)}
              <Button
                primary
                disabled={!canInventory}
                onClick={() =>
                  save(() => {
                    const issued = x.movements.find((m) => m.id === f.id)!;
                    assert(
                      !Number.isInteger(Number(f.quantity)) ||
                        Number(f.quantity) <= 0 ||
                        Number(f.quantity) > Math.abs(issued.quantity)
                        ? "Return quantity must be within the original issue quantity."
                        : "",
                    );
                    const prior = x.movements
                      .filter((m) => m.reversalOf === issued.id && m.kind === "Return")
                      .reduce((n, m) => n + m.quantity, 0);
                    assert(
                      prior + Number(f.quantity) > Math.abs(issued.quantity)
                        ? "Return exceeds remaining returnable quantity."
                        : "",
                    );
                    const mov: Movement = {
                      ...issued,
                      id: uid("MOV"),
                      kind: "Return",
                      quantity: Number(f.quantity),
                      date: f.date,
                      reference: f.reference,
                      notes: f.notes,
                      actor: x.role,
                      reversalOf: issued.id,
                      history: [x.stamp(`Valid return against ${issued.id}`)],
                    };
                    assert(movementError(mov, x.movements, x.items, x.stores));
                    x.setMovements((old) => [mov, ...old]);
                  })
                }
              >
                Confirm return
              </Button>
            </>
          ) : dialog === "Correction request" ? (
            <>
              {field("Correction reason", "reason", undefined, "textarea", true)}
              <p>
                Confirmed movements remain immutable. This preview records a correction request in
                the movement history but does not alter stock.
              </p>
              <Button
                disabled={!canInventory || !f.reason?.trim()}
                onClick={() =>
                  save(() =>
                    x.setMovements((old) =>
                      old.map((m) =>
                        m.id === f.id
                          ? {
                              ...m,
                              history: [...m.history, x.stamp("Correction requested: " + f.reason)],
                            }
                          : m,
                      ),
                    ),
                  )
                }
              >
                Record correction request
              </Button>
            </>
          ) : dialog === "Movement detail" ? (
            (() => {
              const v = x.movements.find((v) => v.id === f.id)!;
              return (
                <>
                  <strong>
                    {v.kind} · {v.reference}
                  </strong>
                  <p>
                    {x.items.find((i) => i.id === v.item)?.name} ·{" "}
                    {x.stores.find((s) => s.id === v.store)?.name} · {v.quantity} · {v.date} ·{" "}
                    {v.party}
                  </p>
                  <p>{v.notes}</p>
                  {v.history.map((h, i) => (
                    <p key={i}>{h}</p>
                  ))}
                  <p>SIMULATED STOCK SLIP · not proof of procurement, issue or receipt.</p>
                </>
              );
            })()
          ) : dialog === "Item editor" ? (
            <form
              className="ops-fields"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const i: Item = {
                    id: f.id || uid("ITEM"),
                    name: f.name || "",
                    sku: f.sku || "",
                    category: f.category,
                    description: f.description || "",
                    unit: f.unit || "",
                    brand: f.brand || "",
                    barcode: f.barcode || "",
                    minimum: Number(f.minimum),
                    supplier: f.supplier || "",
                    store: f.store,
                    unitCost: Math.round(Number(f.unitCost || 0) * 100),
                    track: f.track === "true",
                    classification: f.classification || "Consumable",
                    returnable: f.returnable === "true",
                    status: f.status || "Active",
                    history: [],
                  };
                  assert(!canInventory ? "Restricted role." : "");
                  assert(itemError(i, x.items, x.movements));
                  setF({ ...f, id: i.id });
                  setDialog("Confirm item");
                  setDirty(false);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {field("Item name", "name", undefined, "text", true)}
              {field("Item code / SKU", "sku", undefined, "text", true)}
              {field(
                "Category",
                "category",
                x.categories.filter((c) => c.status === "Active").map((c) => c.id),
              )}
              {field("Description", "description", undefined, "textarea")}
              {field("Unit of measurement", "unit", [
                "unit",
                "book",
                "box",
                "pack",
                "piece",
                "litre",
                "kilogram",
              ])}
              {field("Brand", "brand")}
              {field("Barcode (optional)", "barcode")}
              {field("Reorder level", "minimum", undefined, "number")}
              {field("Preferred supplier", "supplier", [
                "",
                ...x.suppliers.filter((s) => s.status === "Active").map((s) => s.id),
              ])}
              {field(
                "Default store",
                "store",
                x.stores.filter((s) => s.status === "Active").map((s) => s.id),
              )}
              {field("Estimated unit value", "unitCost", undefined, "number")}
              {field("Track stock", "track", ["true", "false"])}
              {field("Classification", "classification", ["Consumable", "Reusable"])}
              {field("Returnable item", "returnable", ["false", "true"])}
              {field("Status", "status", ["Active", "Archived"])}
              <Button primary type="submit">
                Review item
              </Button>
            </form>
          ) : dialog === "Confirm item" ? (
            <>
              <p>
                {f.name} · {f.sku} · estimated unit value{" "}
                {finance.money(Math.round(Number(f.unitCost || 0) * 100))} · {f.status}. Creating an
                item does not create stock.
              </p>
              <Button
                primary
                disabled={!canInventory}
                onClick={() =>
                  save(() => {
                    const previous = x.items.find((i) => i.id === f.id);
                    const i: Item = {
                      id: f.id,
                      name: f.name,
                      sku: f.sku,
                      category: f.category,
                      description: f.description || "",
                      unit: f.unit,
                      brand: f.brand || "",
                      barcode: f.barcode || "",
                      minimum: Number(f.minimum),
                      supplier: f.supplier || "",
                      store: f.store,
                      unitCost: Math.round(Number(f.unitCost || 0) * 100),
                      track: f.track === "true",
                      classification: f.classification,
                      returnable: f.returnable === "true",
                      status: f.status,
                      history: [
                        ...(previous?.history || []),
                        x.stamp(`${previous?.status || "New"} → ${f.status}`),
                      ],
                    };
                    assert(itemError(i, x.items, x.movements));
                    x.setItems((old) => [...old.filter((v) => v.id !== i.id), i]);
                  })
                }
              >
                Confirm item
              </Button>
            </>
          ) : dialog === "Archive items" ? (
            <>
              {field("Archive reason", "reason", undefined, "textarea", true)}
              <p>
                Selected items must reconcile to zero stock. Records and movements are retained.
              </p>
              <Button
                danger
                disabled={!canInventory || !f.reason?.trim()}
                onClick={() =>
                  save(() =>
                    x.setItems((old) =>
                      old.map((i) => {
                        if (!selected.includes(i.id)) return i;
                        const next = {
                          ...i,
                          status: "Archived",
                          history: [...i.history, x.stamp("Archived: " + f.reason)],
                        };
                        assert(itemError(next, old, x.movements));
                        return next;
                      }),
                    ),
                  )
                }
              >
                Confirm archive
              </Button>
            </>
          ) : dialog === "Item detail" ? (
            (() => {
              const i = x.items.find((i) => i.id === f.id)!;
              return (
                <>
                  <strong>
                    {i.name} · {i.sku}
                  </strong>
                  <p>
                    Total stock {balance(x.movements, i.id)} · reorder {i.minimum} · estimated value{" "}
                    {finance.money(balance(x.movements, i.id) * i.unitCost)}
                  </p>
                  <Table
                    headers={["Store", "Balance"]}
                    rows={x.stores.map((s) => [s.name, balance(x.movements, i.id, s.id)])}
                  />
                  <Table
                    headers={["Reference", "Movement", "Quantity", "Date"]}
                    rows={x.movements
                      .filter((m) => m.item === i.id)
                      .map((m) => [m.reference, m.kind, m.quantity, m.date])}
                  />
                  {i.history.map((h, j) => (
                    <p key={j}>{h}</p>
                  ))}
                </>
              );
            })()
          ) : dialog.endsWith(" editor") &&
            ["Category editor", "Store editor", "Supplier editor"].includes(dialog) ? (
            <ReferenceEditor
              type={dialog.split(" ")[0]}
              f={f}
              field={field}
              x={x}
              can={canInventory}
              save={save}
              assert={assert}
            />
          ) : dialog.endsWith(" detail") &&
            ["Category detail", "Store detail", "Supplier detail"].includes(dialog) ? (
            <ReferenceDetail type={dialog.split(" ")[0]} id={f.id} x={x} money={finance.money} />
          ) : dialog === "Route editor" ? (
            <form
              className="ops-fields"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const r: Route = {
                    id: f.id || uid("ROUTE"),
                    name: f.name || "",
                    code: f.code || "",
                    type: f.type,
                    start: f.start || "",
                    end: f.end || "",
                    stops: (f.stops || "")
                      .split("\n")
                      .map((v) => v.trim())
                      .filter(Boolean),
                    pickup: f.pickup || "",
                    dropoff: f.dropoff || "",
                    days: (f.days || "").split(",").filter(Boolean),
                    capacity: Number(f.capacity),
                    students: (f.students || "").split(",").filter(Boolean),
                    status: f.status,
                    notes: f.notes || "",
                    history: [],
                  };
                  assert(!canTransport ? "Restricted role." : "");
                  assert(routeError(r, x.routes));
                  const active = x.assignments.some(
                    (a) => a.route === r.id && a.status === "Active",
                  );
                  assert(
                    active && r.status !== "Active"
                      ? "End active assignments before deactivating or archiving the route."
                      : "",
                  );
                  setF({ ...f, id: r.id });
                  setDialog("Confirm route");
                  setDirty(false);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {field("Route name", "name", undefined, "text", true)}
              {field("Route code", "code", undefined, "text", true)}
              {field("Route type", "type", [
                "School bus",
                "Staff transport",
                "Special transport",
                "Other",
              ])}
              {field("Start point", "start", undefined, "text", true)}
              {field("End point", "end", undefined, "text", true)}
              {field("Ordered stops, one per line", "stops", undefined, "textarea", true)}
              {field("Pickup time", "pickup", undefined, "time")}
              {field("Drop-off time", "dropoff", undefined, "time")}
              {field("Days, comma separated", "days")}
              {field("Route capacity", "capacity", undefined, "number")}
              {field("Assigned student IDs, comma separated", "students")}
              {field("Notes", "notes", undefined, "textarea")}
              {field("Status", "status", ["Active", "Inactive", "Archived"])}
              <Button primary type="submit">
                Review route
              </Button>
            </form>
          ) : dialog === "Confirm route" ? (
            <>
              <p>
                {f.name} · {f.start} → {f.stops?.split("\n").filter(Boolean).join(" → ")} → {f.end}{" "}
                · requirement {f.capacity}.
              </p>
              <p>Schematic only; no coordinates or GPS.</p>
              <Button
                primary
                disabled={!canTransport}
                onClick={() =>
                  save(() => {
                    const previous = x.routes.find((r) => r.id === f.id);
                    const r: Route = {
                      id: f.id,
                      name: f.name,
                      code: f.code,
                      type: f.type,
                      start: f.start,
                      end: f.end,
                      stops: f.stops
                        .split("\n")
                        .map((v) => v.trim())
                        .filter(Boolean),
                      pickup: f.pickup || "",
                      dropoff: f.dropoff || "",
                      days: f.days.split(",").filter(Boolean),
                      capacity: Number(f.capacity),
                      students: f.students?.split(",").filter(Boolean) || [],
                      status: f.status,
                      notes: f.notes || "",
                      history: [
                        ...(previous?.history || []),
                        x.stamp(`Route ${previous?.status || "New"} → ${f.status}`),
                      ],
                    };
                    assert(routeError(r, x.routes));
                    x.setRoutes((old) => [...old.filter((v) => v.id !== r.id), r]);
                  })
                }
              >
                Confirm route
              </Button>
            </>
          ) : dialog === "Vehicle editor" ? (
            <form
              className="ops-fields"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const v: Vehicle = {
                    id: f.id || uid("VEH"),
                    registration: f.registration || "",
                    name: f.name || "",
                    type: f.type,
                    make: f.make || "",
                    model: f.model || "",
                    year: Number(f.year),
                    capacity: Number(f.capacity),
                    fuel: f.fuel || "",
                    ownership: f.ownership || "",
                    insurance: f.insurance || "",
                    inspection: f.inspection || "",
                    service: f.service || "",
                    nextService: f.nextService || "",
                    condition: f.condition || "",
                    status: f.status,
                    notes: f.notes || "",
                    history: [],
                  };
                  assert(!canTransport ? "Restricted role." : "");
                  assert(vehicleError(v, x.vehicles));
                  const active = x.assignments.some(
                    (a) => a.vehicle === v.id && a.status === "Active",
                  );
                  assert(
                    active && !["Available", "Assigned"].includes(v.status)
                      ? "End active assignments before maintenance, out-of-service or retirement."
                      : "",
                  );
                  setF({ ...f, id: v.id });
                  setDialog("Confirm vehicle");
                  setDirty(false);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {field("Registration number", "registration", undefined, "text", true)}
              {field("Vehicle name", "name", undefined, "text", true)}
              {field("Vehicle type", "type", ["School bus", "Minibus", "Van", "Car", "Other"])}
              {field("Make", "make")}
              {field("Model", "model")}
              {field("Year", "year", undefined, "number")}
              {field("Capacity", "capacity", undefined, "number", true)}
              {field("Fuel type", "fuel")}
              {field("Ownership / lease", "ownership")}
              {field("Insurance expiry", "insurance", undefined, "date")}
              {field("Inspection expiry", "inspection", undefined, "date")}
              {field("Last service", "service", undefined, "date")}
              {field("Next service due", "nextService", undefined, "date")}
              {field("Condition", "condition")}
              {field("Status", "status", [
                "Available",
                "Assigned",
                "Maintenance",
                "Out of service",
                "Retired",
              ])}
              {field("Notes", "notes", undefined, "textarea")}
              <Button primary type="submit">
                Review vehicle
              </Button>
            </form>
          ) : dialog === "Confirm vehicle" ? (
            <>
              <p>
                {f.name} · {f.registration} · capacity {f.capacity} · {f.status}. Expiry alerts are
                date comparisons only.
              </p>
              <Button
                primary
                disabled={!canTransport}
                onClick={() =>
                  save(() => {
                    const previous = x.vehicles.find((v) => v.id === f.id);
                    const v: Vehicle = {
                      id: f.id,
                      registration: f.registration,
                      name: f.name,
                      type: f.type,
                      make: f.make || "",
                      model: f.model || "",
                      year: Number(f.year),
                      capacity: Number(f.capacity),
                      fuel: f.fuel || "",
                      ownership: f.ownership || "",
                      insurance: f.insurance || "",
                      inspection: f.inspection || "",
                      service: f.service || "",
                      nextService: f.nextService || "",
                      condition: f.condition || "",
                      status: f.status,
                      notes: f.notes || "",
                      history: [
                        ...(previous?.history || []),
                        x.stamp(`Vehicle ${previous?.status || "New"} → ${f.status}`),
                      ],
                    };
                    assert(vehicleError(v, x.vehicles));
                    x.setVehicles((old) => [...old.filter((v) => v.id !== f.id), v]);
                  })
                }
              >
                Confirm vehicle
              </Button>
            </>
          ) : dialog === "Vehicle assignment" ? (
            <form
              className="ops-fields"
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  const a: Assignment = {
                    id: f.id || uid("ASN"),
                    route: f.route,
                    vehicle: f.vehicle,
                    driver: f.driver,
                    start: f.start,
                    end: f.end || "",
                    days: (f.days || "").split(",").filter(Boolean),
                    status: f.status,
                    notes: f.notes || "",
                    history: [],
                  };
                  assert(!canTransport ? "Restricted role." : "");
                  assert(
                    assignmentError(
                      a,
                      x.assignments,
                      x.routes,
                      x.vehicles,
                      x.workforce.staff.find((s) => s.id === a.driver)?.status === "Active",
                    ),
                  );
                  setF({ ...f, id: a.id });
                  setDialog("Confirm assignment");
                  setDirty(false);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {field(
                "Route",
                "route",
                x.routes.filter((r) => r.status === "Active").map((r) => r.id),
              )}
              {field(
                "Vehicle",
                "vehicle",
                x.vehicles
                  .filter((v) => ["Available", "Assigned"].includes(v.status))
                  .map((v) => v.id),
              )}
              {field(
                "Driver",
                "driver",
                x.workforce.staff.filter((s) => s.status === "Active").map((s) => s.id),
              )}
              {field("Effective date", "start", undefined, "date")}
              {field("Assignment end date (optional)", "end", undefined, "date")}
              {field("Days, comma separated", "days")}
              {field("Status", "status", ["Active", "Ended"])}
              {field("Notes", "notes", undefined, "textarea")}
              <p>
                Route requirement {x.routes.find((r) => r.id === f.route)?.capacity || 0}; vehicle
                capacity {x.vehicles.find((v) => v.id === f.vehicle)?.capacity || 0}.
              </p>
              <Button primary type="submit">
                Preview assignment
              </Button>
            </form>
          ) : dialog === "Confirm assignment" ? (
            <>
              <p>
                {x.routes.find((r) => r.id === f.route)?.name} ·{" "}
                {x.vehicles.find((v) => v.id === f.vehicle)?.name} ·{" "}
                {x.workforce.staff.find((s) => s.id === f.driver)?.name} · {f.start} →{" "}
                {f.end || "Open"}.
              </p>
              <p>No GPS, telematics, availability calendar or notification service.</p>
              <Button
                primary
                disabled={!canTransport}
                onClick={() =>
                  save(() => {
                    const previous = x.assignments.find((a) => a.id === f.id);
                    const a: Assignment = {
                      id: f.id,
                      route: f.route,
                      vehicle: f.vehicle,
                      driver: f.driver,
                      start: f.start,
                      end: f.end || "",
                      days: f.days.split(",").filter(Boolean),
                      status: f.status,
                      notes: f.notes || "",
                      history: [
                        ...(previous?.history || []),
                        x.stamp(`${previous?.status || "New"} → ${f.status}`),
                      ],
                    };
                    assert(
                      assignmentError(
                        a,
                        x.assignments,
                        x.routes,
                        x.vehicles,
                        x.workforce.staff.find((s) => s.id === a.driver)?.status === "Active",
                      ),
                    );
                    x.setAssignments((old) => [...old.filter((v) => v.id !== a.id), a]);
                    x.setVehicles((old) =>
                      old.map((v) => (v.id === a.vehicle ? { ...v, status: "Assigned" } : v)),
                    );
                  })
                }
              >
                Confirm assignment
              </Button>
            </>
          ) : dialog === "End assignment" ? (
            <>
              {field("End date", "date", undefined, "date", true)}
              {field("Reason", "reason", undefined, "textarea", true)}
              <Button
                danger
                disabled={!canTransport}
                onClick={() =>
                  save(() => {
                    const current = x.assignments.find((a) => a.id === f.id);
                    assert(
                      !current || current.status !== "Active" ? "Assignment is not active." : "",
                    );
                    assert(
                      !f.reason?.trim() || !f.date || f.date < current!.start
                        ? "Valid end date and reason are required."
                        : "",
                    );
                    x.setAssignments((old) =>
                      old.map((a) =>
                        a.id === f.id
                          ? {
                              ...a,
                              end: f.date,
                              status: "Ended",
                              history: [...a.history, x.stamp("Ended: " + f.reason)],
                            }
                          : a,
                      ),
                    );
                    x.setVehicles((old) =>
                      old.map((v) =>
                        v.id === current!.vehicle ? { ...v, status: "Available" } : v,
                      ),
                    );
                  })
                }
              >
                Confirm unassign
              </Button>
            </>
          ) : ["Route detail", "Vehicle detail", "Assignment detail"].includes(dialog) ? (
            <TransportDetail dialog={dialog} id={f.id} x={x} />
          ) : null}
          {error && (
            <div className="op-form-error" role="alert">
              {error}
            </div>
          )}
        </AssessmentDialog>
      )}
    </div>
  );
}
function ReferenceEditor({
  type,
  f,
  field,
  x,
  can,
  save,
  assert,
}: {
  type: string;
  f: Record<string, string>;
  field: (l: string, k: string, o?: string[], t?: string, r?: boolean) => ReactNode;
  x: ReturnType<typeof useOperations>;
  can: boolean;
  save: (fn: () => void) => void;
  assert: (s: string) => void;
}) {
  const records = type === "Category" ? x.categories : type === "Store" ? x.stores : x.suppliers;
  return (
    <form
      className="ops-fields"
      onSubmit={(e) => {
        e.preventDefault();
        save(() => {
          assert(!can ? "Restricted role." : "");
          assert(referenceError(f.name || "", f.code || "", f.id || "", records));
          if (type === "Category") {
            const v: Category = {
              id: f.id || uid("CAT"),
              name: f.name,
              code: f.code,
              description: f.description || "",
              parent: f.parent || "",
              status: f.status,
              track: f.track === "true",
              history: [x.stamp("Reference saved")],
            };
            assert(
              v.status !== "Active" &&
                x.items.some((i) => i.category === v.id && i.status === "Active")
                ? "Active items reference this category."
                : "",
            );
            x.setCategories((old) => [...old.filter((r) => r.id !== v.id), v]);
          } else if (type === "Store") {
            const v: Store = {
              id: f.id || uid("STORE"),
              name: f.name,
              code: f.code,
              location: f.location || "",
              type: f.type || "",
              responsible: f.responsible || "",
              description: f.description || "",
              status: f.status,
              history: [x.stamp("Reference saved")],
            };
            assert(
              v.status !== "Active" && x.items.some((i) => balance(x.movements, i.id, v.id) !== 0)
                ? "Resolve store stock before deactivation."
                : "",
            );
            x.setStores((old) => [...old.filter((r) => r.id !== v.id), v]);
          } else {
            const v: Supplier = {
              id: f.id || uid("SUP"),
              name: f.name,
              code: f.code,
              contact: f.contact || "",
              phone: f.phone || "",
              email: f.email || "",
              address: f.address || "",
              categories: (f.categories || "").split(",").filter(Boolean),
              terms: f.terms || "",
              status: f.status,
              notes: f.notes || "",
              history: [x.stamp("Reference saved")],
            };
            assert(
              v.status !== "Active" &&
                x.items.some((i) => i.supplier === v.id && i.status === "Active")
                ? "Active items reference this supplier."
                : "",
            );
            x.setSuppliers((old) => [...old.filter((r) => r.id !== v.id), v]);
          }
        });
      }}
    >
      {field(type + " name", "name", undefined, "text", true)}
      {field(type + " code", "code", undefined, "text", true)}
      {type === "Category" ? (
        <>
          {field("Description", "description", undefined, "textarea")}
          {field("Parent category", "parent", [
            "",
            ...x.categories.filter((c) => c.id !== f.id).map((c) => c.id),
          ])}
          {field("Stock tracking default", "track", ["true", "false"])}
        </>
      ) : type === "Store" ? (
        <>
          {field("Location", "location")}
          {field("Store type", "type", ["Central", "Department", "Specialist"])}
          {field(
            "Responsible staff",
            "responsible",
            x.workforce.staff.filter((s) => s.status === "Active").map((s) => s.id),
          )}
          {field("Description", "description", undefined, "textarea")}
        </>
      ) : (
        <>
          {field("Contact person", "contact")}
          {field("Phone", "phone")}
          {field("Email", "email", undefined, "email")}
          {field("Address", "address", undefined, "textarea")}
          {field("Supplied category IDs, comma separated", "categories")}
          {field("Payment terms", "terms")}
          {field("Notes", "notes", undefined, "textarea")}
        </>
      )}
      {field("Status", "status", ["Active", "Inactive", "Archived"])}
      <Button primary type="submit">
        Save {type.toLowerCase()}
      </Button>
    </form>
  );
}
function ReferenceDetail({
  type,
  id,
  x,
  money,
}: {
  type: string;
  id: string;
  x: ReturnType<typeof useOperations>;
  money: (n: number) => string;
}) {
  if (type === "Category") {
    const r = x.categories.find((v) => v.id === id)!;
    return (
      <>
        <strong>{r.name}</strong>
        <p>
          {r.description} · {r.status}
        </p>
        <Table
          headers={["Item", "Stock"]}
          rows={x.items
            .filter((i) => i.category === id)
            .map((i) => [i.name, balance(x.movements, i.id)])}
        />
      </>
    );
  }
  if (type === "Store") {
    const r = x.stores.find((v) => v.id === id)!;
    return (
      <>
        <strong>{r.name}</strong>
        <p>
          {r.location} · {r.status}
        </p>
        <p>
          Total estimated value{" "}
          {money(x.items.reduce((n, i) => n + balance(x.movements, i.id, id) * i.unitCost, 0))}
        </p>
        <Table
          headers={["Item", "Balance"]}
          rows={x.items
            .filter((i) => balance(x.movements, i.id, id) !== 0)
            .map((i) => [i.name, balance(x.movements, i.id, id)])}
        />
      </>
    );
  }
  const r = x.suppliers.find((v) => v.id === id)!;
  return (
    <>
      <strong>{r.name}</strong>
      <p>
        {r.contact} · {r.phone || "No phone"} · {r.email || "No email"} · {r.status}
      </p>
      <Table
        headers={["Receipt reference", "Item", "Quantity", "Date"]}
        rows={x.movements
          .filter((m) => m.kind === "Receipt" && m.party === id)
          .map((m) => [
            m.reference,
            x.items.find((i) => i.id === m.item)?.name,
            m.quantity,
            m.date,
          ])}
      />
      <p>No vendor contract or real contact action is implied.</p>
    </>
  );
}
function TransportDetail({
  dialog,
  id,
  x,
}: {
  dialog: string;
  id: string;
  x: ReturnType<typeof useOperations>;
}) {
  if (dialog === "Route detail") {
    const r = x.routes.find((v) => v.id === id)!;
    return (
      <>
        <strong>
          {r.name} · {r.code}
        </strong>
        <p>
          {r.start} → {r.stops.join(" → ")} → {r.end}
        </p>
        <p>
          {r.days.join(", ")} · {r.pickup} / {r.dropoff} · requirement {r.capacity} · {r.status}
        </p>
        <p>Schematic route only · no map or GPS.</p>
        {r.history.map((h, i) => (
          <p key={i}>{h}</p>
        ))}
      </>
    );
  }
  if (dialog === "Vehicle detail") {
    const v = x.vehicles.find((v) => v.id === id)!;
    return (
      <>
        <strong>
          {v.name} · {v.registration}
        </strong>
        <p>
          {v.type} · {v.make} {v.model} · capacity {v.capacity} · {v.status}
        </p>
        <p>
          Insurance {v.insurance || "Not configured"} · inspection{" "}
          {v.inspection || "Not configured"} · next service {v.nextService || "Not configured"}
        </p>
        <Table
          headers={["Assignment", "Route", "Period", "Status"]}
          rows={x.assignments
            .filter((a) => a.vehicle === id)
            .map((a) => [
              a.id,
              x.routes.find((r) => r.id === a.route)?.name,
              `${a.start} → ${a.end || "Open"}`,
              a.status,
            ])}
        />
      </>
    );
  }
  const a = x.assignments.find((v) => v.id === id)!;
  return (
    <>
      <strong>
        {a.id} · {a.status}
      </strong>
      <p>
        {x.routes.find((r) => r.id === a.route)?.name} ·{" "}
        {x.vehicles.find((v) => v.id === a.vehicle)?.name} ·{" "}
        {x.workforce.staff.find((s) => s.id === a.driver)?.name}
      </p>
      <p>
        {a.start} → {a.end || "Open"} · {a.days.join(", ")}
      </p>
      {a.history.map((h, i) => (
        <p key={i}>{h}</p>
      ))}
    </>
  );
}
