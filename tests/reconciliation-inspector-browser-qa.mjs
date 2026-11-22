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
  await evaluate(`document.querySelectorAll('.layer-switch>button')[1].click()`);
  await wait();
  await evaluate(
    `[...document.querySelectorAll('.sidebar .nav-item')].find(e=>e.title==='Reports').click()`,
  );
  await waitForUI(evaluate, `!!document.querySelector('.reports')`, "Reports");
  await field("Reports workspace", "Reports / Finance", true);
  await evaluate(`document.querySelector('button[aria-label^="Explain Outstanding"]').click()`);
  await waitForUI(evaluate, `!!document.querySelector('[role=dialog]')`, "calculation");
  await click("[role=dialog] button", "Developer reconciliation");
  await check(
    "Raw-ledger expected agrees with displayed balance",
    `document.querySelector('[role=dialog]').textContent.includes('Expected 204000')&&document.querySelector('[role=dialog]').textContent.includes('difference 0.0000')&&document.querySelector('[role=dialog]').textContent.includes('status PASS')`,
  );
  await check(
    "Reference inclusion and exclusion IDs are disclosed",
    `[...document.querySelectorAll('[role=dialog] pre')].some(e=>e.textContent.includes('included')&&e.textContent.includes('excluded'))`,
  );
  await click("[role=dialog] header button", "Close");
  await click(".reports button", "Access & states");
  await field("Reporting preview role", "Auditor", true);
  await click("[role=dialog] header button", "Close");
  await evaluate(`document.querySelector('button[aria-label^="Explain Outstanding"]').click()`);
  await waitForUI(evaluate, `!!document.querySelector('[role=dialog]')`, "auditor calculation");
  await check(
    "QA inspector hidden for non-administrator preview",
    `![...document.querySelectorAll('[role=dialog] button')].some(e=>e.textContent.trim()==='Developer reconciliation')`,
  );
  await check("No reconciliation UI runtime exceptions", JSON.stringify(exceptions.length === 0));
  console.log(JSON.stringify({ passed: checks.length, sourceNavigationScenarios: 0, exceptions }));
} finally {
  ws.close();
}
