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
const route = (name) => field("Credentials & alumni workspace", name, true);
const widths = [390, 430, 768, 1024, 1280, 1440, 1600];
const responsive = async (name) => {
  for (const width of widths) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await wait();
    await check(
      name + " fits " + width,
      `document.documentElement.scrollWidth<=innerWidth+1 && (!document.querySelector('[role=dialog]') || document.querySelector('[role=dialog]').getBoundingClientRect().width<=innerWidth+1)`,
    );
  }
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
  await new Promise((r) => setTimeout(r, 1600));
  await evaluate(`document.querySelectorAll('.layer-switch>button')[1].click()`);
  await wait();
  await evaluate(
    `[...document.querySelectorAll('.sidebar .nav-item')].find(e=>e.title==='Certificate').click()`,
  );
  await wait();
  await route("Generate Certificate");
  await click(".credentials:not([hidden]) button", "Start guided generation");
  await click("[role=dialog] button", "Continue");
  await click("[role=dialog] button", "Select eligible filtered");
  await click("[role=dialog] button", "Continue");
  await field(
    "Manual eligibility review and evidence",
    "QA school reviewed example; no achievement inferred",
  );
  await click("[role=dialog] button", "Continue");
  await responsive("Certificate preview");
  await click("[role=dialog] button", "Continue");
  await click("[role=dialog] button", "Confirm generation (simulation)");
  await check(
    "Certificate batch generated",
    `document.querySelector('[role=dialog]').textContent.includes('Generated 11')`,
  );
  await click("[role=dialog] header button", "Close");
  await route("Student Certificate");
  await click(".credentials:not([hidden]) button", "Details / preview");
  await click("[role=dialog] button", "Reprint preview");
  await check(
    "Snapshot preview watermark",
    `document.querySelector('.cred-preview').textContent.includes('NOT AN OFFICIAL')`,
  );
  await click("[role=dialog] header button", "Close");
  await click(".credentials:not([hidden]) button", "Revoke");
  await field("Lifecycle reason", "QA revoked");
  await click("[role=dialog] button", "Confirm document status");
  await check(
    "Certificate revoked",
    `document.querySelector('.credentials:not([hidden]) tbody').textContent.includes('Revoked')`,
  );
  await route("Student ID Card");
  await click(".credentials:not([hidden]) button", "Open template designer");
  await field("Document title", "QA Student Card");
  await click("[role=dialog] button", "Back card");
  await responsive("Card designer back");
  await click("[role=dialog] button", "Save template version");
  await check(
    "Template version incremented",
    `document.querySelector('.credentials:not([hidden])').textContent.includes('v2')`,
  );
  for (const name of ["Generate ID Card", "Generate Staff ID Card"]) {
    await route(name);
    await click(".credentials:not([hidden]) button", "Start guided generation");
    await click("[role=dialog] button", "Continue");
    await click("[role=dialog] button", "Select eligible filtered");
    await click("[role=dialog] button", "Continue");
    await field("Manual eligibility review and evidence", "QA active identity reviewed");
    await field("Acknowledge missing-photo placeholders", "Acknowledged", true);
    await click("[role=dialog] button", "Continue");
    await click("[role=dialog] button", "Continue");
    await click("[role=dialog] button", "Confirm generation (simulation)");
    await check(
      name + " results",
      `document.querySelector('[role=dialog]').textContent.includes('Generated') && !document.querySelector('[role=alert]')`,
    );
    await click("[role=dialog] header button", "Close");
  }
  await route("Manage Alumni");
  await click(".credentials:not([hidden]) button", "Add Alumni");
  await field("External alumnus name", "QA Alumni");
  await field("Graduation year", "2024");
  await field("Last known class", "Grade 12");
  await field(
    "Manual graduation review / override reason",
    "QA historical record reviewed manually",
  );
  await click("[role=dialog] button", "Review alumni record");
  await click("[role=dialog] button", "Confirm alumni record");
  await check(
    "Alumni record retained",
    `document.querySelector('.credentials:not([hidden]) tbody').textContent.includes('QA Alumni')`,
  );
  await click(".credentials:not([hidden]) button", "Alumni 360");
  await responsive("Alumni 360");
  await click("[role=dialog] header button", "Close");
  await route("Events");
  await click(".credentials:not([hidden]) button", "Create event");
  await field("Event name", "QA Reunion");
  await field("Location", "School Hall");
  await field("Event status", "Published", true);
  await field("Publication / capacity / cancellation reason", "QA reviewed publication");
  await click("[role=dialog] button", "Review event");
  await click("[role=dialog] button", "Confirm event change");
  await check(
    "Event published",
    `document.querySelector('.credentials:not([hidden]) tbody').textContent.includes('Published')`,
  );
  await click(".credentials:not([hidden]) button", "Details / participation");
  await click("[role=dialog] button", "Preview RSVP / attendance");
  await click("[role=dialog] button", "Confirm participation");
  await check(
    "RSVP registered",
    `document.querySelector('[role=dialog] tbody').textContent.includes('Registered')`,
  );
  await field("Participation status", "Attendance marked", true);
  await click("[role=dialog] button", "Preview RSVP / attendance");
  await click("[role=dialog] button", "Confirm participation");
  await check(
    "Attendance marked",
    `document.querySelector('[role=dialog] tbody').textContent.includes('Attendance marked')`,
  );
  await responsive("RSVP attendance drawer");
  await click("[role=dialog] header button", "Close");
  for (const name of [
    "Certificates Overview",
    "Student Certificate",
    "Generate Certificate",
    "Student ID Card",
    "Generate ID Card",
    "Staff ID Card",
    "Generate Staff ID Card",
    "Alumni Overview",
    "Manage Alumni",
    "Events",
  ]) {
    await route(name);
    await responsive(name);
  }
  await check("No runtime exceptions", JSON.stringify(exceptions.length === 0));
  console.log(JSON.stringify({ passed: checks.length, exceptions }));
} finally {
  ws.close();
}
