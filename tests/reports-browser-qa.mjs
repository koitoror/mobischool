import { waitForUI } from "./ui-readiness.mjs";
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
  await waitForUI(
    evaluate,
    `!![...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.getClientRects().length&&!e.disabled&&e.textContent.trim()===${JSON.stringify(text)})`,
    "visible enabled action: " + text,
  );
  await evaluate(
    `(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.getClientRects().length&&e.textContent.trim()===${JSON.stringify(text)});if(!e)throw Error('Missing action: '+${JSON.stringify(text)});e.click()})()`,
  );
  await wait();
};
const field = async (label, value, select = false) => {
  await waitForUI(
    evaluate,
    `!![...document.querySelectorAll('label')].find(e=>e.getClientRects().length&&e.querySelector('span')?.textContent.replace('*','').trim()===${JSON.stringify(label)})?.querySelector(${JSON.stringify(select ? "select" : "input,textarea")})`,
    "labelled field: " + label,
  );
  await evaluate(
    `(()=>{const l=[...document.querySelectorAll('label')].find(e=>e.getClientRects().length&&e.querySelector('span')?.textContent.replace('*','').trim()===${JSON.stringify(label)});const e=l?.querySelector(${JSON.stringify(select ? "select" : "input,textarea")});if(!e)throw Error('Missing field: '+${JSON.stringify(label)});Object.getOwnPropertyDescriptor(e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(${JSON.stringify(select ? "change" : "input")},{bubbles:true}))})()`,
  );
  await wait();
};
const route = (name) => field("Reports workspace", name, true);
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
  await new Promise((r) => setTimeout(r, 1600));
  await evaluate(`document.querySelectorAll('.layer-switch>button')[1].click()`);
  await wait();
  await evaluate(
    `[...document.querySelectorAll('.sidebar .nav-item')].find(e=>e.title==='Reports').click()`,
  );
  await wait();
  await waitForUI(
    evaluate,
    `!!document.querySelector('.reports:not([hidden]) [role="heading"]')`,
    "Reports Overview lazy route",
  );
  await check(
    "Reporting overview",
    `document.querySelector('.reports:not([hidden])').textContent.includes('Reporting library')`,
  );
  await route("Reports / Student Information");
  await field("Search / record reference", "Olivia");
  await click(".reports:not([hidden]) button", "Apply filters");
  await check(
    "Applied search changes records",
    `document.querySelector('.reports:not([hidden]) tbody').textContent.includes('Olivia')&&!document.querySelector('.reports:not([hidden]) tbody').textContent.includes('Phoenix')`,
  );
  await click(".reports:not([hidden]) button", "Save report");
  await field("Saved report name", "QA Olivia");
  await click("[role=dialog] button", "Confirm save configuration");
  await click(".reports:not([hidden]) button", "Export preview");
  await check(
    "Export respects filtered count",
    `document.querySelector('[role=dialog]').textContent.includes('1 filtered records')`,
  );
  await click("[role=dialog] button", "Confirm simulated export");
  await click(".reports:not([hidden]) button", "Reset filters");
  await check(
    "Reset restores source rows",
    `document.querySelector('.reports:not([hidden]) tbody').textContent.includes('Phoenix')`,
  );
  await field("From date", "2025-03-01");
  await field("To date", "2025-02-01");
  await click(".reports:not([hidden]) button", "Apply filters");
  await check(
    "Reversed dates announced",
    `document.querySelector('[role=alert]').textContent.includes('Start date')`,
  );
  await click(".reports:not([hidden]) button", "Reset filters");
  await field("Search / record reference", "NO-MATCH");
  await click(".reports:not([hidden]) button", "Apply filters");
  await check(
    "Honest empty results",
    `document.querySelector('.reports:not([hidden])').textContent.includes('No matching source records')`,
  );
  await click(".reports:not([hidden]) button", "Reset filters");
  await click(".reports:not([hidden]) button", "Saved reports (1)");
  await click("[role=dialog] button", "Open configuration");
  await check(
    "Saved filters restored",
    `document.querySelector('.reports:not([hidden]) tbody').textContent.includes('Olivia')&&!document.querySelector('.reports:not([hidden]) tbody').textContent.includes('Phoenix')`,
  );
  await click(".reports:not([hidden]) button", "Reset filters");
  await route("Reports / Finance");
  await check(
    "Finance source notes",
    `document.querySelector('.reports:not([hidden])').textContent.includes('Same shared fee ledger')`,
  );
  await click(".reports:not([hidden]) button", "Access & states");
  await field("Reporting preview role", "Teacher", true);
  await click("[role=dialog] header button", "Close");
  await check(
    "Unauthorized finance blocked",
    `document.querySelector('.reports:not([hidden])').textContent.includes('does not have access')`,
  );
  await click(".reports:not([hidden]) button", "Access & states");
  await field("Reporting preview role", "School Administrator", true);
  await click("[role=dialog] header button", "Close");
  for (const name of [
    "Reports Overview",
    ...[
      "Student Information",
      "Finance",
      "Attendance",
      "Examinations",
      "Online Examinations",
      "Lesson Plan",
      "Human Resource",
      "Homework",
      "Library",
      "Inventory",
      "Transport",
      "Hostel",
      "Alumni",
      "User Log",
      "Audit Trail Report",
    ].map((n) => "Reports / " + n),
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
