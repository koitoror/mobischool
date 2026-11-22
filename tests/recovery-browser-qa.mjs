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
  await field("Reports workspace", name, true);
  await waitForUI(
    evaluate,
    `document.querySelector('.reports:not([hidden]) [role=heading]')?.textContent===${JSON.stringify(name === "Reports Overview" ? "Reports & Analytics" : name.replace("Reports / ", ""))}`,
    "visible report heading " + name,
  );
};
const module = async (title) => {
  await evaluate(
    `[...document.querySelectorAll('.sidebar .nav-item')].find(e=>e.title===${JSON.stringify(title)}).click()`,
  );
  await wait();
};
const key = async (key, code = key, modifiers = 0) => {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, modifiers });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, modifiers });
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
    "initial Pulse",
  );
  await evaluate(`document.querySelectorAll('.layer-switch>button')[1].click()`);
  await wait();
  await module("Inventory");
  await field("Operations workspace", "Add Item Stock", true);
  await click(".ops:not([hidden]) button", "Receive stock");
  await field("Quantity received", "5");
  await field("Unique reference", "REC12A");
  await click("[role=dialog] button", "Preview stock transaction");
  await click("[role=dialog] button", "Confirm transaction");
  await module("Reports");
  await route("Reports / Inventory");
  await check(
    "Inventory report receives confirmed receipt",
    `document.querySelector('.reports:not([hidden])').textContent.includes('REC12A')`,
  );
  await check(
    "Current stock includes receipt",
    `[...document.querySelectorAll('.report-kpis .op-card')].find(e=>e.textContent.includes('Stock units')).textContent.includes('55')`,
  );
  await module("Inventory");
  await field("Operations workspace", "Add Item Stock", true);
  await check(
    "Source retains receipt after cross-module navigation",
    `document.querySelector('.ops:not([hidden])').textContent.includes('REC12A')`,
  );
  await module("Reports");
  await route("Reports / Student Information");
  const trigger = await evaluate(
    `(()=>{const b=[...document.querySelectorAll('.reports:not([hidden]) button')].find(e=>e.textContent.trim()==='Select columns');b.scrollIntoView();const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`,
  );
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    button: "left",
    clickCount: 1,
    ...trigger,
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    button: "left",
    clickCount: 1,
    ...trigger,
  });
  await waitForUI(evaluate, `!!document.querySelector('[role=dialog]')`, "column selector dialog");
  await check(
    "Dialog initial focus inside",
    `document.querySelector('[role=dialog]').contains(document.activeElement)`,
  );
  await key("Tab", "Tab", 8);
  await check(
    "Shift Tab trap stays inside dialog",
    `document.querySelector('[role=dialog]').contains(document.activeElement)`,
  );
  await key("Escape");
  await check("Escape closes report dialog", `!document.querySelector('[role=dialog]')`);
  await check(
    "Focus restored to columns trigger",
    `document.activeElement?.textContent.trim()==='Select columns'`,
  );
  await check(
    "Tables have semantic column headers",
    `document.querySelectorAll('.reports table th').length>0`,
  );
  await check(
    "Filter controls have associated labels",
    `[...document.querySelectorAll('.reports input,.reports select')].every(e=>!!e.closest('label'))`,
  );
  await check(
    "Charts have textual meter names",
    `[...document.querySelectorAll('.reports meter')].every(e=>!!e.getAttribute('aria-label'))`,
  );
  await module("Front CMS");
  await field("Front CMS workspace", "Public Website Preview", true);
  await click(".web-preview-toolbar button", "Mobile");
  await waitForUI(
    evaluate,
    `!![...document.querySelectorAll('.web-menu-toggle button')].find(e=>e.getClientRects().length)`,
    "mobile menu",
  );
  await click(".website button", "Open navigation");
  await key("Escape");
  await check(
    "CMS Escape closes menu",
    `!document.querySelector('.web-nav').classList.contains('open')`,
  );
  await check(
    "CMS Escape returns focus to trigger",
    `document.activeElement?.textContent.trim()==='Open navigation'`,
  );
  for (const width of [390, 430, 768, 1024, 1280, 1440, 1600]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await click(".website button", "Open navigation");
    await click(".web-nav button", "News & stories");
    await check(
      "CMS navigation closes after destination " + width,
      `!document.querySelector('.web-nav').classList.contains('open')&&document.querySelector('.website').textContent.includes('News & stories')`,
    );
    await check(
      "CMS no page overflow " + width,
      `document.documentElement.scrollWidth<=innerWidth+1`,
    );
  }
  const origin = await evaluate("performance.timeOrigin");
  await send("Page.reload");
  await waitForUI(
    evaluate,
    `performance.timeOrigin!==${origin}&&!![...document.querySelectorAll('h1')].find(e=>e.getClientRects().length&&e.textContent==='School Pulse')`,
    "fresh Pulse reset",
  );
  await evaluate(`document.querySelectorAll('.layer-switch>button')[1].click()`);
  await wait();
  await module("Reports");
  await route("Reports / Inventory");
  await check(
    "Reload consistently discards receipt",
    `!document.querySelector('.reports:not([hidden])').textContent.includes('REC12A')`,
  );
  await check(
    "Reload stock returns to opening balance",
    `[...document.querySelectorAll('.report-kpis .op-card')].find(e=>e.textContent.includes('Stock units')).textContent.includes('50')`,
  );
  await check("No recovery runtime exceptions", JSON.stringify(exceptions.length === 0));
  console.log(
    JSON.stringify({
      passed: checks.length,
      workflows: ["stock cross-module", "dialog keyboard", "CMS navigation", "reload reset"],
      exceptions,
    }),
  );
} finally {
  ws.close();
}
