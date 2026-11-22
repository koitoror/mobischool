import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkforceProvider } from "../src/WorkforceContext";
import { FinanceProvider } from "../src/FinanceContext";
import { OperationsProvider } from "../src/OperationsContext";
import Operations from "../src/Operations";
import {
  operationsPages,
  balance,
  movementError,
  itemError,
  referenceError,
  routeError,
  vehicleError,
  assignmentError,
  type Item,
  type Store,
  type Movement,
  type Route,
  type Vehicle,
  type Assignment,
} from "../src/operationsModel";
const item: Item = {
  id: "I",
  name: "Paper",
  sku: "PAPER",
  category: "C",
  description: "",
  unit: "pack",
  brand: "",
  barcode: "",
  minimum: 2,
  supplier: "",
  store: "S",
  unitCost: 100,
  track: true,
  classification: "Consumable",
  returnable: false,
  status: "Active",
  history: [],
};
const store: Store = {
  id: "S",
  name: "Main",
  code: "MAIN",
  location: "",
  type: "",
  responsible: "",
  description: "",
  status: "Active",
  history: [],
};
const opening: Movement = {
  id: "M1",
  item: "I",
  store: "S",
  kind: "Opening balance",
  quantity: 5,
  unitCost: 100,
  date: "2025-02-24",
  reference: "OPEN",
  party: "",
  notes: "",
  actor: "",
  reversalOf: "",
  history: [],
};
const move = (patch: Partial<Movement> = {}): Movement => ({
  ...opening,
  id: "M2",
  kind: "Issue",
  quantity: -2,
  reference: "ISSUE",
  ...patch,
});
test("ledger receipt and issue reconcile without negative stock", () => {
  const receipt = move({ kind: "Receipt", quantity: 3, reference: "R" }),
    issue = move();
  assert.equal(movementError(receipt, [opening], [item], [store]), "");
  assert.equal(movementError(issue, [opening, receipt], [item], [store]), "");
  assert.equal(balance([opening, receipt, issue], "I", "S"), 6);
  assert.match(movementError(move({ quantity: -6 }), [opening], [item], [store]), /Insufficient/);
});
test("duplicate transaction reference and adjustment reason blocked", () => {
  assert.match(movementError(move({ reference: "open" }), [opening], [item], [store]), /unique/);
  assert.match(
    movementError(
      move({ kind: "Adjustment", quantity: -1, notes: "" }),
      [opening],
      [item],
      [store],
    ),
    /reason/,
  );
});
test("inactive store and archived item reject movement", () => {
  assert.match(
    movementError(move(), [opening], [{ ...item, status: "Archived" }], [store]),
    /active inventory/,
  );
  assert.match(
    movementError(move(), [opening], [item], [{ ...store, status: "Inactive" }]),
    /active store/,
  );
});
test("SKU barcode uniqueness and stock-aware archive work", () => {
  assert.match(itemError({ ...item, id: "N" }, [item], [opening]), /SKU/);
  assert.match(
    itemError(
      { ...item, id: "N", sku: "N", barcode: "X" },
      [item, { ...item, id: "B", sku: "B", barcode: "X" }],
      [opening],
    ),
    /Barcode/,
  );
  assert.match(itemError({ ...item, status: "Archived" }, [item], [opening]), /zero/);
});
test("reference duplicate detection", () =>
  assert.match(referenceError("main", "OTHER", "N", [store]), /exists/));
const route: Route = {
  id: "R",
  name: "North",
  code: "N",
  type: "School bus",
  start: "School",
  end: "North",
  stops: ["School", "North"],
  pickup: "",
  dropoff: "",
  days: ["Monday"],
  capacity: 10,
  students: [],
  status: "Active",
  notes: "",
  history: [],
};
const vehicle: Vehicle = {
  id: "V",
  registration: "REG",
  name: "Bus",
  type: "School bus",
  make: "",
  model: "",
  year: 2020,
  capacity: 12,
  fuel: "",
  ownership: "",
  insurance: "",
  inspection: "",
  service: "",
  nextService: "",
  condition: "",
  status: "Available",
  notes: "",
  history: [],
};
const assignment: Assignment = {
  id: "A",
  route: "R",
  vehicle: "V",
  driver: "D",
  start: "2025-02-24",
  end: "",
  days: ["Monday"],
  status: "Active",
  notes: "",
  history: [],
};
test("route requires ordered stops, days and unique code", () => {
  assert.equal(routeError(route, []), "");
  assert.match(routeError({ ...route, id: "N" }, [route]), /code/);
  assert.match(routeError({ ...route, stops: [] }, []), /stop/);
});
test("vehicle registration capacity and dates validated", () => {
  assert.equal(vehicleError(vehicle, []), "");
  assert.match(vehicleError({ ...vehicle, id: "N" }, [vehicle]), /registration/);
  assert.match(vehicleError({ ...vehicle, capacity: 0 }, []), /capacity/);
  assert.match(vehicleError({ ...vehicle, inspection: "2025-02-30" }, []), /dates/);
});
test("assignment checks capacity status driver and overlap", () => {
  assert.equal(assignmentError(assignment, [], [route], [vehicle], true), "");
  assert.match(
    assignmentError(assignment, [], [route], [{ ...vehicle, capacity: 9 }], true),
    /below/,
  );
  assert.match(
    assignmentError(assignment, [], [route], [{ ...vehicle, status: "Maintenance" }], true),
    /available/,
  );
  assert.match(assignmentError(assignment, [], [route], [vehicle], false), /driver/);
  assert.match(
    assignmentError({ ...assignment, id: "B" }, [assignment], [route], [vehicle], true),
    /conflict/,
  );
});
test("adjacent non-overlapping assignment periods accepted", () =>
  assert.equal(
    assignmentError(
      { ...assignment, id: "B", start: "2025-03-01" },
      [{ ...assignment, end: "2025-02-28" }],
      [route],
      [vehicle],
      true,
    ),
    "",
  ));
const students = [
  {
    id: "ST",
    name: "Sample Student",
    grade: "Grade 8",
    section: "A",
    guardian: "",
    phone: "",
    date: "",
    status: "Active",
  },
];
for (const page of operationsPages)
  test("renders operational route " + page, () => {
    const html = renderToStaticMarkup(
      h(WorkforceProvider, {
        children: h(FinanceProvider, {
          ids: ["ST"],
          session: "2024 – 2025",
          children: h(OperationsProvider, {
            students,
            children: h(Operations, {
              page,
              active: true,
              school: "Sample School",
              navigate: () => {},
              onDirty: () => {},
              notify: () => {},
            }),
          }),
        }),
      }),
    );
    assert.ok(html.includes("Illustrative Data"));
    assert.ok(!html.includes("NaN"));
    assert.ok(html.includes("Operations workspace"));
  });
