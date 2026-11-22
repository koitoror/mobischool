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
const route = async (name) => {
  await field("System settings workspace", name, true);
  await waitForUI(
    evaluate,
    `document.querySelector('.settings [role=heading]')?.textContent===${JSON.stringify(name)}`,
    "settings route " + name,
  );
};
const confirm = async (reason) => {
  await field("Change reason", reason);
  await click("[role=dialog] button", "Validate & preview impact");
  await click("[role=dialog] button", "Confirm configuration change");
};
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
  await waitForUI(
    evaluate,
    `!![...document.querySelectorAll('h1')].find(e=>e.getClientRects().length&&e.textContent==='School Pulse')`,
    "Pulse",
  );
  await evaluate(`document.querySelectorAll('.layer-switch>button')[2].click()`);
  await waitForUI(evaluate, `!!document.querySelector('.settings')`, "System Settings");
  await check(
    "Configuration health is source-backed",
    `document.querySelector('.settings').textContent.includes('readiness checks complete')`,
  );
  await route("School Identity");
  await click(".settings button", "Edit institutional identity");
  await field("School name", "QA Configured School");
  await field("Country", "Kenya");
  await field("Address", "Illustrative campus");
  await field("Email", "office@example.org");
  await confirm("QA institutional identity review");
  await check(
    "Identity propagates to shell",
    `document.querySelector('.institution strong').textContent==='QA Configured School'`,
  );
  await route("Academic Sessions");
  await click(".settings .settings-heading button", "Configure / add");
  await field("Session name", "QA 2026");
  await field("Session start", "2026-01-01");
  await field("Session end", "2025-01-01");
  await field("Change reason", "QA validation");
  await click("[role=dialog] button", "Validate & preview impact");
  await check(
    "Reversed session dates blocked",
    `document.querySelector('[role=alert]').textContent.includes('end')`,
  );
  await field("Session end", "2026-12-31");
  await confirm("QA draft session");
  await check(
    "Draft session is shared in registry",
    `document.querySelector('.settings tbody').textContent.includes('QA 2026')`,
  );
  await route("Payment Methods");
  await click(".settings button", "Manage method");
  await field("Active", "false", true);
  await field("Change reason", "QA history safeguard");
  await click("[role=dialog] button", "Validate & preview impact");
  await check(
    "Used method deactivation guarded",
    `document.querySelector('[role=alert]').textContent.includes('Historical')`,
  );
  await click("[role=dialog] header button", "Close");
  await click(".settings .settings-heading button", "Configure / add");
  await field("Method name", "QA Voucher");
  await field("Internal method code", "QA_VOUCHER");
  await confirm("QA new method");
  await check(
    "New payment method retained",
    `document.querySelector('.settings tbody').textContent.includes('QA Voucher')`,
  );
  await route("Users");
  await click(".settings button", "Manage account preview");
  await field("Account status", "Inactive", true);
  await field("Change reason", "QA administrator protection");
  await click("[role=dialog] button", "Validate & preview impact");
  await check(
    "Final administrator protected",
    `document.querySelector('[role=alert]').textContent.includes('final')`,
  );
  await click("[role=dialog] header button", "Close");
  await route("Grading & Assessment");
  await click(".settings .settings-heading button", "Configure / add");
  await field("Grading scheme name", "QA explicit policy");
  await field("Explicit passing grades (comma separated)", "A,B,C,D,E");
  await confirm("QA explicit school-reviewed passing labels");
  await check(
    "Published grade policy retained",
    `document.querySelector('.settings').textContent.includes('QA explicit policy')&&document.querySelector('.settings').textContent.includes('A, B, C, D, E')`,
  );
  await route("Backup Restore");
  await click(".settings button", "Create backup preview");
  await confirm("QA metadata snapshot");
  await click(".settings button", "Inspect restore preview");
  await field("Change reason", "QA restore guard");
  await click("[role=dialog] button", "Validate & preview impact");
  await check(
    "Restore requires typed acknowledgement",
    `document.querySelector('[role=alert]').textContent.includes('RESTORE SIMULATION')`,
  );
  await field("Type RESTORE SIMULATION", "RESTORE SIMULATION");
  await confirm("QA metadata-only restore simulation");
  await route("Configuration Audit History");
  await check(
    "Changes create auditable events",
    `document.querySelector('.settings tbody').textContent.includes('QA explicit school-reviewed')`,
  );
  for (const name of [
    "System Settings Overview",
    "Payment Methods",
    "Print Header Footer",
    "Backup Restore",
    "Users",
    "Custom Fields",
    "System Fields",
    "Student Profile Update",
    "Online Admission",
    "School Identity",
    "Academic Sessions",
    "Academic Structure",
    "Curriculum & Subjects",
    "Grading & Assessment",
    "Attendance Configuration",
    "Finance Configuration",
    "Communication Defaults",
    "Module Configuration",
    "Configuration Audit History",
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
  await check("No configuration runtime exceptions", JSON.stringify(exceptions.length === 0));
  console.log(JSON.stringify({ passed: checks.length, exceptions }));
} finally {
  ws.close();
}
