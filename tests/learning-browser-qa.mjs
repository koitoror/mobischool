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
const route = async (name) => field("Learning workspace", name, true);
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
    `[...document.querySelectorAll('.sidebar .nav-item')].find(b=>b.title==='Homework').click()`,
  );
  await wait();
  await click(".learn:not([hidden]) .op-heading-actions button", "Add homework");
  await field("Homework title", "QA Assignment");
  await field("Instructions", "Solve the problems");
  await field("Maximum marks (optional)", "10");
  await field("Status", "Published", true);
  await click("[role=dialog] button", "Review and save homework");
  await click("[role=dialog] button", "Confirm publish homework");
  await check(
    "Published homework retained",
    `document.querySelector('.learn:not([hidden]) tbody').textContent.includes('Published')`,
  );
  await click(".learn:not([hidden]) button", "Details / submissions");
  await click("[role=dialog] button", "Preview student submission");
  await field("Response / attachment filename", "QA answer");
  await click("[role=dialog] button", "Confirm simulated submission");
  await click(".learn:not([hidden]) button", "Details / submissions");
  await click("[role=dialog] button", "Review");
  await field("Awarded marks", "8");
  await field("Teacher feedback", "Good work");
  await click("[role=dialog] button", "Confirm teacher review");
  await click(".learn:not([hidden]) button", "Details / submissions");
  await check(
    "Homework reviewed",
    `document.querySelector('[role=dialog]').textContent.includes('Reviewed')`,
  );
  await click("[role=dialog] header button", "Close");
  await route("Upload/Share Content");
  await click(".learn:not([hidden]) button", "Upload/share resource");
  await field("Resource title", "QA Worksheet");
  await field("Filename with extension", "qa.pdf");
  await field("Status", "Published", true);
  await click("[role=dialog] button", "Preview resource sharing");
  await click("[role=dialog] button", "Confirm resource simulation");
  await check(
    "Resource sharing retained",
    `document.querySelector('.learn:not([hidden]) tbody').textContent.includes('qa.pdf')`,
  );
  await route("Book List");
  await click(".learn:not([hidden]) button", "Add catalog book");
  await field("Book title", "QA Library Book");
  await field("Author", "QA Author");
  await field("ISBN", "QA-ISBN");
  await click("[role=dialog] button", "Review inventory change");
  await click("[role=dialog] button", "Confirm inventory update");
  await route("Add Student");
  await evaluate(`document.querySelector('.learn:not([hidden]) tbody button').click()`);
  await wait();
  await click(".learn:not([hidden]) button", "Review registrations (1)");
  await click("[role=dialog] button", "Confirm borrower registration");
  await check(
    "Student registered from shared registry",
    `document.querySelector('.learn:not([hidden]) tbody').textContent.includes('LIB-')`,
  );
  await route("Issue - Return");
  await click(".learn:not([hidden]) button", "Issue book");
  await click("[role=dialog] button", "Confirm issue (simulation)");
  await check(
    "Loan issued",
    `document.querySelector('.learn:not([hidden]) tbody').textContent.includes('Issued')`,
  );
  await click(".learn:not([hidden]) button", "Issue book");
  await click("[role=dialog] button", "Confirm issue (simulation)");
  await check(
    "Exhausted inventory blocked without crash",
    `document.querySelector('[role=dialog]').textContent.includes('No available')`,
  );
  await click("[role=dialog] header button", "Close");
  await click(".learn:not([hidden]) button", "Return");
  await click("[role=dialog] button", "Confirm return (simulation)");
  await check(
    "Return closes loan",
    `document.querySelector('.learn:not([hidden]) tbody').textContent.includes('Closed')`,
  );
  for (const name of [
    "Homework",
    "Add Homework",
    "Download Center",
    "Upload/Share Content",
    "Content Share List",
    "Library",
    "Book List",
    "Issue - Return",
    "Add Student",
    "Add Staff Member",
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
