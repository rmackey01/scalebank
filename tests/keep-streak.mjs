/**
 * Daily visit streak, Sunday rest, clock rollback, and one claim a day.
 * Run: node tests/keep-streak.mjs
 */
import { boot } from "./game-vm.mjs";

const H = 60 * 60 * 1000;
function stamp(y, m, d, hh = 15, mm = 0){ return new Date(y, m - 1, d, hh, mm, 0, 0).getTime(); }
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
  t.equal(sun.count, 2, "Sunday does not add to the streak");
  t.equal(sun.best, 2, "Sunday does not raise best");
  t.equal(g.snapshot().keep.streak.last, key(2026, 10, 17), "Sunday does not move last");
  t.equal(sun.rest, true, "Sunday is the rest day");
  t.ok(sun.note.indexOf("Sabbath rest") >= 0, "Sunday visit names Sabbath rest");
  t.equal(sun.blessing, false, "Sunday uses the rest note");
  t.equal(g.claimStreak(), 0, "Sunday pays nothing");
  t.equal(g.snapshot().keep.streak.count, 2, "a Sunday claim does not change the count");
  const sunWrites = g.writes();
  t.equal(g.visitKeep().fresh, false, "Sunday is greeted once");
  t.equal(g.writes(), sunWrites, "a second Sunday visit does not save");

  clock = stamp(2026, 10, 20);
  const tue = g.visitKeep();
  t.equal(tue.count, 1, "missing Monday resets to 1");
  t.equal(tue.best, 2, "best is kept after a break");
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
  t.equal(sun.count, 1, "Sunday does not break a streak");
  t.equal(broken.snapshot().keep.streak.last, key(2026, 10, 16), "Sunday leaves last on Friday");
  t.equal(sun.rest, true, "the Sunday visit is still a rest day");
  t.ok(sun.note.indexOf("Sabbath rest") >= 0, "Sunday still shows Sabbath rest");
  clock = stamp(2026, 10, 19);
  const missed = broken.visitKeep();
  t.equal(missed.count, 1, "missing Saturday resets on the next weekday");
  t.equal(broken.snapshot().keep.streak.last, key(2026, 10, 19), "the weekday is recorded");
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

add("midnight-farm", t => {
  let clock = stamp(2026, 10, 16, 10);
  const g = boot(save());
  g.setCareClock(() => clock);
  t.equal(g.claimStreak(), 10, "Friday pays once");
  const bank = g.snapshot().bank;
  const writes = g.writes();
  clock = stamp(2026, 10, 15, 23);
  const back = g.visitKeep();
  t.equal(back.clamped, true, "the day before last is not a visit");
  t.equal(back.fresh, false, "rolling back over midnight is not a new day");
  t.equal(g.claimStreak(), 0, "rolling back over midnight does not pay");
  t.equal(g.writes(), writes, "a backward day is not saved");
  t.equal(g.snapshot().keep.streak.last, key(2026, 10, 16), "last never moves backward");
  t.equal(g.snapshot().keep.streak.count, 1, "count stays on the rollback");
  t.equal(g.snapshot().keep.streak.claimed, key(2026, 10, 16), "claimed stays the later date string");
  t.equal(g.snapshot().bank, bank, "no farmed steps");
  clock = stamp(2026, 10, 16, 8);
  t.equal(g.claimStreak(), 0, "returning to the claimed date does not pay again");
  t.equal(g.snapshot().keep.streak.last, key(2026, 10, 16), "last is still Friday");
  t.equal(g.snapshot().bank, bank, "still no extra steps");
  t.equal("2026-10-17" > "2026-10-16", true, "later date strings sort after earlier ones");
  t.equal("2026-10-16" > "2026-10-16", false, "the same date string is not later");
});

add("clock-back", t => {
  let clock = stamp(2026, 10, 16, 15);
  const g = boot(save({last: key(2026, 10, 16), count: 14, best: 20, claimed: key(2026, 10, 16)}));
  g.setCareClock(() => clock);
  const writes = g.writes();
  clock = stamp(2026, 10, 16, 14);
  t.equal(g.visitKeep().clamped, false, "an earlier hour on the same local date is not a rollback");
  t.equal(g.claimStreak(), 0, "that hour does not pay again");
  clock = stamp(2026, 10, 1, 8);
  const days = g.visitKeep();
  t.equal(days.clamped, true, "days earlier than last are ignored");
  t.equal(days.fresh, false, "a multi-day rollback is not a new visit");
  t.equal(days.blessing, false, "a rollback does not bless");
  t.equal(g.writes(), writes, "rolling the clock back does not save");
  t.equal(g.snapshot().keep.streak.last, key(2026, 10, 16), "last stays on the saved day");
  t.equal(g.snapshot().keep.streak.count, 14, "the streak is not wiped");
  t.equal(g.snapshot().keep.streak.best, 20, "best stays");
  t.equal(g.snapshot().keep.streak.claimed, key(2026, 10, 16), "claimed stays put");
  t.equal(g.claimStreak(), 0, "days back do not pay");
  t.equal(g.snapshot().bank, 100, "bank unchanged");
  clock = stamp(2026, 10, 16, 18);
  t.equal(g.visitKeep().fresh, false, "the original day is not new");
  t.equal(g.claimStreak(), 0, "the claimed date does not pay again");
  t.equal(g.snapshot().keep.streak.count, 14, "returning to last keeps the count");
  clock = stamp(2026, 10, 17, 12);
  const next = g.visitKeep();
  t.equal(next.count, 15, "the next local day adds one");
  t.equal(g.claimStreak(), 140, "that day pays the current tier once");
  t.equal(g.claimStreak(), 0, "and only once");
  t.equal(g.snapshot().bank, 240, "only one gift after the long rollback");
});

add("sunday-pay", t => {
  let clock = stamp(2026, 10, 17);
  const g = boot(save({last: key(2026, 10, 16), count: 6, best: 6, claimed: key(2026, 10, 16)}));
  g.setCareClock(() => clock);
  t.equal(g.claimStreak(), 70, "Saturday pays the 7-day tier");
  clock = stamp(2026, 10, 18);
  t.equal(g.claimStreak(), 0, "Sunday pays nothing");
  t.equal(g.snapshot().bank, 170, "Sunday adds no steps");
  t.equal(g.snapshot().keep.streak.count, 7, "Sunday does not add a day");
  t.equal(g.snapshot().keep.streak.last, key(2026, 10, 17), "Sunday does not move last");
  t.equal(g.snapshot().keep.streak.best, 7, "Sunday does not change best");
  clock = stamp(2026, 10, 19);
  t.equal(g.claimStreak(), 70, "Monday pays that same tier again");
  t.equal(g.snapshot().keep.streak.count, 8, "Monday adds the next day");
  t.equal(g.snapshot().bank, 240, "Monday's gift is added once");
});

add("load", t => {
  let clock = stamp(2026, 10, 16, 9);
  const on = boot(save({last: key(2026, 10, 15), count: 4, best: 4}), {search: "?keep=1"});
  on.setCareClock(() => clock);
  on.start();
  t.equal(on.snapshot().tab, "bank", "the visit is recorded without opening Keep");
  t.equal(on.snapshot().keep.streak.count, 5, "app load with keep=1 adds the day");
  t.equal(on.snapshot().keep.streak.last, key(2026, 10, 16), "app load stores today");
  on.start();
  t.equal(on.snapshot().keep.streak.count, 5, "loading again the same day does not add");
  const off = boot(save({last: key(2026, 10, 15), count: 4, best: 4}));
  off.setCareClock(() => clock);
  t.equal(off.noteDailyVisit(), null, "without keep=1 a visit is not recorded");
  off.start();
  t.equal(off.snapshot().keep.streak.count, 4, "app load without keep=1 leaves the streak");
  t.equal(off.snapshot().keep.streak.last, key(2026, 10, 15), "last stays put when keep is off");
});

add("timezone", t => {
  let clock = stamp(2026, 10, 16, 0, 30);
  const g = boot(save());
  g.setCareClock(() => clock);
  g.visitKeep();
  const writes = g.writes();
  clock = stamp(2026, 10, 16, 23, 30);
  const again = g.visitKeep();
  t.equal(again.fresh, false, "a later time on the same local date is not a new day");
  t.equal(g.snapshot().keep.streak.count, 1, "hours inside one local date do not add a day");
  t.equal(g.snapshot().keep.streak.last, key(2026, 10, 16), "last stays that date string");
  t.equal(g.writes(), writes, "the same local date does not save");
  t.equal(g.claimStreak(), 10, "the day can still be claimed once");
  clock = stamp(2026, 10, 16, 23, 50);
  t.equal(g.claimStreak(), 0, "a later clock on the claimed date still does not pay");
  t.equal(g.snapshot().keep.streak.claimed, key(2026, 10, 16), "claimed is the date string");
  const ahead = boot(save({last: key(2026, 10, 16), count: 3, best: 3, claimed: key(2026, 10, 20)}));
  clock = stamp(2026, 10, 17, 12);
  ahead.setCareClock(() => clock);
  t.equal(ahead.claimStreak(), 0, "today must be greater than the claimed date string");
  t.equal(ahead.snapshot().keep.streak.claimed, key(2026, 10, 20), "a later claimed date is not moved backward");
  t.equal(ahead.snapshot().keep.streak.count, 4, "the strictly later day still counts");
  t.equal(ahead.snapshot().bank, 100, "a claimed-ahead day pays nothing");
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
