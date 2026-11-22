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
  await evaluate(
    `(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.getClientRects().length && e.textContent.trim()===${JSON.stringify(text)});if(!e)throw Error('Missing action: '+${JSON.stringify(text)});e.click()})()`,
  );
  await wait();
};
const field = async (label, value, select = false) => {
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

const route = async (name) => {
  await evaluate(
    `(()=>{const e=document.querySelector('.wf:not([hidden]) [aria-label="Workforce workspace"]');e.value=${JSON.stringify(name)};e.dispatchEvent(new Event('change',{bubbles:true}))})()`,
  );
  await wait();
};
const search = async (value) => {
  await evaluate(
    `(()=>{const e=document.querySelector('.wf:not([hidden]) [aria-label="Search workforce records"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`,
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
  await new Promise((r) => setTimeout(r, 1200));
  await evaluate(`document.querySelectorAll('.layer-switch>button')[1].click()`);
  await wait();
  await evaluate(
    `[...document.querySelectorAll('.sidebar .nav-item')].find(b=>b.title==='Human Resource').click()`,
  );
  await new Promise((r) => setTimeout(r, 500));
  await check(
    "HR overview uses imported staff count",
    `document.querySelector('.wf:not([hidden]) .op-stats').textContent.includes('44')`,
  );
  await route("Staff Directory");
  await click(".wf:not([hidden]) .op-heading-actions button", "Add staff member");
  await field("Staff ID", "QA-HR-001");
  await field("First name", "QA");
  await field("Last name", "Teacher");
  await field("Department", "Teaching Staff", true);
  await field("Designation", "Mr", true);
  await click("[role=dialog] button", "Save staff (preview)");
  await check(
    "Staff onboarding opens shared profile",
    `document.querySelector('[role=dialog]').textContent.includes('QA Teacher')`,
  );
  await evaluate(`document.querySelector('[aria-label="Close workforce drawer"]').click()`);
  await wait();
  await check(
    "New staff retained in registry",
    `document.querySelector('.wf:not([hidden])').textContent.includes('45 imported')===false&&document.querySelector('.wf:not([hidden])').textContent.includes('45 records')`,
  );
  await route("Staff Attendance");
  await search("QA Teacher");
  await click(".wf:not([hidden]) button", "Mark filtered present");
  await click(".wf:not([hidden]) button", "Review & save");
  await click("[role=dialog] button", "Confirm attendance save");
  await check(
    "Staff attendance saved",
    `document.querySelector('.wf:not([hidden]) select[aria-label="Attendance QA-HR-001"]')?.value==='Present'`,
  );
  await route("Apply Leave");
  await field("Staff member", "QA-HR-001", true);
  await field("Leave type", "Personal leave", true);
  await field("Start date", "2025-02-24");
  await field("End date", "2025-02-25");
  await field("Reason", "QA leave request");
  await click(".wf:not([hidden]) button", "Submit request (preview)");
  await check(
    "Leave request submitted",
    `document.querySelector('[role=dialog]').textContent.includes('Submitted')`,
  );
  await field("Decision remarks", "QA approved");
  await click("[role=dialog] button", "Approve");
  await field("Type CONFIRM", "CONFIRM");
  await click("[role=dialog] button", "Confirm decision");
  await check(
    "Leave approval history retained",
    `document.querySelector('[role=dialog]').textContent.includes('Approved')&&document.querySelector('[role=dialog]').textContent.includes('QA approved')`,
  );
  await evaluate(`document.querySelector('[aria-label="Close workforce drawer"]').click()`);
  await wait();
  await route("Staff Attendance");
  await search("QA Teacher");
  await check(
    "Approved leave overrides ordinary attendance without double count",
    `document.querySelector('.wf:not([hidden]) [aria-label="Attendance QA-HR-001"]')?.value==='On Leave'`,
  );
  await route("Apply Leave");
  await field("Leave type", "Personal leave", true);
  await field("Start date", "2025-03-03");
  await field("End date", "2025-03-04");
  await field("Reason", "QA self-approval guard");
  await click(".wf:not([hidden]) button", "Submit request (preview)");
  await check(
    "Self-approval is blocked",
    `[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.trim()==='Approve')?.disabled`,
  );
  await evaluate(`document.querySelector('[aria-label="Close workforce drawer"]').click()`);
  await wait();
  await route("Payroll");
  await search("QA Teacher");
  await click(".wf:not([hidden]) button", "Components");
  await field("Basic salary", "50000");
  await field("Allowances", "5000");
  await field("Deductions", "2500");
  await click("[role=dialog] button", "Save illustrative components");
  await evaluate(
    `(e=>{if(!e.checked)e.click()})(document.querySelector('.wf:not([hidden]) input[aria-label="Payroll select QA-HR-001"]'))`,
  );
  await wait();
  await click(".wf:not([hidden]) button", "Review payroll batch");
  await check(
    "Payroll confirmation guarded before typing",
    `[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.includes('Confirm simulated payroll'))?.disabled`,
  );
  await field("Type PAYROLL to confirm simulation", "PAYROLL");
  await click("[role=dialog] button", "Confirm simulated payroll run");
  await check(
    "Payroll is finalized simulation not payment",
    `document.querySelector('[role=dialog]').textContent.includes('NOT PAID')`,
  );
  await evaluate(`document.querySelector('[role=dialog] button.op-list-row').click()`);
  await wait();
  await check(
    "Payslip shows gross deductions and net",
    `document.querySelector('.wf-payslip').textContent.includes('55,000.00')&&document.querySelector('.wf-payslip').textContent.includes('52,500.00')`,
  );
  await evaluate(`document.querySelector('[aria-label="Close workforce drawer"]').click()`);
  await wait();
  await route("Send Email");
  await field("To · explicit preview addresses", "qa@example.test; QA@example.test");
  await field("Subject", "QA announcement");
  await field("Message body", "Illustrative email body");
  await click(".wf:not([hidden]) button", "Validate & preview");
  await check(
    "Email preview deduplicates recipients",
    `document.querySelector('[role=dialog]').textContent.includes('1 unique recipient')`,
  );
  await click("[role=dialog] button", "Confirm simulated send");
  await check(
    "Email log is simulated not delivered",
    `document.querySelector('.wf:not([hidden])').textContent.includes('Queued (simulation)')&&document.querySelector('.wf:not([hidden]) tbody').textContent.includes('Not connected')`,
  );
  await route("Send SMS");
  await field("Phone numbers · explicit preview recipients", "+254700000000");
  await field("Message body", "a".repeat(161));
  await check(
    "SMS counter calculates two segments",
    `document.querySelector('.wf:not([hidden])').textContent.includes('2 segment(s)')`,
  );
  await click(".wf:not([hidden]) button", "Validate & preview");
  await click("[role=dialog] button", "Confirm simulated send");
  await check(
    "SMS creates a second simulated queue record",
    `document.querySelectorAll('.wf:not([hidden]) tbody tr').length===2`,
  );
  await route("Notice Board");
  await click(".wf:not([hidden]) .op-heading-actions button", "Create notice");
  await field("Notice title", "QA notice");
  await field("Notice body", "School announcement preview");
  await click("[role=dialog] button", "Select this audience");
  const today = new Date().toISOString().slice(0, 10),
    expiry = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  await field("Publish date", today);
  await field("Expiry date", expiry);
  await click("[role=dialog] button", "Preview publication");
  await check(
    "Notice audience is explicit",
    `document.querySelector('[role=dialog]').textContent.includes('45 explicitly selected')`,
  );
  await click("[role=dialog] button", "Confirm publication (simulation)");
  await check(
    "Notice publication history retained",
    `document.querySelector('[role=dialog]').textContent.includes('Published')&&document.querySelector('[role=dialog]').textContent.includes('Notice publication simulated')`,
  );
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await wait();
  await check("Escape closes workforce drawer", `!document.querySelector('.wf [role=dialog]')`);
  for (const destination of [
    "Staff Directory",
    "Staff Attendance",
    "Payroll",
    "Apply Leave",
    "Send Email",
    "Send SMS",
    "Notice Board",
    "Email / SMS Log",
  ]) {
    await route(destination);
    for (const width of [390, 430, 768, 1024, 1280, 1440, 1600]) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await wait();
      await check(
        destination + " fits " + width,
        `document.documentElement.scrollWidth<=innerWidth+1&&[...document.querySelectorAll('.wf:not([hidden]) form input,.wf:not([hidden]) form textarea')].every(e=>e.getBoundingClientRect().right<=innerWidth+1)`,
      );
    }
  }
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await route("Staff Directory");
  await click(".wf:not([hidden]) .op-heading-actions button", "Preview controls");
  await field("Preview role", "General Staff", true);
  await click("[role=dialog] button", "Apply preview");
  await route("Payroll");
  await check(
    "Payroll restricted for general staff preview role",
    `document.querySelector('.wf:not([hidden])').textContent.includes('Access restricted in this preview')`,
  );
  await check("No runtime exceptions in workforce flows", JSON.stringify(exceptions.length === 0));
  console.log(JSON.stringify({ passed: checks.length, checks, exceptions }, null, 2));
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  ws.close();
}
