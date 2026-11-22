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
const route = (name) => field("Front CMS workspace", name, true);
const responsive = async (name) => {
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
    `[...document.querySelectorAll('.sidebar .nav-item')].find(e=>e.title==='Front CMS').click()`,
  );
  await wait();
  await check(
    "CMS overview loaded",
    `document.querySelector('.cms:not([hidden])').textContent.includes('Publishing desk')`,
  );
  await route("News");
  await click(".cms:not([hidden]) button", "Create news");
  await field("Title", "QA Draft Secret");
  await field("Slug", "qa-draft-secret");
  await field("Short summary", "Private editorial draft");
  await field("Body / editorial text", "Draft content must never leak");
  await field("Review / change note", "QA draft");
  await click("[role=dialog] button", "Review changes");
  await click("[role=dialog] button", "Confirm content change");
  await check(
    "Draft retained in CMS",
    `document.querySelector('.cms:not([hidden]) tbody').textContent.includes('QA Draft Secret')`,
  );
  await route("Public Website Preview");
  await check(
    "Draft hidden from public",
    `!document.querySelector('.website').textContent.includes('QA Draft Secret')`,
  );
  await click(".website button", "News & stories");
  await check(
    "Public news navigation",
    `document.querySelector('.website').textContent.includes('Small questions')`,
  );
  await click(".website button", "Read story");
  await check(
    "News detail navigation",
    `document.querySelector('.website').textContent.includes('Illustrative editorial story')`,
  );
  await click(".web-preview-toolbar button", "Reset preview");
  await responsive("Public website");
  await click(".web-preview-toolbar button", "Mobile");
  await waitForUI(
    evaluate,
    `!![...document.querySelectorAll(".web-menu-toggle button")].find(e=>e.getClientRects().length)`,
    "mobile menu trigger visible after preview resizing",
  );
  await click(".website button", "Open navigation");
  await check(
    "Mobile navigation opens",
    `document.querySelector('.web-nav').classList.contains('open')`,
  );
  await route("Pages");
  await click(".cms:not([hidden]) button", "Create page");
  await field("Title", "QA Page");
  await field("Slug", "qa-page");
  await click("[role=dialog] button", "Add block");
  await field("Block 1 heading", "QA first section");
  await field("Block 1 content", "School-authored text");
  await check(
    "Live block preview",
    `document.querySelector('.cms-live-preview').textContent.includes('QA first section')`,
  );
  await responsive("Page builder drawer");
  await click("[role=dialog] header button", "Close");
  await route("Media Manager");
  await click(".cms:not([hidden]) button", "Upload media simulation");
  await click("[role=dialog] button", "Simulate upload failure");
  await check(
    "Recoverable upload simulation",
    `document.querySelector('[role=dialog]').textContent.includes('Upload failed')`,
  );
  await field("File name", "qa.png");
  await field("Asset title", "QA Image");
  await field("Alternative text", "QA illustrative image");
  await click("[role=dialog] button", "Simulate upload");
  await click("[role=dialog] button", "Save asset metadata");
  await check(
    "Shared media metadata retained",
    `document.querySelector('.cms:not([hidden])').textContent.includes('QA Image')`,
  );
  await route("Menus");
  await click(".cms:not([hidden]) button", "Create menu");
  await field("Menu name", "QA Footer");
  await field("Menu placement", "Footer", true);
  await click("[role=dialog] button", "Add menu item");
  await field("Item 1 label", "Contact QA");
  await field("Item 1 destination", "contact");
  await field("Menu status", "Published", true);
  await click("[role=dialog] button", "Confirm save menu");
  await route("Public Website Preview");
  await check(
    "Shared footer menu consumed",
    `document.querySelector('.web-footer').textContent.includes('Contact QA')`,
  );
  for (const name of [
    "Front CMS Overview",
    "Event",
    "Gallery",
    "News",
    "Media Manager",
    "Pages",
    "Menus",
    "Banner Images",
    "Public Website Preview",
  ]) {
    await route(name);
    await responsive(name);
  }
  await check("No runtime exceptions", JSON.stringify(exceptions.length === 0));
  console.log(JSON.stringify({ passed: checks.length, exceptions }));
} finally {
  ws.close();
}
