import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { useWorkforce } from "./WorkforceContext";
import type { Student } from "./Lifecycle";
import type {
  Category,
  Store,
  Supplier,
  Item,
  Movement,
  Route,
  Vehicle,
  Assignment,
} from "./operationsModel";
import { balance } from "./operationsModel";
function useStore(students: Student[]) {
  const workforce = useWorkforce(),
    today = "2025-02-24";
  const [categories, setCategories] = useState<Category[]>([
    {
      id: "CAT-1",
      name: "Teaching Materials",
      code: "TEACH",
      description: "Illustrative configurable category",
      parent: "",
      status: "Active",
      track: true,
      history: [],
    },
  ]);
  const [stores, setStores] = useState<Store[]>([
    {
      id: "STORE-1",
      name: "Main Store",
      code: "MAIN",
      location: "Main campus · illustrative",
      type: "Central",
      responsible: workforce.staff.find((s) => s.status === "Active")?.id || "",
      description: "Illustrative store",
      status: "Active",
      history: [],
    },
  ]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    {
      id: "SUP-1",
      name: "Illustrative School Supplier",
      code: "SAMPLE",
      contact: "Not supplied",
      phone: "",
      email: "",
      address: "",
      categories: ["CAT-1"],
      terms: "Not configured",
      status: "Active",
      notes: "No vendor contract implied",
      history: [],
    },
  ]);
  const [items, setItems] = useState<Item[]>([
    {
      id: "ITEM-1",
      name: "Exercise books",
      sku: "EXB-A5",
      category: "CAT-1",
      description: "Illustrative stock item",
      unit: "book",
      brand: "Not supplied",
      barcode: "",
      minimum: 20,
      supplier: "SUP-1",
      store: "STORE-1",
      unitCost: 250,
      track: true,
      classification: "Consumable",
      returnable: false,
      status: "Active",
      history: [],
    },
  ]);
  const [movements, renderMovements] = useState<Movement[]>([
    {
      id: "MOV-1",
      item: "ITEM-1",
      store: "STORE-1",
      kind: "Opening balance",
      quantity: 50,
      unitCost: 250,
      date: today,
      reference: "OPEN-001",
      party: "Illustrative opening balance",
      notes: "Seeded sample only",
      actor: "System sample",
      reversalOf: "",
      history: [],
    },
  ]);
  const movementRef = useRef(movements),
    setMovements = (fn: (m: Movement[]) => Movement[]) => {
      const next = fn(movementRef.current);
      movementRef.current = next;
      renderMovements(next);
    };
  const [routes, setRoutes] = useState<Route[]>([
    {
      id: "ROUTE-1",
      name: "North loop",
      code: "NORTH",
      type: "School bus",
      start: "Main campus",
      end: "North district",
      stops: ["Main campus", "Central stop", "North district"],
      pickup: "07:00",
      dropoff: "16:30",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      capacity: 20,
      students: [],
      status: "Active",
      notes: "Illustrative schematic route",
      history: [],
    },
  ]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    {
      id: "VEH-1",
      registration: "SAMPLE-001",
      name: "Illustrative minibus",
      type: "Minibus",
      make: "Not supplied",
      model: "Not supplied",
      year: 2020,
      capacity: 24,
      fuel: "Not supplied",
      ownership: "School-owned (illustrative)",
      insurance: "2025-06-30",
      inspection: "2025-05-30",
      service: "2025-01-15",
      nextService: "2025-04-15",
      condition: "Operational (illustrative)",
      status: "Available",
      notes: "No real fleet record",
      history: [],
    },
  ]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [role, setRole] = useState("Administrator");
  const stamp = (action: string) =>
    `${new Date().toISOString()} · ${role} (unauthenticated preview) · ${action}`;
  const metrics = () => ({
    items: items.filter((i) => i.status === "Active").length,
    units: items.reduce((n, i) => n + balance(movementRef.current, i.id), 0),
    value: items.reduce((n, i) => n + balance(movementRef.current, i.id) * i.unitCost, 0),
    low: items.filter((i) => {
      const q = balance(movementRef.current, i.id);
      return q > 0 && q <= i.minimum;
    }).length,
    out: items.filter((i) => balance(movementRef.current, i.id) <= 0).length,
    issues: movements.filter((m) => m.kind === "Issue" && m.date === today).length,
    vehicles: vehicles.length,
    activeVehicles: vehicles.filter((v) => ["Available", "Assigned"].includes(v.status)).length,
    maintenance: vehicles.filter((v) => v.status === "Maintenance").length,
    activeAssignments: assignments.filter((a) => a.status === "Active").length,
    conflicts: 0,
  });
  return {
    students,
    workforce,
    today,
    categories,
    setCategories,
    stores,
    setStores,
    suppliers,
    setSuppliers,
    items,
    setItems,
    movements,
    setMovements,
    routes,
    setRoutes,
    vehicles,
    setVehicles,
    assignments,
    setAssignments,
    role,
    setRole,
    stamp,
    metrics,
  };
}
const Context = createContext<ReturnType<typeof useStore> | null>(null);
export function OperationsProvider({
  students,
  children,
}: {
  students: Student[];
  children: ReactNode;
}) {
  const store = useStore(students);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useOperations() {
  const v = useContext(Context);
  if (!v) throw Error("OperationsProvider required");
  return v;
}
export function useOperationsOptional() {
  return useContext(Context);
}
