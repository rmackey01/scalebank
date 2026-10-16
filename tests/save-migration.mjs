/**
 * Boots index.html against sample saves and checks the v4 Dragon Keep migration.
 * Run from the repo root: node tests/save-migration.mjs
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
function dragon(id, item, xp, extra = {}) {
  return {id, item, line: LINES[item], xp, name: id, species: id, seenStage: 0, trail: null, reveals: {}, ...extra};
}
const dex = (n, top) => ({first: null, n, top});

const ordered = [
  dragon("inf-elder", "inferno", 400000),
  dragon("moss-elder", "forest", 400000),
  dragon("a-tide", "tide", 400000),
  dragon("z-tide", "tide", 400000),
  dragon("void-adult", "void", 120000, {mut:"moonlit"}),
  dragon("storm-juv", "storm", 30000),
  dragon("temp-hatch", "tempest", 0),
  dragon("ember-hatch", "ember", 0)
];
const v3 = {
  ver: 3, bank: 4321, lifetime: 88000, seq: 12, prize: "a-tide", tab: "bank", scene: 0,
  owned: {ember: 4, void: 1, trail: 1}, bought: {trail: 1}, opened: {},
  eggs: [{id:"egg9", item:"tide", at: 88000}],
  dragons: ordered,
  dex: {
    inferno: dex(2, 3), moss: dex(1, 3), brine: dex(4, 3),
    "voidling:moonlit": dex(3, 2), stormling: dex(1, 1), tempest: dex(1, 0), cinder: dex(6, 0)
  }
};

const cases = [
  {
    name: "v1",
    raw: JSON.stringify({
      bank: 2500, lifetime: 9000, seq: 4, prize: "ash", tab: "bank",
      owned: {ember: 2, frost: 1}, bought: {trail: 1},
      eggs: [{id:"egg1", item:"frost", at: 9000}],
      dragons: [
        {id:"ash", item:"ember", xp: 30000, name:"Ash", color:"red", horns:"curl"},
        {id:"moon", item:"ember", xp: 0, mut:"moonlit", name:"Moon"}
      ]
    }),
    backup: true,
    check(s, t) {
      t.equal(s.ver, 4, "ver 4");
      t.equal(s.bank, 2500, "coins");
      t.equal(s.lifetime, 9000, "lifetime");
      t.deepEqual(s.owned, {ember: 2}, "owned counts (retired frost egg dropped by the v1 chain)");
      t.deepEqual(s.bought, {trail: 1}, "bought");
      t.deepEqual(s.dragons.map(d => d.id), ["ash", "moon"], "no dragon lost");
      t.equal(s.dragons[0].horns, undefined, "v1 chain still strips horns");
      t.equal(s.eggs[0].item, "tide", "v1 chain still maps frost eggs onto tide");
      t.equal(s.dex.cinder.n, 2, "v1 chain rebuilds the base count from owned dragons");
      t.equal(s.dex["cinder:moonlit"].n, 1, "v1 chain records the mutation");
      t.deepEqual(s.keep.roaming, ["ash", "moon"], "juvenile outranks the moonlit hatchling");
      t.deepEqual(s.keep.stables, [], "stables");
      t.keepDefaults(s);
    }
  },
  {
    name: "v2",
    raw: JSON.stringify({
      ver: 2, bank: 100, lifetime: 100, seq: 2, prize: null, tab: "bank",
      owned: {storm: 3}, bought: {}, opened: {}, eggs: [],
      dragons: [dragon("skip", "storm", 0)],
      dex: {stormling: dex(9, 0)}
    }),
    backup: true,
    check(s, t) {
      t.equal(s.ver, 4, "ver 4");
      t.equal(s.bank, 100, "coins");
      t.equal(s.dex.stormling.n, 9, "v2 dex count preserved");
      t.deepEqual(s.owned, {storm: 3}, "owned");
      t.deepEqual(s.dragons.map(d => d.id), ["skip"], "dragon kept");
      t.deepEqual(s.keep.roaming, ["skip"], "roaming");
      t.deepEqual(s.keep.stables, [], "stables");
      t.keepDefaults(s);
    }
  },
  {
    name: "v3",
    raw: JSON.stringify(v3),
    backup: true,
    check(s, t) {
      t.equal(s.ver, 4, "ver 4");
      t.equal(s.bank, 4321, "coins");
      t.equal(s.lifetime, 88000, "lifetime");
      t.equal(s.seq, 12, "seq");
      t.equal(s.prize, "a-tide", "prize");
      t.deepEqual(s.owned, v3.owned, "owned counts");
      t.deepEqual(s.bought, v3.bought, "bought");
      t.deepEqual(s.eggs.map(e => e.id), ["egg9"], "egg kept");
      t.deepEqual(s.dragons.map(d => d.id), ordered.map(d => d.id), "no dragon lost or reordered");
      t.equal(s.dex.inferno.n, 2, "inferno count");
      t.equal(s.dex.brine.n, 4, "brine count");
      t.equal(s.dex.cinder.n, 6, "cinder count");
      t.equal(s.dex["voidling:moonlit"].n, 3, "mutation count");
      t.deepEqual(s.keep.roaming, ["inf-elder", "moss-elder", "a-tide", "z-tide", "void-adult", "storm-juv"], "six highest stage, then rarity, then id");
      t.deepEqual(s.keep.stables, ["temp-hatch", "ember-hatch"], "the rest stabled, legendary hatchling included");
      t.ok(new Set([...s.keep.roaming, ...s.keep.stables]).size === 8, "each id once");
      t.keepDefaults(s);
      t.equal(t.balance, "4,321", "bank still shows the same coins");
    }
  },
  {
    name: "missing",
    raw: undefined,
    backup: false,
    check(s, t) {
      t.equal(s.ver, 4, "ver 4");
      t.equal(s.bank, 0, "coins");
      t.deepEqual(s.dragons, [], "no dragons");
      t.deepEqual(s.keep.roaming, [], "roaming");
      t.deepEqual(s.keep.stables, [], "stables");
      t.keepDefaults(s);
    }
  },
  {
    name: "json-null",
    raw: "null",
    backup: true,
    check(s, t) {
      t.equal(s.ver, 4, "ver 4");
      t.equal(s.bank, 0, "coins");
      t.deepEqual(s.keep.roaming, [], "roaming");
      t.deepEqual(s.keep.stables, [], "stables");
      t.keepDefaults(s);
    }
  },
  {
    name: "corrupt",
    raw: "{",
    backup: true,
    corrupt: true,
    check(s, t) {
      t.equal(s.ver, 4, "ver 4");
      t.equal(s.bank, 0, "fell back to an empty save");
      t.deepEqual(s.dragons, [], "no dragons");
      t.deepEqual(s.keep.roaming, [], "roaming");
      t.keepDefaults(s);
      t.equal(t.balance, "0", "page still booted");
      t.equal(t.corrupt, "{", "raw corrupt save copied");
    }
  },
  {
    name: "corrupt-kept",
    raw: "{",
    backup: true,
    corruptSeed: "ALREADY",
    corrupt: "ALREADY",
    check(s, t) {
      t.equal(s.ver, 4, "ver 4");
      t.equal(s.bank, 0, "still reset to defaults");
      t.equal(t.corrupt, "ALREADY", "existing corrupt copy left alone");
    }
  },
  {
    name: "partial",
    raw: JSON.stringify({bank: 1234, lifetime: 50, owned: {ember: 2}, dragons: [dragon("only", "void", 400000)], keep: {roaming: ["ghost"]}}),
    backup: true,
    check(s, t) {
      t.equal(s.ver, 4, "ver 4");
      t.equal(s.bank, 1234, "coins");
      t.equal(s.lifetime, 50, "lifetime");
      t.deepEqual(s.owned, {ember: 2}, "owned");
      t.deepEqual(s.dragons.map(d => d.id), ["only"], "dragon kept");
      t.deepEqual(s.keep.roaming, ["only"], "partial keep was rebuilt from owned dragons");
      t.deepEqual(s.keep.stables, [], "stables");
      t.keepDefaults(s);
    }
  },
  {
    name: "junk",
    raw: JSON.stringify({
      ver: 3, bank: 77, lifetime: 88, owned: {forest: 1}, bought: {},
      dragons: [null, dragon("dup", "ember", 0), "nope", dragon("dup", "tempest", 400000), ["nope"], dragon("solo", "forest", 0)],
      keep: null, dex: {cinder: 1}
    }),
    backup: true,
    check(s, t) {
      t.equal(s.bank, 77, "coins");
      t.equal(s.lifetime, 88, "lifetime");
      t.deepEqual(s.owned, {forest: 1}, "owned");
      t.deepEqual(s.dragons.map(d => d.id), ["dup", "dup", "solo"], "real dragons kept, junk dropped");
      t.deepEqual(s.keep.roaming, ["dup", "solo"], "duplicate id placed once, using its higher stage");
      t.deepEqual(s.keep.stables, [], "stables");
      t.keepDefaults(s);
    }
  },
  {
    name: "bak-kept",
    raw: JSON.stringify({ver: 3, bank: 5, lifetime: 5, owned: {}, dragons: [dragon("one", "ember", 0)]}),
    bak: "KEEP-ME",
    backup: "KEEP-ME",
    check(s, t) {
      t.equal(s.bank, 5, "coins");
      t.deepEqual(s.keep.roaming, ["one"], "still migrated");
      t.equal(t.bak, "KEEP-ME", "existing backup left alone");
    }
  },
  {
    name: "v4",
    raw: JSON.stringify({
      ver: 4, bank: 9, lifetime: 9, seq: 3, prize: "b", tab: "bank", scene: 0,
      owned: {}, bought: {}, opened: {}, eggs: [],
      dragons: [dragon("a", "ember", 0), dragon("b", "ember", 0)],
      dex: {},
      keep: {roaming: ["b", "a"], stables: [], zones: ["meadow"], care: {b: 1}, streak: {last: "yesterday", count: 4, best: 6}, restDay: 3}
    }),
    backup: false,
    check(s, t) {
      t.equal(s.ver, 4, "ver 4");
      t.equal(s.bank, 9, "coins");
      t.deepEqual(s.keep.roaming, ["b", "a"], "already-migrated order is not resorted");
      t.deepEqual(s.keep.stables, [], "stables");
      t.deepEqual(s.keep.zones, ["meadow"], "zones");
      t.deepEqual(s.keep.care, {b: 1}, "care");
      t.deepEqual(s.keep.streak, {last: "yesterday", count: 4, best: 6}, "streak");
      t.equal(s.keep.restDay, 3, "rest day");
      t.equal(t.bak, null, "no backup written for a v4 save");
    }
  },
  {
    name: "hatch",
    raw: JSON.stringify({
      ver: 4, bank: 100, lifetime: 6000, seq: 8, prize: "old", tab: "bank", scene: 0,
      owned: {ember: 1}, bought: {ember: 1}, opened: {},
      eggs: [{id: "egg1", item: "ember", at: 0}],
      dragons: [dragon("old", "ember", 0)],
      dex: {cinder: dex(1, 0)},
      keep: {roaming: ["old"], stables: [], zones: [], care: {}, streak: {last: null, count: 0, best: 0}, restDay: 0}
    }),
    backup: false,
    waitDragons: 2,
    check(s, t) {
      t.equal(s.bank, 100, "coins");
      t.equal(s.lifetime, 6000, "lifetime");
      t.deepEqual(s.dragons.map(d => d.id), ["old", "drg8"], "hatched dragon kept");
      t.deepEqual(s.eggs, [], "egg consumed");
      t.deepEqual(s.keep.roaming, ["old", "drg8"], "new dragon joined roaming");
      t.deepEqual(s.keep.stables, [], "stables");
      t.equal(s.dex.cinder.n, 2, "hatch count");
    }
  },
  {
    name: "hatch-seventh",
    raw: JSON.stringify({
      ver: 4, bank: 40, lifetime: 6000, seq: 20, prize: "d1", tab: "bank", scene: 0,
      owned: {ember: 6}, bought: {}, opened: {},
      eggs: [{id: "egg7", item: "ember", at: 0}],
      dragons: ["d1", "d2", "d3", "d4", "d5", "d6"].map(id => dragon(id, "ember", 0)),
      dex: {cinder: dex(6, 0)},
      keep: {roaming: ["d1", "d2", "d3", "d4", "d5", "d6"], stables: [], zones: [], care: {}, streak: {last: null, count: 0, best: 0}, restDay: 0}
    }),
    backup: false,
    waitDragons: 7,
    check(s, t) {
      t.equal(s.bank, 40, "coins");
      t.deepEqual(s.dragons.map(d => d.id), ["d1", "d2", "d3", "d4", "d5", "d6", "drg20"], "seventh dragon kept");
      t.deepEqual(s.keep.roaming, ["d1", "d2", "d3", "d4", "d5", "d6"], "roaming stays the first six");
      t.deepEqual(s.keep.stables, ["drg20"], "seventh goes to stables");
    }
  },
  {
    name: "reconcile",
    raw: JSON.stringify({
      ver: 4, bank: 15, lifetime: 15, seq: 9, prize: "r1", tab: "bank", scene: 0,
      owned: {}, bought: {}, opened: {}, eggs: [],
      dragons: ["r1", "r2", "r3", "r4", "r5", "r6", "extra"].map(id => dragon(id, "tide", 0)),
      dex: {},
      keep: {roaming: ["r1", "r2", "r3", "r4", "r5", "stale"], stables: ["ghost"], zones: [], care: {}, streak: {last: null, count: 0, best: 0}, restDay: 0}
    }),
    backup: false,
    check(s, t) {
      t.equal(s.bank, 15, "coins");
      t.deepEqual(s.dragons.map(d => d.id), ["r1", "r2", "r3", "r4", "r5", "r6", "extra"], "owned dragons unchanged");
      t.deepEqual(s.keep.roaming, ["r1", "r2", "r3", "r4", "r5", "r6"], "missing id filled the open roaming slot");
      t.deepEqual(s.keep.stables, ["extra"], "the rest go to stables, stale ids dropped");
    }
  }
];

function keepDefaults(s) {
  const k = s.keep;
  const ok = k && Array.isArray(k.zones) && k.zones.length === 0
    && k.care && typeof k.care === "object" && !Array.isArray(k.care) && Object.keys(k.care).length === 0
    && k.streak && k.streak.last === null && k.streak.count === 0 && k.streak.best === 0
    && k.restDay === 0;
  return ok;
}

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
    await page.evaluate(setup => {
      localStorage.clear();
      if (setup.hasRaw) localStorage.setItem("scalebank.v1", setup.raw);
      if (setup.hasBak) localStorage.setItem("scalebank.bak.v3", setup.bak);
      if (setup.hasCorrupt) localStorage.setItem("scalebank.corrupt", setup.corrupt);
    }, {hasRaw: c.raw !== undefined, raw: c.raw ?? null, hasBak: c.bak !== undefined, bak: c.bak ?? null, hasCorrupt: c.corruptSeed !== undefined, corrupt: c.corruptSeed ?? null});
    await page.goto(base + "/index.html", {waitUntil: "load"});
    if (c.waitDragons){
      await page.waitForFunction(n => {
        try { return JSON.parse(localStorage.getItem("scalebank.v1") || "{}").dragons.length >= n; }
        catch (e) { return false; }
      }, {timeout: 5000}, c.waitDragons);
    }
    const read = () => page.evaluate(() => ({
      save: localStorage.getItem("scalebank.v1"),
      bak: localStorage.getItem("scalebank.bak.v3"),
      corrupt: localStorage.getItem("scalebank.corrupt"),
      balance: document.querySelector("#balance") ? document.querySelector("#balance").textContent : null
    }));
    const first = await read();
    await page.reload({waitUntil: "load"});
    const second = await read();
    await page.close();

    const problems = [];
    const s = first.save ? JSON.parse(first.save) : null;
    const s2 = second.save ? JSON.parse(second.save) : null;
    const t = {
      balance: first.balance,
      bak: first.bak,
      corrupt: first.corrupt,
      equal(actual, expected, label) { if (actual !== expected) problems.push(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`); },
      deepEqual(actual, expected, label) { if (JSON.stringify(actual) !== JSON.stringify(expected)) problems.push(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`); },
      ok(cond, label) { if (!cond) problems.push(label); },
      keepDefaults(state) { if (!keepDefaults(state)) problems.push("keep defaults: " + JSON.stringify(state.keep)); }
    };
    if (!s) problems.push("save missing after boot");
    else c.check(s, t);
    if (JSON.stringify(s) !== JSON.stringify(s2)) problems.push("second boot changed the save");
    if (first.bak !== second.bak) problems.push("second boot changed the backup");
    if (first.corrupt !== second.corrupt) problems.push("second boot changed the corrupt copy");
    const expectCorrupt = c.corrupt === true ? c.raw : (c.corrupt === undefined ? null : c.corrupt);
    if (first.corrupt !== expectCorrupt) problems.push("corrupt copy: " + JSON.stringify(first.corrupt) + " !== " + JSON.stringify(expectCorrupt));
    if (c.backup === false) {
      if (first.bak !== null) problems.push("backup written: " + JSON.stringify(first.bak));
    } else if (c.backup === true) {
      if (first.bak !== c.raw) problems.push("backup is not the raw old save");
    } else if (first.bak !== c.backup) problems.push("backup mismatch: " + JSON.stringify(first.bak));
    if (errors.length) problems.push("page error: " + errors.join(" | "));
    if (s) {
      const ids = new Set();
      const placed = [...(s.keep.roaming || []), ...(s.keep.stables || [])];
      placed.forEach(id => { if (ids.has(id)) problems.push("duplicate id " + id); ids.add(id); });
      if ((s.keep.roaming || []).length > 6) problems.push("roaming has more than 6");
    }
    if (problems.length) {
      failed++;
      lines.push("FAIL " + c.name);
      problems.forEach(p => lines.push("  " + p));
    } else {
      const roam = s.keep.roaming.join(",") || "—";
      const stab = s.keep.stables.join(",") || "—";
      lines.push(`ok   ${c.name}  roaming [${roam}]  stables [${stab}]  coins ${s.bank}  backup ${c.backup === false ? "absent" : "kept"}`);
    }
  }
} finally {
  await browser.close();
  await new Promise(r => server.close(r));
}

console.log(lines.join("\n"));
console.log(failed ? `\n${failed} failed` : `\n${cases.length} passed`);
process.exit(failed ? 1 : 0);
