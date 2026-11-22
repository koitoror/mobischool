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
const module = async (title) => {
  await evaluate(
    `[...document.querySelectorAll('.sidebar .nav-item')].find(e=>e.title===${JSON.stringify(title)}).click()`,
  );
  await wait();
};
const route = async (name) => {
  await field("Reports workspace", name, true);
  await waitForUI(
    evaluate,
    `!!document.querySelector('.reports:not([hidden]) [role=heading]')`,
    "report heading",
  );
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
  await module("Reports");
  await waitForUI(evaluate, `!!document.querySelector('.reports')`, "reports");
  await route("Reports / Examinations");
  await check(
    "Eligible scope rendered without invented marks",
    `document.querySelector('[aria-label="Examination analytics"]').textContent.includes('Missing Marks')`,
  );
  await click('[aria-label="Examination analytics"] button', "Missing marks");
  await check(
    "Missing register says not entered",
    `document.querySelector('[aria-label="Examination analytics"] tbody').textContent.includes('Not entered')`,
  );
  await click('[aria-label="Examination analytics"] button', "Inspect assessment Olivia Rhye");
  await check(
    "Exact assessment source ID",
    `document.querySelector('[aria-label="Exact assessment source"]').textContent.includes('EX-1|ST-2024001')`,
  );
  await click("[role=dialog] button", "Open exact exam marks context");
  await waitForUI(evaluate, `!!document.querySelector('.ex:not([hidden])')`, "exact exam source");
  await click(".ex:not([hidden]) button", "Enter marks");
  await field("Score for Olivia Rhye", "0");
  await click("[role=dialog] button", "Save draft marks");
  await module("Reports");
  await route("Reports / Examinations");
  await click('[aria-label="Examination analytics"] button', "Missing marks");
  await check(
    "Explicit zero is complete, not missing",
    `document.querySelector('[aria-label="Examination analytics"] tbody').textContent.includes('0 / Draft')&&document.querySelector('[aria-label="Examination analytics"] tbody').textContent.includes('Complete')`,
  );
  await click('[aria-label="Examination analytics"] button', "Pass / fail");
  await check(
    "No invented pass threshold",
    `document.querySelector('[aria-label="Examination analytics"]').textContent.includes('Actual classifiable denominator: 0')`,
  );
  for (const tab of ["Overview", "Missing marks", "Pass / fail", "Subjects", "Classes"]) {
    await click('[aria-label="Examination analytics"] button', tab);
    for (const width of [390, 430, 768, 1024, 1280, 1440, 1600]) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await wait();
      await check(tab + " fits " + width, `document.documentElement.scrollWidth<=innerWidth+1`);
    }
  }
  await send("Accessibility.enable");
  const tree = await send("Accessibility.getFullAXTree");
  await check(
    "AX tree exposes examination controls",
    JSON.stringify(
      tree.nodes.some((n) => n.name?.value === "Exam group") &&
        tree.nodes.some((n) => n.name?.value === "Result context"),
    ),
  );
  await route("Reports / Finance");
  await evaluate(`document.querySelector('button[aria-label^="Explain Outstanding"]').click()`);
  await waitForUI(
    evaluate,
    `!!document.querySelector('[aria-label="Calculation & contributing records"]')`,
    "contributors",
  );
  await check(
    "Outstanding contributor set excludes payments",
    `[...document.querySelectorAll('[role=dialog] tbody tr')].every(r=>r.textContent.includes('Fee obligation'))`,
  );
  await check(
    "Calculation filters are disclosed",
    `document.querySelector('[role=dialog]').textContent.includes('"session"')`,
  );
  await click("[role=dialog] button", "View source record");
  await check(
    "Inspector resolves exact obligation and allocations",
    `document.querySelector('[role=dialog] pre').textContent.includes('Fee obligation')&&document.querySelector('[role=dialog] pre').textContent.includes('outstanding')`,
  );
  await click("[role=dialog] header button", "Close");
  await field("From date", "2025-04-01");
  await field("To date", "2025-01-01");
  await click(".reports:not([hidden]) button", "Apply filters");
  await check(
    "Date validation associated with inputs",
    `[...document.querySelectorAll('.reports input[type=date]')].every(e=>e.getAttribute('aria-invalid')==='true'&&!!document.getElementById(e.getAttribute('aria-describedby')))`,
  );
  await click(".reports:not([hidden]) button", "Reset filters");
  const contrast = await evaluate(
    `(()=>{const rgb=s=>s.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});const l=s=>{const c=rgb(s);return .2126*c[0]+.7152*c[1]+.0722*c[2]};const e=document.querySelector('.reports .op-primary'),s=getComputedStyle(e),a=l(s.color),b=l(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)})()`,
  );
  await check("Report primary action text contrast >=4.5", JSON.stringify(contrast >= 4.5));
  await check("No closure runtime exceptions", JSON.stringify(exceptions.length === 0));
  console.log(JSON.stringify({ passed: checks.length, contrast, exceptions }));
} finally {
  ws.close();
}
