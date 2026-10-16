/**
 * Pen unlocks and sprite keys. Run: node tests/keep-pens.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { boot } from "./game-vm.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "art/keep/sprites/manifest.json"), "utf8"));
const LINES = ["cinder", "inferno", "brine", "voidling", "stormling", "moss", "tempest"];
const STAGES = [["hatchling", 0], ["juvenile", 30000], ["adult", 120000], ["elder", 400000]];

function dragon(id, line, xp){
  return {id, item: "ember", line, xp, name: id, species: id, seenStage: 0, trail: null, reveals: {}};
}
function save(dragons){
  return JSON.stringify({
    ver: 4, bank: 1, lifetime: 1, seq: 3, prize: dragons[0] ? dragons[0].id : null, tab: "bank", scene: 0,
    owned: {}, bought: {}, opened: {}, eggs: [], dragons, dex: {},
    keep: {roaming: dragons.map(d => d.id).slice(0, 6), stables: dragons.map(d => d.id).slice(6), zones: ["meadow"], care: {}, streak: {last: null, count: 0, best: 0}, restDay: 0}
  });
}

const cases = [];
function add(name, fn){ cases.push({name, fn}); }

add("unlocks", t => {
  const g = boot(save([]));
  t.equal(g.pensOpen(0), 0, "no breeds");
  t.equal(g.pensOpen(1), 1, "first pen at 1");
  t.equal(g.pensOpen(2), 1, "still one pen at 2");
  t.equal(g.pensOpen(3), 2, "second pen at 3");
  t.equal(g.pensOpen(4), 2, "still two pens at 4");
  t.equal(g.pensOpen(5), 3, "third pen at 5");
  t.equal(g.pensOpen(7), 3, "seven breeds stay at three pens");
  t.equal(g.breedCount(), 0, "empty keep has no breeds");
});

add("keys", t => {
  const dragons = LINES.map((line, i) => dragon("d" + i, line, 0));
  const g = boot(save(dragons));
  t.equal(g.breedCount(), 7, "seven breeds");
  t.equal(manifest.frames, 8, "strip length");
  const keys = [];
  for (const line of LINES){
    for (const [name, xp] of STAGES){
      const key = line + "-" + name;
      keys.push(key);
      const spec = manifest.sprites[key];
      t.ok(spec, key + " is in the manifest");
      t.equal(spec.frames, 8, key + " frames");
      t.equal(spec.frameHeight, 176, key + " frame height");
      t.equal(spec.file, key + ".webp", key + " strip file");
      t.equal(spec.still, key + "-still.webp", key + " still file");
      t.equal(g.spriteKey({line, xp, item:"ember"}), key, "sprite key " + key);
      t.ok(spec.frameWidth > 0 && spec.fps > 0, key + " has width and fps");
    }
  }
  t.equal(Object.keys(manifest.sprites).length, keys.length, "manifest has one entry per breed and stage");
  t.equal(g.spriteKey({line:"cinder", xp:29999}), "cinder-hatchling", "just under juvenile");
  t.equal(g.spriteKey({line:"moss", xp:120000}), "moss-adult", "adult threshold");
  t.equal(g.spriteKey({line:"tempest", xp:400000}), "tempest-elder", "elder threshold");
});

add("breeds", t => {
  const g = boot(save([
    dragon("a", "cinder", 0),
    dragon("b", "cinder", 30000),
    dragon("c", "brine", 0)
  ]));
  t.equal(g.breedCount(), 2, "same breed twice counts once");
  t.equal(g.pensOpen(g.breedCount()), 1, "two breeds open the court only");
});

let failed = 0;
const lines = [];
for (const c of cases) {
  const problems = [];
  try {
    const g = {
      equal(actual, expected, label){ if (actual !== expected) problems.push(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`); },
      ok(cond, label){ if (!cond) problems.push(label); }
    };
    c.fn(g);
  } catch (e) {
    problems.push(e && e.stack ? e.stack : String(e));
  }
  if (problems.length) {
    failed++;
    lines.push("FAIL " + c.name);
    problems.forEach(p => lines.push("  " + p));
  } else lines.push("ok   " + c.name);
}
console.log(lines.join("\n"));
console.log(failed ? `\n${failed} failed` : `\n${cases.length} passed`);
process.exit(failed ? 1 : 0);
