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
  clock = stamp(2026, 10, 16, 14);
  t.equal(g.visitKeep().clamped, false, "an earlier hour on the same local date is not a rollback");
  t.equal(g.snapshot().keep.streak.homeTz, new Date(clock).getTimezoneOffset(), "an old save stores its home offset");
  const writes = g.writes();
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
  const on = boot(save({last: key(2026, 10, 15), count: 4, best: 4}));
  on.setCareClock(() => clock);
  on.start();
  t.equal(on.snapshot().tab, "bank", "the visit is recorded without opening Keep");
  t.equal(on.snapshot().keep.streak.count, 5, "app load adds the day");
  t.equal(on.snapshot().keep.streak.last, key(2026, 10, 16), "app load stores today");
  on.start();
  t.equal(on.snapshot().keep.streak.count, 5, "loading again the same day does not add");
  const flagged = boot(save({last: key(2026, 10, 15), count: 4, best: 4}), {search: "?keep=1"});
  flagged.setCareClock(() => clock);
  flagged.start();
  t.equal(flagged.snapshot().keep.streak.count, 5, "an old keep=1 link still records the day");
  t.equal(flagged.snapshot().keep.streak.last, key(2026, 10, 16), "an old keep=1 link stores today");
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
  t.equal(g.snapshot().keep.streak.homeTz, new Date(stamp(2026, 10, 16, 0, 30)).getTimezoneOffset(), "first play stores the home offset");
});

add("chicago-tokyo", t => {
  const CHI = 300, TYO = -540;
  let off = CHI;
  let zone = "America/Chicago";
  let clock = Date.UTC(2026, 9, 17, 1, 0, 0);
  const g = boot(save());
  g.setCareClock(() => clock);
  g.setZoneOffset(() => off);
  g.setTimeZone(() => zone);
  t.equal(g.claimStreak(), 10, "Chicago's first home day pays once");
  t.equal(g.snapshot().keep.streak.count, 1, "Chicago starts at day 1");
  t.equal(g.snapshot().keep.streak.last, "2026-10-16", "the home date is Oct 16");
  t.equal(g.snapshot().keep.streak.homeTz, CHI, "homeTz is Chicago");
  t.equal(g.snapshot().keep.streak.homeZone, "America/Chicago", "homeZone is Chicago");
  const bank = g.snapshot().bank;
  const writes = g.writes();
  off = TYO;
  zone = "Asia/Tokyo";
  const moved = g.visitKeep();
  t.equal(moved.fresh, false, "Tokyo the same instant does not add a day");
  t.equal(moved.count, 1, "the streak stays on day 1");
  t.equal(g.claimStreak(), 0, "Tokyo does not pay again");
  t.equal(g.writes(), writes, "the zone change is not saved");
  t.equal(g.snapshot().keep.streak.last, "2026-10-16", "last stays the home date");
  t.equal(g.snapshot().keep.streak.homeTz, CHI, "homeTz does not follow Tokyo");
  t.equal(g.snapshot().keep.streak.homeZone, "America/Chicago", "homeZone does not follow Tokyo");
  t.equal(g.snapshot().bank, bank, "the bank stays put");
  clock = Date.UTC(2026, 9, 17, 12, 0, 0);
  t.equal(g.claimStreak(), 10, "the next home day pays once while the device is in Tokyo");
  t.equal(g.snapshot().keep.streak.count, 2, "that home day adds one");
  t.equal(g.snapshot().keep.streak.last, "2026-10-17", "last is the next Chicago date");
  t.equal(g.snapshot().keep.streak.homeTz, CHI, "homeTz is still Chicago");
  t.equal(g.snapshot().keep.streak.homeZone, "America/Chicago", "homeZone is still Chicago");
  t.equal(g.claimStreak(), 0, "that home day does not pay twice");
  off = CHI;
  zone = "America/Chicago";
  t.equal(g.visitKeep().fresh, false, "switching back does not add a day");
  t.equal(g.claimStreak(), 0, "switching back does not pay");
  t.equal(g.snapshot().keep.streak.count, 2, "the round trip did not lose or add a day");
});

add("tokyo-chicago", t => {
  const CHI = 300, TYO = -540;
  let off = TYO;
  let zone = "Asia/Tokyo";
  let clock = Date.UTC(2026, 9, 16, 1, 0, 0);
  const g = boot(save());
  g.setCareClock(() => clock);
  g.setZoneOffset(() => off);
  g.setTimeZone(() => zone);
  t.equal(g.claimStreak(), 10, "Tokyo's first home day pays once");
  t.equal(g.snapshot().keep.streak.last, "2026-10-16", "the home date is Oct 16");
  t.equal(g.snapshot().keep.streak.homeTz, TYO, "homeTz is Tokyo");
  t.equal(g.snapshot().keep.streak.homeZone, "Asia/Tokyo", "homeZone is Tokyo");
  const bank = g.snapshot().bank;
  const writes = g.writes();
  off = CHI;
  zone = "America/Chicago";
  const moved = g.visitKeep();
  t.equal(moved.fresh, false, "Chicago the same instant does not add a day");
  t.equal(moved.count, 1, "switching west does not add a day");
  t.equal(g.claimStreak(), 0, "Chicago does not pay again");
  t.equal(g.writes(), writes, "the westward change is not saved");
  t.equal(g.snapshot().keep.streak.last, "2026-10-16", "last stays the home date");
  t.equal(g.snapshot().keep.streak.homeTz, TYO, "homeTz does not follow Chicago");
  t.equal(g.snapshot().keep.streak.homeZone, "Asia/Tokyo", "homeZone does not follow Chicago");
  t.equal(g.snapshot().bank, bank, "no steps are added");
  clock = Date.UTC(2026, 9, 17, 12, 0, 0);
  t.equal(g.claimStreak(), 10, "the next home day pays once while the device is in Chicago");
  t.equal(g.snapshot().keep.streak.count, 2, "that home day adds one");
  t.equal(g.snapshot().keep.streak.last, "2026-10-17", "last is the next Tokyo date");
  t.equal(g.snapshot().keep.streak.homeTz, TYO, "homeTz is still Tokyo");
  t.equal(g.snapshot().keep.streak.homeZone, "Asia/Tokyo", "homeZone is still Tokyo");
  t.equal(g.claimStreak(), 0, "that home day does not pay twice");
  off = TYO;
  zone = "Asia/Tokyo";
  t.equal(g.visitKeep().fresh, false, "switching back does not add a day");
  t.equal(g.claimStreak(), 0, "switching back does not pay");
  t.equal(g.snapshot().keep.streak.count, 2, "the round trip did not lose or add a day");
});

add("dst", t => {
  let off = 360;
  let zone = "Etc/GMT+6";
  let clock = Date.UTC(2026, 9, 17, 2, 0, 0);
  const g = boot(save());
  g.setCareClock(() => clock);
  g.setZoneOffset(() => off);
  g.setTimeZone(() => zone);
  t.equal(g.claimStreak(), 10, "the home day pays once");
  t.equal(g.snapshot().keep.streak.last, "2026-10-16", "the home date is Oct 16");
  t.equal(g.snapshot().keep.streak.homeTz, 360, "homeTz keeps the first offset");
  t.equal(g.snapshot().keep.streak.homeZone, "Etc/GMT+6", "homeZone keeps the first zone");
  const bank = g.snapshot().bank;
  const writes = g.writes();
  off = 300;
  zone = "Etc/GMT+5";
  const shifted = g.visitKeep();
  t.equal(shifted.fresh, false, "a one-hour device shift is not a new day");
  t.equal(g.claimStreak(), 0, "the shift does not pay again");
  t.equal(g.writes(), writes, "the shift is not saved");
  t.equal(g.snapshot().keep.streak.count, 1, "the streak stays on day 1");
  t.equal(g.snapshot().keep.streak.homeTz, 360, "homeTz ignores the new offset");
  t.equal(g.snapshot().keep.streak.homeZone, "Etc/GMT+6", "homeZone ignores the new zone");
  clock = Date.UTC(2026, 9, 17, 5, 30, 0);
  t.equal(g.visitKeep().fresh, false, "the device's next date waits for the home date");
  t.equal(g.claimStreak(), 0, "the device rolling forward does not pay");
  t.equal(g.snapshot().keep.streak.count, 1, "daylight time alone does not add a day");
  t.equal(g.snapshot().bank, bank, "no extra gift");
  clock = Date.UTC(2026, 9, 17, 6, 30, 0);
  t.equal(g.claimStreak(), 10, "the next home date pays once");
  t.equal(g.snapshot().keep.streak.count, 2, "that home day adds one");
  t.equal(g.snapshot().keep.streak.last, "2026-10-17", "Saturday is the home date");
  t.equal(g.snapshot().keep.streak.homeTz, 360, "homeTz is still the first offset");
  t.equal(g.snapshot().keep.streak.homeZone, "Etc/GMT+6", "homeZone is still the first zone");
  t.equal(g.claimStreak(), 0, "that home day pays only once");
});

add("zone-continue", t => {
  const CHI = 300, TYO = -540;
  let off = TYO;
  let zone = "America/Chicago";
  let clock = Date.UTC(2026, 9, 21, 1, 0, 0);
  const east = boot(save({last: "2026-10-19", count: 3, best: 3, claimed: "2026-10-19", tz: CHI}));
  east.setCareClock(() => clock);
  east.setZoneOffset(() => off);
  east.setTimeZone(() => zone);
  t.equal(east.visitKeep().count, 4, "the home Tuesday continues");
  t.equal(east.snapshot().keep.streak.last, "2026-10-20", "home records Oct 20, not Tokyo's Oct 21");
  t.equal(east.snapshot().keep.streak.best, 4, "Tuesday does not break the streak");
  t.equal(east.snapshot().keep.streak.homeTz, CHI, "an old tz becomes homeTz");
  t.equal(east.snapshot().keep.streak.homeZone, "America/Chicago", "an old save stores the device zone");
  t.equal(east.snapshot().keep.streak.tz, CHI, "the old tz is left as it was");
  t.equal(east.claimStreak(), 30, "that home day pays once");
  t.equal(east.claimStreak(), 0, "it does not pay twice");
  clock = Date.UTC(2026, 9, 21, 12, 0, 0);
  zone = "Asia/Tokyo";
  const next = east.visitKeep();
  t.equal(next.count, 5, "the next home day continues");
  t.equal(next.fresh, true, "that home day is a visit");
  t.equal(east.snapshot().keep.streak.last, "2026-10-21", "last is the next Chicago date");
  t.equal(east.snapshot().keep.streak.best, 5, "best follows the continued streak");
  t.equal(east.snapshot().keep.streak.homeTz, CHI, "homeTz stays Chicago while the device is in Tokyo");
  t.equal(east.snapshot().keep.streak.homeZone, "America/Chicago", "homeZone stays Chicago");
  t.equal(east.claimStreak(), 30, "the next home day pays once");
  t.equal(east.claimStreak(), 0, "that payout cannot repeat");
  off = CHI;
  zone = "America/Chicago";
  t.equal(east.visitKeep().fresh, false, "switching back does not add a day");
  t.equal(east.snapshot().keep.streak.count, 5, "the trip did not lose a day");
});

add("tokyo-skip-tuesday", t => {
  const CHI = 300, TYO = -540;
  let off = TYO;
  let zone = "Asia/Tokyo";
  let clock = Date.UTC(2026, 9, 19, 1, 0, 0);
  const g = boot(save());
  g.setCareClock(() => clock);
  g.setZoneOffset(() => off);
  g.setTimeZone(() => zone);
  t.equal(g.claimStreak(), 10, "Tokyo Monday pays once");
  t.equal(g.snapshot().keep.streak.count, 1, "the streak starts at 1");
  t.equal(g.snapshot().keep.streak.last, "2026-10-19", "Monday is the home date");
  t.equal(g.snapshot().keep.streak.homeTz, TYO, "homeTz is Tokyo");
  t.equal(g.snapshot().keep.streak.homeZone, "Asia/Tokyo", "homeZone is Tokyo");
  off = CHI;
  zone = "America/Chicago";
  clock = Date.UTC(2026, 9, 20, 1, 0, 0);
  const tue = g.visitKeep();
  t.equal(tue.count, 2, "Tuesday in the home zone continues");
  t.equal(g.snapshot().keep.streak.best, 2, "Chicago's earlier date does not break the streak");
  t.equal(g.snapshot().keep.streak.last, "2026-10-20", "last is the Tokyo Tuesday");
  t.equal(g.snapshot().keep.streak.homeTz, TYO, "homeTz stays Tokyo");
  t.equal(g.snapshot().keep.streak.homeZone, "Asia/Tokyo", "homeZone stays Tokyo");
  t.equal(g.claimStreak(), 10, "Tuesday pays once");
  t.equal(g.claimStreak(), 0, "Tuesday does not pay twice");
  off = TYO;
  zone = "Asia/Tokyo";
  t.equal(g.visitKeep().fresh, false, "switching back on Tuesday does not add a day");
  off = CHI;
  zone = "America/Chicago";
  clock = Date.UTC(2026, 9, 21, 1, 0, 0);
  const wed = g.visitKeep();
  t.equal(wed.count, 3, "Wednesday continues");
  t.equal(g.snapshot().keep.streak.last, "2026-10-21", "last is the Tokyo Wednesday");
  t.equal(g.snapshot().keep.streak.homeTz, TYO, "homeTz is still Tokyo");
  t.equal(g.snapshot().keep.streak.homeZone, "Asia/Tokyo", "homeZone is still Tokyo");
  t.equal(g.claimStreak(), 30, "Wednesday pays once");
  t.equal(g.claimStreak(), 0, "Wednesday does not pay twice");
  t.equal(g.snapshot().keep.streak.count, 3, "the zone changes did not skip or lose a day");
});

add("missed-weekday", t => {
  let clock = stamp(2026, 10, 20);
  const g = boot(save({last: key(2026, 10, 20), count: 4, best: 4, claimed: key(2026, 10, 20)}));
  g.setCareClock(() => clock);
  clock = stamp(2026, 10, 22);
  const missed = g.visitKeep();
  t.equal(missed.count, 1, "skipping Wednesday resets the streak");
  t.equal(g.snapshot().keep.streak.best, 4, "best keeps the longer run");
  t.equal(g.snapshot().keep.streak.last, key(2026, 10, 22), "Thursday is the new start");
  t.equal(g.claimStreak(), 10, "a reset streak pays the first-day gift");
});

add("sunday-still-skipped", t => {
  let clock = stamp(2026, 10, 17);
  const g = boot(save({last: key(2026, 10, 17), count: 4, best: 4, claimed: key(2026, 10, 17)}));
  g.setCareClock(() => clock);
  clock = stamp(2026, 10, 19);
  const mon = g.visitKeep();
  t.equal(mon.count, 5, "skipping only Sunday continues the streak");
  t.equal(g.snapshot().keep.streak.last, key(2026, 10, 19), "Monday is recorded");
  t.equal(g.claimStreak(), 30, "Monday pays the continued tier");
});

add("zone-farm", t => {
  const CHI = 300, TYO = -540;
  let off = CHI;
  let zone = "America/Chicago";
  let clock = Date.UTC(2026, 9, 19, 20, 0, 0);
  const g = boot(save(), {search: "?keep=1"});
  g.setCareClock(() => clock);
  g.setZoneOffset(() => off);
  g.setTimeZone(() => zone);
  t.equal(g.noteDailyVisit().count, 1, "load records the home day");
  t.equal(g.noteDailyVisit().fresh, false, "opening Keep the same home day does not add");
  t.equal(g.claimStreak(), 10, "day 1 pays 10 once");
  t.equal(g.claimStreak(), 0, "day 1 does not pay twice");
  t.equal(g.snapshot().keep.streak.homeTz, CHI, "homeTz is Chicago");
  t.equal(g.snapshot().keep.streak.homeZone, "America/Chicago", "homeZone is Chicago");
  const bank = g.snapshot().bank;
  off = TYO;
  zone = "Asia/Tokyo";
  clock = Date.UTC(2026, 9, 21, 1, 0, 0);
  const loaded = g.noteDailyVisit();
  t.equal(loaded.count, 2, "the next home day adds one, not Tokyo's extra day");
  t.equal(loaded.day, "2026-10-20", "the visit reports the home date");
  t.equal(g.snapshot().keep.streak.homeTz, CHI, "homeTz ignores Tokyo");
  t.equal(g.snapshot().keep.streak.homeZone, "America/Chicago", "homeZone ignores Tokyo");
  t.equal(g.snapshot().keep.streak.last, "2026-10-20", "last is the Chicago date");
  const kept = g.noteDailyVisit();
  t.equal(kept.fresh, false, "opening Keep does not count another day");
  t.equal(kept.count, 2, "Keep still shows day 2");
  t.equal(g.claimStreak(), 10, "day 2 pays 10");
  t.equal(g.snapshot().keep.streak.claimedDay, "2026-10-20", "claimedDay is the home date");
  t.equal(g.claimStreak(), 0, "that payout cannot repeat");
  t.equal(g.snapshot().bank, bank + 10, "one payout");
  off = CHI;
  zone = "America/Chicago";
  t.equal(g.noteDailyVisit().fresh, false, "load after switching back is the same home date");
  t.equal(g.noteDailyVisit().count, 2, "Keep after switching back does not add");
  t.equal(g.claimStreak(), 0, "switching back does not pay");
  t.equal(g.snapshot().keep.streak.count, 2, "the round trip added only one home day");
  t.equal(g.snapshot().keep.streak.homeTz, CHI, "homeTz never changed");
  t.equal(g.snapshot().keep.streak.homeZone, "America/Chicago", "homeZone never changed");
  t.equal(g.snapshot().bank, bank + 10, "the round trip does not pay again");
});

add("tokyo-same-day", t => {
  const CHI = 300, TYO = -540;
  let off = TYO;
  let zone = "Asia/Tokyo";
  let clock = Date.UTC(2026, 9, 19, 1, 0, 0);
  const g = boot(save(), {search: "?keep=1"});
  g.setCareClock(() => clock);
  g.setZoneOffset(() => off);
  g.setTimeZone(() => zone);
  t.equal(g.noteDailyVisit().count, 1, "Tokyo load records day 1");
  t.equal(g.claimStreak(), 10, "day 1 pays once");
  t.equal(g.snapshot().keep.streak.claimedDay, "2026-10-19", "day 1 claims the home date");
  t.equal(g.snapshot().keep.streak.homeTz, TYO, "homeTz is Tokyo");
  t.equal(g.snapshot().keep.streak.homeZone, "Asia/Tokyo", "homeZone is Tokyo");
  t.equal(g.claimStreak(), 0, "day 1 does not pay twice");
  const bank = g.snapshot().bank;
  off = CHI;
  zone = "America/Chicago";
  t.equal(g.noteDailyVisit().fresh, false, "Chicago the same instant is not a new home day");
  t.equal(g.noteDailyVisit().count, 1, "opening Keep after that switch does not add a day");
  t.equal(g.claimStreak(), 0, "the same home date does not pay");
  t.equal(g.snapshot().keep.streak.count, 1, "still day 1");
  t.equal(g.snapshot().keep.streak.last, "2026-10-19", "last stays on the home date");
  t.equal(g.snapshot().keep.streak.homeTz, TYO, "homeTz stays Tokyo");
  t.equal(g.snapshot().keep.streak.homeZone, "Asia/Tokyo", "homeZone stays Tokyo");
  clock = Date.UTC(2026, 9, 19, 18, 0, 0);
  const loaded = g.noteDailyVisit();
  t.equal(loaded.count, 2, "the next home day adds one");
  t.equal(loaded.day, "2026-10-20", "the visit reports the Tokyo date");
  t.equal(g.snapshot().keep.streak.last, "2026-10-20", "last is the home date");
  t.equal(g.snapshot().keep.streak.homeTz, TYO, "the device zone does not replace homeTz");
  t.equal(g.snapshot().keep.streak.homeZone, "Asia/Tokyo", "the device zone does not replace homeZone");
  t.equal(g.noteDailyVisit().count, 2, "opening Keep does not add Chicago's date");
  t.equal(g.claimStreak(), 10, "day 2 pays once");
  t.equal(g.snapshot().keep.streak.claimedDay, "2026-10-20", "claimedDay matches last");
  t.equal(g.claimStreak(), 0, "day 2 does not pay twice");
  t.equal(g.snapshot().bank, bank + 10, "one payout for the counted day");
  clock = Date.UTC(2026, 9, 20, 6, 0, 0);
  t.equal(g.noteDailyVisit().fresh, false, "Chicago's next date is still the same home day");
  t.equal(g.noteDailyVisit().count, 2, "Keep does not make day 3");
  t.equal(g.claimStreak(), 0, "that home day does not pay again");
  t.equal(g.snapshot().keep.streak.count, 2, "the streak is still day 2");
  t.equal(g.snapshot().bank, bank + 10, "no second payout");
});

add("old-save-offset", t => {
  let clock = stamp(2026, 10, 16, 15);
  let off = null;
  const g = boot(save({last: key(2026, 10, 15), count: 2, best: 2}));
  g.setCareClock(() => clock);
  g.setZoneOffset(ms => off == null ? new Date(ms).getTimezoneOffset() : off);
  const v = g.visitKeep();
  const home = new Date(clock).getTimezoneOffset();
  t.equal(v.count, 3, "a save with no offset still counts the next home day");
  t.equal(g.snapshot().keep.streak.homeTz, home, "first play stores the current offset");
  t.equal(g.snapshot().keep.streak.homeZone, Intl.DateTimeFormat().resolvedOptions().timeZone, "an old save stores the device zone");
  t.equal(g.snapshot().keep.streak.tz, undefined, "that save does not gain tz");
  const locked = g.snapshot().keep.streak.homeZone;
  off = home === 300 ? -540 : 300;
  g.setTimeZone(() => "Asia/Tokyo");
  t.equal(g.visitKeep().fresh, false, "a later device zone does not add a day");
  t.equal(g.snapshot().keep.streak.homeTz, home, "homeTz stays the first offset");
  t.equal(g.snapshot().keep.streak.homeZone, locked, "homeZone stays the first zone");
  t.equal(g.snapshot().keep.streak.count, 3, "the streak is unchanged");
});

add("dst-fall", t => {
  let zone = "America/Chicago";
  let clock = Date.UTC(2026, 9, 31, 20, 0, 0);
  const g = boot(save());
  g.setCareClock(() => clock);
  g.setTimeZone(() => zone);
  t.equal(g.claimStreak(), 10, "Saturday before the change pays once");
  t.equal(g.snapshot().keep.streak.count, 1, "the streak starts at 1");
  t.equal(g.snapshot().keep.streak.last, "2026-10-31", "Saturday is the Chicago date");
  t.equal(g.snapshot().keep.streak.homeZone, "America/Chicago", "homeZone is Chicago");
  zone = "Asia/Tokyo";
  clock = Date.UTC(2026, 10, 3, 5, 0, 0);
  const late = g.visitKeep();
  t.equal(late.count, 2, "11 PM after DST ends continues across Sunday");
  t.equal(late.rest, false, "Monday is not the rest day");
  t.equal(g.snapshot().keep.streak.last, "2026-11-02", "11 PM is still Monday in Chicago");
  t.equal(g.snapshot().keep.streak.best, 2, "the streak did not break");
  t.equal(g.snapshot().keep.streak.homeZone, "America/Chicago", "homeZone stays Chicago");
  t.equal(g.claimStreak(), 10, "Monday pays once");
  t.equal(g.claimStreak(), 0, "Monday does not pay twice");
  t.equal(g.visitKeep().fresh, false, "the same Chicago night does not add another day");
});

add("morning-verse", t => {
  const g = boot(save());
  t.equal(g.morningVerse("2026-10-16"), g.morningVerse("2026-10-16"), "a date keeps its verse");
  t.ok(g.morningVerse("2026-10-16") !== g.morningVerse("2026-10-17"), "the next date has another verse");
  t.ok(/\([^)]+\)$/.test(g.morningVerse("2026-10-16")), "the verse ends with its reference");
  t.equal(g.blessingLine(false, "2026-10-16"), g.morningVerse("2026-10-16"), "a weekday blessing is the verse");
  t.ok(g.blessingLine(false, "2026-10-16").indexOf("A blessing for this day.") < 0, "the plain blessing line is gone");
  const sundayLine = g.blessingLine(true, "2026-10-18");
  t.ok(sundayLine.indexOf("Sabbath rest. No chores required.") === 0, "Sunday still begins with the Sabbath note");
  t.ok(sundayLine.indexOf(g.morningVerse("2026-10-18")) > 0, "Sunday keeps that day's verse with the note");

  let zone = "America/Chicago";
  let off = 300;
  let clock = Date.UTC(2026, 9, 16, 15, 0, 0);
  g.setCareClock(() => clock);
  g.setTimeZone(() => zone);
  g.setZoneOffset(() => off);
  const morning = g.visitKeep();
  t.equal(morning.day, "2026-10-16", "morning is the Chicago date");
  t.equal(morning.verse, g.morningVerse("2026-10-16"), "the visit carries that date's verse");
  t.equal(morning.blessing, true, "a new weekday still carries a blessing");
  clock = Date.UTC(2026, 9, 16, 23, 0, 0);
  const evening = g.visitKeep();
  t.equal(evening.fresh, false, "later the same home day is not a new visit");
  t.equal(evening.verse, morning.verse, "the verse stays through the home day");
  zone = "Asia/Tokyo";
  off = -540;
  clock = Date.UTC(2026, 9, 16, 20, 0, 0);
  const trip = g.visitKeep();
  t.equal(trip.day, "2026-10-16", "a device zone change keeps the home date");
  t.equal(trip.verse, morning.verse, "the verse follows the home date, not the device date");
  clock = Date.UTC(2026, 9, 17, 15, 0, 0);
  const next = g.visitKeep();
  t.equal(next.day, "2026-10-17", "the next Chicago morning is a new date");
  t.ok(next.verse !== morning.verse, "the new home date has a new verse");
  clock = Date.UTC(2026, 9, 18, 15, 0, 0);
  const sun = g.visitKeep();
  t.equal(sun.rest, true, "Sunday is still the rest day");
  t.equal(sun.blessing, false, "Sunday does not use the weekday blessing flag");
  t.ok(sun.note.indexOf("Sabbath rest") >= 0, "Sunday still names Sabbath rest");
  t.equal(sun.verse, g.morningVerse("2026-10-18"), "Sunday carries the verse beside the note");
});

add("dst-spring", t => {
  let zone = "America/Chicago";
  let clock = Date.UTC(2026, 2, 7, 21, 0, 0);
  const g = boot(save());
  g.setCareClock(() => clock);
  g.setTimeZone(() => zone);
  t.equal(g.claimStreak(), 10, "Saturday before the change pays once");
  t.equal(g.snapshot().keep.streak.last, "2026-03-07", "Saturday is the Chicago date");
  t.equal(g.snapshot().keep.streak.homeZone, "America/Chicago", "homeZone is Chicago");
  zone = "America/New_York";
  clock = Date.UTC(2026, 2, 9, 5, 30, 0);
  const early = g.visitKeep();
  t.equal(early.count, 2, "12:30 AM after DST starts counts once");
  t.equal(early.rest, false, "Monday is not Sunday");
  t.equal(g.snapshot().keep.streak.last, "2026-03-09", "12:30 AM is Monday in Chicago");
  t.equal(g.snapshot().keep.streak.homeZone, "America/Chicago", "homeZone stays Chicago");
  t.equal(g.claimStreak(), 10, "Monday pays once");
  clock = Date.UTC(2026, 2, 9, 13, 0, 0);
  t.equal(g.visitKeep().fresh, false, "later that morning does not count again");
  t.equal(g.claimStreak(), 0, "Monday does not pay twice");
  t.equal(g.snapshot().keep.streak.count, 2, "the morning is still day 2");
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
