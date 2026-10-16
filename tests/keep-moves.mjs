/**
 * Checks moveKeep: one save write, no lost or duplicate ids, roaming max 6.
 * Run from the repo root: node tests/keep-moves.mjs
 */
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const puppeteerPath = [
  join(root, "node_modules/puppeteer-core"),
  "/tmp/rf-test/node_modules/puppeteer-core"
].find(p => existsSync(join(p, "package.json")));
if (!puppeteerPath) {
  console.error("puppeteer-core not found. Install it, or keep /tmp/rf-test/node_modules.");
  process.exit(1);
}
const require = createRequire(join(puppeteerPath, "package.json"));
const puppeteer = require("puppeteer-core");

const MIME = {".html":"text/html", ".js":"text/javascript", ".mjs":"text/javascript", ".json":"application/json", ".css":"text/css", ".webp":"image/webp", ".png":"image/png", ".mp4":"video/mp4", ".webm":"video/webm", ".svg":"image/svg+xml"};
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  if (url.pathname === "/__blank") {
    res.writeHead(200, {"content-type":"text/html"});
    res.end("<!doctype html><title>blank</title>");
    return;
  }
  const path = join(root, decodeURIComponent(url.pathname));
  if (!path.startsWith(root)) { res.writeHead(403); res.end(); return; }
  try {
    const body = readFileSync(path);
    res.writeHead(200, {"content-type": MIME[extname(path)] || "application/octet-stream"});
    res.end(body);
  } catch {
    res.writeHead(404); res.end();
  }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const LINES = {ember:"cinder", tide:"brine", forest:"moss", inferno:"inferno", storm:"stormling", void:"voidling", tempest:"tempest"};
const NAMES = {ember:"Cinder", tide:"Brine", forest:"Moss", inferno:"Inferno", storm:"Stormling", void:"Voidling", tempest:"Tempest"};
function dragon(id, item, xp) {
  return {id, item, line: LINES[item], xp, name: NAMES[item], species: NAMES[item], seenStage: 0, trail: null, reveals: {}};
}
function save(dragons, roaming, stables) {
  return JSON.stringify({
    ver: 4, bank: 50, lifetime: 50, seq: 30, prize: roaming[0] || null, tab: "bank", scene: 0,
    owned: {}, bought: {}, opened: {}, eggs: [], dragons, dex: {},
    keep: {roaming, stables, zones: ["meadow"], care: {note: 1}, streak: {last: "yesterday", count: 2, best: 4}, restDay: 1}
  });
}
const six = ["r1","r2","r3","r4","r5","r6"].map(id => dragon(id, "ember", 0));
const extra = dragon("s1", "tide", 0);

const cases = [
  {
    name: "send",
    raw: save([dragon("a","ember",0), dragon("b","forest",30000), dragon("c","inferno",120000)], ["a","b"], ["c"]),
    async run(page) {
      return page.evaluate(() => {
        const before = localStorage.getItem("scalebank.v1");
        const writes = [];
        const orig = localStorage.setItem.bind(localStorage);
        localStorage.setItem = (k, v) => { if (k === "scalebank.v1") writes.push(v); return orig(k, v); };
        const ok = window.__moveKeep("send", "c");
        localStorage.setItem = orig;
        return {ok, writes: writes.length, save: localStorage.getItem("scalebank.v1"), before};
      });
    },
    check(r, t) {
      t.equal(r.ok, true, "send accepted");
      t.equal(r.writes, 1, "one save write");
      t.deepEqual(r.keep.roaming, ["a","b","c"], "sent to the end of roaming");
      t.deepEqual(r.keep.stables, [], "left the stables");
      t.sameDragons(r);
      t.keptMeta(r);
    }
  },
  {
    name: "rest",
    raw: save([dragon("a","ember",0), dragon("b","void",400000)], ["a","b"], []),
    async run(page) {
      return page.evaluate(() => {
        const writes = [];
        const orig = localStorage.setItem.bind(localStorage);
        localStorage.setItem = (k, v) => { if (k === "scalebank.v1") writes.push(v); return orig(k, v); };
        const ok = window.__moveKeep("rest", "a");
        localStorage.setItem = orig;
        return {ok, writes: writes.length, save: localStorage.getItem("scalebank.v1")};
      });
    },
    check(r, t) {
      t.equal(r.ok, true, "rest accepted");
      t.equal(r.writes, 1, "one save write");
      t.deepEqual(r.keep.roaming, ["b"], "left roaming");
      t.deepEqual(r.keep.stables, ["a"], "appended to stables");
      t.sameDragons(r);
      t.keptMeta(r);
    }
  },
  {
    name: "swap",
    raw: save([dragon("a","ember",0), dragon("b","tide",0), dragon("c","storm",30000), dragon("d","tempest",0)], ["a","b"], ["c","d"]),
    async run(page) {
      return page.evaluate(() => {
        const writes = [];
        const orig = localStorage.setItem.bind(localStorage);
        localStorage.setItem = (k, v) => { if (k === "scalebank.v1") writes.push(v); return orig(k, v); };
        const ok = window.__moveKeep("swap", "b", "c");
        localStorage.setItem = orig;
        return {ok, writes: writes.length, save: localStorage.getItem("scalebank.v1")};
      });
    },
    check(r, t) {
      t.equal(r.ok, true, "swap accepted");
      t.equal(r.writes, 1, "one save write");
      t.deepEqual(r.keep.roaming, ["a","c"], "roaming slot exchanged");
      t.deepEqual(r.keep.stables, ["b","d"], "stables slot exchanged");
      t.sameDragons(r);
      t.keptMeta(r);
    }
  },
  {
    name: "full",
    raw: save(six.concat(extra), six.map(d => d.id), ["s1"]),
    async run(page) {
      return page.evaluate(() => {
        const before = localStorage.getItem("scalebank.v1");
        const writes = [];
        const orig = localStorage.setItem.bind(localStorage);
        localStorage.setItem = (k, v) => { if (k === "scalebank.v1") writes.push(v); return orig(k, v); };
        const send = window.__moveKeep("send", "s1");
        const sendWrites = writes.length;
        const swap = window.__moveKeep("swap", "r6", "s1");
        const swapWrites = writes.length - sendWrites;
        localStorage.setItem = orig;
        return {send, sendWrites, swap, swapWrites, before, save: localStorage.getItem("scalebank.v1")};
      });
    },
    check(r, t) {
      t.equal(r.send, false, "send refused while roaming is full");
      t.equal(r.sendWrites, 0, "refused send does not write");
      t.equal(r.swap, true, "swap still works when the keep is full");
      t.equal(r.swapWrites, 1, "the swap is the only write");
      t.deepEqual(r.keep.roaming, ["r1","r2","r3","r4","r5","s1"], "roaming stays at six");
      t.deepEqual(r.keep.stables, ["r6"], "the displaced dragon rests");
      t.ok(r.keep.roaming.length <= 6, "roaming max 6");
      t.sameDragons(r);
    }
  },
  {
    name: "unknown",
    raw: save([dragon("a","ember",0), dragon("b","tide",0)], ["a"], ["b"]),
    async run(page) {
      return page.evaluate(() => {
        const before = localStorage.getItem("scalebank.v1");
        const writes = [];
        const orig = localStorage.setItem.bind(localStorage);
        localStorage.setItem = (k, v) => { if (k === "scalebank.v1") writes.push(v); return orig(k, v); };
        const results = [
          window.__moveKeep("send", "nope"),
          window.__moveKeep("rest", "nope"),
          window.__moveKeep("swap", "nope", "b"),
          window.__moveKeep("swap", "a", "nope"),
          window.__moveKeep("swap", "b", "a"),
          window.__moveKeep("send", "a"),
          window.__moveKeep("rest", "b")
        ];
        localStorage.setItem = orig;
        return {results, writes: writes.length, before, save: localStorage.getItem("scalebank.v1")};
      });
    },
    check(r, t) {
      t.deepEqual(r.results, [false, false, false, false, false, false, false], "unknown and wrong-list ids are refused");
      t.equal(r.writes, 0, "no save write");
      t.equal(r.save, r.before, "save text unchanged");
      t.deepEqual(r.keep.roaming, ["a"], "roaming unchanged");
      t.deepEqual(r.keep.stables, ["b"], "stables unchanged");
    }
  },
  {
    name: "reload",
    raw: save([dragon("a","ember",0), dragon("b","forest",0), dragon("c","void",120000)], ["a","b"], ["c"]),
    async run(page) {
      return page.evaluate(() => {
        const ok = window.__moveKeep("rest", "b");
        return {ok, save: localStorage.getItem("scalebank.v1")};
      });
    },
    check(r, t) {
      t.equal(r.ok, true, "rest accepted");
      t.deepEqual(r.keep.roaming, ["a"], "roaming after rest");
      t.deepEqual(r.keep.stables, ["c","b"], "stables after rest");
      t.deepEqual(r.again.roaming, ["a"], "roaming survived reload");
      t.deepEqual(r.again.stables, ["c","b"], "stables survived reload");
      t.deepEqual(r.againDragons, ["a","b","c"], "dragons survived reload");
    }
  }
];

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "/usr/local/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});

let failed = 0;
const lines = [];
try {
  for (const c of cases) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", err => errors.push(String(err)));
    await page.goto(base + "/__blank", {waitUntil: "load"});
    await page.evaluate(raw => { localStorage.clear(); localStorage.setItem("scalebank.v1", raw); }, c.raw);
    await page.goto(base + "/index.html", {waitUntil: "load"});
    const result = await c.run(page);
    const first = JSON.parse(result.save);
    await page.reload({waitUntil: "load"});
    const second = await page.evaluate(() => localStorage.getItem("scalebank.v1"));
    await page.close();
    const again = JSON.parse(second);
    const problems = [];
    const owned = () => JSON.parse(c.raw).dragons.map(d => d.id);
    const t = {
      equal(actual, expected, label) { if (actual !== expected) problems.push(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`); },
      deepEqual(actual, expected, label) { if (JSON.stringify(actual) !== JSON.stringify(expected)) problems.push(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`); },
      ok(cond, label) { if (!cond) problems.push(label); },
      sameDragons(r) { if (JSON.stringify(r.keep && r.dragons) !== JSON.stringify(owned())) problems.push("dragons changed: " + JSON.stringify(r.dragons)); },
      keptMeta(r) {
        const k = r.keep;
        if (!k || JSON.stringify(k.zones) !== JSON.stringify(["meadow"])) problems.push("zones lost");
        if (!k || !k.care || k.care.note !== 1) problems.push("care lost");
        if (!k || !k.streak || k.streak.count !== 2 || k.streak.best !== 4) problems.push("streak lost");
        if (!k || k.restDay !== 1) problems.push("rest day lost");
      }
    };
    const view = {
      ...result,
      keep: first.keep,
      dragons: first.dragons.map(d => d.id),
      again: again.keep,
      againDragons: again.dragons.map(d => d.id)
    };
    c.check(view, t);
    const placed = [...first.keep.roaming, ...first.keep.stables];
    const set = new Set(placed);
    if (set.size !== placed.length) problems.push("duplicate id");
    if (first.keep.roaming.length > 6) problems.push("roaming over 6");
    const expect = new Set(owned());
    if (set.size !== expect.size || [...set].some(id => !expect.has(id))) problems.push("ids lost or invented: " + JSON.stringify(placed));
    if (errors.length) problems.push("page error: " + errors.join(" | "));
    if (problems.length) {
      failed++;
      lines.push("FAIL " + c.name);
      problems.forEach(p => lines.push("  " + p));
    } else {
      lines.push(`ok   ${c.name}  roaming [${first.keep.roaming.join(",")}]  stables [${first.keep.stables.join(",") || "—"}]`);
    }
  }
} finally {
  await browser.close();
  await new Promise(r => server.close(r));
}

console.log(lines.join("\n"));
console.log(failed ? `\n${failed} failed` : `\n${cases.length} passed`);
process.exit(failed ? 1 : 0);
