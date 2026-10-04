# Scale Bank: Nest screen spec (build sheet)

Translated from Ryan's `SPEC.md`, `ui/layout.json`, and `build_mockup.py` (the source kit `scale_bank_nest/`) to the **repo file names** in `art/nest/`. The target picture is `mockup_final.png` (1170 × 2532 = the 390 × 844 frame at @3x). Line 3 of SPEC.md says "960×2080"; that's stale, and the PNG really is 1170 × 2532.
Asset details (file px, what each file is) are in `assets.md`.
Rule: if a number isn't here, don't guess. Ask, or leave it as a TODO.

## 1. Reference frame and units

- Reference frame: **390 × 844**. All "px" in this file are CSS px on that frame (SPEC.md calls them pt).
- Scale it the way `index.html` already does. Put the screen in a container with `container-type: inline-size`, define `--u: calc(100cqw / 390)`, and write every length as `calc(N * var(--u))`. This scales x and y by the **width**, so the layout keeps its shape on any phone. Only use the "% of H" column if you deliberately scale y by height.
- Percent columns: left and width are % of 390; top and height are % of 844.
- Every box is the asset's full canvas, including its glow and shadow padding. Put the `<img>` at exactly that box with `width/height: 100%`.

## 2. Positions

### 2.1 Fixed elements

| Element | Asset | px: left, top, w × h | %: left, top, w × h | z | Notes |
|---|---|---|---|---|---|
| Background | `background.webp` | 0, 0, 390 × 844 | 0, 0, 100 × 100 | 0 | `background: #03060B url(art/nest/background.webp) center top / cover no-repeat` |
| Banner (canvas) | `banner_panel.webp` | 21, 24, 348 × 78 | 5.385, 2.844, 89.231 × 9.242 | 12 | visible panel 27, 30, 336 × 66, radius 14 |
| Banner text | live text | left 50.5; line-box top 41.31; 2 lines × 21 | 12.949, 4.895 | 12 | baselines **58 / 79**. Width: TODO (the spec gives none; index uses right padding 30, so text ends at x 339) |
| Cabinet back | `cabinet_back.webp` | 20, 90, 350 × 488 | 5.128, 10.664, 89.744 × 57.82 | 2 | 9-slice (§8). Interior 34, 103, 322 × 449 |
| Cabinet frame | `cabinet_frame.webp` | 20, 90, 350 × 488 | 5.128, 10.664, 89.744 × 57.82 | 11 | 9-slice, transparent centre, `pointer-events: none`. Glass body 25, 94, 340 × 466; plinth y 550–571 |
| Status line | live text | centred on x 195; line-box top 581.31; 2 lines × 21 | top 68.876 | 13 | baselines **598 / 619**. Width: TODO (index uses 14…376) |
| Info card (canvas) | `info_card_panel.webp` | 18, 628, 354 × 136 | 4.615, 74.408, 90.769 × 16.114 | 14 | visible panel 24, 634, 342 × 124, radius 18 |
| Portrait backing | `portrait_backing.webp` | 37.5, 639, 112 × 112 | 9.615, 75.711, 28.718 × 13.27 | 15a | circle centre (93.5, 695), r 52 |
| Portrait egg | `<dragon>_egg.webp` | egg fitted in the 84 × 84 box 51.5, 653 | 13.205, 77.37, 21.538 × 9.953 | 15b | exact img placement per egg in §6 |
| Portrait frame | `portrait_frame.webp` | 37.5, 639, 112 × 112 | same as backing | 15c | |
| Card caps | live text | left 164.5; line-box top 651.64, h 12.6 | 42.179, 77.209 | 15 | baseline **662** |
| Card title | live text | left 164; line-box top 665.13, h 33.91 | 42.051, 78.807 | 15 | baseline **691** |
| Card body | live text | left 164.5; line-box top 706.72; 2 lines × 18.5 | 42.179, 83.735 | 15 | baselines **721 / 739.5** |
| Card text width | n/a | TODO | n/a | n/a | the spec gives none; index uses 190 (to x 354.5) |
| Nav bar (canvas) | `nav_bar_bg.webp` | 2, 756, 386 × 83 | 0.513, 89.573, 98.974 × 9.834 | 16 | visible panel 8, 762, 374 × 71, radius 16 |

The line-box tops are computed from the fonts' vertical metrics: Lato ascent 0.987 em, descent 0.213 em; Cormorant Garamond ascent 0.924 em, descent 0.287 em. With `line-height: L` and `font-size: F`, top = baseline − (L − F·(ascent + descent)) / 2 − F·ascent. Put each text block at that top with `margin: 0` and the stated line-height, and the baselines land on the spec.

### 2.2 Shelf grid (3 rows × 3 columns)

Constants (px): column centres **colX = 93, 195, 297** (pitch 102). Tube tops **tubeY = 239, 384, 529** (pitch 145).

| Piece | Formula (px) | Size | z |
|---|---|---|---|
| Row back-light glow | left 40, top tubeY − 92 | 310 × 70 ellipse | 3 |
| Ready ring | left slotX − 25, top slotY − 50 | 150 × 150 | 4 |
| Shelf plank | left 29, top tubeY − 6 | 332 × 46 | 5 |
| Shelf light spill | left colX − 46, top tubeY + 12 | (92 × max(p, 0.35)) × 16 ellipse | 6 |
| Egg-on-nest slot (`<dragon>_nest.webp` / `nest_empty.webp`) | slotX = colX − 50, slotY = tubeY − 92 | 100 × 100 | 7 |
| Tube connector | left colX + 42 (cols 1→2 and 2→3 only), top tubeY − 4 | 18 × 28 | 9 |
| Tube stack | left colX − 48, top tubeY − 4 | 96 × 28 | 10 |

Lookup (px):

| | col 1 | col 2 | col 3 |
|---|---|---|---|
| slot left | 43 | 145 | 247 |
| ring left | 18 | 120 | 222 |
| tube left | 45 | 147 | 249 |
| connector left | 135 (between 1–2) | 237 (between 2–3) | n/a |

| | row 1 | row 2 | row 3 |
|---|---|---|---|
| slot top | 147 | 292 | 437 |
| ring top | 97 | 242 | 387 |
| shelf top | 233 | 378 | 523 |
| tube / connector top | 235 | 380 | 525 |
| back-light top | 147 | 292 | 437 |
| light-spill top | 251 | 396 | 541 |

Same values as % (left of 390 / top of 844):
- slot left: 11.026 / 37.179 / 63.333; slot top: 17.417 / 34.597 / 51.777; size 25.641 × 11.848
- ring left: 4.615 / 30.769 / 56.923; ring top: 11.493 / 28.673 / 45.853; size 38.462 × 17.773
- tube left: 11.538 / 37.692 / 63.846; tube top: 27.844 / 45.024 / 62.204; size 24.615 × 3.318
- shelf left 7.436; shelf top: 27.607 / 44.787 / 61.967; size 85.128 × 5.45
- connector left: 34.615 / 60.769; size 4.615 × 3.318

Grid order (the demo in the mockup): row 1 = cinder (READY), brine, inferno; row 2 = cinder, brine, voidling; row 3 = moss, stormling, tempest. Demo progress: [1.0, .55, .72], [.40, .62, .50], [.45, .58, .35]. The real game fills slots from its own egg list. Extra rows past 3 are not in the spec. Index adds rows at pitch 145 and pushes everything below them down; that's fine.

Glows (CSS only, no asset), copied from `build_mockup.py`:
- **Back-light**: ellipse, fill `#5A3216` at alpha 0.22, `filter: blur(calc(18 * var(--u)))`, `border-radius: 50%`.
- **Light spill**: ellipse, fill = the tube base hex (§7.1), or `#FFBE3E` when ready (unused with auto-hatch). Alpha 0.40 (warming) / 0.55 (ready), `filter: blur(calc(5 * var(--u)))`.
- The mockup composites each glow normally and then screens the same layer once more. In CSS, use two stacked copies: one normal, one `mix-blend-mode: screen`.

### 2.3 Nav (shared bottom bar)

| Piece | BANK | VENDORS | NEST | DRAGON | top / size |
|---|---|---|---|---|---|
| tab centre x | 54.75 (14.038%) | 148.25 (38.013%) | 241.75 (61.987%) | 335.25 (85.962%) | n/a |
| icon left (30 × 30) | 39.75 | 133.25 | 226.75 | 320.25 | top 772 (icon centre y 787) |
| label | centred on tab x | | | | baseline 817; Lato Bold 11.5 line box top 805.65, h 13.8 |
| active underline left (50 × 12) | 29.75 | 123.25 | 216.75 | 310.25 | top 757.8 (centre y 763.8, on the bar's top edge) |
| notification dot left (20 × 20) | 59.75 | 153.25 | 246.75 | 340.25 | top 766 (centre = tab x + 15, icon centre y − 11) |

Relative to the nav canvas top (756), so you can place it inside a bottom-docked bar: icon centre +31, label baseline +61, underline centre +7.8, dot centre +20.

## 3. Z-order (bottom → top)

| z | Layer |
|---|---|
| 0 | background (`background.webp`) |
| 1 | back embers (`ember_0n.webp`) |
| 2 | `cabinet_back.webp` |
| 3 | row back-light glow |
| 4 | ring (`ring_sheet.webp` sprite / `ring.webp`), only on eggs with ≤ 2,000 steps left |
| 5 | `shelf.webp` (hides the ring's faint lowest wisps) |
| 6 | shelf light spill |
| 7 | egg on nest (`<dragon>_nest.webp`) / `nest_empty.webp` |
| 8 | (optional ring front strands. The mask asset isn't in the repo, so skip this.) |
| 9 | `tube_connector.webp` |
| 10 | tube stack. Warming: `tube_track_back` → `fill_<dragon>` (cropped) → sheen → meniscus → `tube_track_front`. Ready (unused with auto-hatch): `tube_track_back` → `tube_ready_full` → `tube_ready_label`. |
| 11 | `cabinet_frame.webp` |
| 12 | `banner_panel.webp` + banner text |
| 13 | status line |
| 14 | `info_card_panel.webp` |
| 15 | `portrait_backing` → egg → `portrait_frame`, then card text |
| 16 | nav: `nav_bar_bg` → icons → labels → `nav_active_underline` → `nav_notification_dot` |
| 17 | foreground embers |

SPEC.md draws per row (row 2's ring after row 1's tubes). Putting all rings at z 4 under every tube is simpler, and the difference is at most about 5 px of faint wisp under row 1's tube. Keep the global order.

## 4. Tube fill (progress)

- `p = clamp(stepsWarmed / stepsRequired, 0, 1)`.
- Tube canvas 96 × 28. Capsule 88 × 20 at (4, 4). **Liquid area: x 7.4, y 6.4, w 81.2, h 15.2, radius 7.6** (all relative to the tube box).
- Show the whole `fill_<dragon>.webp` at full 96 × 28 and **crop it with a mask**. Never scale the fill.
  - The liquid's right edge is at **edge = 7.4 + 81.2 × p**.
  - If p > 0, use **edge = max(7.4 + 4, 7.4 + 81.2 × p)** so at least 4 px of liquid shows.
  - If p = 0, don't render the fill.
- The mask (from `build_mockup.py`) has two parts:
  1. A full-height rectangle from x 0 to **edge − 7.6**. It's full height so the glow above and below the liquid survives.
  2. A rounded leading cap: a 15.2 × 19.2 shape from x **edge − 15.2** to **edge**, y **4.4** to **23.6**. The mockup uses a rounded rect with radius 9.6; an ellipse is a close match.
  3. The mask edge is softened by about 0.3 px. That's optional.

```css
.tube { position:absolute; width:calc(96*var(--u)); height:calc(28*var(--u)); z-index:10; }
.tube > * { position:absolute; inset:0; width:100%; height:100%; }
.tube .fill {                      /* <img src="art/nest/fill_<dragon>.webp"> ; JS sets style="--edge: 52.06" */
  -webkit-mask:
    linear-gradient(#000 0 0) 0 0 / calc((var(--edge) - 7.6) * var(--u)) 100% no-repeat,
    radial-gradient(closest-side, #000 calc(100% - 1px), transparent)
      calc((var(--edge) - 15.2) * var(--u)) calc(4.4 * var(--u)) / calc(15.2 * var(--u)) calc(19.2 * var(--u)) no-repeat;
          mask:
    linear-gradient(#000 0 0) 0 0 / calc((var(--edge) - 7.6) * var(--u)) 100% no-repeat,
    radial-gradient(closest-side, #000 calc(100% - 1px), transparent)
      calc((var(--edge) - 15.2) * var(--u)) calc(4.4 * var(--u)) / calc(15.2 * var(--u)) calc(19.2 * var(--u)) no-repeat;
}
```

- **Meniscus** (white arc at the leading edge, in `build_mockup.py`):
  - The arc's box spans x edge − 3.2 to edge + 0.2 and y 7.6 to 20.4. It covers −70° to +70° (the right side).
  - White at 65% (the mockup uses 170/255), stroke about 0.67 px, blur 0.25 px.
  - CSS approximation: a `<i class="meniscus">` at `left: calc((var(--edge) - 3.2) * var(--u)); top: calc(7.6 * var(--u)); width: calc(3.4 * var(--u)); height: calc(12.8 * var(--u)); border-right: calc(.67 * var(--u)) solid rgba(255,255,255,.65); border-radius: 50%; filter: blur(calc(.25 * var(--u)))`.
- **Shimmer**: a soft white band **12 px wide at 25% opacity**, limited to the liquid. It sweeps left → right over **1.2 s easeInOutSine** (`cubic-bezier(.37,0,.63,1)`) and repeats every **3.2 s**, with a random phase per tube (negative `animation-delay`).
- **Progress changes** animate over **600 ms easeOutCubic** (`cubic-bezier(.33,1,.68,1)`). Animate `--edge` (register it with `@property --edge { syntax: '<number>'; inherits: true; initial-value: 0 }`) or use the Web Animations API. The tube must not be re-created on every render, or the transition can't run. Never animate backwards, except on reset.
- Sparkles twinkle (opacity 0.4 ↔ 1, 1.2–2.0 s random periods) and bubbles drift up 1–2 px on a 2.5 s loop. These are optional polish, and the spec gives no sprite for them (they're baked into the fill image).

## 5. Near-ready state (≤ 2,000 steps left), then auto-hatch

**Ryan's decision (Oct 4, 2026): keep auto-hatch.** Eggs hatch on their own at 0 steps left. There is no tap-to-hatch and no persistent "ready" egg. Keep the current code (`RING_STEPS = 2000`, `stepsLeft(e) <= RING_STEPS`, `autoHatch()`). Don't change it to `eggReady(e)`.

What changes when an egg has 2,000 steps or fewer left:

1. **Ring**: behind the shelf and egg (z 4), box = slot grown 25% left, 25% right, 50% up, and 0% down. That's left slotX − 25, top slotY − 50, 150 × 150. The ring centre lands at (slotX + 50, slotY + 25), and the band's outer radius is about 59 px.
   - It fades in once (`ring-in`, 0.6 s) when the egg crosses into the window. It must **not** restart the fade on every re-render (see §11, item 3).
   - Edge cases: show it at exactly 2,000 left (not at 2,001). If one big step add jumps from more than 2,000 left straight to 0, skip the ring and hatch normally.
2. **Tube**: keeps the egg-colour `fill_<dragon>` filling as usual. The gold ready tube (`tube_ready_full`, `tube_ready_label`, `fill_ready.webp`) isn't used with auto-hatch. Leave those files in `art/nest/`; they're unused for now.
3. **Egg wobble**: during the same window, the egg wobbles so the "almost there" moment reads at a glance. If the code already wobbles near-ready eggs, keep it and match these timings.
   - Rotate the slot around its bottom centre (`transform-origin: 50% 95%`; the nest base sits at y 342 of the 360 px file) through 0° → −4° → +4° → −2.5° → +1.5° → 0° over **0.9 s** easeInOutSine.
   - Add scaleX 1.02 / scaleY 0.98 on the first swing.
   - Rest **2.2 s**, with a per-egg random negative delay so the eggs don't wobble in sync.
4. **Copy**: keep the current copy. The "ready to crack" banner, status-line span, `· READY` card caps, and NEST nav dot belong to the dropped tap-to-hatch flow, so don't add them.

### 5.1 Ring sprite: `ring_sheet.webp`

- File: **3072 × 2048 px**.
- Frame count:
  - SPEC.md lists the 3072 × 2048 sheet as "256 px cells, 12 × 8, 96 frames, 24 fps". 3072 / 256 = **12 columns**, 2048 / 256 = **8 rows**, 12 × 8 = **96 frames**, **row-major**.
  - I checked this against the source frames: cell (0, 0) = frame 000 and cell (0, 1) = frame 001, and none of the 96 cells is empty.
- Timing: 96 frames at 24 fps = **4.0 s**, so one frame is 41.667 ms and one row (12 frames) is **0.5 s**.
- The loop is seamless: after frame 095 comes frame 000 again. **Don't** add an extra copy of frame 0.
- What the loop shows: one full clockwise turn per loop, with a counter-rotating inner layer, travelling bright lobes, brightness breathing, and sparks, all baked into the frames.

```css
.ring { position:absolute; width:calc(150*var(--u)); height:calc(150*var(--u)); z-index:4;
        overflow:hidden; pointer-events:none;
        animation: ring-in .6s cubic-bezier(.33,1,.68,1) both; }          /* fade in once when the egg reaches 2,000 steps left */
.ring .rs { width:100%; height:100%;
        background: url(art/nest/ring_sheet.webp) 0 0 / 1200% 800% no-repeat;   /* 12 × 8 cells */
        animation: ring-x .5s steps(12) infinite, ring-y 4s steps(8) infinite; }
@keyframes ring-x { from { background-position-x: 0% } to { background-position-x: 109.0909% } }  /* = 12/11 */
@keyframes ring-y { from { background-position-y: 0% } to { background-position-y: 114.2857% } }  /* = 8/7  */
@keyframes ring-in { from { opacity:0; transform:scale(.85) } }
```

Why the odd percentages:
- With `background-size: 1200%`, `background-position-x: P%` shifts the sheet by P × (box − sheet) = −11 boxes × P. P = 12/11 means −12 boxes, so `steps(12)` stops on columns 0…11 and then wraps.
- Rows work the same way: 8/7 → `steps(8)`.
- Both animations live on the same element, so they start together. Their 0.5 s × 8 = 4 s cycle stays in sync.
- Fixed-size alternative for a 150 px box: `background-size: 1800px 1200px`, with keyframes animating to `-1800px` and `-1200px`.
- Keep `overflow: hidden` on the box and animate `background-position`. Don't move a transformed 12 × 8 sheet (`index.html` notes that this is too big a layer for Safari).

### 5.2 Static fallback and reduced motion: `ring.webp`

- `ring.webp` is 540 × 540 (@3x of 180, shown at 150 × 150).
- Simple 4 s seamless spin: `animation: ring-spin 4s linear infinite, ring-breathe 2s ease-in-out infinite;` with `@keyframes ring-spin { to { transform: rotate(360deg) } }` and `@keyframes ring-breathe { 50% { opacity: .9 } }`. Opacity goes 1 → 0.9 → 1, which is the spec's 0.9 ↔ 1.0 on a 2 s sine.
- Under `prefers-reduced-motion: reduce`, show `ring.webp` with no animation.

## 6. Portrait egg (info card), exact placement

The spec takes `<dragon>_egg.webp`, crops it to its alpha bounds, fits it into an 84 × 84 box, and centres it at (93.5, 695). Without cropping, the same result comes from placing the whole 360 px image like this, inside the 112 × 112 portrait box (box left 37.5, top 639):

| Egg file | alpha bbox in 360 px file (l, t, r, b) | img size (px) | img left, top in the portrait box (px) | same as % of 112: left, top, width = height |
|---|---|---|---|---|
| `cinder_egg.webp` | 91, 81, 269, 342 | 115.86 | −1.93, −12.07 | −1.72%, −10.78%, 103.45% |
| `inferno_egg.webp` | 91, 81, 269, 342 | 115.86 | −1.93, −12.07 | −1.72%, −10.78%, 103.45% |
| `brine_egg.webp` | 91, 80, 269, 342 | 115.42 | −1.71, −11.65 | −1.53%, −10.40%, 103.05% |
| `voidling_egg.webp` | 91, 83, 269, 342 | 116.76 | −2.38, −12.92 | −2.12%, −11.53%, 104.25% |
| `stormling_egg.webp` | 91, 86, 269, 342 | 118.12 | −3.06, −14.22 | −2.73%, −12.70%, 105.47% |
| `moss_egg.webp` | 91, 81, 269, 342 | 115.86 | −1.93, −12.07 | −1.72%, −10.78%, 103.45% |
| `tempest_egg.webp` | 91, 80, 269, 341 | 115.86 | −1.93, −11.75 | −1.72%, −10.49%, 103.45% |

## 7. Colours (hex)

### 7.1 Eggs and tubes

| File key | Egg | Dragon | Rarity | Tube base | Ramp deep / bright / highlight | Gem |
|---|---|---|---|---|---|---|
| `cinder` | Ember Egg (red) | Cinder | Common | `#B3261A` | `#6E1206` / `#E8462B` / `#FF9A78` | Ruby |
| `inferno` | Forge Egg (orange) | Inferno | Rare | `#CC5F17` | `#7A2E06` / `#F5862F` / `#FFC77A` | Ruby |
| `brine` | Tide Egg (teal) | Brine | Common | `#128399` | `#033F4E` / `#2EC3D9` / `#9BEFF8` | Pearl |
| `stormling` | Squall Egg (indigo lattice) | Stormling | Rare | `#3C35A6` | `#1B1650` / `#6C62EE` / `#BDB6FF` | Sapphire |
| `moss` | Grove Egg (green) | Moss | Uncommon | `#3E7A16` | `#1D3806` / `#6FBE2C` / `#BDF07E` | Emerald |
| `voidling` | Night Egg (purple) | Voidling | Epic | `#6A2C90` | `#2D0E43` / `#A64FD6` / `#DCA2F5` | Amethyst |
| `tempest` | Storm Egg (slate, lightning crack) | Tempest | Legendary | `#5D6470` | `#2A2C32` / `#9EA8B8` / `#EEF3FA` | Ice-blue topaz |
| ready state | n/a | n/a | n/a | `#DC8A1A` (light spill uses `#FFBE3E`) | `#8A3A04` / `#FFBE3E` / `#FFF3BE` | n/a |

### 7.2 Screen and surfaces

| Token | Hex |
|---|---|
| bg_black (screen base) | `#03060B` |
| haze brown / ember (baked into background.webp) | `#3E2414`, `#2A180D` / `#4A260F`, `#40210D` |
| panel fill | `#141216` → `#0C0C10` → `#07070A` @ 86–92% |
| nav fill | `#0E1118` → `#05070C` @ 94–97% |
| cabinet back | `#120D0A` → `#0A0706` |
| wood dark / mid / lit | `#120B07` / `#3A2616` / `#654322` |
| glass tint | `#FFE7C0` @ 3–16% |

### 7.3 Gold

| Token | Hex |
|---|---|
| gold_light | `#FFE6A0` |
| gold_bright | `#F3C859` |
| gold_mid | `#D19F68` |
| gold_muted | `#967A5B` |
| gold_deep | `#7A4A14` |
| gold_border_dim | `#3D3630` |
| metallic gradient (top→bottom) | `#FFE9A8 → #E8B451 → #9A5E18 → #6E400F → #C68A30 → #FFD98A` |
| panel border gradient (TL→BR) | `#F0CC8E → #B39062 → #6E583C → #A88458 → #E8BE7E` |

### 7.4 Text and indicators

| Token | Hex |
|---|---|
| banner text | `#F5E5C1` |
| status text / bold span | `#F4DA9A` / `#FFE3A0` |
| card title | `#F3DBA0` (gradient `#FFF1CC → #E9C27E`) |
| card caps | `#E1B567` |
| card body | `#EDEDEA` |
| nav label inactive / active | `#C3B197` / `#EECA74` |
| nav icon inactive | `#B9A68A` @ 90% (baked into the icon) |
| notification red | `#EA5530` (radial `#FF9A72 → #EA5530 → #B32A12`, baked into the dot) |
| ready label / shadow | `#FFF6E0` / `#5A2400` |
| ready ring core / glow | `#FFF4C0`, `#FFE7A0` / `#FFB43A`, `#FFA526` (baked into the ring) |
| ember core / glow | `#FFF2C8`, `#FFDA91` / `#FF8A2A`, `#FF7A1E` (baked into the embers) |

## 8. Typography

Fonts: **Cormorant Garamond** for headings, **Lato** for body. Load them like this:
`https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Lato:wght@400;700;900&display=swap`
(index already loads these, plus Gloock and Albert Sans for the other screens).

| Style | Font | Size / line-height (px) | Weight | Letter-spacing | Colour | Extra |
|---|---|---|---|---|---|---|
| Banner | Lato | 16 / 21 | 400 | 0 | `#F5E5C1` | left-aligned, max 2 lines |
| Status | Lato | 16 / 21 | 400, bold span 700 | 0 | `#F4DA9A`, span `#FFE3A0` | centred; gold glow `0 0 2px rgba(244,200,100,.35)` |
| Card caps | Lato | 10.5 | 700 | 0.18em | `#E1B567` | uppercase, e.g. `COMMON EGG · WARMING` |
| Card title | Cormorant Garamond | 28 | 600 | 0 | gradient `#FFF1CC → #E9C27E` (`background-clip: text`) | glow 2 px blur @ 45% |
| Card body | Lato | 13 / 18.5 | 400 | 0 | `#EDEDEA` | max 2 lines |
| Nav label | Lato | 11.5 | 700 | 0.08em | `#C3B197` / active `#EECA74` | uppercase, centred under the icon |
| Tube "Ready" (if live text) | Lato | 13 | 700 | 0.2px | `#FFF6E0` | dark-orange shadow `#5A2400` |

All text gets a legibility shadow: `0 0.6px 0.8px rgba(0,0,0,.6)` (scale with `--u`).

## 9. 9-slice (`border-image`) values for the @3x files

`border-image-slice` order is top, right, bottom, left, in file px. `border-width` is in px on the 390 frame.

| Asset | slice (file px) | border-width (px) | Notes |
|---|---|---|---|
| `banner_panel.webp` | 78 108 78 108 fill | 26 36 26 36 | or just stretch it at its fixed 348 × 78 |
| `info_card_panel.webp` | 132 fill | 44 | |
| `nav_bar_bg.webp` | 78 72 fill | 26 24 | |
| `cabinet_back.webp` | 72 66 90 fill | 24 22 30 | |
| `cabinet_frame.webp` | 168 102 126 | 56 34 42 | no `fill` (transparent centre) |
| `shelf.webp` | 0 48 fill | 0 16 | stretch horizontally only |
| `tube_track_*.webp` | 0 42 fill | 0 14 | only if tubes are resized |
| portraits, icons, ring, dot, eggs | n/a | n/a | scale uniformly only |

## 10. Other animation timings

| Effect | Spec |
|---|---|
| Embers | `ember_01–06`, 24 × 24, `mix-blend-mode: screen`. Spawn 0.6–1.2 per second, at most 24 alive. Lifetime 4–7 s. Rise 12–30 px/s with a sine sway (amplitude 6–14 px, period 2–4 s). Scale 0.5–1.2. Fade in over 0.4 s and out over the last 1.5 s. Spawn mostly at x < 30 or x > 360 in the bottom 60% of the screen; the occasional one goes behind the cabinet (z 1). |
| Warming eggs | Still. Optional 1° nudge every 8–12 s at ≥ 67% progress. |
| Tab indicator | Slides between tabs in 250 ms easeInOutCubic (`cubic-bezier(.65,0,.35,1)`). |
| Info card | Content crossfades in 200 ms when the selection changes. |
| Pressed nest | scale 0.96 for 120 ms. |

Selection: the banner and card describe the selected egg. By default that's the warming egg closest to cracking. Card body copy by progress: 0–33% "It's still and quiet.", 34–66% "It's warm to the touch.", 67–99% "Something is pressing at the shell from the inside."

---

## 11. Mismatches: what `index.html` does now vs this spec

I measured these in headless Chrome at a 390 × 844 viewport, using the mockup's 9-egg state, at commit `8b75456`. The positions in `renderNest()` (slots, rings, shelves, tubes, connectors, banner, cabinet, card panel, portrait box) already match the spec exactly. These are the differences:

1. **Ready state: resolved, keep auto-hatch (Ryan, Oct 4).**
   - Keep `autoHatch()` and the ring at `stepsLeft(e) <= RING_STEPS` (2,000 steps left). No code change is needed for the hatch flow itself.
   - Make sure the ring shows at exactly 2,000 left, and that a big step jump past the window still hatches cleanly (§5).
2. **Night Egg rarity: resolved, it's Epic (Ryan, Oct 4).** The code is already correct, so leave it alone. "Prize" isn't a rarity; it's the label for whichever dragon is currently getting the steps.
3. **Tube leading edge is square.**
   - Current: `clip-path: inset(0 X% 0 0 round 0 7.6u 7.6u 0)`. That rounds the corners of the full 28 px canvas, not the 15.2 px liquid, so the liquid end reads square.
   - Fix: use the two-layer mask in §4, with JS setting `--edge`.
4. **No meniscus highlight** at the liquid edge. Add the §4 meniscus.
5. **No row back-light or shelf light spill glows** (§2.2). Add both. They're what make the cabinet look lit in the mockup.
6. **Status line type is too small.**
   - Current: `.hx-status` uses 15.5 / 19.5, which puts the baselines at about 597 / 615.
   - Fix: 16 / 21, line box top 581.31, no grid centring. Baselines then land at 598 / 619.
7. **Card text is vertically centred instead of baseline-placed.**
   - Measured baselines: caps ≈ 664.9 (spec 662), title ≈ 695.0 (spec 691), body ≈ 720.0 / 738.5 (spec 721 / 739.5).
   - Fix: absolutely position each line box (caps top 651.64 with line-height 12.6; title top 665.13 with line-height 33.91; body top 706.72 with line-height 18.5) instead of `.hx-cardtext{justify-content:center; gap}`.
8. **Nav offsets.**
   - Measured from the nav canvas top: icon centre +35 (spec +31), label baseline ≈ +66.8 (spec +61), underline centre +10 (spec +7.8), dot centre = icon centre − 13 (spec − 11).
   - Fix (the nav canvas top is 12 px above each `.tab`'s top):
     - `.tab` padding-top 4 (not 8). The icon centre moves to +31.
     - Label `line-height: 13.8px`, with a gap of about 3.65 px under the icon (the current 4 px gives +61.35). The baseline lands at +61.
     - Underline `top: -10.2px` (not -8px). Its centre moves to +7.8.
     - Dot `top: -2px` (not 0), after the padding change. Its centre lands at +20 = icon centre − 11.
     - Verify all of these in the browser.
9. **Embers.**
   - Current: 14 px wide (spec 24 × 24), rise about 26–45 px/s (spec 12–30), a fixed set of 12, and all in the foreground at z 9.
   - Fix: width/height `calc(24*var(--u))` and travel distance ≤ 30 px/s × duration. Add a few behind the cabinet (z 1).
10. **Progress isn't animated.**
    - `renderNest()` rebuilds `#nestBody.innerHTML` on every change, so there's no 600 ms easeOutCubic fill animation, and the ring's `ringin` fade replays on every render.
    - Fix: update existing tube and ring nodes in place (set `--edge`, toggle classes) instead of replacing the markup.
11. **Sheen is too wide and not confined to the liquid.**
    - Current: the band is about 58 px wide (20% of a 300% background) at 28% opacity, clipped with the same rect as the fill, so it also covers the glow.
    - Fix: 12 px band at 25%, masked to the liquid area (x 7.4…edge, y 6.4…21.6). Keep 3.2 s with about 1.2 s of motion.
12. ~~Gold crossfade on ready~~: not needed with auto-hatch. `fill_ready.webp` and the gold tube stay unused.
13. **The tab underline doesn't slide** (250 ms); it's a per-tab `::before`, so make it one shared element that moves.
14. **Portrait egg slightly too big.**
    - Current: `.hx-portrait .pe` at left −2.5%, top −11.4%, size 105% for every egg, so the egg is about 85.6 px tall instead of fitting 84.
    - Fix: use the per-egg values in §6 (e.g. cinder −1.72%, −10.78%, 103.45%).
15. **Default selection**: with auto-hatch, ready eggs never persist, so the current "most-progressed egg" default is fine. No change.
16. **Fonts outside the Nest (decision).**
    - The Nest correctly uses Lato and Cormorant Garamond 600.
    - The other screens use `--display: Gloock` and `--body: Albert Sans`.
    - If Cormorant Garamond / Lato should be app-wide, set `--display: "Cormorant Garamond", …` and `--body: "Lato", …`, then drop Gloock and Albert Sans from the Google Fonts URL.
17. **Wobble jitter**: fixed 3.1 s period plus a per-egg phase. The spec wants the rest to vary ±0.4 s per egg. Minor; it would need the Web Animations API.
18. Ready banner copy: keep whatever the current code says. The spec's "ready to crack" copy belonged to the dropped tap-to-hatch flow.

Not Nest-specific, but visible on the Nest: the empty `#toast` peeks 2.4 px into the top of the screen. It's 24 px tall when empty and `translateY(-140%)` only moves it 33.6 px. Fix: `transform: translateY(calc(-100% - 16px))`, or `visibility: hidden` when it lacks `.show`.

## 12. Open TODOs (not determinable from the inputs)

- Text box widths for the banner, status line, and card text. The spec gives only x positions and baselines.
- Whether to ship the sharper 512 px ring sheet (not in the repo) for 3× screens.
- Empty-nest opacity: index uses 0.55, and the spec doesn't say.
