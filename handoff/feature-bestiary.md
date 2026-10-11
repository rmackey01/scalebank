# Scale Bank: Bestiary (feature spec)

- **Status:** approved by Ryan (small win)
- **Owner:** Crazy Idea Guy (spec)
- **Builder:** Software Engineer
- **Design:** Animator (Pokédex-style field journal, approved by Ryan Oct 10, 2026). Mockups: `art/bestiary-mockups/` (Animator). Field notes: `handoff/bestiary-notes.md` (Animator).
- **Source checked:** `rmackey01/scalebank` @ `main`, commit `1dca214` (`index.html`, 1,175 lines, Oct 4, 2026). Line numbers below refer to that file.
- **Checked:** the code in this spec was applied to a scratch copy of `index.html` @ `1dca214` (not the repo) and run in headless Chrome at 390 × 844: migration, Bestiary grid, detail sheet, hoard frames and the hatch overlay frame all rendered as described.
- **Depends on:** `feature-rarity-frames.md` (the `.rf` classes, `rfcls()`, `rfd()`, and the "Next hatch mutation" debug control). Build that first.

Rule (same as the other specs): if a number isn't here, don't guess. Values marked **(proposed)** are new design decisions made in this spec. Use them exactly as written.

---

## 1. Goal

A collection screen with one page for every dragon, plus one page for every mutation of every dragon. Pages you haven't found yet show as dark silhouettes of the Hatchling art with "???". Found pages show the art and the facts: rarity, which egg, first hatched, how many, and the highest stage reached. Collectors get something to fill in, and the only new art it needs is Animator's pre-made silhouettes (§6.0).

## 2. Scope

**In scope:**
1. A Bestiary sub-view of the Dragon tab, opened from a button on the Dragon screen (§4).
2. A grid of the 7 dragons and a grid of the 28 mutation variants (7 dragons × 4 mutations), 35 pages in total (§6).
3. A detail sheet when a found page is tapped (§7).
4. New save data (`S.dex`) and a versioned save migration that backfills it from existing saves without breaking them (§5).

**Non-goals:**
- **Breeding** is out of scope. It's planned as a future major update. The Bestiary must not add breeding pages, hybrid placeholders, or "?" slots for future dragons. It lists exactly the dragons and mutations in the code.
- No new bottom-nav tab (§4 explains why).
- No new dragon art beyond Animator's finished Bestiary assets: pre-made silhouettes and cut-outs in `art/bestiary-mockups/silhouettes/` (copy into `art/bestiary/` when building, §6.0), mockups in `art/bestiary-mockups/`, and species tags and field notes in `handoff/bestiary-notes.md`.
- No changes to hatch odds, prices, stage thresholds, auto-hatch, or the prize rule.
- No hints on undiscovered pages about which egg hatches them. The game deliberately hides this: the Vendors odds say "Mystery dragon", and the Nest code says "Nothing here shows or names the dragon inside before it hatches" (line 740).
- No stage-by-stage gallery in the detail sheet (it shows the highest stage reached only).
- No sound.

---

## 3. Facts from `index.html` (don't change them)

### 3.1 Dragons, eggs, rarities (`DRAGONS` lines 412–415, `ITEMS` lines 418–441)

Bestiary order = the order of eggs in `ITEMS`, which is also the key order of `DRAGONS`.

| # | Line key | Dragon | Egg (item id) | Egg price / hatch steps | Rarity | Sold at (`SCENES[scene].name`) | Mutation chance per hatch (`RARITY`) |
|---|---|---|---|---|---|---|---|
| 1 | `cinder` | Cinder | Ember Egg (`ember`) | 4,000 / 6,000 | Common | Lantern Stall | 0.03 |
| 2 | `brine` | Brine | Tide Egg (`tide`) | 6,000 / 8,000 | Common | Lantern Stall | 0.03 |
| 3 | `moss` | Moss | Grove Egg (`forest`) | 12,000 / 15,000 | Uncommon | Lantern Stall | 0.05 |
| 4 | `inferno` | Inferno | Forge Egg (`inferno`) | 40,000 / 35,000 | Rare | Moon Kiln | 0.08 |
| 5 | `stormling` | Stormling | Squall Egg (`storm`) | 30,000 / 30,000 | Rare | Moon Kiln | 0.08 |
| 6 | `voidling` | Voidling | Night Egg (`void`) | 90,000 / 60,000 | **Epic** | Cliff Roost | 0.12 |
| 7 | `tempest` | Tempest | Storm Egg (`tempest`) | 200,000 / 120,000 | Legendary | Cliff Roost | 0.20 |

- Rarity tiers are exactly `Common`, `Uncommon`, `Rare`, `Epic`, `Legendary` (`RARITY`, line 443).
- A dragon's rarity is its egg's: `rarityOf(d) = ITEM[d.item].rarity` (line 487).
- **"Prize" is not a rarity.** It's the one dragon receiving steps (`S.prize`). The Bestiary never says "Prize".
- Scenes open in order: the Moon Kiln opens once you own `ember` + `tide`, and the Cliff Roost once you own `storm` + `tsparks` (`SCENES[].keys`, lines 455–459).

### 3.2 Mutations (`MUTATIONS` lines 444–449, `rollMutation` lines 986–990)

| Key | Name | Card effect class on `.dart` |
|---|---|---|
| `moonlit` | Moonlit | `fx-moon` |
| `obsidian` | Obsidian | `fx-gold` |
| `gilded` | Gilded | `fx-shine` (+ animated `<b class="shine">`) |
| `aurora` | Aurora | `fx-aurora` |

- Any hatch rolls `Math.random() < RARITY[rarity].mut`. On success, one of the 4 keys is picked uniformly, so a specific variant's chance is `mut / 4`. The hatch overlay already shows it with `pct(RARITY[it.rarity].mut / 4)` (line 1026): Common 0.8%, Uncommon 1%, Rare 2%, Epic 3%, Legendary 5%.
- Stored as `d.mut` (key or `null`). Mutations are card effects around the art, never a recolour (comment, line 316).
- Display name of a variant: `MUTATIONS[m].name + " " + species`, e.g. "Moonlit Cinder" (same wording as the hatch overlay, line 1027).

### 3.3 Stages (`STAGES` line 452, `stageIdx` line 486)

| Index | Name | xp needed (`at`) | Art file |
|---|---|---|---|
| 0 | Hatchling | 0 | `art/dragons/<line>-1.{webp,webm,mp4}` |
| 1 | Juvenile | 30,000 | `…-2` |
| 2 | Adult | 120,000 | `…-3` |
| 3 | Elder | 400,000 | `…-4` |

- `stageIdx(d)` = the highest index whose `at` ≤ `d.xp`. Only the prize dragon gains xp (`addSteps`, line 951). xp never goes down.
- Art path helper: `stageSrc(line, si)` = `` `art/dragons/${line}-${si + 1}` `` (line 548). Posters are opaque 480 × 715 WebP on a parchment background (`assets.md` §3).

### 3.4 Save format (lines 460–469)

- localStorage key: **`scalebank.v1`** (`KEY`, line 460). One JSON blob of the whole state `S`. `save()` = `localStorage.setItem(KEY, JSON.stringify(S))`. `load()` = `Object.assign(fresh(), JSON.parse(raw))`.
- State shape today (`fresh()`, line 463):

| Field | Type | Meaning |
|---|---|---|
| `bank` | number | spendable steps |
| `lifetime` | number | all steps ever added (eggs warm from this) |
| `owned` | `{itemId: true}` | items ever bought |
| `bought` | `{eggItemId: count}` | eggs bought per type |
| `opened` | `{sceneIndex: true}` | vendor scenes unlocked |
| `eggs` | `[{id:"egg<n>", item, at}]` | eggs warming; `at` = `lifetime` at purchase |
| `dragons` | `[{id:"drg<n>", item, line, species, mut, xp, seenStage, name, trail}]` | every dragon owned. None are ever removed (there's no release or sell) |
| `prize` | dragon id or `null` | the dragon receiving steps |
| `scene` | number | last vendor scene viewed |
| `tab` | `"bank" \| "vendors" \| "nest" \| "dragon"` | last tab |
| `seq` | number | id counter for eggs and dragons |

- Dragons have **no hatch timestamp** today. That's why old saves backfill "first hatched" as unknown (§5.4).
- `migrate()` (lines 1141–1157) already repairs old saves (old egg ids via `OLD_EGG`, missing `line`, invalid `mut`/`trail`). It runs on every boot from `start()` (line 1161).
- `start(data)` also accepts `data.state` from the artifact hot-reload wrapper (line 1159). Treat it exactly like a loaded save.
- "Reset to first run" sets `S = fresh()` (line 1097).

### 3.5 Navigation (lines 394–400, `setTab` lines 576–584, `nest-spec.md` §2.3)

- The bottom nav has **4 tabs**: BANK, VENDORS, NEST, DRAGON (`<nav class="tabs">`, `grid-template-columns:repeat(4,1fr)`). Each has an active and inactive icon in `art/nest/`. `nest-spec.md` §2.3 fixes 4 tab centres, and the shared underline slides by `--ti` in 25% steps.
- `setTab(t)` shows exactly one of `#bank, #vendors, #nest, #dragon` (each a `<main class="screen">`), marks the tab `aria-current="page"`, saves `S.tab`, and calls `render()`.

### 3.6 Dragon screen and hoard (lines 878–940, CSS 149–173, 243–259)

- `#dragon` = `.topbar` (`<h1>Your dragon</h1>` + `#dchip` balance chip), then `#dragonBody`.
- With a prize: `.frame` prize card (plaque "Prize dragon", live art `width:min(240px,62vw)`, name, species · rarity, mutation badge `.mutb`, growth), then `<button class="btn share-btn">Make share card</button>`, then the Customize section.
- Without a prize: `.frame.empty` (ghost art + padlock, "Unclaimed", a message, and a CTA `goto-nest` or `goto-stall`).
- Hoard (only when `S.dragons.length > 1`): `.hoard` grid of `.hd` buttons (see `feature-rarity-frames.md` §3).
- Art helper `dragonArt(d, o)` (lines 550–561) returns `<div class="dart …" role="img" aria-label="{name}, {stage}">`. `o.live` plays the loop (and falls back to the poster under reduced motion); otherwise it's a lazy `<img>` of the poster. `o.stage` overrides the stage. A mutation adds `fx-<fx>`.
- Overlays: `#hatchOv`, `#shareOv` (`.overlay`: `position:absolute; inset:0; z-index:20`). `autoHatch()` (line 994) only starts a hatch when both are hidden.

---

## 4. Where it lives: a sub-view of the Dragon tab (not a new tab)

**Decision:** no fifth tab. A fifth tab would need new icon art, a new nav layout (the 4 tab centres, the 25% underline steps, and the dot positions in `nest-spec.md` §2.3 are all fixed), and narrower tabs on a 390 px phone. Instead:
- The Dragon screen gets a **"Bestiary" button**.
- The Bestiary opens as a separate `<main>` screen while the **DRAGON tab stays active** (the underline doesn't move).
- A back button returns to the Dragon screen. Tapping the DRAGON tab (or any tab) also leaves the Bestiary.

### 4.1 Markup (add after `#dragon`, line 392, before `<nav>`)

```html
<main id="bestiary" class="screen pad" aria-label="Bestiary" hidden>
  <div class="topbar">
    <button class="bst-back" data-act="bestiary-back" aria-label="Back to your dragon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>
    <h1 tabindex="-1">Bestiary</h1>
    <span class="chip" id="bchip"></span>
  </div>
  <div id="bestiaryBody"></div>
</main>
```
And a third overlay after `#shareOv` (line 403):
```html
<div class="overlay" id="dexOv" hidden></div>
```

### 4.2 JS: sub-view state (not saved)

```js
let DSUB = null;   // "bestiary" while the Bestiary is open inside the Dragon tab. Not saved: a reload lands on the Dragon screen.
```
- `setTab(t, sub)`: add the `sub` parameter. First line after `S.tab = t;`:
```js
DSUB = t === "dragon" && sub === "bestiary" ? "bestiary" : null;
```
  Replace the hide loop with:
```js
for (const id of ["bank","vendors","nest","dragon"]) document.getElementById(id).hidden = id !== t || (id === "dragon" && DSUB === "bestiary");
$("#bestiary").hidden = DSUB !== "bestiary";
```
  The rest of `setTab` is unchanged. Every existing call (`setTab(tab.dataset.tab)`, `goto-stall`, `goto-nest`, `closeHatch`, reset) passes no `sub`, so it leaves the Bestiary. That's intended. For example, "Meet your dragon" after a first hatch goes to the Dragon screen.
- `render()` (line 947): replace `if (S.tab === "dragon") renderDragon();` with
```js
if (S.tab === "dragon"){ if (DSUB === "bestiary") renderBestiary(); else renderDragon(); }
```

### 4.3 Entry button on the Dragon screen

```js
const bstEntry = () => `<button class="btn ghost bst-entry" data-act="bestiary"><span>Bestiary</span><small>${dexFound()} of ${DEX_KEYS.length} found</small></button>`;
```
- Prize case: insert `${bstEntry()}` right after `<button class="btn share-btn" data-act="share">Make share card</button>` (line 906).
- No-prize case: insert `${bstEntry()}` right after the closing `</div>` of `.frame.empty` (line 923).
- It's always shown, even at 0 found (it then reads "0 of 35 found").

### 4.4 Click and key handling (in the existing listeners, lines 1066–1111)

```js
else if (a === "bestiary"){ setTab("dragon", "bestiary"); $("#bestiary").scrollTop = 0; $("#bestiary h1").focus(); }
else if (a === "bestiary-back"){ setTab("dragon"); const b2 = $(".bst-entry"); if (b2) b2.focus(); }
else if (a === "dex") openDex(b.dataset.k);
else if (a === "close-dex") closeDex();
else if (a === "dex-replay") { /* only if the growth reveal is built, §7.4 */ }
```
- Escape (keydown, line 1108): before the share check, add `if (!$("#dexOv").hidden){ closeDex(); return; }`.
- `autoHatch()` (line 996): the condition becomes `$("#hatchOv").hidden && $("#shareOv").hidden && $("#dexOv").hidden`. Steps can still be added under the sheet from the debug panel (z-index 40), so a hatch must wait until the sheet closes.

---

## 5. Save data and migration

### 5.1 New fields (save key stays `scalebank.v1`)

Keep the localStorage key `scalebank.v1`. Changing it would orphan every existing save. Add two fields to `S`:

| Field | Type | Meaning |
|---|---|---|
| `ver` | number | save format version. **2** after this feature. Saves without it are version 1. |
| `dex` | `{ [key]: {first, n, top} }` | one entry per found page |

- Key: `"<line>"` for a dragon page (e.g. `"cinder"`), and `"<line>:<mutKey>"` for a variant page (e.g. `"cinder:moonlit"`). There are 35 possible keys.
- `first`: `Date.now()` (ms) at the first hatch of that page, or `null` if it hatched before the Bestiary existed (backfill).
- `n`: number of dragons hatched for that page. A mutated dragon counts for **both** its dragon page and its variant page.
- `top`: highest stage index (0–3) any dragon of that page has reached.

Example (an old save after migration, plus one new hatch):
```json
"ver": 2,
"dex": {
  "cinder":        {"first": null,          "n": 2, "top": 1},
  "brine":         {"first": null,          "n": 2, "top": 2},
  "brine:moonlit": {"first": null,          "n": 1, "top": 0},
  "moss":          {"first": 1791090000000, "n": 1, "top": 0}
}
```

### 5.2 Constants and helpers (add right after `const KEY = "scalebank.v1";`, line 460)

```js
const SAVE_VER = 2;
const DEX_LINES = ITEMS.filter(i => i.kind === "egg").map(i => i.line);        // cinder, brine, moss, inferno, stormling, voidling, tempest
const MUT_KEYS = Object.keys(MUTATIONS);                                         // moonlit, obsidian, gilded, aurora
const DEX_KEYS = DEX_LINES.flatMap(l => [l, ...MUT_KEYS.map(m => l + ":" + m)]); // 35 pages
const eggOf = line => ITEMS.find(i => i.kind === "egg" && i.line === line);
const dexKeys = d => d.mut ? [d.line, d.line + ":" + d.mut] : [d.line];
const dexName = (line, m) => (m ? MUTATIONS[m].name + " " : "") + DRAGONS[line].name;
const dexFound = () => DEX_KEYS.filter(k => S.dex[k]).length;
```
Derive everything from `ITEMS` and `MUTATIONS`. Don't hard-code 7, 4 or 35 anywhere. A new egg or mutation added later then shows up automatically.

### 5.3 Load, version, save

```js
// fresh(), line 463: add  dex:{}, ver:SAVE_VER  to the returned object.

/* Saves written before the Bestiary have no "ver": mark them v1 so migrate() backfills. */
function hydrate(obj){
  const st = Object.assign(fresh(), obj);
  if (!obj.ver) st.ver = 1;
  if (!st.dex || typeof st.dex !== "object") st.dex = {};
  return st;
}
function load(){
  try { const raw = localStorage.getItem(KEY); if (raw) return hydrate(JSON.parse(raw)); } catch(e){}
  return null;
}
// start(), line 1159:  S = (data && data.state) ? hydrate(data.state) : (load() || fresh());

function save(){ dexSync(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
```
`hydrate` has to check `obj.ver` (the raw data), not `st.ver`. `fresh()` now carries `ver: 2`, so after `Object.assign` every old save would otherwise look like v2 and skip the backfill.

### 5.4 Migration v1 → v2 (backfill)

Add at the **end** of `migrate()` (after the dragon repairs, so `line` and `mut` are already valid):
```js
if ((S.ver || 1) < 2){ migrateDex(); S.ver = 2; }
```
```js
/* v1 -> v2: build the Bestiary from the dragons already owned. Dragons are never removed, so the
   counts and highest stages are exact. Hatch dates weren't stored before v2, so "first" is null. */
function migrateDex(){
  S.dex = {};
  S.dragons.forEach(d => dexKeys(d).forEach(k => {
    const e = S.dex[k] || (S.dex[k] = {first: null, n: 0, top: 0});
    e.n += 1; e.top = Math.max(e.top, stageIdx(d));
  }));
}
```
- Nothing else in the save changes. Old fields are untouched.
- Downgrade: an older build that loads a v2 save keeps `dex` and `ver` (its `Object.assign` + `JSON.stringify(S)` preserve unknown fields). It just doesn't update them. Known limitation: dragons hatched under an old build after the upgrade won't be counted, beyond the safety net in §5.5.

### 5.5 Keeping it current

```js
/* Called in hatch() right after S.dragons.push(d), before save(). */
function dexRecord(d){
  const now = Date.now();
  dexKeys(d).forEach(k => {
    const e = S.dex[k];
    if (e) e.n += 1;
    else S.dex[k] = {first: now, n: 1, top: 0};
  });
}
/* Called from save(): raises "top" as dragons grow, and recreates any entry that's missing (safety net). */
function dexSync(){
  S.dragons.forEach(d => dexKeys(d).forEach(k => {
    let e = S.dex[k];
    if (!e) e = S.dex[k] = {first: null, n: S.dragons.filter(x => dexKeys(x).includes(k)).length, top: 0};
    e.top = Math.max(e.top || 0, stageIdx(d));
  }));
}
```
- `hatch()` (line 1007): insert `dexRecord(d);` on the line right after `S.dragons.push(d);`. It must come before `save()`, otherwise `dexSync` creates the entry first with `first: null`.
- Backfilled entries keep `first: null` forever. A later hatch of the same page doesn't set a date, because it wasn't the first.
- `top` is raised on every `save()`. That covers `addSteps`, the debug "Prize → stage" buttons, and the growth reveal.
- Reset to first run wipes the Bestiary (`fresh()` has `dex: {}`). That matches "Wipes all progress".

---

## 6. Bestiary screen

### 6.0 Approved design (Animator, approved by Ryan): Pokédex-style field journal

This section wins over any older value below it. Fonts stay Cormorant Garamond (`--display`) and Lato (`--body`).

**Page count: 35, decided.** 7 dragon pages + 28 variant pages (each dragon has its own Moonlit, Obsidian, Gilded and Aurora page). No shared mutation pages.

**Dex numbers:**
- Dragons `No. 01`–`No. 07`, in `DEX_LINES` order.
- Variants `No. 01-M`, `01-O`, `01-G`, `01-A` (Moonlit, Obsidian, Gilded, Aurora), using the parent dragon's number. Derive the letter from the mutation, don't hard-code the 35.
- Numbers are always visible, including on undiscovered tiles.

**Counters:**
- Header: total in the gold pill, e.g. "4 of 35".
- Each dragon's variant row: sub-counter "`{Name} · {n} / 4`", e.g. "Cinder · 1 / 4" ("??? · 0 / 4" while the dragon is undiscovered), plus a small gold completion star (★) once all 4 of that dragon's variants are found.

**Chrome:**
- Dark leather panel `#14110e` behind the whole screen content.
- Thin gold double rule at the top and the bottom of the panel, and small gold corner brackets at the four corners.
- Header "Bestiary" in Cormorant Garamond 700; the count in a gold pill.
- Gold and neutrals only. **No rarity colour or lavender is used as decoration** anywhere in the chrome.

**Grid tile (found):**
- Parchment art plate at **2:3** with the rarity frame (`rf rf-<tier>`, `feature-rarity-frames.md` §8).
- Dex number top-left on the plate: Cormorant Garamond 600 italic, small, dim gold (e.g. "No. 04").
- Below the plate: name in Cormorant Garamond 700; rarity in Lato 700 caps, letter-spacing 2px, in its `.r-<tier>` colour (Common is now `#c9bfae`); then "`×3 · Juvenile`" in Lato 400 at 70% opacity.

**Undiscovered tile:**
- Art: the pre-made silhouette `art/bestiary/silhouettes/<line>-1-silhouette.webp` (solid `#0b0a09` dragon shape on transparent) at **55% opacity** over the parchment plate dimmed by about 25%. **No CSS filter.** See `.unk` in `mockups.html` (plate `#aea48f`, the image's mask removed).
- Assets: `art/bestiary-mockups/silhouettes/<line>-1-silhouette.webp` and the cut-outs `<line>-1-cutout.{png,webp}`, for all 7 dragons. When the feature is built, copy them into `art/bestiary/silhouettes/`. The game loads them from there, not from the mockups folder.
- Dex number visible, name "???", neutral grey frame `rf rf-none` (`#4a4844` → `#3a3936`). No tier colour, because that would leak the rarity.

**Detail sheet (the Pokédex entry):**
- Top: large art plate, then the dex number plus the name, then a one-line species tag in Cormorant Garamond italic, taken from `handoff/bestiary-notes.md` (e.g. Inferno is "Forge bulwark").
- Stats strip: 3 cells with gold hairline dividers: **Rarity**, **Egg** (e.g. "Forge Egg · Moon Kiln"), **Highest stage** as 4 pips (e.g. ●●○○).
- Facts row: **First hatched** date and **number owned**.
- Description: 2–3 lines of field-note text in Cormorant Garamond italic, copied word for word from `handoff/bestiary-notes.md` (all 7 dragons are written). Variant sheets add that mutation's one-line flavour from the same file, below the "{Mutation} mutation" badge.
- Bottom: 4 mutation chips that link to that dragon's variant pages. Found chips show in colour. On variant pages, mutations not found yet show **their names in dashed chips** (`1px dashed #4a4844`, text `#6d6a63`, per `.chip` in `mockups.html`), not "???". Unfound chips aren't links.

**Variant pages:** the same layout, with the mutation's card effect on the plate and a lavender hairline (`rf-mut`, `feature-rarity-frames.md` §8).

**Mockups and CSS reference:** `art/bestiary-mockups/mockups.html` is the CSS reference. Open it with `?v=tiles`, `?v=grid`, `?v=inferno` or `?v=moon` for the tile states, the full grid, the Inferno detail sheet and the Moonlit Cinder variant sheet (PNG captures sit beside it). Take styles from it where this spec doesn't give a number. **Dates, counts and owned numbers in the mockups are example data.** Real values come from the save (§5).


### 6.1 Layout at 390 × 844 (CSS px, `nest-spec.md` reference frame)

The Bestiary is a normal scrolling screen like the Dragon screen: plain px, no `--u` scaling. The app column is max 480 px (line 30). The `.pad` gutters are 16 px, so content is **358 px** wide at 390.

| Piece | Box (px at 390 wide) | Style |
|---|---|---|
| Top bar | `.topbar` padding 14 top / 10 bottom, gap 10, items centred | |
| Back button | 40 × 40, circle | border 1px `rgba(244,215,143,.55)`, bg `rgba(10,12,16,.62)`, chevron 18 × 18 `var(--gold-hi)` (same look as `.vnav`) |
| Title | flex 1 | `<h1>`: Cormorant Garamond **700**, 24 px, 1 line, ellipsis (§6.0) |
| Count chip | auto | gold pill (§6.0): "`{found} of {total}`", e.g. "4 of 35" |
| Intro note | full width, 2 lines × 18.5 max | Lato 13 / 18.5, `var(--muted)`, clamp 2 lines + ellipsis |
| Section heading "Dragons `n of 7`" | `.ghead` (existing, line 111): margin 14 0 8 | Lato 700 11 px, letter-spacing .16em, uppercase, `var(--muted)`, rule to the right |
| Dragons grid | 3 columns × **112.67**, gap **10** | |
| Dragon tile | 112.67 × **≈208** (measured in headless Chrome, 390 viewport) | padding 8 / 6 / 10, column flex, gap 3, centred |
| Tile art | **88 × 131.1** (aspect 784/1168), radius 8 | |
| Tile name | max 2 lines × 20 | Cormorant Garamond **700**, 17 / 20 (dex number above it on the plate, §6.0) |
| Tile rarity | 1 line × 13 | Lato 700 10 / 13, letter-spacing **2px**, uppercase, colour `.r.r-<tier>` (Common now `#c9bfae`) |
| Tile meta | max 2 lines × 15 | Lato 400 11 / 15 at **70% opacity**: "`×{n} · {stage}`" |
| Section heading "Mutations `n of 28`" | `.ghead` | then a 2-line note with the odds |
| Per-dragon sub-heading | `.ghead.sub`: margin 12 0 6 | "`{Dragon or ???} · {n} / 4`" + ★ when complete (§6.0) |
| Mutation grid | 4 columns × **83.5**, gap **8** | |
| Mutation tile | 83.5 × **≈162** | padding 6 / 4 / 8, gap 2 |
| Mutation tile art | **64 × 95.3**, radius 6 | |
| Mutation tile name | max 2 lines × 15 | Lato 700 12 / 15 (e.g. "Moonlit / Stormling") |
| Mutation tile meta | max 2 lines × 15 | Lato 11 / 15 muted: "`×{n} · {stage}`" |
| Bottom spacer | 24 | same as the Dragon screen (line 932) |

- At 480 px (desktop column) the grids keep 3 and 4 columns. Tiles just get wider, and the art stays the same size.
- First screen at 390 × 844: top bar, note, Dragons heading and two full rows of dragon tiles fit above the nav. The third row peeks in, which shows there's more to scroll.

### 6.2 Tile states

| State | Art | Text | Frame (`feature-rarity-frames.md`) | Element |
|---|---|---|---|---|
| Dragon, found | `dragonArt(d, {stage: e.top})`: still poster of the **highest stage reached** | name, rarity, `×n · Stage` | `rf rf-<tier>` | `<button data-act="dex" data-k="<line>">` |
| Variant, found | same, which also carries the mutation's `fx-*` effect | "Moonlit Cinder", `×n · Stage` (no rarity line: the frame shows it) | `rf rf-<tier> rf-mut` + `style="--rfd:…"` | `<button data-act="dex" data-k="<line>:<mut>">` |
| Dragon, undiscovered | `art/bestiary/silhouettes/<line>-1-silhouette.webp` at 55% opacity, no filter (§6.0) | dex number + "???" + "Undiscovered" | `rf rf-none` (neutral grey 1px `#4a4844` → `#3a3936`) | `<div role="img" aria-label="Undiscovered dragon">` |
| Variant, undiscovered | `art/bestiary/silhouettes/<line>-1-silhouette.webp` at 55%, **no** fx effect | dex number (e.g. "01-M") + "???" | `rf rf-none` | `<div role="img" aria-label="Undiscovered mutation">` |

- Undiscovered tiles must **not** go through `dragonArt()`: its `aria-label` contains the dragon's name. Build them by hand (§6.4).
- Undiscovered tiles show no rarity, no egg and no count. They aren't focusable and do nothing on tap.
- Names are always the **species** names (`DRAGONS[line].name`), never a dragon's custom name.

### 6.3 Silhouette (pre-made art, no filter)

**Replaced by §6.0.** Use the pre-made silhouette `art/bestiary/silhouettes/<line>-1-silhouette.webp` at 55% opacity over the dimmed parchment plate, with **no CSS filter**. The old CSS-filter silhouette has been removed. In the §6.4 code, the undiscovered `<img>` src becomes the silhouette file and the box gets `rf rf-none`.

### 6.4 Render code

```js
function renderBestiary(){
  const found = dexFound(), total = DEX_KEYS.length;
  $("#bchip").textContent = `${found} of ${total}`;
  $("#bchip").setAttribute("aria-label", `${found} of ${total} pages found`);
  const unk = (line, label, extra) => `<div class="bx rf unk" role="img" aria-label="${label}">
      <div class="dart" style="--edge:#151b22" aria-hidden="true"><img src="${stageSrc(line, 0)}.webp" alt="" loading="lazy" draggable="false"></div>
      <span class="bn">???</span>${extra}</div>`;
  const tile = (line, m, i) => {
    const k = m ? line + ":" + m : line, e = S.dex[k];
    if (!e) return unk(line, m ? "Undiscovered mutation" : "Undiscovered dragon", m ? "" : `<small>Undiscovered</small>`);
    const it = eggOf(line), r = it.rarity, st = STAGES[e.top].name;
    const d = {item: it.id, line, mut: m || null, name: dexName(line, m)};
    return `<button class="bx ${rfcls(d)}"${m ? ` style="${rfd(i)}"` : ""} data-act="dex" data-k="${k}"
        aria-label="${esc(d.name)}, ${r}, hatched ${fmt(e.n)} ${e.n === 1 ? "time" : "times"}, highest stage ${st}">
        ${dragonArt(d, {stage: e.top})}<span class="bn">${esc(d.name)}</span>${m ? "" : `<em class="r ${rcls(r)}">${r}</em>`}<small>×${fmt(e.n)} · ${st}</small></button>`;
  };
  const dFound = DEX_LINES.filter(l => S.dex[l]).length;
  const mTotal = DEX_LINES.length * MUT_KEYS.length, mFound = DEX_KEYS.filter(k => k.includes(":") && S.dex[k]).length;
  let h = `<p class="bst-note">${found ? "Every dragon you hatch gets a page here. Tap a page to read it." : "No pages yet. Hatch an egg and its dragon gets a page here."}</p>`;
  if (!found) h += S.eggs.length ? `<button class="btn bst-cta" data-act="goto-nest">Go to the nest</button>` : `<button class="btn bst-cta" data-act="goto-stall">Visit the Lantern Stall</button>`;
  h += `<h2 class="ghead">Dragons <span>${dFound} of ${DEX_LINES.length}</span></h2><div class="bst-grid">${DEX_LINES.map(l => tile(l, null, 0)).join("")}</div>`;
  h += `<h2 class="ghead">Mutations <span>${mFound} of ${mTotal}</span></h2>`;
  h += `<p class="bst-note">Odds per hatch: ${Object.keys(RARITY).map(r => `${r} ${pct(RARITY[r].mut)}`).join(" · ")}.</p>`;
  DEX_LINES.forEach((l, li) => {
    const n = MUT_KEYS.filter(m => S.dex[l + ":" + m]).length;
    h += `<h3 class="ghead sub">${S.dex[l] ? esc(DRAGONS[l].name) : "???"} <span>${n} of ${MUT_KEYS.length}</span></h3>
      <div class="bst-grid mut">${MUT_KEYS.map((m, mi) => tile(l, m, li * MUT_KEYS.length + mi)).join("")}</div>`;
  });
  h += `<div style="height:24px"></div>`;
  $("#bestiaryBody").innerHTML = h;
}
```
The odds note renders as "Odds per hatch: Common 3% · Uncommon 5% · Rare 8% · Epic 12% · Legendary 20%." These are the same numbers the Vendors odds chips already show.

### 6.5 Empty states

| Situation | What shows |
|---|---|
| 0 pages found, no eggs | Note: "No pages yet. Hatch an egg and its dragon gets a page here." + gold button "Visit the Lantern Stall" (`goto-stall`). All 35 tiles are silhouettes. Headings read "Dragons 0 of 7", "Mutations 0 of 28", and every sub-heading "??? 0 of 4". |
| 0 pages found, eggs warming | Same, but the button is "Go to the nest" (`goto-nest`) |
| Some found, no mutations | Normal note. The Mutations section shows its odds note and silhouettes. Found dragons' sub-headings show their names. |
| Everything found | Normal. Chip "35 of 35", and every dragon row shows its ★. No other celebration in v1. |

### 6.6 CSS (new block after the rarity-frames block)

```css
/* ---------- bestiary (handoff/feature-bestiary.md) ---------- */
.bst-entry{width:100%;margin-top:12px;display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:12px 16px;font-size:16px}
.bst-entry small{font-size:12px;font-weight:600;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}
#bestiary .topbar{justify-content:flex-start;gap:10px}
#bestiary .topbar h1{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;outline:none}
.bst-back{flex:none;width:40px;height:40px;padding:0;border-radius:50%;border:1px solid rgba(244,215,143,.55);background:rgba(10,12,16,.62);color:var(--gold-hi);display:grid;place-items:center}
.bst-back svg{width:18px;height:18px}
.bst-note{margin:0 0 4px;font-size:13px;line-height:18.5px;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bst-cta{width:100%;margin:8px 0 2px}
.ghead.sub{margin:12px 0 6px}
.bst-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.bst-grid.mut{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.bx{padding:8px 6px 10px;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0;text-align:center;transition:transform .12s}
button.bx:active{transform:scale(.96)}
.bx .dart{width:88px;border-radius:8px}
.mut .bx{padding:6px 4px 8px;gap:2px}
.mut .bx .dart{width:64px;border-radius:6px}
.bx .bn{max-width:100%;font-family:var(--display);font-weight:600;font-size:17px;line-height:20px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.mut .bx .bn{font-family:var(--body);font-weight:700;font-size:12px;line-height:15px}
.bx em{font-style:normal;font-size:10px;line-height:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.bx small{max-width:100%;font-size:11px;line-height:15px;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bx.unk .bn{color:var(--muted)}
.bx.unk .dart{background:#aea48f}
.bx.unk .dart > img{opacity:.55;-webkit-mask:none;mask:none}  /* pre-made #0b0a09 silhouette, no filter (mockups.html .unk) */
/* Detail sheet */
#dexOv{align-items:flex-start;overflow-y:auto}
.dex-card{margin-block:auto}
.dexsheet{--rf-r:22px;--rf-fill:linear-gradient(180deg,#1a1410,#0e1116);padding:18px 16px 16px;text-align:center}
.dexsheet.rf-mut{--rf-fill:linear-gradient(180deg,#26283a,#0e1116)}
.dexsheet .brand{font-size:10px;font-weight:700;letter-spacing:.3em;text-transform:uppercase;color:var(--gold)}
.dexsheet .stage .dart{width:200px}
.dexsheet .cname{font-family:var(--display);font-weight:600;font-size:30px;line-height:33px;margin:8px 0 2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.dexsheet .parts li span:last-child{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dex-card .card-actions{grid-template-columns:1fr}
.dex-card .card-actions.two{grid-template-columns:1fr auto}
```

---

## 7. Detail sheet (tap a found page)

### 7.1 Content

**Superseded by §6.0** for layout: number + name, species tag, 3-cell stats strip (Rarity, Egg, Highest stage pips), facts row (first hatched, number owned), field-note description from `handoff/bestiary-notes.md`, 4 mutation chips linking to variant pages. The values below (date format, "Before the bestiary", egg/vendor text, odds) still apply to those cells.

| Row | Value |
|---|---|
| Eyebrow | "BESTIARY" (`.brand`, like the share card) |
| Art | `dragonArt(d, {live:true, stage: e.top})`, **200 × 298** (looping video of the highest stage reached; poster under reduced motion; carries the mutation `fx-*` for variants) |
| Name | species or variant name, Cormorant Garamond 600 30 / 33, max 2 lines |
| Mutation badge | variants only: existing `.mutb`, "`{Name}` mutation" |
| Facts (`.parts` list, existing, line 295) | **Rarity**: tier in its `.r` colour · **Hatched from**: "`{Egg name} · {Vendor}`", e.g. "Ember Egg · Lantern Stall" · **First hatched**: "Oct 4, 2026" (`toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})`) or "Before the bestiary" when `first` is `null` · **Times hatched**: `fmt(n)` · **Highest stage**: `STAGES[top].name` · last row: dragon pages show **Mutations found** (the found variant names joined with ", ", or "None yet"); variant pages show **Odds per hatch**: `pct(RARITY[r].mut / MUT_KEYS.length)` |
| Buttons | "Close" (`.btn.ghost`, full width). Optional "Watch it grow again" (§7.4) |

Every value is max 2 lines with an ellipsis.

### 7.2 Code

```js
let dexFrom = null;
function openDex(k){
  const e = S.dex[k]; if (!e) return;
  const [line, m] = k.split(":"), it = eggOf(line), r = it.rarity;
  const d = {item: it.id, line, mut: m || null, name: dexName(line, m)};
  const first = e.first ? new Date(e.first).toLocaleDateString("en-US", {month:"short", day:"numeric", year:"numeric"}) : "Before the bestiary";
  const muts = MUT_KEYS.filter(x => S.dex[line + ":" + x]).map(x => MUTATIONS[x].name);
  dexFrom = k;
  const ov = $("#dexOv");
  ov.innerHTML = `<div class="card-wrap dex-card" role="dialog" aria-modal="true" aria-labelledby="dexName">
      <div class="${rfcls(d)} dexsheet"${m ? ` style="${rfd(0)}"` : ""}>
        <div class="brand">Bestiary</div>
        <div class="stage">${dragonArt(d, {live:true, stage:e.top})}</div>
        <p class="cname" id="dexName">${esc(d.name)}</p>
        ${m ? `<div class="mutb">${MUTATIONS[m].name} mutation</div>` : ""}
        <ul class="parts">
          <li><span>Rarity</span><span class="r ${rcls(r)}">${r}</span></li>
          <li><span>Hatched from</span><span>${esc(it.name)} · ${esc(SCENES[it.scene].name)}</span></li>
          <li><span>First hatched</span><span>${first}</span></li>
          <li><span>Times hatched</span><span>${fmt(e.n)}</span></li>
          <li><span>Highest stage</span><span>${STAGES[e.top].name}</span></li>
          ${m ? `<li><span>Odds per hatch</span><span>${pct(RARITY[r].mut / MUT_KEYS.length)}</span></li>`
              : `<li><span>Mutations found</span><span>${muts.length ? muts.join(", ") : "None yet"}</span></li>`}
        </ul>
      </div>
      <div class="card-actions" id="dexActions"><button class="btn ghost" data-act="close-dex">Close</button></div>
    </div>`;
  ov.hidden = false;
  ov.querySelector("[data-act=close-dex]").focus();
}
function closeDex(){
  const ov = $("#dexOv"); ov.hidden = true; ov.innerHTML = "";     // also stops and unloads the video
  const t = dexFrom && document.querySelector(`[data-act="dex"][data-k="${dexFrom}"]`); dexFrom = null;
  if (t) t.focus();
  autoHatch();
}
```

### 7.3 Size at 390 × 844

- Overlay padding 16, so the card is **358** wide (`.card-wrap` max 360).
- Sheet height ≈ 18 + 14.5 (eyebrow) + 4 + 298 (art) + 4 + 43 (name) + 25 (badge, variants only) + 16 + 147 (6 fact rows) + 16 ≈ **560–585**. Then 12 gap + 49 button: about **620–650 total**, which fits the 812 px available.
- On short phones (e.g. 375 × 667), `#dexOv` scrolls vertically (`align-items:flex-start; overflow-y:auto`, with `margin-block:auto` keeping it centred when it fits).

### 7.4 "Watch it grow again" (only if the growth reveal is built)

`growth-reveal-spec.md` §9 defines a "Watch it grow again" replay on the Dragon screen. **As of commit `1dca214` the growth reveal isn't built** (no `#revealOv` in `index.html`). So:
- **If the reveal isn't built yet when you build this:** skip this section. No button.
- **If it is built:** after `openDex(k)`, pick the owned dragon for this page with the most xp:
  ```js
  const best = S.dragons.filter(x => dexKeys(x).includes(k)).sort((a, b) => (b.xp || 0) - (a.xp || 0))[0];
  const si = best ? stageIdx(best) : 0;
  ```
  If `si >= 1` and `revealAvailable(best.line, REVEAL_KEY[si])` resolves true while the sheet is still open, insert `<button class="btn" data-act="dex-replay" data-id="${best.id}">Watch it grow again</button>` before Close, and add class `two` to `#dexActions`.
- `dex-replay`: `closeDex()`, then run the **same replay path** as the Dragon screen's `data-act="replay-reveal"` button, for dragon `best`. It plays the reveal into its current stage (`si − 1 → si`) and changes no state except `best.reveals[key] = true`. When the reveal closes, the user is back on the Bestiary (`DSUB` is unchanged).

---

## 8. Accessibility

1. **Names:**
   - Found tiles are `<button>`s with `aria-label` "`{Name}, {Rarity}, hatched {n} time(s), highest stage {Stage}`".
   - Undiscovered tiles are `role="img"` with "Undiscovered dragon" / "Undiscovered mutation". Their `<img>` has `alt=""` inside an `aria-hidden` box, so the species name never leaks to screen readers.
   - The count chip has `aria-label` "`{found} of {total} pages found`".
2. **Headings:** `<h1>` Bestiary, `<h2>` Dragons / Mutations, `<h3>` per-dragon rows. On open, focus moves to the `<h1>` (`tabindex="-1"`). On back, it returns to the "Bestiary" button.
3. **Dialog:**
   - `role="dialog"`, `aria-modal="true"`, `aria-labelledby="dexName"`.
   - Focus goes to Close on open. Escape closes it, and focus returns to the tile that opened it.
   - The art keeps `dragonArt`'s `role="img"` label (e.g. "Moonlit Cinder, juvenile").
4. **Reduced motion:**
   - The global rule (lines 350–353) stops the tile press scale and the mutation sweep (static, `feature-rarity-frames.md` §5.2).
   - `dragonArt({live:true})` already shows the poster instead of the video.
   - No other motion is added.
5. **Not colour alone:** rarity is always written as text (tile and sheet), and undiscovered tiles say "???" / "Undiscovered".
6. **Targets:** every tappable tile is at least 83 × 160 px, and the back button is 40 × 40 (same as `.vnav`).
7. **Contrast:** "???" and muted text use `--muted #9c978b` on `#151b22` (about 5.6 : 1).
8. **Focus ring:** the existing `button:focus-visible` gold outline. Found tiles use `.rf:focus-visible{outline-offset:6px}` from the frames spec.

---

## 9. Test checklist (App Tester)

Open with `?debug=1` at 390 × 844 unless stated. Debug → Bank → Set 1,000,000 to buy freely. Debug → Eggs → "Hatch all" hatches every egg in the Nest. Debug → Mutate → {name} forces the next hatch's mutation (`feature-rarity-frames.md` §10).

1. **Entry:** fresh run (Reset). The Dragon tab shows a "Bestiary · 0 of 35 found" button under the empty prize card. Tap it: the Bestiary opens, the DRAGON tab stays highlighted, and the underline doesn't move.
2. **Empty state:** all 7 dragon tiles and all 28 mutation tiles are dark silhouettes with "???". No names, eggs or rarities appear anywhere, including screen-reader text. The note reads "No pages yet…" and the button reads "Visit the Lantern Stall" (it goes to Vendors, Lantern Stall). Buy an egg, reopen: the button now reads "Go to the nest".
3. **Silhouettes:** each silhouette is recognisably that dragon's Hatchling shape (dark shape on dim stone), not a black rectangle.
4. **Back:**
   - The back arrow returns to the Dragon screen with focus on the Bestiary button.
   - Tapping the DRAGON tab while in the Bestiary also returns to the Dragon screen.
   - Tapping another tab, then DRAGON, lands on the Dragon screen, not the Bestiary.
   - Reload while in the Bestiary: you land on the Dragon screen.
5. **First discovery:** buy and hatch an Ember Egg. The Bestiary shows Cinder with art, "Cinder", "COMMON", "×1 · Hatchling" and a Common frame. Chip "1 of 35", "Dragons 1 of 7", Cinder's mutation row heading reads "Cinder 0 of 4".
6. **Detail:**
   - Tap Cinder. The sheet shows the looping Hatchling video.
   - Rows: Rarity Common · Hatched from "Ember Egg · Lantern Stall" · First hatched = today's date ("Oct 4, 2026" format) · Times hatched 1 · Highest stage Hatchling · Mutations found "None yet".
   - Close returns focus to the Cinder tile. Escape also closes it.
7. **Counts:** hatch 2 more Ember Eggs. Cinder shows "×3". The first-hatched date doesn't change.
8. **Highest stage:**
   - Make Cinder the prize. Debug → Prize → Juvenile: Cinder's tile art switches to the Juvenile still and reads "Juvenile".
   - Debug → Prize → Elder: it shows "Elder".
   - Make a different Cinder the prize: Cinder's page still says Elder (highest ever).
9. **Mutation variant:**
   - Debug → Mutate → Moonlit, buy and hatch a Tide Egg. Brine's page shows ×1, and Brine's mutation row shows "Moonlit Brine" found with the moonlit effect, the Common frame with the lavender sweep, and "1 of 4".
   - Brine's detail lists "Mutations found: Moonlit".
   - Moonlit Brine's detail shows the "Moonlit mutation" badge and "Odds per hatch 0.8%".
10. **Mutation counts both:** that Moonlit Brine also counts in Brine's "×" count.
11. **All tiers:** buy and hatch one of every egg. Rarities read Common, Common, Uncommon, Rare, Rare, **Epic** (Voidling, from the Night Egg), Legendary. The order matches the table in §3.1.
12. **Variant names wrap:** "Moonlit Stormling" / "Obsidian Voidling" fit in at most 2 lines with no overflow. Nothing anywhere exceeds 2 lines; longer text ends in "…".
13. **Migration from an old save:** in the console, run
    ```js
    localStorage.setItem("scalebank.v1", '{"bank":5000,"lifetime":200000,"owned":{"ember":true,"tide":true},"bought":{"ember":2,"tide":1},"opened":{},"eggs":[],"dragons":[{"id":"drg3","item":"frost","species":"Frostling","mut":"sparkle","xp":125000,"seenStage":2,"name":"Frostling","trail":null},{"id":"drg4","item":"ember","line":"cinder","species":"Cinder","mut":null,"xp":31000,"seenStage":1,"name":"Cinder","trail":null},{"id":"drg5","item":"tide","line":"brine","species":"Brine","mut":"moonlit","xp":0,"seenStage":0,"name":"Brine","trail":null},{"id":"drg6","item":"ember","line":"cinder","species":"Cinder","mut":null,"xp":0,"seenStage":0,"name":"Soot2","trail":null}],"prize":"drg4","scene":0,"tab":"dragon","seq":7}'); location.reload();
    ```
    Expected:
    - The game loads normally, with the hoard showing 4 dragons and Cinder as prize.
    - `JSON.parse(localStorage["scalebank.v1"])` now has `"ver":2` and `"dex":{"brine":{"first":null,"n":2,"top":2},"cinder":{"first":null,"n":2,"top":1},"brine:moonlit":{"first":null,"n":1,"top":0}}` (key order may differ).
    - The Bestiary shows "3 of 35". Cinder ×2 Juvenile, Brine ×2 Adult, Moonlit Brine ×1 Hatchling.
    - Their detail sheets say "First hatched: Before the bestiary".
    - The "Frostling" (old frost egg) became a Brine and its invalid mutation was dropped. That's existing `migrate()` behaviour, unchanged.
14. **Migration runs once:** reload again. The dex is unchanged, and counts don't double.
15. **New hatch after migration:** hatch another Tide Egg. Brine becomes ×3, but "First hatched" stays "Before the bestiary".
16. **Reset:** "Reset to first run" (tap twice). The Bestiary is back to 0 of 35 and the save has `"ver":2,"dex":{}`.
17. **Hatch while the sheet is open:** with an egg at "1 left" (Debug → Eggs → 1 left) and the sheet open, Debug → Walk → Add steps. No hatch overlay appears over the sheet. Close the sheet: the hatch plays.
18. **Hatch while in the Bestiary:** a first-ever hatch that takes the prize slot ends with "Meet your dragon", which goes to the Dragon screen. A later hatch ending with "Done" leaves you in the Bestiary, with the new page shown.
19. **Reduced motion** (OS setting, reload): the detail art is a still poster with no video element, and mutated tiles have a static highlight with no sweep. Tapping a tile has no scale animation.
20. **Screen reader** (VoiceOver/TalkBack):
    - Opening announces "Bestiary".
    - Found tiles read e.g. "Cinder, Common, hatched 3 times, highest stage Juvenile, button".
    - Undiscovered tiles read "Undiscovered dragon" / "Undiscovered mutation", never a species name.
    - The sheet is announced as a dialog named after the dragon.
21. **Layout:**
    - At 390 px: Dragons grid 3 columns (tiles about 112.7 wide), mutations grid 4 columns (about 83.5 wide), no horizontal scroll.
    - At 375 × 667 the detail sheet scrolls and nothing is cut off.
    - At 1280 px wide (480 px column) it's still 3 / 4 columns, and the art isn't stretched.
22. **Renamed dragon:** rename the prize to "Sparky". The Bestiary still says "Cinder".
23. **Hot reload / artifact wrapper path** (if testing in the claude.ai artifact): state restored through `data.state` gets the same migration (`ver` 1 → 2).
24. **No regressions:** Bank, Vendors, Nest, hatch overlay, share card and hoard behave as before. The Dragon screen only gained the Bestiary button.
25. **Approved design (§6.0), compare with `art/bestiary-mockups/`:**
    - Leather panel `#14110e`, gold double rule top and bottom, corner brackets; header in Cormorant 700 with the count in a gold pill. No rarity colour or lavender used as decoration.
    - Dex numbers: dragons No. 01–07; Cinder's variants read 01-M, 01-O, 01-G, 01-A. Numbers show on undiscovered tiles too.
    - Each variant row reads e.g. "Cinder · 1 / 4"; force all 4 Cinder mutations (Debug → Mutate) and a ★ appears on that row.
    - Undiscovered tiles: dim parchment plate with a 55%-opacity dark dragon shape (no filter), "???", neutral grey `#4a4844` → `#3a3936` frame, no tier colour.
    - On a variant page with unfound mutations, those chips show the mutation names in dashed chips, not "???".
    - Species tags and field notes match `handoff/bestiary-notes.md` word for word.
    - Detail sheet: number + name, species tag in italic, 3-cell stats strip with stage pips, first hatched + number owned, 2–3 line field note matching `handoff/bestiary-notes.md`, and 4 mutation chips that open the variant pages. Variant pages show the mutation effect and a lavender hairline.
    - Common rarity text is `#c9bfae`, not gold.
