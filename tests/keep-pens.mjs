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

add("mutations", t => {
  const g = boot(save([]));
  const plain = {line:"cinder", xp:0, item:"ember"};
  const moon = {line:"cinder", xp:0, item:"ember", mut:"moonlit"};
  const other = {line:"cinder", xp:0, item:"ember", mut:"obsidian"};
  const bogus = {line:"cinder", xp:0, item:"ember", mut:"cursed"};
  const bare = {frames:8, sprites: manifest.sprites};
  const plainChain = g.spriteChain(plain, bare);
  t.equal(plainChain.length, 2, "plain dragon uses the base strip and still");
  t.equal(plainChain[0].bag, "sprites", "plain strip comes from the base book");
  t.equal(plainChain[0].file, "cinder-hatchling.webp", "plain strip file");
  t.equal(plainChain[0].spec.frameHeight, 176, "base height is that entry's own");
  t.equal(g.spriteChain(moon, bare).map(s => s.file).join(","), plainChain.map(s => s.file).join(","), "a missing mutations object keeps the base sprite");
  t.equal(g.spriteChain(moon, {frames:8, sprites: manifest.sprites, mutations: null}).length, 2, "a null mutations object keeps the base sprite");
  const book = {frames:8, sprites: manifest.sprites, mutations: {
    "cinder-moonlit-hatchling": {file:"mut/cinder-moonlit-hatchling.webp", still:"mut/cinder-moonlit-hatchling-still.webp", frameWidth:181, frameHeight:180, frames:8, fps:10.0, motion:"moonlit"},
    "cinder-moonlit-juvenile": {file:"mut/cinder-moonlit-juvenile.webp", still:"mut/cinder-moonlit-juvenile-still.webp", frameWidth:160, frameHeight:200, frames:6, fps:7.5}
  }};
  const mut = g.spriteChain(moon, book);
  t.equal(mut.length, 4, "mutation strip, mutation still, then the base strip and still");
  t.equal(mut[0].bag, "mutations", "mutation strip is first");
  t.equal(mut[0].key, "cinder-moonlit-hatchling", "mutation key");
  t.equal(mut[0].kind, "strip", "first step is the strip");
  t.equal(mut[0].file, "mut/cinder-moonlit-hatchling.webp", "mutation strip file");
  t.equal(mut[0].spec.frameWidth, 181, "width is read from the mutation entry");
  t.equal(mut[0].spec.frameHeight, 180, "height is read from the mutation entry");
  t.equal(mut[0].spec.fps, 10, "fps is read from the mutation entry");
  t.equal(mut[1].kind, "still", "mutation still is the next fallback");
  t.equal(mut[1].file, "mut/cinder-moonlit-hatchling-still.webp", "mutation still file");
  t.equal(mut[1].spec.frameHeight, 180, "the still uses that same entry");
  t.equal(mut[2].bag, "sprites", "base strip follows the mutation art");
  t.equal(mut[2].file, "cinder-hatchling.webp", "base strip file");
  t.equal(mut[2].spec.frameHeight, 176, "base entry keeps its own height");
  t.equal(mut[3].kind, "still", "base still is last");
  const grown = g.spriteChain({line:"cinder", xp:30000, item:"ember", mut:"moonlit"}, book);
  t.equal(grown[0].key, "cinder-moonlit-juvenile", "stage is part of the mutation key");
  t.equal(grown[0].spec.frameWidth, 160, "juvenile width is its own");
  t.equal(grown[0].spec.frameHeight, 200, "juvenile height is its own");
  t.equal(grown[0].spec.fps, 7.5, "juvenile fps is its own");
  t.equal(grown[0].spec.frames, 6, "juvenile frame count is its own");
  t.equal(g.spriteChain(other, book)[0].bag, "sprites", "a mutation with no entry uses the base sprite");
  t.equal(g.spriteChain(bogus, book)[0].file, "cinder-hatchling.webp", "an unknown mutation stays on the base sprite");
  t.equal(g.spriteChain(plain, book).length, 2, "a plain dragon does not walk the mutation chain");
  t.equal(g.spriteChain(plain, book)[0].bag, "sprites", "a plain dragon keeps the base sprite");
  const pix = {file:"cinder-hatchling.webp", still:"cinder-hatchling-still.webp", frameWidth:84, frameHeight:74, frames:8, fps:4, anchor:"bottom-center"};
  const withPix = {frames:8, fps:4, sprites: manifest.sprites, pixel: {"cinder-hatchling": pix}, mutations: book.mutations};
  const pixelFirst = g.spriteChain(plain, withPix);
  t.equal(pixelFirst[0].bag, "pixel", "a plain dragon prefers the pixel strip");
  t.equal(pixelFirst[0].kind, "strip", "pixel strip is first");
  t.equal(pixelFirst[0].spec.fps, 4, "pixel strip breathes at 4 fps");
  t.equal(pixelFirst[0].spec.anchor, "bottom-center", "pixel strip anchors at the feet");
  t.equal(pixelFirst[1].kind, "still", "pixel still follows the strip");
  t.equal(pixelFirst[2].bag, "sprites", "the old strip is the next fallback");
  t.equal(pixelFirst[3].kind, "still", "the old still is last");
  t.equal(g.spriteChain(moon, withPix)[0].bag, "mutations", "a mutation entry still comes before the pixel art");
  t.equal(g.spriteChain(other, withPix)[0].bag, "pixel", "a mutation with no entry uses the pixel art");
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
