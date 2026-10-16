/**
 * Daily visit streak, Sunday rest, clock rollback, and one claim a day.
 * Run: node tests/keep-streak.mjs
 */
import { boot } from "./game-vm.mjs";

const H = 60 * 60 * 1000;
function stamp(y, m, d, hh = 15){ return new Date(y, m - 1, d, hh, 0, 0, 0).getTime(); }
function key(y, m, d){
  const dt = new Date(y, m - 1, d), p = n => String(n).padStart(2, "0");
  return dt.getFullYear() + "-" + p(dt.getMonth() + 1) + "-" + p(dt.getDate());
}
function save(streak){
  return JSON.stringify({
    ver: 4, bank: 100, lifetime: 100, seq: 3, prize: null, tab: "bank", scene: 0,
    owned: {}, bought: {}, opened: {}, eggs: [], dragons: [], dex: {},
    keep: {roaming: [], stables: [], zones: ["meadow"], care: {}, streak: streak || {last: null, count: 0, best: 0}, restDay: 0}
  });
}

const cases = [];
function add(name, fn){ cases.push({name, fn}); }

add("math", t => {
  t.equal(new Date(2026, 9, 18).getDay(), 0, "18 Oct 2026 is Sunday");
  t.equal(new Date(2026, 9, 17).getDay(), 6, "17 Oct 2026 is Saturday");
  let clock = stamp(2026, 10, 16);
  const g = boot(save());
  g.setCareClock(() => clock);
  const first = g.visitKeep();
  t.equal(first.fresh, true, "first visit is new");
  t.equal(first.count, 1, "first day counts as 1");
  t.equal(first.best, 1, "best starts at 1");
  t.equal(g.snapshot().keep.streak.last, key(2026, 10, 16), "last is that local day");
  t.equal(g.visitKeep().fresh, false, "same day is not a new visit");
  t.equal(g.snapshot().keep.streak.count, 1, "same day does not add");
  t.equal(g.writes(), 1, "same day does not save again");

  clock = stamp(2026, 10, 17);
  const sat = g.visitKeep();
  t.equal(sat.count, 2, "the next day adds 1");
  t.equal(sat.best, 2, "best follows");
  clock = stamp(2026, 10, 18);
  const sun = g.visitKeep();
  t.equal(sun.count, 3, "Sunday continues the streak");
  t.equal(sun.rest, true, "Sunday is the rest day");
  t.ok(sun.note.indexOf("Sabbath rest") >= 0, "Sunday visit names Sabbath rest");
  t.equal(sun.blessing, false, "Sunday uses the rest note");

  clock = stamp(2026, 10, 20);
  const tue = g.visitKeep();
  t.equal(tue.count, 1, "missing Monday resets to 1");
  t.equal(tue.best, 3, "best is kept after a break");
  t.equal(tue.blessing, true, "a new weekday visit carries a blessing");
});

add("sunday-skip", t => {
  let clock = stamp(2026, 10, 17);
  const g = boot(save());
  g.setCareClock(() => clock);
  g.visitKeep();
  clock = stamp(2026, 10, 19);
  const mon = g.visitKeep();
  t.equal(mon.count, 2, "skipping only Sunday does not break the streak");
  t.equal(mon.best, 2, "best includes the Monday visit");
  t.equal(g.snapshot().keep.streak.last, key(2026, 10, 19), "Monday is recorded");

  const broken = boot(save());
  clock = stamp(2026, 10, 16);
  broken.setCareClock(() => clock);
  broken.visitKeep();
  clock = stamp(2026, 10, 18);
  const sun = broken.visitKeep();
  t.equal(sun.count, 1, "skipping Saturday resets even if Sunday is rest");
  t.equal(sun.rest, true, "the Sunday visit is still a rest day");
  t.ok(sun.note.indexOf("Sabbath rest") >= 0, "the reset visit still shows Sabbath rest");
});

add("prizes", t => {
  const g = boot(save());
  t.equal(g.streakPrize(0), 0, "no streak yet");
  t.equal(g.streakPrize(1), 10, "day 1");
  t.equal(g.streakPrize(2), 10, "day 2");
  t.equal(g.streakPrize(3), 30, "day 3");
  t.equal(g.streakPrize(6), 30, "day 6");
  t.equal(g.streakPrize(7), 70, "day 7");
  t.equal(g.streakPrize(13), 70, "day 13");
  t.equal(g.streakPrize(14), 140, "day 14");
  t.equal(g.streakPrize(29), 140, "day 29");
  t.equal(g.streakPrize(30), 300, "day 30");
  t.equal(g.streakPrize(40), 300, "past 30 stays at the top gift");
});

add("claim-once", t => {
  let clock = stamp(2026, 10, 16);
  const g = boot(save({last: key(2026, 10, 15), count: 6, best: 6}));
  g.setCareClock(() => clock);
  const paid = g.claimStreak();
  t.equal(paid, 70, "a 7-day streak claims 70 steps");
  t.equal(g.snapshot().bank, 170, "steps land in the bank");
  t.equal(g.snapshot().keep.streak.count, 7, "the claim visits too");
  t.equal(g.snapshot().keep.streak.claimed, key(2026, 10, 16), "today is marked claimed");
  t.equal(g.claimStreak(), 0, "a second claim the same day pays nothing");
  t.equal(g.snapshot().bank, 170, "the bank does not move again");
  const writes = g.writes();
  t.equal(g.claimStreak(), 0, "a third claim still pays nothing");
  t.equal(g.writes(), writes, "a refused claim does not save");

  clock = stamp(2026, 10, 17);
  t.equal(g.claimStreak(), 70, "the next day can be claimed once");
  t.equal(g.snapshot().bank, 240, "the next day's gift is added");
  t.equal(g.claimStreak(), 0, "that day cannot be claimed twice");
});

add("clock-back", t => {
  let clock = stamp(2026, 10, 18, 15);
  const g = boot(save());
  g.setCareClock(() => clock);
  t.equal(g.claimStreak(), 10, "Sunday claim pays once");
  t.equal(g.snapshot().keep.streak.count, 1, "one visit");
  const bank = g.snapshot().bank;
  clock = stamp(2026, 10, 18, 14);
  const back = g.visitKeep();
  t.equal(back.clamped, false, "the same calendar day is not a rollback");
  t.equal(g.claimStreak(), 0, "an hour earlier the same day stays claimed");
  t.equal(g.snapshot().bank, bank, "no extra steps");

  clock = stamp(2026, 10, 17);
  const minute = g.visitKeep();
  t.equal(minute.clamped, true, "a saved day ahead of now is clamped");
  t.equal(minute.fresh, false, "a rollback is not a new visit");
  t.equal(minute.blessing, false, "a rollback does not bless again");
  t.equal(g.snapshot().keep.streak.count, 1, "count does not increase");
  t.equal(g.snapshot().keep.streak.last, key(2026, 10, 17), "last is clamped to today");
  t.equal(g.snapshot().keep.streak.claimed, key(2026, 10, 17), "the prize stays claimed");
  t.equal(g.claimStreak(), 0, "a one-day rollback does not pay");
  t.equal(g.snapshot().bank, bank, "steps stay put");

  clock = stamp(2026, 10, 1);
  const days = g.visitKeep();
  t.equal(days.clamped, true, "a multi-day rollback is clamped");
  t.equal(g.snapshot().keep.streak.count, 1, "days back do not add visits");
  t.equal(g.claimStreak(), 0, "days back do not pay");
  t.equal(g.snapshot().bank, bank, "still no extra steps");
  clock = stamp(2026, 10, 2);
  const next = g.visitKeep();
  t.equal(next.fresh, true, "the following day is a normal visit");
  t.equal(next.count, 2, "it adds one, not the skipped days");
  t.equal(g.claimStreak(), 10, "that one day can be claimed");
  t.equal(g.claimStreak(), 0, "and only once");
  t.equal(g.snapshot().bank, bank + 10, "only one gift after the long rollback");
});

let failed = 0;
const lines = [];
for (const c of cases) {
  const problems = [];
  try {
    const g = {
      equal(actual, expected, label){ if (actual !== expected) problems.push(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`); },
      ok(cond, label){ if (!cond) problems.push(label || "not ok"); }
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
