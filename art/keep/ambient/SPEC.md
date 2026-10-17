# Keep ambient life — spec for Software Engineer

Environment-only motion for the Keep. **Dragon sprites are not animated or touched** (dragon idle motion comes from the separate weekly idle-clip job).
Everything is drawn in code from `keep-ambient.js` (canvas, no generated video). Coordinates are Keep scene px (1008 × 1792, same space as `slot-map.json`).

## Files (copy `ambient/` to `art/keep/ambient/`)
| File | Size | Purpose |
|---|---|---|
| `keep-ambient.js` | ~18 KB | The whole kit. `window.KeepAmbient` = `{mount, render, MAP, WX, loadAssets}` |
| `ambient-map.json` | 6 KB | Read-only export of `MAP` + `WX` (positions, timings, per-weather table). JS does not fetch it. |
| `fog-tile.webp` | 2.4 KB | 256×128 seamless horizontal fog band (alpha), used in fog weather |
| `water-mask-moonpool.png` | 5 KB | Alpha mask, placed at x141 y744 (269×104) |
| `water-mask-fountain.png` | 4.6 KB | x351 y898 (278×89) |
| `water-mask-waterfall.png` | 1.5 KB | x444 y862 (57×106) |
| `water-mask-pond.png` | 15 KB | x125 y1446 (485×113), lily pads cut out |
| `plates/keep-weather-{rain,snow,storm}.webp` | 186 / 241 / 147 KB | **Replace** the current `art/keep/keep-weather-{rain,snow,storm}.webp`. Same grade, but without the baked-in static streaks/flakes (otherwise frozen drops sit under the moving ones). Pixel-aligned with the old plates, so fences and slot-map stay valid. |
| `build_plates.py`, `fix_shelf_top.py` | — | Rebuild scripts (box only, don't ship) |

Total new download: ~45 KB (plates replace existing files, roughly the same size).

## Layer order (inside `#keepWorld`)
Slots are `z = drawOrder*2` (2…14); fences are `penFenceZ(pen)` (ember 5, violet 9, azure 13, pond 15).

| Canvas | z-index | DOM rule | Box (x,y,w,h) | Contents |
|---|---|---|---|---|
| `.keep-amb-back` | 1 | anywhere | 0,0,1008,1792 | water movement, torch/forge/candle/lantern glows, crystal pulse, forge sparks, smoke wisps, stars, fireflies |
| `.keep-amb-ember` | ember fence z (5) | inserted **before** the ember fence img | 40,860,380,260 | embers rising over the ember pen, in front of Cinder/Inferno, behind the ember fence |
| `.keep-amb-pond` | pond fence z (15) | inserted **before** the pond fence img | 110,1360,540,220 | low mist over the pond pen, in front of Moss, behind the pond fence |
| `.keep-amb-front` | 40 | anywhere | 0,0,1008,1792 | rain, snow, fog bands, lightning |

All four canvases are `pointer-events:none`, so taps still reach slots/spots. Plates, Ledger plaque and the lock wing (z 4+ outside `#keepWorld`) stay above the weather.

## Wiring (≈15 lines)
```html
<script src="art/keep/ambient/keep-ambient.js"></script>
```
```js
let keepAmb = null;
// after syncPenFences() has created the fence imgs (end of syncPens, first time only):
if (!keepAmb) keepAmb = KeepAmbient.mount({
  world: $("#keepWorld"), bg: $(".keep-bg"), base: "art/keep/ambient/",
  fenceZ: {ember: penFenceZ("ember"), pond: penFenceZ("pond")}, variant: fenceVariant($(".keep-bg").getAttribute("src")) || "v6"
});
keepAmb.setVariant(fenceVariant(bg.getAttribute("src")) || "v6");   // every syncPens
// in measureKeepWorld(): keepAmb && keepAmb.resize();
// startPenLoop(): keepAmb && keepAmb.start();   stopPenLoop() / tab hidden: keepAmb && keepAmb.stop();
```
- `mount` respects `prefers-reduced-motion` (never starts). Draw rate is capped at 30 fps; canvas resolution = on-screen size × min(2, dpr).
- Water movement resamples the live `.keep-bg` image, so it automatically carries each weather's colours. If the bg isn't loaded yet it just shows glints.
- `fenceVariant()` already returns `v6|sunny|overcast|rain|snow|storm|fog`; those are the `WX` keys.

## Effects, positions, timings
**Water** (back layer, masked so only water pixels move)
- Surface movement: 3 px rows of the background shifted by `amp·sin(2πt/period + y·0.19) + amp/2·sin(…·1.7 − y·0.07)`. Moon pool amp 1.0 px / 4.2 s, fountain 1.4 px / 2.6 s, pond 1.2 px / 5.0 s.
- Glints: 3 px twinkles on 2–5 s cycles (moon pool 22, fountain 18, pond 26).
- Waterfall: 14 light streaks falling at 230 px/s; foam rings where it lands (470, 950), 1.1 s cycle.
- Rain: 0.9 s raindrop rings (2→13 px, flattened to 38%) on every water body; storm 1.7× as many.
- Snow: water slows 3× and moves at 35% amplitude (near-frozen), no rings.

**Light** (additive radial glows, flicker = sum of 3 sines)
forge 475,562 r92 · torches 183,455 / 735,420 / 378,182 · library candles 552,765 / 895,790 · keeper's lantern 297,1215 r40 · tower orbs 650,100 / 289,88 (slow) · 10 crystals (moon pool, library, azure pen, pond) breathing on 4.6–6.4 s.
Note: index.html already draws a `.keep-forge.is-live` glow; the forge entry here is softer and flickers. Drop `glows[0]` if the two stack too bright.

**Smoke / sparks / embers**
- Forge sparks: 7 × 3 px, rising 70 px over 1.4 s from 475,575.
- Smoke wisps: 4.5 s life, forge chimney 475,520 (rise 70), wall torches (rise 40). Opacity ≤ 0.16.
- Embers: 16 over the ember pen (x70–370, y1000–1100), rise 110 px in 2.6–4.4 s. Rain 40%, storm 30%, snow 60%.
- Pond mist: 7 soft flattened blobs drifting across x130–620, y1440–1560, 7 s breathing.

**Life**: fireflies (5 zones, 20 total; night `v6` 100%, overcast 80%, fog 40%, off in sunny/rain/snow/storm), stars twinkling in the sky band y0–105 (v6, sunny 60%).

**Weather** (front layer)
- Rain: 200 streaks, 2 px, length ~28, slant 0.32, 1400 px/s, 30% opacity. Storm: 300, faster and steeper.
- Snow: 150 flakes (3 or 6 px), 40–85 px/s, 12 px sway.
- Fog: three `fog-tile` bands at y330/900/1380, drifting 9, −6, 12 px/s, opacity 0.34–0.42.
- Storm lightning: one strike per 9 s window at a random moment, double flash (0–0.12 s, 0.2–0.32 s), 26% full-scene blue-white plus a short bolt in the sky (x620–860, y0–108).

## Bookshelf top fix (in this batch)
The back-centre library shelf (x664–826) had its top edge cut flat against the floor tiles in the painting. `fix_shelf_top.py` adds stone caps and a wooden cornice at y676–699 to `keep-v6.webp`, all six `keep-weather-*.webp`, and the three new plates, colour-matched per weather. Nothing else moves, so the slot map and fences stay valid. Originals are in `art/keep/_orig/` on the box. Before/after: `out/bookshelf-top-before-after.png`.

## Label
`index.html` line 758 `<h1>Dragon Keep</h1>` → `<h1>Dragon's Keep</h1>` (it shows as DRAGON'S KEEP through `text-transform:uppercase`). Use `&rsquo;` or ’ if you want a curly apostrophe. Line 3895 is only a code comment.
