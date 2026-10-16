/**
 * Loads the game script from index.html in a small vm so tests can call
 * moveKeep and care helpers without a window hook.
 * Run helpers from other tests: import { boot } from "./game-vm.mjs"
 */
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function element(){
  const el = {
    hidden: true,
    className: "",
    id: "",
    dataset: {},
    style: { setProperty(){} },
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    children: [],
    innerHTML: "",
    textContent: "",
    offsetWidth: 0,
    offsetHeight: 0,
    tabIndex: 0,
    disabled: false,
    isConnected: true,
    addEventListener(){},
    removeEventListener(){},
    setAttribute(){},
    getAttribute(){ return null; },
    removeAttribute(){},
    focus(){},
    click(){},
    appendChild(c){ return c; },
    querySelector(){ return element(); },
    querySelectorAll(){ return []; },
    getClientRects(){ return []; },
    closest(){ return null; }
  };
  return el;
}

export function boot(raw, opts){
  const search = opts && opts.search ? String(opts.search) : "";
  const session = new Map(Object.entries(opts && opts.session || {}));
  const html = readFileSync(join(root, "index.html"), "utf8");
  const open = html.lastIndexOf("<script>");
  const close = html.lastIndexOf("</script>");
  if (open < 0 || close < open) throw new Error("game script not found");
  let src = html.slice(open + "<script>".length, close).trim();
  if (!src.startsWith("(function(){") || !src.endsWith("})();")) throw new Error("game script is not the expected IIFE");
  src = src.slice("(function(){".length, src.length - "})();".length);
  const cut = src.lastIndexOf("try { window.claude");
  if (cut < 0) throw new Error("boot tail not found");
  src = src.slice(0, cut) + `
    function loadFromStorage(){
      const raw = localStorage.getItem(KEY);
      S = raw ? hydrate(JSON.parse(raw)) : fresh();
      reconcileKeep();
    }
    function snapshot(){ return JSON.parse(JSON.stringify(S)); }
    const __api = { moveKeep, loadFromStorage, snapshot };
    if (typeof now === "function") __api.now = now;
    if (typeof today === "function") __api.today = today;
    if (typeof setCareClock === "function") __api.setCareClock = setCareClock;
    if (typeof setZoneOffset === "function") __api.setZoneOffset = setZoneOffset;
    if (typeof setTimeZone === "function") __api.setTimeZone = setTimeZone;
    if (typeof careAct === "function") __api.careAct = careAct;
    if (typeof careRecord === "function") __api.careRecord = careRecord;
    if (typeof keeperNotes === "function") __api.keeperNotes = keeperNotes;
    if (typeof careWait === "function") __api.careWait = careWait;
    if (typeof careSeals === "function") __api.careSeals = careSeals;
    if (typeof spriteKey === "function") __api.spriteKey = spriteKey;
    if (typeof spriteChain === "function") __api.spriteChain = spriteChain;
    if (typeof pensOpen === "function") __api.pensOpen = pensOpen;
    if (typeof breedCount === "function") __api.breedCount = breedCount;
    if (typeof visitKeep === "function") __api.visitKeep = visitKeep;
    if (typeof claimStreak === "function") __api.claimStreak = claimStreak;
    if (typeof streakPrize === "function") __api.streakPrize = streakPrize;
    if (typeof noteDailyVisit === "function") __api.noteDailyVisit = noteDailyVisit;
    if (typeof start === "function") __api.start = start;
    return __api;
  `;

  const writes = [];
  const store = new Map();
  if (raw != null) store.set("scalebank.v1", String(raw));
  const localStorage = {
    getItem(k){ return store.has(k) ? store.get(k) : null; },
    setItem(k, v){ const s = String(v); store.set(k, s); if (k === "scalebank.v1") writes.push(s); },
    removeItem(k){ store.delete(k); },
    clear(){ store.clear(); }
  };
  const document = {
    documentElement: element(),
    body: element(),
    addEventListener(){},
    removeEventListener(){},
    querySelector(){ return element(); },
    querySelectorAll(){ return []; },
    getElementById(){ return element(); },
    createElement(){ return element(); },
    fonts: null
  };
  const sandbox = {
    console, setTimeout, clearTimeout, setInterval, clearInterval,
    performance: { now: () => Date.now() },
    requestAnimationFrame: (fn) => setTimeout(fn, 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    Date, Math, JSON, Object, Array, Set, Map, Number, String, Boolean, RegExp, Error,
    parseInt, parseFloat, isNaN, isFinite, NaN, Infinity, undefined,
    URL, URLSearchParams, Promise,
    fetch: () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }),
    matchMedia: () => ({ matches: false, addEventListener(){}, removeEventListener(){} }),
    document,
    localStorage,
    sessionStorage: {
      getItem(k){ return session.has(k) ? session.get(k) : null; },
      setItem(k, v){ session.set(k, String(v)); },
      removeItem(k){ session.delete(k); }
    },
    location: { search, hash: "", href: "http://localhost/index.html" + search },
    navigator: { userAgent: "node" }
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = () => {};
  const context = createContext(sandbox);
  const api = runInContext("(function(){\n" + src + "\n})()", context, { filename: "index.html" });
  writes.length = 0;
  api.loadFromStorage();
  writes.length = 0;
  api.text = () => localStorage.getItem("scalebank.v1");
  api.writes = () => writes.length;
  api.saved = () => (writes.length ? JSON.parse(writes[writes.length - 1]) : JSON.parse(api.text()));
  return api;
}
