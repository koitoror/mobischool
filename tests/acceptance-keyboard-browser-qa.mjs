import { writeFile, mkdir } from "node:fs/promises";
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
const key = async (key, modifiers = 0) => {
  const codes = { Enter: 13, Tab: 9, Escape: 27, Home: 36, ArrowDown: 40, ArrowUp: 38, " ": 32 };
  const windowsVirtualKeyCode = codes[key] || key.toUpperCase().charCodeAt(0);
  const code = key === "a" ? "KeyA" : key === " " ? "Space" : key;
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    ...(key === "Enter" ? { text: "\r", unmodifiedText: "\r" } : {}),
    key,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode,
    modifiers,
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode,
    modifiers,
  });
};
const seek = async (condition) => {
  for (let i = 0; i < 260; i++) {
    if (await evaluate(`(()=>{const e=document.activeElement;return ${condition}})()`)) return;
    await key("Tab");
  }
  throw Error("Keyboard target not reachable: " + condition);
};
const button = async (name) => {
  await seek(`e.tagName==='BUTTON'&&(e.textContent||'').trim()===${JSON.stringify(name)}`);
  await key("Enter");
};
const select = async (label, value) => {
  await seek(
    `e.tagName==='SELECT'&&e.closest('label')?.querySelector('span')?.textContent.trim()===${JSON.stringify(label)}`,
  );
  const index = await evaluate(
    `[...document.activeElement.options].findIndex(o=>o.value===${JSON.stringify(value)})`,
  );
  if (index < 0) throw Error("Missing option " + value);
  await key("Home");
  for (let i = 0; i < index; i++) await key("ArrowDown");
  await key("Enter");
};
const search = async (value) => {
  await seek(
    `e.tagName==='INPUT'&&e.closest('label')?.querySelector('span')?.textContent.trim()==='Search / record reference'`,
  );
  await key("a", 2);
  await send("Input.insertText", { text: value });
  await button("Apply filters");
};
const route = async (name) => {
  await select("Reports workspace", name);
  await waitForUI(
    evaluate,
    `document.querySelector('.reports [role=heading]')?.textContent===${JSON.stringify(name === "Reports Overview" ? "Reports & Analytics" : name.replace("Reports / ", ""))}`,
    "keyboard route " + name,
  );
};
const inventories = [];
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
  await seek(
    `e.tagName==='BUTTON'&&e.parentElement?.classList.contains('layer-switch')&&(e.textContent||'').includes('Operations')`,
  );
  await key("Enter");
  await seek(`e.tagName==='BUTTON'&&e.title==='Reports'`);
  await key("Enter");
  await waitForUI(evaluate, `!!document.querySelector('.reports')`, "keyboard reports");
  await check(
    "Keyboard shell to Reports",
    `document.querySelector('.reports').textContent.includes('Reporting library')`,
  );
  for (const name of ["Student Information", "Finance", "Attendance", "Examinations"]) {
    await route("Reports / " + name);
    await search("Olivia");
    await check(
      name + " keyboard filter",
      `[...document.querySelectorAll('.reports input')].some(e=>e.value==='Olivia')`,
    );
    if (name === "Examinations") {
      await button("Missing marks");
      await button("Inspect assessment Olivia Rhye");
      await check(
        "Keyboard exact candidate inspector",
        `document.querySelector('[aria-label="Exact assessment source"]').textContent.includes('EX-1|ST-2024001')`,
      );
      await button("Open exact exam marks context");
      await waitForUI(
        evaluate,
        `!!document.querySelector('.ex:not([hidden])')`,
        "exact exam marks workspace",
      );
      await button("Return to originating report");
      await waitForUI(
        evaluate,
        `!!document.querySelector('.reports')`,
        "originating examination report",
      );
      await check(
        "Examination source return preserves filters",
        `[...document.querySelectorAll('.reports input')].some(e=>e.value==='Olivia')`,
      );
    }
    await seek(`e.tagName==='BUTTON'&&(e.getAttribute('aria-label')||'').startsWith('Explain ')`);
    const trigger = await evaluate('document.activeElement.getAttribute("aria-label")');
    await key("Enter");
    await waitForUI(
      evaluate,
      `!!document.querySelector('[aria-label="Calculation & contributing records"]')`,
      "keyboard KPI",
    );
    await check(
      name + " keyboard KPI drawer",
      `document.querySelector('[role=dialog]').contains(document.activeElement)`,
    );
    await key("Escape");
    await check(
      name + " KPI focus restored",
      `document.activeElement.getAttribute('aria-label')===${JSON.stringify(trigger)}`,
    );
    if (name !== "Examinations") {
      await seek(
        `e.tagName==='BUTTON'&&(e.getAttribute('aria-label')||'').startsWith('View source record')`,
      );
      await key("Enter");
      await waitForUI(
        evaluate,
        `!!document.querySelector('[aria-label="Source record detail"]')`,
        "keyboard record",
      );
      await check(
        name + " exact source inspector",
        `document.querySelector('[role=dialog] pre').textContent.includes('record')`,
      );
      if (name === "Student Information") {
        await button("Open exact Student 360");
        await waitForUI(
          evaluate,
          `!![...document.querySelectorAll('.op:not([hidden]) h2')].find(e=>e.textContent==='Olivia Rhye')`,
          "Student360",
        );
        await button("Return to originating report");
        await waitForUI(evaluate, `!!document.querySelector('.reports')`, "origin report");
        await check(
          "Student 360 return preserves filters",
          `[...document.querySelectorAll('.reports input')].some(e=>e.value==='Olivia')`,
        );
      } else await key("Escape");
    }
    await button("Export preview");
    await waitForUI(
      evaluate,
      `!!document.querySelector('[aria-label="Export preview"]')`,
      "keyboard export",
    );
    await check(
      name + " keyboard export retains filter",
      name === "Examinations"
        ? `document.querySelector('[role=dialog]').textContent.includes('0 filtered records')&&[...document.querySelectorAll('.reports input')].some(e=>e.value==='Olivia')&&document.querySelector('[role=dialog] button.op-primary').disabled`
        : `document.querySelector('[role=dialog] pre').textContent.includes('Olivia')`,
    );
    await key("Escape");
    await button("Reset filters");
  }
  // Read-only contrast inventory of visible text samples on every report route. Unknown compositing is flagged, not passed.
  for (const name of [
    "Reports Overview",
    ...[
      "Student Information",
      "Finance",
      "Attendance",
      "Examinations",
      "Online Examinations",
      "Lesson Plan",
      "Human Resource",
      "Homework",
      "Library",
      "Inventory",
      "Transport",
      "Hostel",
      "Alumni",
      "User Log",
      "Audit Trail Report",
    ].map((n) => "Reports / " + n),
  ]) {
    await route(name);
    inventories.push(
      ...(await evaluate(
        `(()=>{const rgb=s=>(s.match(/[\\d.]+/g)||[]).map(Number),lin=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4},lum=c=>.2126*lin(c[0])+.7152*lin(c[1])+.0722*lin(c[2]);return [...document.querySelectorAll('.reports *')].filter(e=>e.getClientRects().length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(e=>{const s=getComputedStyle(e),fg=rgb(s.color);let bg=[255,255,255],unknown=false;for(let p=e;p;p=p.parentElement){const ps=getComputedStyle(p),c=rgb(ps.backgroundColor);if(ps.backgroundImage!=='none'||Number(ps.opacity)<1)unknown=true;if(c.length>=3&&(c.length<4||c[3]===1)){bg=c;break;}if(c[3]>0)unknown=true;}const ratio=(Math.max(lum(fg),lum(bg))+.05)/(Math.min(lum(fg),lum(bg))+.05),large=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&Number(s.fontWeight)>=700),disabled=e.matches(':disabled')||!!e.closest(':disabled');return {route:${JSON.stringify(name)},component:e.tagName,example:e.closest('tbody')?'Source table content omitted':e.textContent.trim().slice(0,60),foreground:s.color,background:bg.slice(0,3).join(','),ratio:Number(ratio.toFixed(3)),required:large?3:4.5,result:disabled?'EXEMPT-DISABLED':unknown?'UNVERIFIED-COMPOSITING':ratio>=(large?3:4.5)?'PASS':'FAIL'};})})()`,
      )),
    );
  }
  await mkdir("docs/evidence", { recursive: true });
  await writeFile(
    "docs/evidence/12c-contrast-inventory.json",
    JSON.stringify(
      {
        kind: "Automated visible default-state text inventory, not full WCAG/human validation",
        browser: (await send("Browser.getVersion")).product,
        samples: inventories,
      },
      null,
      2,
    ),
  );
  await check(
    "Contrast inventory covers all 16 reports",
    JSON.stringify(new Set(inventories.map((r) => r.route)).size === 16),
  );
  await check("No keyboard-journey runtime exceptions", JSON.stringify(exceptions.length === 0));
  console.log(
    JSON.stringify({
      passed: checks.length,
      journeys: 4,
      sourceNavigationScenarios: 4,
      contrastSamples: inventories.length,
      contrastFailures: inventories.filter((r) => r.result === "FAIL").length,
      unverified: inventories.filter((r) => r.result === "UNVERIFIED-COMPOSITING").length,
      exceptions,
    }),
  );
} finally {
  ws.close();
}
