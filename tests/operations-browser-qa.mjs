// Run against the supervised preview and an agent-owned Chromium CDP session.
const tabs = await (await fetch(process.env.CDP_URL || "http://localhost:9222/json")).json();
const tab = tabs.find((t) => t.type === "page");
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map(),
  exceptions = [],
  checks = [];
ws.addEventListener("message", (e) => {
  const d = JSON.parse(e.data);
  if (d.id) {
    const p = pending.get(d.id);
    pending.delete(d.id);
    d.error ? p?.reject(Error(d.error.message)) : p?.resolve(d.result);
  }
  if (d.method === "Page.javascriptDialogOpening")
    send("Page.handleJavaScriptDialog", { accept: true });
  if (d.method === "Runtime.exceptionThrown") exceptions.push(d.params.exceptionDetails.text);
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails)
    throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result?.value;
};
const wait = () => new Promise((r) => setTimeout(r, 150));
const check = async (name, expression) => {
  if (!(await evaluate(expression))) throw Error("FAILED: " + name);
  checks.push(name);
  console.log("PASS", name);
};
const click = async (selector, text) => {
  await evaluate(
    `(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.getClientRects().length&&e.textContent.trim()===${JSON.stringify(text)});if(!e)throw Error('Missing action: '+${JSON.stringify(text)});e.click()})()`,
  );
  await wait();
};
const field = async (label, value, select = false) => {
  await evaluate(
    `(()=>{const l=[...document.querySelectorAll('label')].find(e=>e.getClientRects().length&&e.querySelector('span')?.textContent.replace('*','').trim()===${JSON.stringify(label)});const e=l?.querySelector(${JSON.stringify(select ? "select" : "input,textarea")});if(!e)throw Error('Missing field: '+${JSON.stringify(label)});Object.getOwnPropertyDescriptor(e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(${JSON.stringify(select ? "change" : "input")},{bubbles:true}))})()`,
  );
  await wait();
};
const route = (name) => field("Operations workspace", name, true);
try {
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: process.env.PREVIEW_URL || "http://localhost:3000" });
  await new Promise((r) => setTimeout(r, 1400));
  await evaluate(`document.querySelectorAll('.layer-switch>button')[1].click()`);
  await wait();
  await evaluate(
    `[...document.querySelectorAll('.sidebar .nav-item')].find(e=>e.title==='Inventory').click()`,
  );
  await wait();
  await check(
    "Inventory overview loaded",
    `document.querySelector('.ops:not([hidden])').textContent.includes('One stock ledger')`,
  );
  await route("Add Item Stock");
  await click(".ops:not([hidden]) button", "Receive stock");
  await field("Quantity received", "5");
  await field("Unique reference", "QA-RECEIPT");
  await field("Unit cost", "2.50");
  await click("[role=dialog] button", "Preview stock transaction");
  await click("[role=dialog] button", "Confirm transaction");
  await check(
    "Receipt increased stock",
    `document.querySelector('.ops:not([hidden]) tbody').textContent.includes('QA-RECEIPT')`,
  );
  await click(".ops:not([hidden]) button", "Receive stock");
  await field("Unique reference", "QA-RECEIPT");
  await click("[role=dialog] button", "Preview stock transaction");
  await check(
    "Duplicate receipt reference blocked",
    `document.querySelector('[role=alert]')?.textContent.includes('unique')`,
  );
  await click("[role=dialog] header button", "Close");
  await route("Issue Item");
  await click(".ops:not([hidden]) button", "Issue stock");
  await field("Quantity to issue", "999");
  await field("Purpose", "QA issue");
  await click("[role=dialog] button", "Preview stock issue");
  await check(
    "Insufficient issue blocked",
    `document.querySelector('[role=alert]')?.textContent.includes('Insufficient')`,
  );
  await field("Quantity to issue", "2");
  await click("[role=dialog] button", "Preview stock issue");
  await click("[role=dialog] button", "Confirm issue (simulation)");
  await check(
    "Issue ledger row created",
    `document.querySelector('.ops:not([hidden]) tbody').textContent.includes('ISSUE-')`,
  );
  await route("Add Item");
  await click(".ops:not([hidden]) button", "Add item");
  await field("Item name", "Duplicate QA item");
  await field("Item code / SKU", "EXB-A5");
  await click("[role=dialog] button", "Review item");
  await check(
    "Duplicate SKU blocked",
    `document.querySelector('[role=alert]')?.textContent.includes('SKU')`,
  );
  await click("[role=dialog] header button", "Close");
  await route("Routes");
  await click(".ops:not([hidden]) button", "Add route");
  await field("Route name", "QA route");
  await field("Route code", "QA-R");
  await field("Start point", "School");
  await field("End point", "East");
  await field("Ordered stops, one per line", "School\nEast");
  await field("Route capacity", "30");
  await click("[role=dialog] button", "Review route");
  await click("[role=dialog] button", "Confirm route");
  await check(
    "Route creation retained",
    `document.querySelector('.ops:not([hidden]) tbody').textContent.includes('QA route')`,
  );
  await route("Vehicles");
  await click(".ops:not([hidden]) button", "Add vehicle");
  await field("Registration number", "QA-VEH-1");
  await field("Vehicle name", "QA minibus");
  await field("Capacity", "20");
  await click("[role=dialog] button", "Review vehicle");
  await click("[role=dialog] button", "Confirm vehicle");
  await check(
    "Vehicle creation retained",
    `document.querySelector('.ops:not([hidden]) tbody').textContent.includes('QA-VEH-1')`,
  );
  await route("Assign Vehicle");
  await click(".ops:not([hidden]) button", "Assign vehicle");
  await field(
    "Route",
    await evaluate(`document.querySelectorAll('[role=dialog] label select')[0].options[1].value`),
    true,
  );
  await field(
    "Vehicle",
    await evaluate(`document.querySelectorAll('[role=dialog] label select')[1].options[1].value`),
    true,
  );
  await click("[role=dialog] button", "Preview assignment");
  await check(
    "Capacity mismatch blocked",
    `document.querySelector('[role=alert]')?.textContent.includes('capacity')`,
  );
  await field("Route", "ROUTE-1", true);
  await field("Vehicle", "VEH-1", true);
  await click("[role=dialog] button", "Preview assignment");
  await click("[role=dialog] button", "Confirm assignment");
  await check(
    "Valid assignment retained",
    `document.querySelector('.ops:not([hidden]) tbody').textContent.includes('Active')`,
  );
  await click(".ops:not([hidden]) button", "Unassign");
  await field("Reason", "QA completed");
  await click("[role=dialog] button", "Confirm unassign");
  await check(
    "Unassign closes assignment",
    `document.querySelector('.ops:not([hidden]) tbody').textContent.includes('Ended')`,
  );
  for (const name of [
    "Inventory",
    "Issue Item",
    "Add Item Stock",
    "Add Item",
    "Item Category",
    "Item Store",
    "Item Supplier",
    "Transport",
    "Routes",
    "Vehicles",
    "Assign Vehicle",
  ]) {
    await route(name);
    for (const width of [390, 430, 768, 1024, 1280, 1440, 1600]) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await wait();
      await check(name + " fits " + width, `document.documentElement.scrollWidth<=innerWidth+1`);
    }
  }
  await check("No runtime exceptions", JSON.stringify(exceptions.length === 0));
  console.log(JSON.stringify({ passed: checks.length, exceptions }));
} finally {
  ws.close();
}
