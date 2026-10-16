/**
 * Checks moveKeep: one save write, no lost or duplicate ids, one dragon per breed.
 * The function is evaluated from index.html. There is no window hook.
 * Run from the repo root: node tests/keep-moves.mjs
 */
import { boot } from "./game-vm.mjs";

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
const breeds = ["ember","tide","forest","inferno","storm","void","tempest"];
const seven = breeds.map((item, i) => dragon("k" + i, item, 0));
const dup = dragon("dup", "ember", 120000);

const cases = [
  {
    name: "send",
    raw: save([dragon("a","ember",0), dragon("b","forest",30000), dragon("c","inferno",120000)], ["a","b"], ["c"]),
    run(g) {
      const ok = g.moveKeep("send", "c");
      return {ok, writes: g.writes()};
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
    run(g) {
      const ok = g.moveKeep("rest", "a");
      return {ok, writes: g.writes()};
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
    run(g) {
      const ok = g.moveKeep("swap", "b", "c");
      return {ok, writes: g.writes()};
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
    name: "breed",
    raw: save(seven.concat(dup), seven.map(d => d.id), ["dup"]),
    run(g) {
      const send = g.moveKeep("send", "dup");
      return {send, writes: g.writes()};
    },
    check(r, t) {
      t.equal(r.send, true, "a duplicate breed swaps into that slot");
      t.equal(r.writes, 1, "one save write");
      t.deepEqual(r.keep.roaming, ["dup","k1","k2","k3","k4","k5","k6"], "the breed's keep dragon is replaced");
      t.deepEqual(r.keep.stables, ["k0"], "the other one rests");
      t.equal(r.keep.shown && r.keep.shown.cinder, "dup", "the arrival is that breed's ledger pick");
      t.ok(r.keep.roaming.length <= 7, "roaming max 7");
      t.sameDragons(r);
    }
  },
  {
    name: "unknown",
    raw: save([dragon("a","ember",0), dragon("b","tide",0)], ["a"], ["b"]),
    run(g) {
      const before = g.text();
      const results = [
        g.moveKeep("send", "nope"),
        g.moveKeep("rest", "nope"),
        g.moveKeep("swap", "nope", "b"),
        g.moveKeep("swap", "a", "nope"),
        g.moveKeep("swap", "b", "a"),
        g.moveKeep("send", "a"),
        g.moveKeep("rest", "b")
      ];
      return {results, writes: g.writes(), before, text: g.text()};
    },
    check(r, t) {
      t.deepEqual(r.results, [false, false, false, false, false, false, false], "unknown and wrong-list ids are refused");
      t.equal(r.writes, 0, "no save write");
      t.equal(r.text, r.before, "save text unchanged");
      t.deepEqual(r.keep.roaming, ["a"], "roaming unchanged");
      t.deepEqual(r.keep.stables, ["b"], "stables unchanged");
    }
  },
  {
    name: "reload",
    raw: save([dragon("a","ember",0), dragon("b","forest",0), dragon("c","void",120000)], ["a","b"], ["c"]),
    run(g) {
      const ok = g.moveKeep("rest", "b");
      const again = boot(g.text()).snapshot();
      return {ok, again};
    },
    check(r, t) {
      t.equal(r.ok, true, "rest accepted");
      t.deepEqual(r.keep.roaming, ["a"], "roaming after rest");
      t.deepEqual(r.keep.stables, ["c","b"], "stables after rest");
      t.deepEqual(r.again.keep.roaming, ["a"], "roaming survived reload");
      t.deepEqual(r.again.keep.stables, ["c","b"], "stables survived reload");
      t.deepEqual(r.again.dragons.map(d => d.id), ["a","b","c"], "dragons survived reload");
    }
  }
];

let failed = 0;
const lines = [];
for (const c of cases) {
  const problems = [];
  let view = null;
  try {
    const g = boot(c.raw);
    const result = c.run(g);
    const snap = g.snapshot();
    const owned = () => JSON.parse(c.raw).dragons.map(d => d.id);
    const t = {
      equal(actual, expected, label) { if (actual !== expected) problems.push(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`); },
      deepEqual(actual, expected, label) { if (JSON.stringify(actual) !== JSON.stringify(expected)) problems.push(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`); },
      ok(cond, label) { if (!cond) problems.push(label); },
      sameDragons(r) { if (JSON.stringify(r.dragons) !== JSON.stringify(owned())) problems.push("dragons changed: " + JSON.stringify(r.dragons)); },
      keptMeta(r) {
        const k = r.keep;
        if (!k || JSON.stringify(k.zones) !== JSON.stringify(["meadow"])) problems.push("zones lost");
        if (!k || !k.care || k.care.note !== 1) problems.push("care lost");
        if (!k || !k.streak || k.streak.count !== 2 || k.streak.best !== 4) problems.push("streak lost");
        if (!k || k.restDay !== 1) problems.push("rest day lost");
      }
    };
    view = {...result, keep: snap.keep, dragons: snap.dragons.map(d => d.id)};
    c.check(view, t);
    const placed = [...snap.keep.roaming, ...snap.keep.stables];
    const set = new Set(placed);
    if (set.size !== placed.length) problems.push("duplicate id");
    if (snap.keep.roaming.length > 7) problems.push("roaming over 7");
    const expect = new Set(owned());
    if (set.size !== expect.size || [...set].some(id => !expect.has(id))) problems.push("ids lost or invented: " + JSON.stringify(placed));
  } catch (e) {
    problems.push(e && e.stack ? e.stack : String(e));
  }
  if (problems.length) {
    failed++;
    lines.push("FAIL " + c.name);
    problems.forEach(p => lines.push("  " + p));
  } else {
    lines.push(`ok   ${c.name}  roaming [${view.keep.roaming.join(",")}]  stables [${view.keep.stables.join(",") || "—"}]`);
  }
}
console.log(lines.join("\n"));
console.log(failed ? `\n${failed} failed` : `\n${cases.length} passed`);
process.exit(failed ? 1 : 0);
