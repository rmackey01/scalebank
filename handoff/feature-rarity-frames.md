# Scale Bank: Rarity frames on dragon cards (feature spec)

- **Status:** approved by Ryan (small win)
- **Owner:** Crazy Idea Guy (spec)
- **Builder:** Software Engineer
- **Source checked:** `rmackey01/scalebank` @ `main`, commit `1dca214` (`index.html`, 1,175 lines, Oct 4, 2026). Line numbers below refer to that file.
- **Checked:** the code in this spec was applied to a scratch copy of `index.html` @ `1dca214` (not the repo) and run in headless Chrome at 390 × 844: migration, Bestiary grid, detail sheet, hoard frames and the hatch overlay frame all rendered as described.
- **Build order:** build this before `feature-bestiary.md`. The Bestiary reuses the `.rf` classes defined here.

Rule (same as the other specs): if a number isn't here, don't guess. Values marked **(proposed)** are new design decisions made in this spec. Use them exactly as written.

---

## 1. Goal

Each dragon card gets a border that shows its rarity tier at a glance. Mutated dragons also get a lavender hairline and a slow light sweep along the border. v1 is CSS only: no new art files.

## 2. Scope

**In scope (v1):**
1. Hoard tiles on the Dragon screen (`.hd`, line 930).
2. The new dragon in the hatch overlay (`.hstage .born`, lines 1021–1022).
3. Bestiary tiles and the Bestiary detail sheet, once `feature-bestiary.md` is built. That spec uses the classes from §5 here.
4. One debug control, "Next hatch mutation" (§10), so mutations can be tested without luck.

**Non-goals:**
- **Breeding** is out of scope. It's planned as a future major update.
- No frame on the Dragon screen prize card (`.frame`, line 898). It already has its own gold double rim and the "Prize dragon" plaque.
- No frame on the share card (`.sharecard`), the Vendors shop rows, the Nest, or the growth reveal's live payoff card.
- No change to the existing mutation card effects on the art (`.dart.fx-moon / fx-gold / fx-shine / fx-aurora`, lines 316–326). Those stay exactly as they are. The frame goes on the **card around** the art, never on `.dart` itself.
- No new rarity, and no "Prize" frame. **"Prize" is not a rarity.** It's the label for the one dragon currently receiving steps (`S.prize`). A prize dragon keeps the frame of its real tier.
- No recolouring of the dragon art.

---

## 3. Facts from `index.html` (don't change them)

| Fact | Where | Value |
|---|---|---|
| Rarity tiers (exactly these five) | `RARITY`, line 443 | `Common`, `Uncommon`, `Rare`, `Epic`, `Legendary` |
| Mutation chance per hatch, by egg rarity | `RARITY[r].mut`, line 443 | Common 0.03, Uncommon 0.05, Rare 0.08, Epic 0.12, Legendary 0.20 |
| A dragon's rarity | `rarityOf(d)`, line 487 | `ITEM[d.item].rarity` (the egg it hatched from) |
| Rarity CSS class helper | `rcls(r)`, line 488 | `"r-" + r.toLowerCase()` |
| Mutations | `MUTATIONS`, lines 444–449 | `moonlit` (Moonlit, fx `moon`), `obsidian` (Obsidian, fx `gold`), `gilded` (Gilded, fx `shine`), `aurora` (Aurora, fx `aurora`) |
| How a mutation is rolled | `rollMutation(it)`, lines 986–990 | `Math.random() < RARITY[it.rarity].mut`, then one of the 4 keys picked uniformly. Stored as `d.mut` (key or `null`) |
| Egg → dragon → rarity | `ITEMS`, lines 418–441 | Ember Egg → Cinder (Common) · Tide Egg → Brine (Common) · Grove Egg → Moss (Uncommon) · Forge Egg → Inferno (Rare) · Squall Egg → Stormling (Rare) · Night Egg → Voidling (Epic) · Storm Egg → Tempest (Legendary) |
| Rarity text colours already in use | lines 129–133 | Common `var(--gold)` = `#d8a94b`; Uncommon `#93cf86`; Rare `#b9b6f0`; Epic `#d6a2ff`; Legendary `#ffd27a` with glow `0 0 10px rgba(255,200,100,.45)` (Common changes to `#c9bfae`, §4) |
| Mutation colours already in use | `.mutb` line 253, `.odds .mut` line 137, `.hd.has-mut` line 251 | `#e6dcff`, `#cdb8ff`, `rgba(190,160,255,.5)`, `rgba(150,120,230,.12)`, tile tint `rgba(190,160,255,.10)` |
| Hoard tile today | lines 243–251, 925–931 | `<button class="hd r-<tier>[ has-mut]" data-act="prize" data-id aria-pressed>`, then `dragonArt(d,{still:true})`, `<span>` name, `<small>` stage (· mutation name), `<em class="r r-<tier>">` rarity, or `Prize` for the prize dragon. Grid `.hoard{grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px}`. Tile `padding:6px 6px 8px; border:1px solid var(--line); border-radius:14px; background:var(--stone)`. Art `.hd .dart{width:72px;border-radius:8px}` (72 × 107.3 px, aspect 784/1168). The hoard only renders when `S.dragons.length > 1`. |
| Tile tier styling today (to be replaced) | lines 247, 250, 251 | `.hd[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-hi)}`, `.hd.r-epic{border-color:rgba(214,162,255,.35)}`, `.hd.r-legendary{border-color:rgba(255,210,122,.45);box-shadow:inset 0 0 18px rgba(255,200,100,.08)}`, `.hd.has-mut{background:linear-gradient(180deg,rgba(190,160,255,.10),var(--stone))}` |
| Hatch overlay new dragon | lines 264–278, 1021–1022 | `.hstage` 220 × 260; `.born` is `position:absolute; inset:0; display:grid; place-items:center`; `.hstage .born .dart{width:160px;opacity:0;transform:scale(.3) translateY(30px)}`, popped in by `.hstage.burst .born .dart{transition:transform .55s cubic-bezier(.3,1.6,.5,1) .15s,opacity .2s .15s;opacity:1;transform:none}` |
| Palette | `:root` lines 8–22; `nest-spec.md` §7 | `--ink #0c1015`, `--stone #151b22`, `--line #2c3540`, `--gold #d8a94b`, `--gold-hi #f4d78f`, `--gold-lo #7b5517`; nest gold tokens incl. metallic gradient `#FFE9A8 → #E8B451 → #9A5E18 → #6E400F → #C68A30 → #FFD98A` and panel border tokens `#B39062`, `#6E583C`; egg ramps per line (§7.1) |
| Reduced motion | lines 350–353 | `@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition-duration:.01ms!important}}` |
| Focus ring | line 29 | `button:focus-visible{outline:2px solid var(--gold-hi);outline-offset:2px}` |

---

## 4. Tier table (proposed values)

The colours come from the existing palette. Each tier's middle stop is that tier's existing rarity text colour, and the dark end is the matching egg ramp from `nest-spec.md` §7.1 (moss for Uncommon, stormling for Rare, voidling for Epic). Common uses the nest panel border golds, and Legendary uses the nest metallic gradient.

All gradients run at `160deg`. All radii are on the outer edge of the border.

| Tier | Border width | Border gradient (`--rf-border`) | Inner glow (`--rf-in`) | Outer glow (`--rf-out`) |
|---|---|---|---|---|
| Common | **1px** | `linear-gradient(160deg,#b39062 0%,#6e583c 100%)` | none | none |
| Uncommon | **2px** | `linear-gradient(160deg,#c9edb9 0%,#93cf86 40%,#3e7a16 100%)` | `inset 0 0 10px rgba(147,207,134,.12)` | none |
| Rare | **2px** | `linear-gradient(160deg,#dcdaff 0%,#b9b6f0 40%,#3c35a6 100%)` | `inset 0 0 12px rgba(185,182,240,.16)` | none |
| Epic | **2px** | `linear-gradient(160deg,#f0d6ff 0%,#d6a2ff 40%,#6a2c90 100%)` | `inset 0 0 14px rgba(214,162,255,.20)` | `0 0 10px rgba(166,79,214,.35)` |
| Legendary | **3px** | `linear-gradient(160deg,#ffe9a8 0%,#e8b451 22%,#9a5e18 45%,#6e400f 60%,#c68a30 80%,#ffd98a 100%)` | `inset 0 0 18px rgba(255,200,100,.16)` | `0 0 14px rgba(255,200,100,.35)` |
| Neutral / unknown (missing tier) | 1px | `linear-gradient(#2c3540,#2c3540)` (= `--line`) | none | none |
| Bestiary undiscovered (`rf-none`) | 1px | `linear-gradient(#4a4844,#3a3936)` (neutral grey, from Animator's `art/bestiary-mockups/mockups.html`) | none | none |

**Mutation treatment (added on top of the tier, never replacing it):**

| Piece | Value |
|---|---|
| Card fill | `linear-gradient(180deg,#26283a,#151b22)`. This is the old `.hd.has-mut` tint, `rgba(190,160,255,.10)` over `#151b22`, pre-mixed to an opaque colour. It must be opaque because the border gradient sits under the fill (§5.1). |
| Inner hairline (`--rf-mutin`) | `inset 0 0 0 1px rgba(190,160,255,.5)` |
| Minimum border width | 2px. A mutated **Common** goes from 1px to 2px so the sweep is visible. Other tiers keep their width. |
| Light sweep (shimmer) | A diagonal band `linear-gradient(115deg,transparent 42%,rgba(230,220,255,.95) 50%,transparent 58%)` clipped to the border ring only. It sweeps from top-left to bottom-right over **1.92 s** with `cubic-bezier(.37,0,.63,1)` (the Nest's easeInOutSine), then rests, repeating every **4.8 s**. Each card gets a different phase (§5.3). |
| Reduced motion | No sweep. The band sits still in the middle of the ring at opacity 0.7 (§5.2). |

**Prize state (hoard only, approved by Ryan, design by Animator):** the prize is a *state*, not a tier, so it gets no coloured ring (every border colour already means a rarity).
- The card keeps its real rarity frame **and** its real rarity label.
- Warm-white glow outside the frame: `box-shadow: 0 0 0 2px rgba(255,244,220,.85), 0 0 18px 4px rgba(255,236,200,.35)`.
- A 2.4 s breathing pulse on that glow (opacity .6 → 1 → .6, `ease-in-out`, infinite). Off under reduced motion: the glow stays at full opacity.
- A small **"WALKING"** tag in Lato 700 caps next to the rarity label. It never replaces the label. (Today the label reads "PRIZE" instead of e.g. "COMMON", which hides the tier: that's the bug this fixes.)
- It replaces today's `border-color:var(--gold)`. The text colour rule `color:var(--gold-hi)` stays.

**Common text colour:** Common's rarity text changes from `var(--gold)` `#d8a94b` to **`#c9bfae`** (muted parchment), so gold text means Legendary only. Change `.r-common` (lines 129–133) everywhere it's used (hoard, Bestiary, detail sheet). `--gold` itself is unchanged.

**No frame colour as decoration:** the five rarity colours plus lavender (mutations) are reserved for frames and rarity text. Don't use them for ornaments, rules or backgrounds elsewhere.

**Radii:** hoard and Bestiary tiles **14px** (today's `.hd` radius), hatch overlay wrapper **14px**, Bestiary detail sheet **22px** (same as `.sharecard`).

**Corner ornaments:** **not in v1.** They'd come with the art swap in §9.

---

## 5. CSS (add once, new block after the `/* ---------- dragon screen ---------- */` block, i.e. after line 259)

### 5.1 Base and tiers

```css
/* ---------- rarity frames (handoff/feature-rarity-frames.md) ---------- */
/* The frame is a transparent border showing a gradient layer underneath (border-box), with an
   opaque fill on top (padding-box). Fills must be single, opaque gradient layers. */
.rf{--rf-w:1px;--rf-r:14px;
  --rf-fill:linear-gradient(#151b22,#151b22);
  --rf-border:linear-gradient(#2c3540,#2c3540);  /* missing tier; Bestiary undiscovered uses .rf-none below */
  --rf-in:0 0 #0000;--rf-out:0 0 #0000;--rf-mutin:0 0 #0000;--rf-sel:0 0 #0000;
  position:relative;
  border:var(--rf-w) solid transparent;border-radius:var(--rf-r);
  background:var(--rf-fill) padding-box,var(--rf-border) border-box;
  box-shadow:var(--rf-sel),var(--rf-out),var(--rf-mutin),var(--rf-in)}
.rf-common{--rf-w:1px;--rf-border:linear-gradient(160deg,#b39062 0%,#6e583c 100%)}
.rf-uncommon{--rf-w:2px;--rf-border:linear-gradient(160deg,#c9edb9 0%,#93cf86 40%,#3e7a16 100%);--rf-in:inset 0 0 10px rgba(147,207,134,.12)}
.rf-rare{--rf-w:2px;--rf-border:linear-gradient(160deg,#dcdaff 0%,#b9b6f0 40%,#3c35a6 100%);--rf-in:inset 0 0 12px rgba(185,182,240,.16)}
.rf-epic{--rf-w:2px;--rf-border:linear-gradient(160deg,#f0d6ff 0%,#d6a2ff 40%,#6a2c90 100%);--rf-in:inset 0 0 14px rgba(214,162,255,.20);--rf-out:0 0 10px rgba(166,79,214,.35)}
.rf-legendary{--rf-w:3px;--rf-border:linear-gradient(160deg,#ffe9a8 0%,#e8b451 22%,#9a5e18 45%,#6e400f 60%,#c68a30 80%,#ffd98a 100%);--rf-in:inset 0 0 18px rgba(255,200,100,.16);--rf-out:0 0 14px rgba(255,200,100,.35)}
.rf-mut{--rf-fill:linear-gradient(180deg,#26283a,#151b22);--rf-mutin:inset 0 0 0 1px rgba(190,160,255,.5)}
.rf-common.rf-mut{--rf-w:2px}
.rf-none{--rf-border:linear-gradient(#4a4844,#3a3936)} /* Bestiary undiscovered: neutral grey */
/* Prize state (hoard): warm-white glow outside the real tier frame, breathing pulse. Focus ring moves outside it. */
.rf[aria-pressed="true"]{position:relative}
.rf[aria-pressed="true"]::after{content:"";position:absolute;inset:calc(-1 * var(--rf-w));border-radius:inherit;pointer-events:none;
  box-shadow:0 0 0 2px rgba(255,244,220,.85),0 0 18px 4px rgba(255,236,200,.35);animation:prizeBreath 2.4s ease-in-out infinite}
@keyframes prizeBreath{0%,100%{opacity:.6}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.rf[aria-pressed="true"]::after{animation:none;opacity:1}}
.walk-tag{margin-left:4px;font:700 9px/13px var(--body);letter-spacing:.1em;text-transform:uppercase;color:#fff4dc}
.r.r-common{color:#c9bfae}  /* was var(--gold) #d8a94b: gold now means Legendary only */
.rf:focus-visible{outline-offset:6px}
```

### 5.2 Mutation sweep

```css
@supports (mask-composite:exclude) or (-webkit-mask-composite:xor){
  .rf-mut::before{content:"";position:absolute;inset:calc(-1 * var(--rf-w));padding:var(--rf-w);border-radius:inherit;pointer-events:none;
    background:linear-gradient(115deg,transparent 42%,rgba(230,220,255,.95) 50%,transparent 58%) 50% 0/300% 100% no-repeat;
    -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;
            mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;
    animation:rfshim 4.8s cubic-bezier(.37,0,.63,1) infinite;animation-delay:var(--rfd,0s)}
}
/* 300% wide band: position 100% = band off the left edge, 0% = off the right edge, 50% = centred. */
@keyframes rfshim{0%{background-position:100% 0}40%,100%{background-position:0% 0}}
@media (prefers-reduced-motion:reduce){ .rf-mut::before{animation:none;background-position:50% 0;opacity:.7} }
```

- The `::before` covers exactly the border ring. The mask cuts out the content box, and `padding` = border width, so only the ring shows.
- Under reduced motion, the global rule (line 351) already stops the animation. The explicit rule above sets the resting state: band centred, 70% opacity.
- If the browser supports neither mask-composite syntax, there's no `::before` at all. The card still gets the mutation fill and hairline.
- `.rf` cards must not use `::before` for anything else. `.hd`, `.bx` and `.rf-wrap` don't today.

### 5.3 Helper (JS, next to `rcls`, line 488)

```js
/* Rarity frame classes for a dragon card. "Prize" is never a tier. */
const rfcls = d => "rf rf-" + rarityOf(d).toLowerCase() + (d.mut ? " rf-mut" : "");
/* Phase offset for the mutation sweep so cards don't shimmer in sync. i = index in its list. */
const rfd = i => `--rfd:-${((i * 1.3) % 4.8).toFixed(2)}s`;
```

---

## 6. Hoard tiles (Dragon screen)

### 6.1 CSS changes
- `.hd` (line 244): remove `background:var(--stone);border:1px solid var(--line);border-radius:14px;`. Keep everything else (`padding:6px 6px 8px;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:13px;font-weight:600;min-width:0`). Background, border and radius now come from `.rf`.
- Line 247: change `.hd[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-hi)}` to `.hd[aria-pressed="true"]{color:var(--gold-hi)}`. The ring comes from `.rf[aria-pressed="true"]`.
- Delete line 250 (`.hd.r-epic…`, `.hd.r-legendary…`) and line 251 (`.hd.has-mut…`).

### 6.2 Markup change (line 930)
Replace the opening tag
```js
`<button class="hd ${rcls(rarityOf(d))}${d.mut ? " has-mut" : ""}" data-act="prize" data-id="${d.id}" aria-pressed="${d.id === S.prize}">`
```
with (the `map` callback also takes the index `i`):
```js
`<button class="hd ${rfcls(d)}"${d.mut ? ` style="${rfd(i)}"` : ""} data-act="prize" data-id="${d.id}" aria-pressed="${d.id === S.prize}">`
```
Inside the button, change the rarity label so it **always** shows the real tier, and add the WALKING tag for the prize:
```js
// was: <em class="r ${rcls(rarityOf(d))}">${d.id === S.prize ? "Prize" : rarityOf(d)}</em>
`<em class="r ${rcls(rarityOf(d))}">${rarityOf(d)}</em>${d.id === S.prize ? `<span class="walk-tag">Walking</span>` : ""}`
```
Everything else inside the button stays the same.

### 6.3 Resulting sizes at a 390 × 844 viewport
- Content width 358 (`.pad` 16 + 16). `minmax(96px,1fr)` gives **3 columns of 112.67 px**, gap 10. Unchanged.
- The art stays **72 × 107.3**. With `box-sizing:border-box` (line 26), a thicker border only eats into the tile's padding area, so tile width doesn't change. Tile height grows by at most 4 px (Legendary 3+3 vs 1+1 today).
- The existing mutation effects on the art (e.g. `fx-gold`'s 4 px ring, `fx-moon`'s 28 px glow) sit inside the tile's 6 px padding as today and must not be clipped. Don't add `overflow:hidden` to `.hd`.
- On desktop the app column is max 480 px (line 30), so 448 px of content gives 4 columns. Unchanged.

---

## 7. Hatch overlay (new dragon)

Frame the new dragon so the tier reads at the reveal moment. The frame pops in **with** the dragon, not before.

### 7.1 Markup (line 1022)
```js
`<div class="born"><div class="${rfcls(d)} rf-wrap">${dragonArt(d, {live:true})}</div></div>`
```

### 7.2 CSS
- Replace `.hstage .born .dart{width:160px;opacity:0;transform:scale(.3) translateY(30px)}` (line 269) with:
```css
.hstage .born .rf-wrap{opacity:0;transform:scale(.3) translateY(30px)}
.hstage .born .dart{width:160px}
```
- Replace `.hstage.burst .born .dart{…}` (line 278) with the same rule on the wrapper:
```css
.hstage.burst .born .rf-wrap{transition:transform .55s cubic-bezier(.3,1.6,.5,1) .15s,opacity .2s .15s;opacity:1;transform:none}
```
- Add:
```css
.rf-wrap{--rf-r:14px;--rf-fill:linear-gradient(#0c1015,#0c1015);padding:6px;line-height:0}
.rf-wrap > .dart{border-radius:8px}
.rf-wrap.rf-mut{--rf-fill:linear-gradient(180deg,#26283a,#0c1015)}
```
- Size: the art stays 160 × 238.4. The wrapper is 160 + 12 + 2 × border, which comes to 174 × 252.4 (Common) up to 178 × 256.4 (Legendary). That fits in `.hstage` (220 × 260). Because `.born` centres it, the dragon sits about 9 px higher than today. That's expected.
- The 6 px padding keeps `fx-gold`'s 4 px ring inside the frame.
- Reduced motion: the global rule makes the pop-in instant, and the sweep is static (§5.2). `dragonArt` already swaps the video for the poster.

---

## 8. Bestiary (when `feature-bestiary.md` is built)

The Bestiary spec gives the markup. The frame rules are:
- **Discovered** species tile: `rf rf-<tier>`.
- **Discovered** mutation-variant tile: `rf rf-<tier> rf-mut` + `style="--rfd:…"` from `rfd(i)`.
- **Undiscovered** tile: `rf rf-none` (neutral grey 1px, `#4a4844` → `#3a3936`). It must never show the tier, because that would hint at what's inside.
- **Detail sheet:** `rf rf-<tier>[ rf-mut] dexsheet` with `--rf-r:22px`.
- **Variant pages** (tile and sheet) add the lavender hairline (`--rf-mutin`) from `rf-mut`.
- The Bestiary chrome (leather panel, gold double rules, corner brackets) is gold/neutral only and never uses a rarity colour or lavender as decoration. See `feature-bestiary.md` §6.0. CSS reference: `art/bestiary-mockups/mockups.html`.
- Undiscovered tiles keep the neutral grey frame (no tier colour, no WALKING tag).

---

## 9. Later (not v1): Animator-drawn frame art under `art/frames/`

When Animator delivers frame art, the CSS gradient frames can be swapped for `border-image`. Same tiers, same class names, no JS change. File list for Animator (transparent RGBA WebP, @3x like the Nest pack, transparent centre, 9-slice):

| File | Use |
|---|---|
| `art/frames/frame_common.webp` | Common tier border |
| `art/frames/frame_uncommon.webp` | Uncommon tier border |
| `art/frames/frame_rare.webp` | Rare tier border |
| `art/frames/frame_epic.webp` | Epic tier border |
| `art/frames/frame_legendary.webp` | Legendary tier border (may include corner filigree) |
| `art/frames/frame_unknown.webp` | Bestiary undiscovered tile (dim iron or stone) |
| `art/frames/frame_mutation.webp` | Lavender filigree overlay ring, layered over the tier frame on mutated cards |
| `art/frames/frame_mutation_sheet.webp` | Optional: sprite sheet of the sweep, if Animator wants a painted shimmer. The CSS sweep (§5.2) stays the reduced-motion fallback |
| `art/frames/corner_epic.webp`, `art/frames/corner_legendary.webp` | Optional corner ornaments (4 corners from one file, mirrored with CSS `scale(-1,1)` / `scale(1,-1)`) |

- TODO (Animator): canvas size, `border-image-slice`, `border-image-width`, and outset for each file. Add them to `assets.md` and this section. Don't guess them.
- `border-image` ignores `border-radius`, so the art must bake its own rounded corners.
- The swap rule: keep `.rf`'s fill layer (`padding-box`) and replace only the border paint.

---

## 10. Debug control: "Next hatch mutation"

Mutations are 3–20% per hatch, so testing needs a way to force one. Add a row to `debugPanel()` (after the Eggs row, line 1124):

```js
`<div class="row"><span>Mutate</span><button data-act="dbg-mut" data-k="none">Off</button>${Object.keys(MUTATIONS).map(k => `<button data-act="dbg-mut" data-k="${k}">${MUTATIONS[k].name}</button>`).join("")}</div>`
```
State and hook:
```js
let DBG_MUT = null;                       // next hatch's forced mutation key, debug only
// first line inside rollMutation(it):
if (DBG_MUT){ const k = DBG_MUT; DBG_MUT = null; return k; }
// in debugAct(a, b):
else if (a === "dbg-mut"){ DBG_MUT = b.dataset.k === "none" ? null : b.dataset.k; toast(DBG_MUT ? `Next hatch: ${MUTATIONS[DBG_MUT].name}` : "Next hatch: normal odds"); }
```
It forces **one** hatch, then goes back to normal odds. It only exists with `?debug=1` / `#debug`. If `feature-bestiary.md` is built first and has already added this control, don't add it twice.

---

## 11. Test checklist (App Tester)

Open with `?debug=1`. Viewport 390 × 844 unless stated. Use Debug → Bank → Set 1,000,000 to buy freely. Opening order: Moon Kiln opens after you own Ember Egg + Tide Egg; Cliff Roost opens after you own Squall Egg + Ember Sparks. Debug → Eggs → "Hatch all" hatches everything in the Nest.

1. **Common:** Reset. Buy and hatch an Ember Egg and a Tide Egg. Dragon tab → Hoard shows 2 tiles with a 1px bronze gradient border (light top-left `#b39062`, dark bottom-right `#6e583c`), no glow.
2. **Prize glow:** the prize tile keeps its tier frame and shows a warm-white glow outside it that breathes about every 2.4 s. Its label still reads its real tier (e.g. "COMMON") with a small "WALKING" tag beside it; "PRIZE" appears nowhere. Tap the other tile: the glow and the WALKING tag move to it, and both labels keep their tiers. Common text is `#c9bfae` (not gold).
3. **Every tier:** buy and hatch one of each egg (Grove, Forge, Squall, Night, Storm). In DevTools, check `border-width` on each `.hd`: Common 1px, Uncommon 2px, Rare 2px, Epic 2px, Legendary 3px. Colours match §4. Epic and Legendary have a visible outer glow; Common, Uncommon and Rare don't.
4. **Night Egg/Voidling is Epic:** the Voidling tile uses the purple Epic frame (`#d6a2ff` middle stop) and its label reads "EPIC".
5. **Mutation:** Debug → Mutate → Moonlit, then buy and hatch an Ember Egg. Its hoard tile has a 2px (not 1px) bronze border, a lavender 1px inner hairline, a lavender-tinted fill, and a light band that sweeps the border about every 4.8 s (moving for about 2 s, then resting). The existing moonlit glow on the art is still visible and not clipped.
6. **Mutation per fx:** repeat with Obsidian, Gilded and Aurora. The art's own effect (gold ring, shine sweep, aurora hue cycle) still shows inside the frame. Nothing is clipped or covered.
7. **Mutation flag resets:** after one forced hatch, the next hatch uses normal odds (no forced mutation).
8. **Out of sync:** with 3+ mutated tiles, the sweeps aren't simultaneous.
9. **Reduced motion** (OS setting on, reload): no sweep anywhere, and the prize glow is still at full opacity with no pulse. Mutated borders show a still lavender highlight in the middle of the ring. Hatch pop-in is instant.
10. **Hatch overlay:** hatch a Storm Egg. The Legendary frame appears around the new dragon **with** the dragon at the burst, not before. It fits inside the overlay with nothing cut off. Hatch a forced-mutation egg: the frame shows the sweep.
11. **Focus:** Tab through hoard tiles with a keyboard. The focus outline sits outside the prize glow (offset 6px) and is visible on every tier.
12. **Layout:** at 390 px the hoard is still 3 columns. Tiles in a row are equal height, and names and stage text are unchanged. At 1280 px (480 px column) it's 4 columns. Nothing scrolls sideways.
13. **Prize is not a rarity:** there's no special "prize" frame colour, and the prize dragon keeps its tier frame.
14. **Old save:** load a save made before this build (any `scalebank.v1` with 2+ dragons). Tiles render with frames and nothing errors. The save format doesn't change for this feature.
15. **Safari (iOS 16+) and Chrome Android:** the sweep stays on the border only, never across the art. If a browser lacks mask-composite, there's no sweep but the hairline still shows.
16. **Performance:** with 12+ mutated dragons, scrolling the Dragon screen stays smooth (no visible jank on a mid-range phone).
17. **Bestiary (once built):** undiscovered tiles have the neutral grey 1px `#4a4844` → `#3a3936` border, no tier colour. Discovered tiles and the detail sheet use the tier frames above.
