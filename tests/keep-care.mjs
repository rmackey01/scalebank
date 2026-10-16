/**
 * Care cooldowns, bond cap, note unlocks, and save persistence.
 * Evaluates the game script from index.html. Run: node tests/keep-care.mjs
 */
import { boot } from "./game-vm.mjs";

const H = 60 * 60 * 1000;
function dragon(id, item, extra = {}){
  const line = {ember:"cinder", tide:"brine", forest:"moss", inferno:"inferno", storm:"stormling", void:"voidling", tempest:"tempest"}[item];
  return {id, item, line, xp: 0, name: id, species: id, seenStage: 0, trail: null, reveals: {}, ...extra};
}
function save(dragons, care = {}){
  return JSON.stringify({
    ver: 4, bank: 1, lifetime: 1, seq: 3, prize: dragons[0].id, tab: "bank", scene: 0,
    owned: {}, bought: {}, opened: {}, eggs: [], dragons, dex: {},
    keep: {roaming: dragons.map(d => d.id).slice(0, 6), stables: dragons.map(d => d.id).slice(6), zones: ["meadow"], care, streak: {last: null, count: 0, best: 0}, restDay: 0}
  });
}
function day(ts){
  const d = new Date(ts), p = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

const cases = [];
function add(name, fn){ cases.push({name, fn}); }

add("clock", t => {
  const g = boot(save([dragon("a", "ember")]));
  const ts = 1_700_000_000_000;
  g.setCareClock(() => ts);
  t.equal(g.now(), ts, "now() reads the override");
  t.equal(g.today(), day(ts), "today() uses the same clock");
  g.setCareClock(() => ts + 36 * H);
  t.equal(g.today(), day(ts + 36 * H), "today() moves with the clock");
  t.equal(g.now(), ts + 36 * H, "now() moved too");
});

add("cooldowns", t => {
  const raw = save([dragon("a", "ember")]);
  let clock = 0;
  const g = boot(raw);
  g.setCareClock(() => clock);
  t.ok(g.careAct("a", "feed"), "feed at epoch");
  t.equal(g.writes(), 1, "feed writes once");
  t.equal(g.careRecord("a").fed, 0, "fed stores timestamp 0");
  t.equal(g.careRecord("a").bond, 1, "bond 1");
  t.ok(!g.careAct("a", "feed"), "feed blocked at the same instant");
  t.equal(g.writes(), 1, "blocked feed does not write");
  clock = 4 * H - 1;
  t.ok(!g.careAct("a", "feed"), "feed blocked one ms early");
  clock = 4 * H;
  t.ok(g.careAct("a", "feed"), "feed ready at 4h");
  t.equal(g.careRecord("a").bond, 2, "second feed raises bond");

  const pet = boot(raw);
  let tp = 5_000;
  pet.setCareClock(() => tp);
  t.ok(pet.careAct("a", "pet"), "pet");
  tp = 5_000 + H - 1;
  t.ok(!pet.careAct("a", "pet"), "pet blocked just before 1h");
  t.ok(pet.careAct("a", "feed"), "feed is not blocked by pet");
  tp = 5_000 + H;
  t.ok(pet.careAct("a", "pet"), "pet ready at 1h");

  const groom = boot(raw);
  let tg = 9_000;
  groom.setCareClock(() => tg);
  t.ok(groom.careAct("a", "groom"), "groom");
  tg = 9_000 + 8 * H - 1;
  t.ok(!groom.careAct("a", "groom"), "groom blocked just before 8h");
  t.equal(groom.careRecord("a").bond, 1, "blocked groom does not raise bond");
  tg = 9_000 + 8 * H;
  t.ok(groom.careAct("a", "groom"), "groom ready at 8h");
});

add("bond-cap", t => {
  const g = boot(save([dragon("a", "ember")]));
  let clock = 10_000;
  g.setCareClock(() => clock);
  for (let i = 0; i < 100; i++){
    if (!g.careAct("a", "pet")) throw new Error("pet " + i + " refused");
    clock += H;
  }
  t.equal(g.careRecord("a").bond, 100, "bond stops at 100");
  t.equal(g.writes(), 100, "one write per action");
  const before = g.careRecord("a").petted;
  t.ok(g.careAct("a", "pet"), "care still works at the cap");
  t.equal(g.careRecord("a").bond, 100, "bond stays 100");
  t.ok(g.careRecord("a").petted > before, "timestamp still updates");
  const rec = g.snapshot().keep.care.a;
  t.deepEqual(Object.keys(rec).sort(), ["bond", "fed", "groomed", "petted"], "care record fields");
});

add("notes", t => {
  const g = boot(save([dragon("a", "ember")]));
  let clock = 20_000;
  g.setCareClock(() => clock);
  const locked = "Keep caring to learn more";
  const first = "It settles on the warmest stone and folds its frill down to keep the heat in.";
  const pet = n => { for (let i = 0; i < n; i++){ g.careAct("a", "pet"); clock += H; } };
  pet(9);
  t.equal(g.careRecord("a").bond, 9, "bond 9");
  t.ok(g.keeperNotes("a").every(n => n.text === locked && !n.open), "all notes locked under 10");
  pet(1);
  const at10 = g.keeperNotes("a");
  t.equal(at10[0].text, first, "first note at bond 10");
  t.ok(at10[0].open, "first note open");
  t.ok(at10.slice(1).every(n => n.text === locked && !n.open), "the other three stay locked");
  pet(20);
  const at30 = g.keeperNotes("a");
  t.equal(g.careRecord("a").bond, 30, "bond 30");
  t.ok(at30[0].open && at30[1].open && !at30[2].open && !at30[3].open, "two notes at 30");
  pet(30);
  const at60 = g.keeperNotes("a");
  t.ok(at60[0].open && at60[1].open && at60[2].open && !at60[3].open, "three notes at 60");
  pet(40);
  const at100 = g.keeperNotes("a");
  t.equal(g.careRecord("a").bond, 100, "bond 100");
  t.ok(at100.every(n => n.open && n.text !== locked), "all four notes open");
  t.deepEqual(at100.map(n => n.at), [10, 30, 60, 100], "unlock thresholds");
});

add("future-clock", t => {
  const minute = 60 * 1000;
  let clock = 10 * H;
  const g = boot(save([dragon("a", "ember")]));
  g.setCareClock(() => clock);
  t.ok(g.careAct("a", "feed"), "feed before the rollback");
  t.ok(g.careAct("a", "groom"), "groom before the rollback");
  t.ok(g.careAct("a", "pet"), "pet before the rollback");
  const bond = g.careRecord("a").bond;
  t.equal(g.careWait(10 * H, 0, 4 * H), 4 * H, "a future feed stamp waits the full 4h, not zero");
  t.equal(g.careWait(50 * H, 0, 8 * H), 8 * H, "a future groom stamp waits 8h, not days");
  t.equal(g.careWait(3 * H, 0, H), H, "a future pet stamp waits 1h");
  clock = 10 * H - minute;
  t.ok(!g.careAct("a", "feed"), "feed stays locked after a 1 minute rollback");
  t.ok(!g.careAct("a", "groom"), "groom stays locked after a 1 minute rollback");
  t.ok(!g.careAct("a", "pet"), "pet stays locked after a 1 minute rollback");
  t.equal(g.careRecord("a").bond, bond, "a rollback does not grant bond");
  const now = clock;
  t.equal(g.careRecord("a").fed, now, "feed stamp clamped to now");
  t.equal(g.careRecord("a").groomed, now, "groom stamp clamped to now");
  t.equal(g.careRecord("a").petted, now, "pet stamp clamped to now");
  t.equal(g.careWait(now, clock, 4 * H), 4 * H, "clamped feed waits the full cooldown");
  clock = now + minute;
  t.ok(!g.careAct("a", "feed"), "one minute later feed is still locked");
  clock = now + H - 1;
  t.ok(!g.careAct("a", "pet"), "pet stays locked until its own hour");
  clock = now + H;
  t.ok(g.careAct("a", "pet"), "pet unlocks after one normal hour");
  clock = now + 4 * H - 1;
  t.ok(!g.careAct("a", "feed"), "feed stays locked until 4h from the clamp");
  clock = now + 4 * H;
  t.ok(g.careAct("a", "feed"), "feed unlocks after one normal cooldown");
  clock = now + 8 * H - 1;
  t.ok(!g.careAct("a", "groom"), "groom stays locked until 8h from the clamp");
  clock = now + 8 * H;
  t.ok(g.careAct("a", "groom"), "groom unlocks after one normal cooldown");
});

add("rollback-days", t => {
  let clock = 12 * 24 * H;
  const g = boot(save([dragon("a", "ember")]));
  g.setCareClock(() => clock);
  t.ok(g.careAct("a", "feed"), "feed days before the rollback");
  const bond = g.careRecord("a").bond;
  clock = 0;
  t.ok(g.careWait(g.careRecord("a").fed, clock, 4 * H) <= 4 * H, "the wait is at most one feed cooldown");
  t.ok(!g.careAct("a", "feed"), "a multi-day rollback does not make feed ready");
  t.equal(g.careRecord("a").fed, 0, "the future stamp is clamped to now");
  t.equal(g.careRecord("a").bond, bond, "clamping does not raise bond");
  clock = 4 * H - 1;
  t.ok(!g.careAct("a", "feed"), "still locked inside that one cooldown");
  clock = 4 * H;
  t.ok(g.careAct("a", "feed"), "feed unlocks after at most one normal cooldown");
  t.equal(g.careRecord("a").bond, bond + 1, "the later feed raises bond once");
});

add("seals", t => {
  const g = boot(save([
    dragon("plain", "ember"),
    dragon("moon", "ember", {mut: "moonlit"}),
    dragon("gilt", "tide", {mut: "gilded"})
  ]));
  const dragons = g.snapshot().dragons;
  const byId = id => dragons.find(d => d.id === id);
  t.deepEqual(g.careSeals(byId("plain")), [], "a plain dragon shows no seal");
  t.deepEqual(g.careSeals(byId("moon")), ["moonlit"], "a mutated dragon shows only its own seal");
  t.deepEqual(g.careSeals(byId("gilt")), ["gilded"], "another dragon's mutation is not borrowed");
  t.deepEqual(g.careSeals({id: "plain", line: "cinder", mut: null}), [], "null mut stays plain");
  t.deepEqual(g.careSeals({id: "x", line: "cinder", mut: "nope"}), [], "an unknown mutation is not a seal");
});

add("unknown", t => {
  const g = boot(save([dragon("a", "ember"), dragon("b", "tide")]));
  g.setCareClock(() => 50_000);
  const before = g.text();
  t.ok(!g.careAct("nope", "feed"), "unknown id");
  t.ok(!g.careAct("a", "sing"), "unknown action");
  t.equal(g.writes(), 0, "refused care does not write");
  t.ok(g.careAct("b", "feed"), "known dragon can be fed");
  const writesAfterKnown = g.writes();
  t.ok(!g.careAct("missing", "pet"), "missing id");
  t.equal(g.writes(), writesAfterKnown, "unknown id does not write");
  t.equal(g.snapshot().keep.care.a, undefined, "a was not cared for");
  t.ok(before !== g.text(), "known care did write");
});

add("persist", t => {
  const g = boot(save([dragon("a", "forest"), dragon("m", "ember", {mut:"moonlit"})], {note: 1}));
  let clock = 80_000;
  g.setCareClock(() => clock);
  t.ok(g.careAct("a", "groom"), "groom saved");
  t.ok(g.careAct("a", "pet"), "pet saved");
  const again = boot(g.text());
  again.setCareClock(() => clock);
  const rec = again.careRecord("a");
  t.equal(rec.bond, 2, "bond survived reload");
  t.equal(rec.groomed, 80_000, "groomed survived reload");
  t.equal(rec.petted, 80_000, "petted survived reload");
  t.equal(rec.fed, null, "feed still unused");
  t.equal(again.snapshot().keep.care.note, 1, "unrelated care key kept");
  t.ok(!again.careAct("a", "groom"), "groom cooldown survived reload");
  t.equal(again.keeperNotes("a").every(n => !n.open), true, "bond 2 keeps notes locked");
  clock = 80_000 + 8 * H;
  again.setCareClock(() => clock);
  t.ok(again.careAct("a", "groom"), "groom works again after reload once 8h pass");
  const third = boot(again.text());
  t.equal(third.careRecord("a").bond, 3, "the later groom persisted too");
});

let failed = 0;
const lines = [];
for (const c of cases) {
  const problems = [];
  try {
    const g = {
      equal(actual, expected, label){ if (actual !== expected) problems.push(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`); },
      deepEqual(actual, expected, label){ if (JSON.stringify(actual) !== JSON.stringify(expected)) problems.push(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`); },
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
