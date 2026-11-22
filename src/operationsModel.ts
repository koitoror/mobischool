export const inventoryPages = [
  "Inventory",
  "Issue Item",
  "Add Item Stock",
  "Add Item",
  "Item Category",
  "Item Store",
  "Item Supplier",
];
export const transportPages = ["Transport", "Routes", "Vehicles", "Assign Vehicle"];
export const operationsPages = [...inventoryPages, ...transportPages];
export type Category = {
  id: string;
  name: string;
  code: string;
  description: string;
  parent: string;
  status: string;
  track: boolean;
  history: string[];
};
export type Store = {
  id: string;
  name: string;
  code: string;
  location: string;
  type: string;
  responsible: string;
  description: string;
  status: string;
  history: string[];
};
export type Supplier = {
  id: string;
  name: string;
  code: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  categories: string[];
  terms: string;
  status: string;
  notes: string;
  history: string[];
};
export type Item = {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  unit: string;
  brand: string;
  barcode: string;
  minimum: number;
  supplier: string;
  store: string;
  unitCost: number;
  track: boolean;
  classification: string;
  returnable: boolean;
  status: string;
  history: string[];
};
export type Movement = {
  id: string;
  item: string;
  store: string;
  kind: string;
  quantity: number;
  unitCost: number;
  date: string;
  reference: string;
  party: string;
  notes: string;
  actor: string;
  reversalOf: string;
  history: string[];
};
export type Route = {
  id: string;
  name: string;
  code: string;
  type: string;
  start: string;
  end: string;
  stops: string[];
  pickup: string;
  dropoff: string;
  days: string[];
  capacity: number;
  students: string[];
  status: string;
  notes: string;
  history: string[];
};
export type Vehicle = {
  id: string;
  registration: string;
  name: string;
  type: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  fuel: string;
  ownership: string;
  insurance: string;
  inspection: string;
  service: string;
  nextService: string;
  condition: string;
  status: string;
  notes: string;
  history: string[];
};
export type Assignment = {
  id: string;
  route: string;
  vehicle: string;
  driver: string;
  start: string;
  end: string;
  days: string[];
  status: string;
  notes: string;
  history: string[];
};
export function isoDate(v: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v
  );
}
export function balance(movements: Movement[], item: string, store?: string) {
  return movements
    .filter((m) => m.item === item && (!store || m.store === store))
    .reduce((n, m) => n + m.quantity, 0);
}
export function movementError(m: Movement, movements: Movement[], items: Item[], stores: Store[]) {
  const item = items.find((i) => i.id === m.item),
    store = stores.find((s) => s.id === m.store);
  if (!item || item.status !== "Active") return "Choose an active inventory item.";
  if (!store || store.status !== "Active") return "Choose an active store.";
  if (!Number.isSafeInteger(m.quantity) || m.quantity === 0)
    return "Quantity must be a non-zero whole number.";
  if (!isoDate(m.date)) return "Choose a valid transaction date.";
  if (
    !m.reference.trim() ||
    movements.some(
      (v) => v.id !== m.id && v.reference.toLowerCase() === m.reference.trim().toLowerCase(),
    )
  )
    return "A unique transaction reference is required.";
  if (m.kind === "Issue" && m.quantity >= 0) return "Issue movement must reduce stock.";
  if (m.kind === "Receipt" && m.quantity <= 0) return "Receipt movement must increase stock.";
  if (m.kind === "Adjustment" && !m.notes.trim()) return "Adjustment reason is required.";
  if (balance(movements, m.item, m.store) + m.quantity < 0)
    return "Insufficient stock. This transaction would create a negative balance.";
  if (!Number.isSafeInteger(m.unitCost) || m.unitCost < 0)
    return "Unit cost must be a non-negative minor-unit amount.";
  return "";
}
export function itemError(item: Item, items: Item[], movements: Movement[]) {
  if (!item.name.trim() || !item.sku.trim() || !item.category || !item.store || !item.unit.trim())
    return "Name, unique SKU, category, default store and unit are required.";
  if (items.some((i) => i.id !== item.id && i.sku.toLowerCase() === item.sku.toLowerCase()))
    return "SKU already exists.";
  if (
    item.barcode &&
    items.some((i) => i.id !== item.id && i.barcode.toLowerCase() === item.barcode.toLowerCase())
  )
    return "Barcode already exists.";
  if (
    !Number.isSafeInteger(item.minimum) ||
    item.minimum < 0 ||
    !Number.isSafeInteger(item.unitCost) ||
    item.unitCost < 0
  )
    return "Reorder level and unit value must be non-negative whole minor-unit values.";
  if (item.status === "Archived" && balance(movements, item.id) !== 0)
    return "Resolve stock to zero before archiving this item.";
  return "";
}
export function referenceError(
  name: string,
  code: string,
  id: string,
  records: { id: string; name: string; code: string }[],
) {
  if (!name.trim() || !code.trim()) return "Name and code are required.";
  if (
    records.some(
      (r) =>
        r.id !== id &&
        (r.name.toLowerCase() === name.toLowerCase() ||
          r.code.toLowerCase() === code.toLowerCase()),
    )
  )
    return "Name or code already exists.";
  return "";
}
export function routeError(route: Route, routes: Route[]) {
  if (!route.name.trim() || !route.code.trim() || !route.start.trim() || !route.end.trim())
    return "Name, unique code, start and end points are required.";
  if (routes.some((r) => r.id !== route.id && r.code.toLowerCase() === route.code.toLowerCase()))
    return "Route code already exists.";
  if (!route.stops.length || route.stops.some((s) => !s.trim()))
    return "Add at least one valid ordered stop.";
  if (!Number.isInteger(route.capacity) || route.capacity < 0)
    return "Capacity must be a non-negative whole number.";
  if (!route.days.length) return "Select at least one operating day.";
  return "";
}
export function vehicleError(vehicle: Vehicle, vehicles: Vehicle[]) {
  if (!vehicle.registration.trim() || !vehicle.name.trim() || !vehicle.type)
    return "Registration, vehicle name and type are required.";
  if (
    vehicles.some(
      (v) =>
        v.id !== vehicle.id && v.registration.toLowerCase() === vehicle.registration.toLowerCase(),
    )
  )
    return "Vehicle registration already exists.";
  if (!Number.isInteger(vehicle.capacity) || vehicle.capacity < 1)
    return "Vehicle capacity must be at least one.";
  for (const date of [vehicle.insurance, vehicle.inspection, vehicle.nextService])
    if (date && !isoDate(date)) return "Insurance, inspection and service dates must be valid.";
  return "";
}
export function assignmentError(
  input: Assignment,
  assignments: Assignment[],
  routes: Route[],
  vehicles: Vehicle[],
  driverActive: boolean,
) {
  const route = routes.find((r) => r.id === input.route),
    vehicle = vehicles.find((v) => v.id === input.vehicle);
  if (!route || route.status !== "Active") return "Choose an active route.";
  if (!vehicle || !["Available", "Assigned"].includes(vehicle.status))
    return "Choose an available vehicle that is not in maintenance or retired.";
  if (vehicle.capacity < route.capacity)
    return `Vehicle capacity ${vehicle.capacity} is below route requirement ${route.capacity}.`;
  if (!driverActive) return "Choose an active staff driver.";
  if (
    !isoDate(input.start) ||
    (input.end && !isoDate(input.end)) ||
    (input.end && input.start > input.end)
  )
    return "Choose a valid assignment period.";
  if (!input.days.length) return "Select operating days.";
  const conflict = assignments.find(
    (a) =>
      a.id !== input.id &&
      a.status === "Active" &&
      a.start <= (input.end || "9999-12-31") &&
      input.start <= (a.end || "9999-12-31") &&
      a.days.some((d) => input.days.includes(d)) &&
      (a.vehicle === input.vehicle || a.driver === input.driver || a.route === input.route),
  );
  return conflict
    ? `Assignment conflict with ${conflict.id}: route, vehicle or driver overlaps.`
    : "";
}
