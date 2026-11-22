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
const route = async (name) => {
  await field("Examination workspace", name, true);
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
  await evaluate(`document.querySelectorAll('.layer-switch>button')[1].click()`);
  await wait();
  await evaluate(
    `[...document.querySelectorAll('.sidebar .nav-item')].find(e=>e.title==='Examinations').click()`,
  );
  await wait();
  await check(
    "Shared examinations overview",
    `document.querySelector('.ex:not([hidden])').textContent.includes('Assessment pipeline')`,
  );
  await route("Exam Schedule");
  await click(".ex:not([hidden]) button", "Add schedule");
  await field("Room", "QA room");
  await click("[role=dialog] button", "Review and save schedule");
  await check(
    "Schedule persisted",
    `document.querySelector('.ex:not([hidden]) tbody').textContent.includes('QA room')`,
  );
  await click(".ex:not([hidden]) button", "Add schedule");
  await field("Room", "QA room");
  await click("[role=dialog] button", "Review and save schedule");
  await check(
    "Schedule conflict blocked",
    `document.querySelector('[role=dialog]').textContent.includes('Conflict')`,
  );
  await evaluate(`document.querySelector('[role=dialog] header button').click()`);
  await wait();
  // Closing a dirty form prompts discard.
  const dialogResult = await send("Page.handleJavaScriptDialog", { accept: true }).catch(
    () => null,
  );
  await wait();
  await route("Print Admit Card");
  await click(".ex:not([hidden]) button", "Select eligible");
  await click(".ex:not([hidden]) button", "Preview selected batch");
  await check(
    "Admit card preview uses shared student",
    `document.querySelector('.ex-document').textContent.includes('Olivia Rhye')`,
  );
  await click("[role=dialog] button", "Confirm generation (simulation)");
  await route("Exam Result");
  await click(".ex:not([hidden]) button", "Enter marks");
  await field("Score for Olivia Rhye", "85");
  await click("[role=dialog] button", "Validate and submit for review");
  await check(
    "Reviewed result saved",
    `document.querySelector('.ex:not([hidden]) tbody').textContent.includes('Reviewed')`,
  );
  await click(".ex:not([hidden]) button", "Review publication");
  await click("[role=dialog] button", "Confirm publication (simulation)");
  await waitForUI(
    evaluate,
    `!!document.querySelector('.ex:not([hidden]) tbody')`,
    "published result table after confirmation",
  );
  await check(
    "Result published with grade",
    `document.querySelector('.ex:not([hidden]) tbody').textContent.includes('Published')&&document.querySelector('.ex:not([hidden]) tbody').textContent.includes('85%')`,
  );
  await route("Print Marksheet");
  await click(".ex:not([hidden]) button", "Select eligible");
  await click(".ex:not([hidden]) button", "Preview selected batch");
  await check(
    "Published marksheet preview",
    `document.querySelector('.ex-document').textContent.includes('85%')`,
  );
  await click("[role=dialog] button", "Confirm generation (simulation)");
  await route("Exam Group");
  await click(".ex:not([hidden]) .op-heading-actions button", "Create exam");
  await field("Exam name", "QA Online Mathematics");
  await field("Maximum marks", "10");
  await click("[role=dialog] button", "Save exam");
  await route("Question Bank");
  await click(".ex:not([hidden]) button", "Add question");
  await field("Topic", "Arithmetic");
  await field("Question type", "True / False", true);
  await field("Question text", "Two plus two equals four.");
  await field("Marks", "10");
  await field("Expected answer", "True", true);
  await click("[role=dialog] button", "Save question");
  await check(
    "Question bank saves validated question",
    `document.querySelector('.ex:not([hidden]) tbody').textContent.includes('Two plus two')`,
  );
  await route("Online Exam");
  await click(".ex:not([hidden]) .op-heading-actions button", "Create online exam");
  await field("Online exam name", "QA Digital Assessment");
  await evaluate(
    `[...document.querySelectorAll('[role=dialog] button')].find(b=>b.textContent.includes('Select: Two plus two')).click()`,
  );
  await wait();
  await click("[role=dialog] button", "Review and save draft exam");
  await click(".ex:not([hidden]) tbody button", "Schedule");
  await check(
    "Online exam scheduled",
    `document.querySelector('.ex:not([hidden]) tbody').textContent.includes('Scheduled')`,
  );
  await click(".ex:not([hidden]) tbody button", "Student preview");
  await click("[role=dialog] button", "Start exam preview");
  await field("Your answer", "True", true);
  await click("[role=dialog] button", "Mark for review");
  await click("[role=dialog] button", "Review submission");
  await check(
    "Submission summary counts responses",
    `document.querySelector('[role=dialog]').textContent.includes('1 answered')&&document.querySelector('[role=dialog]').textContent.includes('1 flagged')`,
  );
  await click("[role=dialog] button", "Confirm submission (simulation)");
  await check(
    "Submission confirmation",
    `document.querySelector('[role=dialog]').textContent.includes('pending evaluation')`,
  );
  await click("[role=dialog] button", "Return to online exams");
  await click(".ex:not([hidden]) button", "Evaluate");
  await waitForUI(
    evaluate,
    `!!document.querySelector('[role=dialog][aria-label="Evaluate attempt"] input[type=number]')`,
    "evaluator marks input",
  );
  await evaluate(
    `(()=>{const e=document.querySelector('[role=dialog][aria-label="Evaluate attempt"] input[type=number]');if(!(e instanceof HTMLInputElement))throw Error('Evaluator marks field is missing');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'10');e.dispatchEvent(new Event('input',{bubbles:true}));})()`,
  );
  await wait();
  await click("[role=dialog] button", "Confirm evaluation and create draft score");
  await check(
    "Evaluated attempt retained",
    `document.querySelector('.ex:not([hidden])').textContent.includes('Evaluated')`,
  );
  await route("Exam Result");
  await check(
    "Evaluation feeds shared draft result",
    `document.querySelector('.ex:not([hidden]) tbody').textContent.includes('10 / 10')&&document.querySelector('.ex:not([hidden]) tbody').textContent.includes('Draft')`,
  );
  for (const name of [
    "Exam Schedule",
    "Exam Result",
    "Design Admit Card",
    "Design Marksheet",
    "Question Bank",
    "Online Exam",
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
  console.log(JSON.stringify({ passed: checks.length, checks, exceptions }, null, 2));
} finally {
  ws.close();
}
