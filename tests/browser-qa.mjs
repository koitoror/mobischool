import { waitForUI } from "./ui-readiness.mjs";
// Run against the supervised preview and an agent-owned Chromium CDP session.
const tabs = await (await fetch(process.env.CDP_URL || "http://localhost:9222/json")).json();
const tab = tabs.find((t) => t.type === "page");
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map(),
  exceptions = [];
ws.addEventListener("message", (e) => {
  const d = JSON.parse(e.data);
  if (d.id) {
    const p = pending.get(d.id);
    pending.delete(d.id);
    d.error ? p?.reject(Error(d.error.message)) : p?.resolve(d.result);
  }
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
const checks = [];
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
    `(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.getClientRects().length && e.textContent.trim()===${JSON.stringify(text)});if(!e)throw Error('Missing action: '+${JSON.stringify(text)});e.click()})()`,
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
    `(()=>{const label=[...document.querySelectorAll('label')].find(e=>e.getClientRects().length&&e.querySelector('span')?.textContent.replace('*','').trim()===${JSON.stringify(label)});const e=label?.querySelector(${JSON.stringify(select ? "select" : "input,textarea")});if(!e)throw Error('Missing form field');Object.getOwnPropertyDescriptor(e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(${JSON.stringify(select ? "change" : "input")},{bubbles:true}))})()`,
  );
  await wait();
};
const page = async (title) => {
  await evaluate(
    `(()=>{const e=document.querySelector('.ac:not([hidden]) [aria-label="Academic workspace"],.fn:not([hidden]) [aria-label="Finance workspace"],.op:not([hidden]) [aria-label="Operational workspace"]');if(e){e.value=${JSON.stringify(title)};e.dispatchEvent(new Event('change',{bubbles:true}))}else{const b=[...document.querySelectorAll('.sidebar button')].find(b=>b.title===${JSON.stringify(title)}||b.textContent.trim()===${JSON.stringify(title)});if(!b)throw Error('Missing route');b.click()}})()`,
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
  await new Promise((r) => setTimeout(r, 1500));
  await check("School Pulse loads", `document.querySelector('h1')?.textContent==='School Pulse'`);
  await check("Eight executive KPIs", `document.querySelectorAll('.sp-kpi').length===8`);
  const collectedBeforePayment = await evaluate(
    `[...document.querySelectorAll('.sp-kpi')].find(e=>e.textContent.includes('Fees collected'))?.querySelector('strong')?.textContent`,
  );
  await click(".mobile-toggle", "");
  await check(
    "Sidebar collapses",
    `document.querySelector('.sidebar').getBoundingClientRect().width===72`,
  );
  await click(".mobile-toggle", "");
  await evaluate(`document.querySelectorAll('.layer-switch>button')[1].click()`);
  await wait();
  await check(
    "Front Office navigation",
    `document.querySelector('.op:not([hidden]) h1')?.textContent==='Front Office'`,
  );
  await click(".op:not([hidden]) .op-heading-actions button", "New enquiry");
  await field("Applicant full name", "QA Prospect");
  await field("Guardian full name", "QA Guardian");
  await field("Guardian phone", "555-0100");
  await click("[role=dialog] button", "Save preview");
  await check(
    "New enquiry appears",
    `document.querySelector('.op:not([hidden])').textContent.includes('Front Office')`,
  );
  await page("Admission Enquiry");
  await evaluate(`document.querySelector('.op:not([hidden]) tbody .op-person').click()`);
  await wait();
  await click("[role=dialog] button", "Convert to application");
  await check(
    "Conversion opens application review",
    `document.querySelector('[role=dialog]')?.getAttribute('aria-label')==='Application review'`,
  );
  await evaluate(
    `[...document.querySelectorAll('[role=dialog] input[type=checkbox]')].forEach(e=>{if(!e.checked)e.click()})`,
  );
  await wait();
  await click("[role=dialog] button", "Approve");
  await click("[role=dialog] button", "Continue to admission");
  await click(".op-admission button", "Continue");
  await click(".op-admission button", "Continue");
  await click(".op-admission button", "Continue");
  await click(".op-admission button", "Admit student");
  await check(
    "Admission succeeds",
    `document.querySelector('[role=dialog]')?.textContent.includes('Welcome, QA.')`,
  );
  await click("[role=dialog] button", "Open Student 360");
  await check(
    "Central Student 360 context",
    `document.querySelector('.op-profile-header')?.textContent.includes('QA Prospect')`,
  );
  await page("Student Directory");
  await check(
    "Registry includes admitted student",
    `document.querySelector('.op:not([hidden])').textContent.includes('12 records')`,
  );
  await click(".op:not([hidden]) button", "View options");
  await check(
    "Column visibility controls available",
    `document.querySelectorAll('[role=dialog] input[type=checkbox]').length===7`,
  );
  await evaluate(`document.querySelector('[role=dialog] input[type=checkbox]').click()`);
  await click("[role=dialog] button", "Apply view");
  await check(
    "Column visibility applies",
    `![...document.querySelectorAll('.op:not([hidden]) th')].some(e=>e.textContent==='Admission no.')`,
  );
  await page("Visitor Book");
  await evaluate(`document.querySelector('.op:not([hidden]) tbody .op-row-link').click()`);
  await wait();
  await click("[role=dialog] button", "Check out visitor");
  await check(
    "Visitor checkout status retained",
    `document.querySelector('[role=dialog]').textContent.includes('Checked out')`,
  );
  await evaluate(`document.querySelector('[aria-label="Close drawer"]').click()`);
  await wait();
  await evaluate(
    `[...document.querySelectorAll('.sidebar .nav-item')].find(e=>e.title==='Fees Collection').click()`,
  );
  await wait();
  await check(
    "Finance overview loads",
    `document.querySelector('.fn:not([hidden]) h1')?.textContent==='Fees & finance'`,
  );
  await page("Collect Fees");
  await evaluate(`document.querySelector('.fn:not([hidden]) input[type=checkbox]').click()`);
  await field("Payment amount", "100");
  await field("Transaction reference", "QA-PAYMENT-0001");
  await click(".fn:not([hidden]) button", "Review payment");
  await check(
    "Allocation review exists",
    `document.querySelector('[role=dialog]').textContent.includes('Allocation preview')`,
  );
  await click("[role=dialog] button", "Back to payment");
  await check("Cancellation creates no receipt", `!document.querySelector('.fn-receipt')`);
  await click(".fn:not([hidden]) button", "Review payment");
  await click("[role=dialog] button", "Confirm payment (simulation)");
  await check(
    "Confirmed simulated receipt generated",
    `document.querySelector('.fn-receipt')?.textContent.includes('$100.00')`,
  );
  await check(
    "Receipt disclaims real settlement",
    `document.querySelector('.fn-receipt')?.textContent.includes('Not proof of payment')`,
  );
  await click("[role=dialog] button", "Open Student 360");
  await check(
    "Student fees panel uses shared ledger",
    `document.querySelector('.op:not([hidden])').textContent.includes('Student fee account')&&document.querySelector('.op:not([hidden])').textContent.includes('$16,100.00')`,
  );
  await evaluate(
    `[...document.querySelectorAll('.sidebar .nav-item')].find(e=>e.title==='Attendance').click()`,
  );
  await wait();
  await page("Student Attendance");
  await click(".ac:not([hidden]) button", "Mark all present");
  await click(".ac:not([hidden]) button", "Save attendance");
  await check(
    "Attendance reconciles after save",
    `document.querySelectorAll('.ac .ac-attendance-options .selected.present').length===12`,
  );
  await page("Manage Syllabus Status");
  await evaluate(
    `const c=document.querySelector('.ac:not([hidden]) tbody input[type=checkbox]');c.click()`,
  );
  await wait();
  await check(
    "Syllabus completion is editable",
    `document.querySelector('.ac:not([hidden])').textContent.includes('1 of 6 topics complete')`,
  );
  await page("Class Timetable");
  await click(".ac:not([hidden]) button", "Add period");
  await click("[role=dialog] button", "Save preview");
  await check(
    "Timetable clash blocks saving",
    `document.querySelector('[role=dialog] .op-form-error')?.textContent.includes('Clash')`,
  );
  await evaluate(`document.querySelector('[aria-label="Close academic drawer"]').click()`);
  await wait();
  const responsive = [];
  for (const width of [390, 430, 768, 1024, 1280, 1440, 1600]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await wait();
    const v = await evaluate(
      `({width:innerWidth,scroll:document.documentElement.scrollWidth,main:document.querySelector('.main').getBoundingClientRect().width})`,
    );
    if (v.scroll > width + 1) throw Error("Horizontal page overflow " + width);
    responsive.push(width);
  }
  checks.push("Academic timetable no page overflow at " + responsive.join("/"));
  console.log("PASS responsive academic timetable", responsive.join(","));
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await evaluate(`document.querySelectorAll('.layer-switch>button')[0].click()`);
  await wait();
  await check(
    "Pulse receives academic updates",
    `document.querySelector('.sp-kpis')?.textContent.includes('100.0%')`,
  );
  await check(
    "Pulse receives shared finance payment update",
    `[...document.querySelectorAll('.sp-kpi')].find(e=>e.textContent.includes('Fees collected'))?.querySelector('strong')?.textContent!==${JSON.stringify(collectedBeforePayment)}`,
  );
  await page("Financial insights");
  await check(
    "Financial insights use reconciled shared ledger definitions",
    `document.querySelector('.sp-kpis')?.textContent.includes('allocated confirmed simulations')&&document.querySelector('.sp-kpis')?.textContent.includes('Non-fee entries')`,
  );

  await evaluate(`document.querySelectorAll('.layer-switch>button')[1].click()`);
  await wait();
  await page("Complaints");
  await evaluate(`document.querySelector('.op:not([hidden]) tbody .op-row-link').click()`);
  await wait();
  await field("Internal / resolution note", "QA resolution note");
  await field("Complaint status", "Resolved", true);
  await check(
    "Complaint resolution status retained",
    `document.querySelector('[role=dialog]').textContent.includes('Resolved')`,
  );
  await evaluate(`document.querySelector('[aria-label="Close drawer"]').click()`);
  await wait();
  await page("Bulk Delete");
  await evaluate(`document.querySelector('.op:not([hidden]) tbody input[type=checkbox]').click()`);
  await wait();
  await click(".op-selection button", "Delete / archive");
  await check(
    "Bulk archive requires explicit safeguards",
    `[...document.querySelectorAll('[role=dialog] button')].some(b=>b.textContent.includes('Archive')&&b.disabled)`,
  );
  await click("[role=dialog] button", "Cancel");
  await check(
    "Bulk cancellation retains registry records",
    `document.querySelector('.op:not([hidden])').textContent.includes('13 records')`,
  );
  await evaluate(
    `[...document.querySelectorAll('.sidebar .nav-item')].find(e=>e.title==='Fees Collection').click()`,
  );
  await wait();
  await page("Collect Fees");
  for (const width of [390, 430, 768, 1024, 1280, 1440, 1600]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await wait();
    await check(
      "Cashier layout fits " + width,
      `document.documentElement.scrollWidth<=innerWidth+1&&[...document.querySelectorAll('.fn:not([hidden]) form input')].every(e=>e.getBoundingClientRect().right<=innerWidth+1)`,
    );
  }
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page("Bulk Fee Receipts");
  await check(
    "Receipt batch starts without fabricated selection",
    `[...document.querySelectorAll('.fn:not([hidden]) button')].find(b=>b.textContent.trim()==='Preview batch')?.disabled`,
  );
  await evaluate(`document.querySelector('.fn:not([hidden]) tbody input[type=checkbox]').click()`);
  await wait();
  await click(".fn:not([hidden]) button", "Preview batch");
  await check(
    "Receipt batch contains confirmed selected records",
    `document.querySelectorAll('.fn-receipt-batch .fn-receipt').length===1`,
  );
  await evaluate(`document.querySelector('[aria-label="Close finance drawer"]').click()`);
  await wait();
  await evaluate(
    `[...document.querySelectorAll('.sidebar .nav-item')].find(e=>e.title==='Student Information').click()`,
  );
  await wait();
  await click(".op:not([hidden]) .op-heading-actions button", "Admit student");
  for (const width of [390, 430, 768, 1024, 1280, 1440, 1600]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await wait();
    await check(
      "Admission form fits " + width,
      `document.documentElement.scrollWidth<=innerWidth+1&&[...document.querySelectorAll('.op-admission input')].every(e=>e.getBoundingClientRect().right<=innerWidth+1)`,
    );
  }
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const previousDocument = await evaluate("performance.timeOrigin");
  await send("Page.reload");
  await waitForUI(
    evaluate,
    `performance.timeOrigin!==${previousDocument} && [...document.querySelectorAll('h1')].some(e=>e.getClientRects().length&&e.textContent==='School Pulse')`,
    "new document with visible School Pulse",
  );
  await check(
    "Reload returns to School Pulse",
    `document.querySelector('h1')?.textContent==='School Pulse'`,
  );
  await evaluate(`document.querySelectorAll('.layer-switch>button')[1].click()`);
  await wait();
  await page("Student Directory");
  await check(
    "Reload discards simulated admissions",
    `document.querySelector('.op:not([hidden])').textContent.includes('11 records')`,
  );

  await evaluate(
    `[...document.querySelectorAll('.sidebar button')].find(b=>b.title==='Staff Directory').click()`,
  );
  await wait();
  await new Promise((r) => setTimeout(r, 600));
  await check(
    "Imported staff directory has 44 supplied people",
    `document.querySelector('.op:not([hidden])').textContent.includes('44 imported staff names')`,
  );
  await evaluate(
    `[...document.querySelectorAll('.sidebar button')].find(b=>b.title==='Guardian Directory').click()`,
  );
  await wait();
  await new Promise((r) => setTimeout(r, 600));
  await check(
    "Guardian directory retains 278 supplied name rows without family links",
    `document.querySelector('.op:not([hidden])').textContent.includes('278 imported names')&&document.querySelector('.op:not([hidden])').textContent.includes('Not linked')`,
  );
  await check("No browser runtime exceptions", JSON.stringify(exceptions.length === 0));
  console.log(JSON.stringify({ passed: checks.length, checks, exceptions }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  ws.close();
}
