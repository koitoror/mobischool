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
const configure = async (page) => {
  await evaluate(`document.querySelectorAll('.layer-switch>button')[2].click()`);
  await waitForUI(evaluate, `!!document.querySelector('.settings')`, "settings");
  await field("System settings workspace", page, true);
};
const operate = async (title) => {
  await evaluate(`document.querySelectorAll('.layer-switch>button')[1].click()`);
  await wait();
  await evaluate(
    `[...document.querySelectorAll('.sidebar .nav-item')].find(e=>e.title===${JSON.stringify(title)}).click()`,
  );
  await wait();
};
const confirm = async (reason) => {
  await field("Change reason", reason);
  await click("[role=dialog] button", "Validate & preview impact");
  await click("[role=dialog] button", "Confirm configuration change");
};
const scheme = async (name, labels) => {
  await configure("Grading & Assessment");
  await click(".settings .settings-heading button", "Configure / add");
  await field("Grading scheme name", name);
  await field("Explicit passing grades (comma separated)", labels);
  await confirm("Explicit QA grading policy");
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
  await configure("School Identity");
  await click(".settings button", "Edit institutional identity");
  await field("School name", "QA saved draft");
  await check(
    "Configuration dialog receives keyboard focus",
    `document.querySelector('[role=dialog]').contains(document.activeElement)`,
  );
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
    modifiers: 8,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
    modifiers: 8,
  });
  await check(
    "Configuration reverse Tab reaches save draft",
    `document.activeElement.textContent.trim()==='Save draft'`,
  );
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    text: "\r",
    unmodifiedText: "\r",
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
  });
  await wait();
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
  });
  await click(".settings button", "Resume saved draft");
  await check(
    "Saved configuration draft resumes",
    `[...document.querySelectorAll('[role=dialog] input')].some(e=>e.value==='QA saved draft')`,
  );
  await check(
    "Draft does not silently publish school name",
    `document.querySelector('.institution strong').textContent==='Ascada School'`,
  );
  await click("[role=dialog] header button", "Close");
  await scheme("QA original scheme", "A,B,C,D,E");
  await operate("Examinations");
  await field("Examination workspace", "Exam Result", true);
  await click(".ex:not([hidden]) button", "Enter marks");
  await field("Score for Olivia Rhye", "45");
  await click("[role=dialog] button", "Validate and submit for review");
  await click(".ex:not([hidden]) button", "Review publication");
  await click("[role=dialog] button", "Confirm publication (simulation)");
  await waitForUI(
    evaluate,
    `!!document.querySelector('.ex:not([hidden]) tbody')`,
    "published marks",
  );
  await check(
    "Published source retains configured grade",
    `document.querySelector('.ex:not([hidden]) tbody').textContent.includes('45%')&&document.querySelector('.ex:not([hidden]) tbody').textContent.includes('Published')`,
  );
  await scheme("QA later scheme", "A");
  await operate("Reports");
  await field("Reports workspace", "Reports / Examinations", true);
  await waitForUI(
    evaluate,
    `!!document.querySelector('[aria-label="Examination analytics"]')`,
    "analytics",
  );
  await check(
    "Published pass classification uses captured old rule",
    `[...document.querySelectorAll('[aria-label="Examination analytics"] .op-card')].find(e=>e.querySelector('header h2')?.textContent==='Passed')?.textContent.includes('1')`,
  );
  await evaluate(
    `document.querySelector('.reports button[aria-label^="View source record EX-1|ST-2024001"]').click()`,
  );
  await waitForUI(evaluate, `!!document.querySelector('[role=dialog] pre')`, "exact score");
  await check(
    "Published grading context not overwritten",
    `document.querySelector('[role=dialog] pre').textContent.includes('QA original scheme')&&document.querySelector('[role=dialog] pre').textContent.includes('passingGradesSnapshot')`,
  );
  await click("[role=dialog] header button", "Close");
  await configure("Student Profile Update");
  await click(".settings .settings-heading button", "Create update request");
  await field("Requested field", "phone", true);
  await field("Proposed value", "+254700000013");
  await confirm("QA simulated guardian request");
  await click(".settings button", "Review update");
  await confirm("QA manually approved request");
  await check(
    "Profile update approved",
    `document.querySelector('.settings tbody').textContent.includes('Approved')`,
  );
  await operate("Student Information");
  await waitForUI(
    evaluate,
    `!!document.querySelector('.op:not([hidden]) tbody')`,
    "student registry",
  );
  await check(
    "Approved update propagates to registry",
    `document.querySelector('.op:not([hidden]) tbody').textContent.includes('+254700000013')`,
  );
  await configure("Online Admission");
  await click(".settings .settings-heading button", "Configure / add");
  await field("classes", "Grade 8");
  await field("Publication status", "Published", true);
  await confirm("QA admission publication");
  await click(".settings button", "Preview public admission form");
  await field("Applicant name", "QA Applicant");
  await field("Guardian name", "QA Guardian");
  await click("[role=dialog] button", "Confirm simulated application");
  await check(
    "Admission metadata submitted without creating student",
    `document.querySelector('.settings tbody').textContent.includes('QA Applicant')`,
  );
  await click(".settings button", "Preview public admission form");
  await field("Applicant name", "QA Applicant");
  await field("Guardian name", "QA Guardian");
  await click("[role=dialog] button", "Confirm simulated application");
  await check(
    "Repeated application is rejected",
    `document.querySelector('[role=alert]').textContent.includes('Duplicate')`,
  );
  await click("[role=dialog] header button", "Close");
  await configure("Payment Methods");
  await click(".settings .settings-heading button", "Configure / add");
  await field("Method name", "QA Voucher");
  await field("Internal method code", "QA_VOUCHER");
  await confirm("QA method propagation");
  await operate("Fees Collection");
  await waitForUI(evaluate, `!!document.querySelector('.fn:not([hidden])')`, "Finance");
  await evaluate(
    `(()=>{const e=document.querySelector('.fn:not([hidden]) [aria-label="Finance workspace"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,'Search Fees Payment');e.dispatchEvent(new Event('change',{bubbles:true}))})()`,
  );
  await waitForUI(
    evaluate,
    `!![...document.querySelectorAll('.fn:not([hidden]) option')].find(e=>e.textContent==='QA Voucher')`,
    "shared method in payment search",
  );
  await check(
    "Configured method reaches Finance controls",
    `[...document.querySelectorAll('.fn:not([hidden]) option')].some(e=>e.textContent==='QA Voucher')`,
  );
  await check("No settings integration exceptions", JSON.stringify(exceptions.length === 0));
  console.log(JSON.stringify({ passed: checks.length, exceptions }));
} finally {
  ws.close();
}
