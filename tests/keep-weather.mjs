/**
 * Keep weather: code mapping, 0.1° rounding, a 30-minute cache, and plain-sky fallbacks.
 * Run: node tests/keep-weather.mjs
 */
import { boot } from "./game-vm.mjs";

const MIN = 60 * 1000;
const TTL = 30 * MIN;
const AT = Date.UTC(2026, 9, 16, 15, 0, 0);

function save(){
  return JSON.stringify({
    ver: 4, bank: 1, lifetime: 1, seq: 3, prize: null, tab: "bank", scene: 0,
    owned: {}, bought: {}, opened: {}, eggs: [], dragons: [], dex: {},
    keep: {roaming: [], stables: [], zones: ["meadow"], care: {}, streak: {last: null, count: 0, best: 0}, restDay: 0}
  });
}

const cases = [];
function add(name, fn){ cases.push({name, fn}); }

add("mapping", t => {
  const g = boot(save());
  const day = {0:"clear", 1:"clear", 2:"cloudy", 3:"cloudy", 45:"fog", 48:"fog",
    51:"rain", 53:"rain", 55:"rain", 56:"rain", 57:"rain",
    61:"rain", 63:"rain", 65:"rain", 66:"rain", 67:"rain",
    80:"rain", 81:"rain", 82:"rain",
    71:"snow", 73:"snow", 75:"snow", 77:"snow", 85:"snow", 86:"snow",
    95:"storm", 96:"storm", 99:"storm"};
  Object.keys(day).forEach(code => {
    t.equal(g.weatherKind(+code, 1), day[code], "code " + code + " by day");
  });
  t.equal(g.weatherKind(0, 0), "night", "clear night is night");
  t.equal(g.weatherKind(3, false), "night", "cloudy night is night");
  t.equal(g.weatherKind(45, 0), "fog", "fog stays fog at night");
  t.equal(g.weatherKind(61, 0), "rain", "rain stays rain at night");
  t.equal(g.weatherKind(71, 0), "snow", "snow stays snow at night");
  t.equal(g.weatherKind(95, 0), "storm", "a night storm stays a storm");
  t.equal(g.weatherKind(999, 1), "clear", "an unknown daytime code is clear");
  t.equal(g.weatherKind(999, 0), "night", "an unknown night code is night");
  ["clear", "cloudy", "fog", "night"].forEach(kind => t.equal(g.weatherHuddle(kind), false, kind + " does not huddle"));
  ["rain", "snow", "storm"].forEach(kind => t.equal(g.weatherHuddle(kind), true, kind + " huddles"));
  const rain = g.weatherResult({current:{weather_code:63, is_day:0}});
  t.equal(rain.kind, "rain", "a reading maps the code");
  t.equal(rain.sky, "art/keep/keep-weather-rain.webp", "a reading names the sky file");
  t.equal(g.weatherSky("clear"), "art/keep/keep-weather-sunny.webp", "clear uses the sunny painting");
  t.equal(g.weatherSky("cloudy"), "art/keep/keep-weather-overcast.webp", "cloudy uses the overcast painting");
  t.equal(rain.huddle, true, "night rain still huddles");
  t.equal(g.weatherResult(null), null, "a missing body is not a sky");
  t.equal(g.weatherResult({}), null, "an empty body is not a sky");
  t.equal(g.weatherResult({current:{is_day:1}}), null, "a reading without a code is not a sky");
});

add("rounding", t => {
  const g = boot(save());
  t.equal(g.roundWeatherCoord(41.164), 41.2, "latitude rounds to 0.1");
  t.equal(g.roundWeatherCoord(-87.062), -87.1, "longitude rounds to 0.1");
  t.equal(g.roundWeatherCoord(0.04), 0, "below .05 rounds toward zero");
  t.equal(g.roundWeatherCoord(0.05), 0.1, "half a tenth rounds away from zero");
  t.equal(g.roundWeatherCoord(-0.04), 0, "a small negative rounds to zero");
  t.equal(g.roundWeatherCoord(-0.06), -0.1, "a larger negative keeps its tenth");
  t.equal(g.roundWeatherCoord("41.16"), 41.2, "numeric strings round");
  t.equal(g.roundWeatherCoord(NaN), null, "NaN is not a coordinate");
  t.equal(g.roundWeatherCoord("nope"), null, "text is not a coordinate");
  const url = g.weatherUrl(41.164, -87.062);
  t.equal(url, "https://api.open-meteo.com/v1/forecast?latitude=41.2&longitude=-87.1&current=weather_code,is_day", "the request uses the rounded cell");
  t.ok(url.indexOf("41.164") < 0 && url.indexOf("-87.062") < 0, "the raw coordinates never reach the url");
  t.equal(g.weatherUrl(91, 0), null, "a latitude past 90 builds no url");
  t.equal(g.weatherUrl(0, 181), null, "a longitude past 180 builds no url");
});

add("cache", t => {
  const g = boot(save());
  t.ok(!("weather" in g.snapshot().keep), "a fresh keep has no weather key");
  const rec = g.storeWeather({on:true, at:AT, lat:41.164, lon:-87.062, code:61, day:1});
  t.equal(rec.lat, 41.2, "the save stores the rounded latitude");
  t.equal(rec.lon, -87.1, "the save stores the rounded longitude");
  t.equal(rec.code, 61, "the save stores the code");
  t.equal(rec.day, 1, "the save stores is_day");
  t.equal(rec.on, true, "the save stores the opt-in");
  t.ok(g.text().indexOf("41.164") < 0 && g.text().indexOf("-87.062") < 0, "full precision is not written");
  t.equal(g.weatherCached(rec, AT + 29 * MIN), true, "29 minutes is still fresh");
  t.equal(g.weatherCached(rec, AT + TTL - 1), true, "just inside 30 minutes is fresh");
  t.equal(g.weatherCached(rec, AT + TTL), false, "30 minutes is stale");
  t.equal(g.weatherCached(rec, AT - 1), false, "a future stamp is not a cache hit");
  t.equal(g.weatherFresh(rec, 41.164, -87.062, AT + MIN), true, "the same rounded cell hits");
  t.equal(g.weatherFresh(rec, 41.26, -87.062, AT + MIN), false, "a different cell misses");
  const again = boot(g.text());
  t.deepEqual(again.snapshot().keep.weather, rec, "reload keeps the rounded cache");
  const hit = g.weatherDecision({keepOn:true, toggle:true, cache:rec, now:AT + MIN});
  t.equal(hit.request, "none", "a fresh cache makes no request");
  t.equal(hit.url, null, "a fresh cache builds no url");
  t.equal(hit.sky, "art/keep/keep-weather-rain.webp", "a fresh cache still picks the sky");
  t.equal(hit.huddle, true, "a fresh rain cache huddles");
  const moved = g.weatherDecision({keepOn:true, toggle:true, cache:rec, now:AT + MIN, lat:40.04, lon:-87.062});
  t.equal(moved.request, "fetch", "a new cell fetches again");
  t.equal(moved.lat, 40, "the new request is rounded first");
  t.equal(moved.lon, -87.1, "longitude is rounded before the fetch");
  t.equal(moved.url, g.weatherUrl(40.04, -87.062), "the fetch url is the rounded one");
  t.ok(moved.url.indexOf("40.04") < 0, "the unrounded latitude is not in the url");
  const stale = g.weatherDecision({keepOn:true, toggle:true, cache:rec, now:AT + TTL, lat:41.164, lon:-87.062});
  t.equal(stale.request, "fetch", "a stale cache fetches");
  t.equal(stale.url.indexOf("latitude=41.2") >= 0, true, "the stale refetch is still rounded");
});

add("fallbacks", t => {
  const g = boot(save());
  const off = g.weatherDecision({keepOn:true, toggle:false, lat:41.164, lon:-87.062, now:AT});
  t.equal(off.request, "none", "the toggle off makes no request");
  t.equal(off.url, null, "the toggle off builds no url");
  t.equal(off.sky, null, "the toggle off selects no weather sky");
  const flag = g.weatherDecision({keepOn:false, toggle:true, lat:41.164, lon:-87.062, now:AT});
  t.equal(flag.request, "none", "keep off makes no request");
  t.equal(flag.url, null, "keep off builds no url");
  t.equal(flag.sky, null, "keep off selects no weather sky");
  const denied = g.weatherDecision({keepOn:true, toggle:true, denied:true, lat:41.16, lon:-87, now:AT});
  t.equal(denied.request, "none", "a denial does not fetch");
  t.equal(denied.url, null, "a denial builds no url");
  t.equal(denied.sky, null, "a denial keeps the plain sky");
  const failed = g.weatherDecision({keepOn:true, toggle:true, failed:true, lat:41.16, lon:-87, now:AT});
  t.equal(failed.request, "none", "a failed fetch does not try another url");
  t.equal(failed.sky, null, "a failed fetch keeps the plain sky");
  const ask = g.weatherDecision({keepOn:true, toggle:true, now:AT});
  t.equal(ask.request, "geo", "with no cache the next step is location");
  t.equal(ask.url, null, "location is asked before any weather url exists");
  t.equal(g.keepSkyFile("rain", false), "art/keep/keep-v6.webp", "toggle off uses the plain painting");
  t.equal(g.keepSkyFile(null, true), "art/keep/keep-v6.webp", "no kind uses the plain painting");
  t.equal(g.keepSkyFile("nope", true), "art/keep/keep-v6.webp", "an unknown kind uses the plain painting");
  t.equal(g.keepSkyFile("storm", true), "art/keep/keep-weather-storm.webp", "a known kind uses its painting");
  const plain = g.storeWeather({on:false});
  t.deepEqual(plain, {on:false}, "opting out stores no coordinates");
  t.equal(g.storeWeather(null), null, "clearing weather drops the key");
  t.ok(!("weather" in g.snapshot().keep), "the key stays absent once cleared");
});

let failed = 0;
const lines = [];
for (const c of cases) {
  const problems = [];
  try {
    const g = {
      equal(actual, expected, label){ if (actual !== expected) problems.push(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`); },
      ok(cond, label){ if (!cond) problems.push(label || "not ok"); },
      deepEqual(actual, expected, label){ if (JSON.stringify(actual) !== JSON.stringify(expected)) problems.push(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`); }
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
