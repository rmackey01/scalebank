# Scale Bank: Mutation Bestiary and unique mutation art (feature spec)

- **Status:** decisions approved by Ryan (Oct 11, 2026). Ready to build once the first manifest entries land.
- **Owner:** Crazy Idea Guy (spec) · **Builder:** Software Engineer · **Art:** Animator · **Tests:** App Tester
- **Extends:** `handoff/feature-bestiary.md` (merged). Also touches `growth-reveal-spec.md` (playback rules unchanged) and `feature-rarity-frames.md` (mutation frame).
- **Source checked:** `rmackey01/scalebank` @ `main`, commit `475cb88` (Oct 11, 2026), `index.html` 2,009 lines. Line numbers refer to that file.
- **Fonts:** Cormorant Garamond (`--display`) and Lato (`--body`) only.

Rule (same as the other specs): if a number isn't here, don't guess. Values marked **(proposed)** are new decisions in this spec.

---

## 1. Goal

Every mutation is its own creature. A Moonlit Cinder has its own art at every stage, its own loop, its own locked silhouette and its own growth reveal. It shows that art everywhere it appears: hoard, prize card, hatch overlay, share card, Bestiary grid and sheet. The variant page in the Bestiary becomes a full entry with a growth row, like the dragon pages.

## 2. What changes from today

| Today (`475cb88`) | After this spec |
|---|---|
| Mutations are a card effect only: "card effects around the video, never a recolor" (CSS comment, line 467). `dragonArt()` always loads `art/dragons/<line>-<n>` and adds `fx-*` (lines 1164–1176). | **That rule is removed.** A mutated dragon loads its own art from the manifest (§4). The `fx-*` card effect is kept **only as the fallback** when that art isn't listed. |
| Variant sheet: no growth row (`openDex`, `m ? "" : …`, line 1648), lavender `rf-mut` hairline and chips. | Variant sheet gets the same journal frame, a 4-tile growth row, and the mutation's accent on the badge and rule instead of lavender (§6). |
| A mutated dragon growing plays the **base** reveal (`startGrowth` → `revealAvailable(d.line, key)`, lines 848–856). | It plays **its own** reveal `art/reveals/<line>-<mut>-<key>`. If that reveal isn't in the manifest, it uses the existing stage-up fallback (`fallbackGrowth`, line 858) with the new stage art. **Never the base reveal.** (§8) |
| Reveal availability is probed with a HEAD request (`revealAvailable`, line 835). | For mutation art the manifest is the only source of truth. No HEAD probes, no path-guessing, no 404s (§4). Base reveals keep today's probe. |

Unchanged: hatch odds, mutation odds, prices, stage thresholds, dex keys, rarity frames, and the base Bestiary pages.

---

## 3. Art plan (Animator, fixed)

### 3.1 Files per listed stage
`art/mutations/<dragon>/<mutation>/<stage>` with:

| File | Use |
|---|---|
| `<stage>.webp` | still (grid tiles, hoard, growth row, chips, portraits) |
| `<stage>-poster.webp` | video poster (prize card, sheet top art, hatch, share; also the reduced-motion image) |
| `<stage>.mp4`, `<stage>.webm` | loop, 540 px wide, target ≤ ~1 MB each |
| `<stage>-sil.webp` | silhouette for locked growth tiles |

- `<dragon>`: `cinder`, `brine`, `moss`, `inferno`, `stormling`, `voidling`, `tempest` (= `DEX_LINES`).
- `<mutation>`: `moonlit`, `obsidian`, `gilded`, `aurora` (= `MUT_KEYS`).
- `<stage>`: `1_hatchling`, `2_juvenile`, `3_adult`, `4_elder` (index `si` 0–3 → `MSTAGE[si]`).
- 7 × 4 × 4 = **112 stages**. Cinder's are already encoded (not yet in the repo). Animator is cutting all 112 silhouettes.

### 3.2 Files per listed reveal
`art/reveals/<dragon>-<mutation>-<rev>.mp4`, `.webm` and `-poster.webp`, with `<rev>` = `h2j`, `j2a`, `a2e` (hyphens, matching the base reveals in `revealSrc`, line 792). 7 × 4 × 3 = **84 reveals**, 540 px, about 2 MB per reveal with both formats together, with themed cocoons by Animator.

### 3.3 The look
Each mutation changes the silhouette. Moonlit floats on mist with moth wings, Obsidian is a wingless lava tank, Gilded is crowned on a hoard, and Aurora is a coiled serpent with light wings.

### 3.4 Accents (badge and rule only)

| Mutation | Accent (confirmed by Animator) | Used on |
|---|---|---|
| Moonlit | silver-blue `#a9c4e8` | `.mutb` badge border/text, sheet rule (`--mut-acc`) |
| Obsidian | ember orange `#e8783a` | same |
| Gilded | gold `#e9c46c` | same |
| Aurora | teal-violet: badge text and border `#8fd6cf`; the gradient `linear-gradient(90deg,#5fd0c0,#a78bfa)` goes on the **rule only** | same |

Accents are used **only** on the mutation badge and the sheet rule. Not on frames, chips, tile backgrounds or chrome (the Bestiary no-decoration rule still holds). Gilded's gold is close to the Legendary frame gold, but it appears only on the badge and rule, never on a frame, so it can't be mistaken for a tier.

### 3.5 Notes
Animator adds a naturalist note per mutation to `handoff/bestiary-notes.md` (a new table, keyed by mutation). The variant sheet shows that note (§6). Until it lands, it uses the current one-line flavour (`MUT_NOTES`, lines 722–727).

---

## 4. The manifest: `art/mutations/manifest.json`

### 4.1 Schema (Animator's, exact)
```json
{"cinder":{"moonlit":{"stages":["1_hatchling","2_juvenile","3_adult","4_elder"],"reveals":["h2j","j2a","a2e"]}}}
```
- Keyed dragon → mutation → `{stages, reveals}`.
- Each entry in `stages` and `reveals` may be a **plain string or an object**. Both forms can be mixed in one array:
  - Stage object: `{"key":"2_juvenile","edge":"#d9c7a5"}`. `edge` is the sampled parchment edge colour for that stage (used for `--edge`). Fallback: the existing `EDGES` table (`EDGES["<line>-<n>"]`), then `#d8c8ac`.
  - Reveal object: `{"key":"j2a","panelH":600,"change":"…"}`. `panelH` and `change` feed the payoff card. Fallback: the base reveal's `PANEL_H["<line>-<key>"]` and `CHANGE_LINES["<line>-<key>"]`.
  - Example: `{"cinder":{"moonlit":{"stages":["1_hatchling",{"key":"2_juvenile","edge":"#d9c7a5"}],"reveals":[{"key":"h2j","panelH":600,"change":"Moth wings unfurl from the mist"}]}}}`
- A stage name in `stages` means **all five** stage files in §3.1 exist.
- A key in `reveals` means all three reveal files in §3.2 exist.
- Anything missing (a dragon, a mutation, a stage or a reveal) is simply not listed. An empty or missing manifest means "no mutation art yet", so everything uses the fallback.

### 4.2 Rules
1. **The code loads only listed files.** It never builds a path to an unlisted file, never probes with HEAD, and never relies on `onerror` to discover art. Result: no 404s in the Network panel.
2. **Every art pull request updates the manifest** in the same commit as the files it adds. A file without a manifest entry is invisible to the game, and an entry without its files is a bug (caught by test M1).
3. Partial sets are fine (e.g. Cinder Moonlit with only `["1_hatchling","2_juvenile"]`).

### 4.3 Loading (JS)
```js
const MSTAGE = ["1_hatchling","2_juvenile","3_adult","4_elder"];
let MUT_ART = {};   // normalized: {line:{mut:{stages:{"2_juvenile":{edge}}, reveals:{"j2a":{panelH,change}}}}}
const HEX = /^#[0-9a-f]{6}$/i;
function normEntries(list, known, pick){             // accepts "key" or {key,...}; drops unknown/duplicate keys
  const out = {};
  (Array.isArray(list) ? list : []).forEach(x => {
    const o = typeof x === "string" ? {key:x} : (x && typeof x === "object" ? x : null);
    if (o && typeof o.key === "string" && known.includes(o.key) && !out[o.key]) out[o.key] = pick(o);
  });
  return out;
}
function normManifest(j){
  const M = {};
  if (!j || typeof j !== "object") return M;
  DEX_LINES.forEach(l => MUT_KEYS.forEach(m => {
    const e = j[l] && j[l][m]; if (!e || typeof e !== "object") return;
    (M[l] = M[l] || {})[m] = {
      stages:  normEntries(e.stages,  MSTAGE, o => ({edge: HEX.test(o.edge || "") ? o.edge : null})),
      reveals: normEntries(e.reveals, REVEAL_KEY.filter(Boolean), o => ({
        panelH: Number.isFinite(o.panelH) && o.panelH > 0 ? o.panelH : null,
        change: typeof o.change === "string" && o.change.trim() ? o.change : null}))
    };
  }));
  return M;
}
const mutStage  = (line, m, si)  => !!(m && MUT_ART[line]?.[m]?.stages[MSTAGE[si]]);
const mutReveal = (line, m, key) => !!(m && MUT_ART[line]?.[m]?.reveals[key]);
const mutEdge   = (line, m, si)  => MUT_ART[line]?.[m]?.stages[MSTAGE[si]]?.edge || EDGES[line + "-" + (si + 1)] || "#d8c8ac";
const mutPanelH = (line, m, key) => MUT_ART[line]?.[m]?.reveals[key]?.panelH || PANEL_H[line + "-" + key] || 600;
const mutChange = (line, m, key) => MUT_ART[line]?.[m]?.reveals[key]?.change ?? CHANGE_LINES[line + "-" + key] ?? "";
const mutSrc    = (line, m, si) => `art/mutations/${line}/${m}/${MSTAGE[si]}`;
function loadMutArt(){
  return fetch("art/mutations/manifest.json", {cache:"no-cache"})
    .then(r => r.ok ? r.json() : {}).catch(() => ({}))
    .then(j => { MUT_ART = normManifest(j); render(); });
}
```
- Call `loadMutArt()` from `start()` right after `setTab(...)`. The first render uses the fallback for a moment, then re-renders. Don't block start on the fetch.
- `normManifest` is the only place that reads the raw JSON. It ignores unknown dragons, mutations and stage/reveal keys, takes the first of any duplicate key, and drops an invalid `edge` (not `#rrggbb`), `panelH` (not a positive number) or empty `change`. A dropped field just uses its fallback.
- A missing or invalid manifest is not an error: `MUT_ART = {}`, so every mutated dragon falls back.

---

## 5. Art everywhere: `dragonArt()` (lines 1164–1176)

Change the source choice, not the call sites:
```js
function artSrc(d, si){
  return mutStage(d.line, d.mut, si) ? {src: mutSrc(d.line, d.mut, si), own: true}
                                     : {src: stageSrc(d.line, si), own: false};
}
```
In `dragonArt`:
- `src` = `artSrc(d, si).src`.
- Still: `<img src="${src}.webp">`.
- Live: `<video poster="${own ? src + "-poster" : src}.webp" …>` with the `.webm`/`.mp4` sources.
- **Card effect:** `const fx = !o.ghost && d.mut && !own ? MUTATIONS[d.mut].fx : ""`. The `fx-*` class and the `.shine` element apply **only when the base art is the fallback**. Own art never gets the old card effect.
- `--edge`: own art uses `mutEdge(d.line, d.mut, si)` (the manifest's sampled edge for that stage, §4.1), falling back to `EDGES[d.line + "-" + (si + 1)]`, then `#d8c8ac`. Base art keeps the `EDGES` lookup.
- Replace the CSS comment at line 467 with `/* Mutation card effects: fallback only, when the mutation's own art isn't in the manifest. */`.

This one change covers every place a mutated dragon appears:

| Place | Call (line) | Shows |
|---|---|---|
| Hoard tile | 1550, still | mutation's **current-stage** still, or base still + `fx-*` |
| Prize card (Dragon screen) | 1518, `live` | mutation's current-stage loop (poster under reduced motion), or base loop + `fx-*` |
| Hatch overlay | 1794, `live` | mutation's Hatchling loop, or base + `fx-*` |
| Share card | 1822, `live` | same as the prize card |
| Bestiary grid tile | 1620, still, `stage: e.top` | still of the highest stage reached **in that mutation**, or base + `fx-*` |
| Variant sheet top art | 1680, `live`, `stage: e.top` | §6 |

The `rf-mut` frame (lavender hairline plus sweep, `feature-rarity-frames.md` §4) stays on hoard tiles, hatch and grid tiles. Only the variant **sheet** swaps lavender for the accent (§6.2).

---

## 6. Variant sheet (`openDex(k)` with `k = "<line>:<mut>"`, lines 1641–1708)

### 6.1 Layout (top to bottom)
Same journal frame (`.dex-frame`, brackets, `#dexOv.bst-journal`, the merged 8 px margin fix: `.dex-frame{margin:8px 0;padding:14px}`, `#dexOv{padding:4px}`).

1. Brand row (unchanged).
2. **Top art:** `dragonArt(d, {live:true, stage:e.top})`. This is the highest stage reached **in this mutation**, playing its own loop, or the poster under reduced motion. Plate **136 px** wide (same as `.dex-dragon .plate`), not 200 (saves about 95 px, §9).
3. Dex number, name (`dexName`), species tag (unchanged).
4. **Mutation badge** under the name: `<div class="mutb acc-<mut>">{Mutation} mutation</div>`, accent border and text.
5. Stats strip (3 cells: Rarity, Egg, Highest stage pips), unchanged.
6. **Growth row** (new for variants): heading "Growth", ruled with the **accent** (`.stg-h` border-bottom `--mut-acc`), then 4 stage tiles (§6.3).
7. **Facts row**, one line: First hatched · Owned · Odds per hatch (odds moves into this row instead of its own row, which saves 24 px).
8. Note: the mutation's naturalist note (§3.5), Cormorant italic, **clamped to 3 lines** (`-webkit-line-clamp:3`).
9. Mutation chips (unchanged behaviour: found are links, unfound are dashed with the name).
10. Actions: Close, plus "Watch it grow again" when this dragon's own reveal for its current stage is listed (§8.3).

### 6.2 Accent replaces lavender on these sheets
```css
.dexsheet.rf-mut{--rf-mutin:inset 0 0 0 1px var(--mut-acc)}        /* hairline = accent, not lavender */
.dexsheet.rf-mut .dno2{color:var(--mut-acc-text,var(--mut-acc))}
.dexsheet .stg-h.acc{border-bottom-color:var(--mut-acc)}
.acc-aurora .stg-h.acc{border-bottom:1px solid transparent;border-image:var(--mut-acc-grad) 1}  /* Aurora: gradient on the rule only */
.acc-moonlit{--mut-acc:#a9c4e8}
.acc-obsidian{--mut-acc:#e8783a}
.acc-gilded{--mut-acc:#e9c46c}
.acc-aurora{--mut-acc:#8fd6cf;--mut-acc-grad:linear-gradient(90deg,#5fd0c0,#a78bfa)}
.mutb[class*="acc-"]{border-color:var(--mut-acc);color:var(--mut-acc);background:transparent}
```
Put the `acc-<mut>` class on the `.dexsheet` element. The rarity frame gradient itself is unchanged.

### 6.3 Growth row tiles
For `i` in 0–3, with `reached = i <= e.top`:
- **Reached and listed** (`mutStage(line, m, i)`): `<img src="${mutSrc(line,m,i)}.webp" loading="lazy">`, with the top tile highlighted (today's `.stg.top`).
- **Reached but not listed:** base still `stageSrc(line,i).webp` inside a `.dart fx-<fx>` wrapper (the card-effect fallback).
- **Locked and listed:** `<img src="${mutSrc(line,m,i)}-sil.webp">` plus "???" caption. **The real still/loop is never referenced in the DOM**, so it is never requested.
- **Locked and not listed:** today's base placeholder (Hatchling: `art/bestiary/silhouettes/<line>-1-silhouette.webp`; others: "???" text box). No mutation path.
- Captions: stage name if reached, "???" if locked. `aria-label` "`{Stage}, reached`" / "`Stage {n}, not reached yet`". Never name a locked stage's look.

### 6.4 Only one video
Only the sheet's top art is a `<video>`. The growth row, chips, grid tiles and hoard use `<img>` stills or silhouettes only, all `loading="lazy"`. `closeDex()` already empties the overlay, which unloads the video.

---

## 7. Save data

### 7.1 Format: no new field
The highest stage per dragon+mutation **already exists**: `S.dex["<line>:<mut>"].top` (written by `dexSync`, lines 1586–1593, max of `stageIdx` over owned dragons with that key). This spec reads it for the variant sheet and grid. **(Decision)** Bump `SAVE_VER` to **3** so App Tester can confirm the upgrade ran, and run a re-derive pass:
```js
function migrateV3(){                       // idempotent; only ever raises, only from owned dragons
  S.dex = asMap(S.dex);
  for (const k of Object.keys(S.dex)){
    const e = S.dex[k];
    e.top = Math.min(3, Math.max(0, e.top | 0));      // clamp junk (NaN, >3, strings)
  }
  S.dragons.forEach(d => { if (!d.mut || !MUTATIONS[d.mut]) return;
    const k = d.line + ":" + d.mut, e = S.dex[k] || (S.dex[k] = {first:null, n:0, top:0});
    if (!e.n) e.n = S.dragons.filter(x => dexKeys(x).includes(k)).length;
    e.top = Math.max(e.top, stageIdx(d)); });
}
// start(), after the existing v2 line (1989):
if ((S.ver || 1) < 3){ migrateV3(); S.ver = 3; save(); }
```
- **No false unlocks:** a stage is unlocked only by an owned dragon's `stageIdx`. Nothing is unlocked from the manifest, from base pages, or from another mutation. A key with no owned dragon keeps its stored `top` (pages are never taken away) but is never raised.
- The `dex` key for a variant is still created only by a hatch (`dexRecord`) or by `dexSync` from an owned dragon.
- `fresh()` gets `ver:SAVE_VER` (3).

### 7.2 Live updates
`save()` already calls `dexSync()`, so `top` rises the moment the prize grows (`addSteps` → `save`). Also, if `#dexOv` is open on that dragon's key (`dexFrom === k`) when it grows, call `openDex(k)` again after `save()` so the growth row and top art update live. (Growth normally waits on the reveal overlay, but debug "Prize → stage" can change it while the sheet is open.)

---

## 8. Growth reveals for mutated dragons (in scope)

### 8.1 Choosing the clip
In `startGrowth` (line 848), `replayReveal` (line ~1120), the Dragon screen replay button (line 1564) and the sheet's replay (line 1699):
```js
const rsrc = (d, key) => d.mut ? `art/reveals/${d.line}-${d.mut}-${key}` : revealSrc(d.line, key);
function revealOk(d, key){
  if (d.mut) return Promise.resolve(mutReveal(d.line, d.mut, key));   // manifest only, no HEAD, never the base clip
  return revealAvailable(d.line, key);                                 // base dragons: unchanged
}
```
- Mutated dragon, reveal listed: `openReveal` plays `rsrc(d,key)` (poster `-poster.webp`, `.webm` then `.mp4`) with **the same playback rules** as the base reveals (`growth-reveal-spec.md`: skip lock on first view, Continue, reduced motion shows the poster still, `d.reveals[key] = true`).
- Mutated dragon, reveal **not** listed: `fallbackGrowth(d, now, msgs)`, i.e. the stage-up toast "`{name} grew into a {Stage}.`". The prize card then shows the mutation's new-stage loop (or base + `fx-*` if that stage isn't listed either). **Never play the base dragon's reveal for a mutated dragon.**
- Replay buttons appear only if `revealOk` is true. For a mutated dragon without its reveal, no replay button (not a "not available" toast).

### 8.2 Payoff card inside the reveal
`openReveal` (line 864) uses `PANEL_H`, `CHANGE_LINES` and portraits keyed by `${line}-${key}`:
- Portraits: use `artSrc(d, was)` / `artSrc(d, now)` stills (own art or base).
- Panel height and change line: for a mutated dragon use `mutPanelH(line, mut, key)` and `mutChange(line, mut, key)` (the reveal object in the manifest, §4.1), falling back to the base reveal's `PANEL_H` / `CHANGE_LINES` for `${line}-${key}`. Base dragons are unchanged.

### 8.3 Only the playing reveal downloads
Reveal `<video>` elements are created only inside `openReveal`, with `preload="auto"` on that one element. Nothing preloads, prefetches or HEADs other reveals. `revealOk` for mutated dragons makes no request at all.

---

## 9. Fit at 390 × 844 and 375 × 667

Measured by me in headless Chrome on `475cb88` (fonts loaded; the overlay's inner height was 757 px in that harness). Base Cinder sheet scroll height **838**, current Moonlit Cinder variant sheet **786**: brand 10, plate 298, number 11, name 32, tag 19, badge 24, stats 65, facts 16 + 16, note 42, chips 24, actions 48.

Variant budget after this spec (frame + 8 px margins + 4 px overlay padding included):
- Remove: plate 298 → 203 (**−95**), odds merged into facts (**−24**).
- Add: growth heading + row (≈15 + 128 + 18 margin = **+161**), and a 3-line note at most (+21 over the current 42).
- Result ≈ **786 − 119 + 161 + 21 ≈ 849**, before the 2-line name. That's about the same as the base dragon sheet (838).

Requirements:
- **390 × 844 (real device viewport, e.g. DevTools iPhone 12/13/14):** variant and dragon sheets show Close with **no scroll** (`#dexOv.scrollHeight <= clientHeight`). If it's over by a few px, cut the tag→badge gap and the `.note` top margin from 10 to 6 before touching anything else. Don't shrink fonts below the current sizes.
- **375 × 667:** `#dexOv` scrolls vertically (existing `align-items:flex-start; overflow-y:auto`). The frame keeps its 8 px margins and 4 px overlay padding, brackets aren't clipped, nothing scrolls sideways, and Close is reachable.
- My harness viewport was shorter than 844 (757), which made even the base sheet scroll. App Tester must confirm on a true 844 viewport.

---

## 10. Size estimate

Based on Cinder's encodes on the box (`/workspace/mutations/app/cinder`): still ≈ 87 KB, poster ≈ 77 KB, mp4 ≈ 0.96 MB, silhouette ≈ 6 KB (base silhouettes, assumed similar). WebM loops are being retuned by Animator to **≈ 1 MB each** (the first Cinder webms were about 1.8 MB). Some Cinder files on the box are 0 bytes or `.tmp.mkv`: that's mid-encode, not a problem, and none of it is in the repo or the manifest.

| Set | Count | Size |
|---|---|---|
| Stills | 112 | 9.7 MB |
| Posters | 112 | 8.6 MB |
| Silhouettes (`-sil`) | 112 | 0.7 MB |
| Loops mp4 (≈ 1 MB) | 112 | ≈ 108 MB |
| Loops webm (≈ 1 MB, retuned) | 112 | ≈ 112 MB |
| Reveals (84 × ~2 MB both formats + posters) | 84 | ≈ 170 MB |
| **Repo total added** | | **≈ 410 MB** |

What a player actually downloads (the browser takes the first supported `<source>`, which is webm in Chrome/Firefox and mp4 in Safari):
- Bestiary grid: one still per **found** variant, lazy (max 28 × 87 KB ≈ 2.4 MB if all found; typically a few hundred KB). Undiscovered tiles: base silhouettes (6 KB).
- Variant sheet: **one** loop (≈ 1 MB) + its poster (77 KB) + up to 3 reached stills (≤ 260 KB) + locked `-sil` files (≤ 18 KB). Chips: text only.
- Hoard: one still per mutated dragon owned.
- A growth reveal: one clip in one format (~1 MB) + poster.


---

## 11. Fallback summary (never a broken image)

| Missing from the manifest | Result |
|---|---|
| Stage still/loop/poster | Base art for that stage + the mutation's old `fx-*` card effect (hoard, prize, hatch, share, grid, sheet, growth row) |
| `-sil` for a locked stage | Base placeholder (Hatchling base silhouette, otherwise the "???" box) |
| Reveal | Stage-up toast + new stage art. Never the base reveal. No replay button |
| Manifest itself (404/invalid) | All mutated dragons use the fallback; no errors |

Because the code only builds paths from the manifest, a broken image can only happen if the manifest lists a file that doesn't exist. Test M1 catches that before merge.

---

## 12. Tests (App Tester)

Open with `?debug=1`, viewport 390 × 844 unless stated, DevTools Network open with "Disable cache" on.

**Manifest and art integrity**
- **M1. Every entry exists:** for each listed stage, all 5 files in §3.1 exist; for each listed reveal, all 3 files in §3.2 exist. Script it: `jq` over `art/mutations/manifest.json` → `test -s` each path. Zero missing, zero 0-byte files. Run on every art pull request.
- **M2. Every file is listed:** every file under `art/mutations/**` and every `art/reveals/*-{moonlit,obsidian,gilded,aurora}-*` maps to a manifest entry. No orphans (e.g. a stray `.tmp.mkv` or a `.webm` without its stage listed).
- **M3. Schema:** the JSON parses; only known dragons, mutations, stage names and reveal keys; no duplicate keys in an array (string and object forms count as the same key); every `edge` is `#rrggbb`; every `panelH` is a positive integer; every `change` is a non-empty string.
- **M3b. Both forms normalize:** a local manifest mixing `"1_hatchling"` with `{"key":"2_juvenile","edge":"#c0ffee"}`, and `"h2j"` with `{"key":"j2a","panelH":640,"change":"Test line"}`: both stages and both reveals are treated as listed. The Juvenile `.dart` has `--edge:#c0ffee` and the Hatchling uses the `EDGES` value. The J→A payoff card is 640 high with "Test line", and the H→J card uses the base `PANEL_H`/`CHANGE_LINES`.
- **M3c. Bad fields fall back:** `{"key":"2_juvenile","edge":"red"}` and `{"key":"j2a","panelH":-5,"change":""}`: the stage and reveal still count as listed, but the edge comes from `EDGES` and the card uses the base panel height and change line. An unknown key (`{"key":"5_ancient"}`) and a non-string, non-object entry are ignored without errors.
- **M4. Size budget:** each loop file ≤ 1.1 MB, webm and mp4 separately (webm retuned to about 1 MB); each reveal's mp4 + webm ≤ 2.2 MB; widths 540 px (`ffprobe`). Total added under `art/mutations` + mutation reveals reported against the ≈ 410 MB estimate in §10 (flag anything over 450 MB). Ignore 0-byte and `.tmp.mkv` files on Animator's box (mid-encode); they must never appear in the repo (M2).

**Save upgrade**
- **S1.** Load a v2 save with a Moonlit Cinder at Adult (xp ≥ adult threshold) and a plain Brine. After reload: `ver: 3`, `dex["cinder:moonlit"].top === 2`, Brine's pages unchanged, **no** other `cinder:*` or `brine:*` variant key created.
- **S2. No false unlocks:** a v2 save with base Cinder at Elder and a Moonlit Cinder at Hatchling → the Moonlit sheet shows Hatchling reached and Juvenile/Adult/Elder locked.
- **S3. Junk:** `dex["cinder:moonlit"].top` set to `9` or `"x"` → clamped (3 or 0), no crash.
- **S4. Idempotent:** reload twice; nothing changes after the first upgrade.
- **S5. Live:** Moonlit Cinder as prize, sheet open on `cinder:moonlit`, Debug → Prize → Juvenile → the growth row now shows Juvenile reached and the top art switches to the Juvenile loop without reopening.

**Locked stages and network (no hidden art requested)**
- **L1.** Moonlit Cinder at Hatchling, open its sheet. Network shows exactly: the Hatchling loop (one of webm/mp4) + its poster, the Hatchling still, and `2_juvenile-sil.webp`, `3_adult-sil.webp`, `4_elder-sil.webp`. **No** request for any locked stage's `.webp`, `-poster.webp`, `.mp4` or `.webm`, and no other mutation's files.
- **L2.** Locked tiles show the silhouette + "???" captions; screen-reader labels say "Stage 2, not reached yet", never the look.
- **L3. One video:** with the sheet open, the page has exactly one `<video>` playing (`document.querySelectorAll("video")` inside `#dexOv` = 1). Grid, growth row and chips are `<img>` only.
- **L4. Lazy loading:** opening the Bestiary grid requests stills only for found tiles in or near view; scrolling loads more. Closing the sheet stops the video request (overlay emptied).
- **L5. Reveals:** grow a Moonlit Cinder H→J with the reveal listed → only `cinder-moonlit-h2j` (one format + poster) downloads. No other reveal, base or mutated, is requested before or after. No HEAD requests for mutation reveals.
- **L6. No 404s:** a full session (hatch a forced mutation, grow it, open grid and sheets, replay) shows zero 404s in Network.

**Missing-art fallback**
- **F1.** Remove `obsidian` from the manifest for Cinder (local copy), force an Obsidian hatch (Debug → Mutate → Obsidian): hatch overlay, hoard, prize and grid show the **base** Cinder art with the old Obsidian card effect; no broken images; no request to `art/mutations/cinder/obsidian/*`.
- **F2.** List only `["1_hatchling"]` for a mutation, grow it to Juvenile: the prize shows the base Juvenile + `fx-*`; the growth row shows the own Hatchling still and the base Juvenile still with the card effect.
- **F3. Reveal fallback:** a mutation without `h2j` listed grows H→J → the stage-up toast appears, the new stage art shows on the prize card, the **base reveal does not play** (no request to `art/reveals/cinder-h2j*`), and there's no "Watch it grow again" button.
- **F4.** Delete the manifest (or serve invalid JSON): the game starts normally, and every mutated dragon uses the fallback.

**Art everywhere**
- **A1.** With Cinder Moonlit fully listed: hoard tile, prize card (loop), hatch overlay, share card and Bestiary grid all show the Moonlit art for the current stage, and none of them has the old `fx-moon` ring.
- **A2.** Reduced motion on: the sheet top art, prize and hatch show `-poster.webp`, no video request.

**Sheet look and fit**
- **V1.** The variant sheet uses the journal frame and brackets, a 136 px plate, the badge under the name, and the accent (not lavender) on the badge, hairline and growth rule. Per mutation: Moonlit `#a9c4e8`, Obsidian `#e8783a`, Gilded `#e9c46c`, Aurora badge `#8fd6cf` with the teal→violet gradient on the growth rule only. Grid tiles and the hoard still use the `rf-mut` lavender frame.
- **V2. Fit:** at 390 × 844 the Moonlit Cinder sheet (all 4 stages reached, longest note) shows Close with no scroll, and so does the base Tempest sheet. Check every mutation's longest note.
- **V3. Scroll:** at 375 × 667 the sheet scrolls vertically; the frame keeps its 8 px margins; brackets are visible; no sideways scroll; Close reachable; Escape closes and focus returns to the tile.

---

## 13. Open decisions

1. **Repo weight:** about 410 MB more on GitHub Pages. Pages has a 1 GB published-site soft limit, and the repo already holds about 125 MB of base reveals plus the dragon loops. Worth checking the total before all 84 reveals land.
2. **390 × 844 fit:** my headless check had a 757 px viewport, which made even the base sheet scroll, so the no-scroll fit (§9) must be confirmed on a true 844 px viewport (test V2).
