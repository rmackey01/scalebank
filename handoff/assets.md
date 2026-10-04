# Scale Bank: art asset map (`art/`)

Source: `rmackey01/scalebank` @ `main`, commit `8b75456` ("Add Scale Bank (live version with trails)", Oct 3, 2026, 11:56 PM CT). 148 files in `art/`.
Every size below was measured from the files themselves (Pillow for images, ffprobe for video). Usage was checked by grepping `index.html` at the same commit.

## How to read this

- **pt** = CSS px on the 390 × 844 reference phone frame. The Nest screen code already uses `--u = 100cqw / 390` (1 pt), so write `calc(N * var(--u))`.
- **File px**: the real pixel size of the file. Nest UI files are **@3x** (3 file px per pt). The exceptions are `background.webp` and `ember_*.webp`, which are **@2x**.
- **Layer**: the z-order number from `nest-spec.md` §3 (bigger numbers sit on top). The Nest screen is the only screen with a fixed layer stack.
- **Loops**: "no" means it's a still image.
- **In index.html**:
  - "yes (literal)": the file name appears verbatim.
  - "yes (template)": the path is built in JS, e.g. `` `${NA}${it.line}_egg.webp` `` or `` `art/dragons/${line}-${si + 1}` ``.
  - "NO": the file isn't referenced.
- KB = 1024 bytes.

## Video rules (all `.webm` / `.mp4` in this repo)

Use exactly this markup. WebM goes first, MP4 is the fallback, and the WebP is the poster:

```html
<video muted autoplay loop playsinline poster="art/dragons/cinder-1.webp" preload="metadata">
  <source src="art/dragons/cinder-1.webm" type="video/webm">
  <source src="art/dragons/cinder-1.mp4"  type="video/mp4">
</video>
```

- Set `muted`, `autoplay`, `loop`, and `playsinline` every time. iOS won't autoplay without `muted` + `playsinline`. None of the files has an audio track; all of them are video only.
- Always set `poster` to the matching `.webp`. It shows before the first frame and, under `prefers-reduced-motion: reduce`, it's the only thing that shows. Use an `<img src="….webp">` in place of the video there.
- No file has alpha. All are yuv420p: WebM is VP9 and MP4 is H.264, at 24 fps. Put them on an opaque box with `object-fit: cover`.
- Off-screen videos (for example, vendor scenes not in view) should be paused with JS. `index.html` already does this for the vendor scenes (`syncVideos()`), so those tags leave out `autoplay` on purpose.
- Loop seams were spot-checked: mean luma difference between the first and last frame, on a 0–255 scale. Dragons measure 2.5–6.1, about the size of one normal frame step. Scenes measure 4.6–7.4, and the stall and roost seams are 2–3× a normal frame step. TODO: watch `stall`, `roost`, and `kiln` loop once on a phone to check for a visible pop.

---

## 1. Nest screen (`art/nest/`), 56 files

The full layout (positions, z-order, tube fill, ready ring) is in `nest-spec.md`. Every Nest file is a transparent RGBA WebP unless it says otherwise.

### 1.1 Background and embers

| File | What it is | Where it goes (pt: left, top, w × h) | File px | Display (pt) | Layer | Loops | In index.html |
|---|---|---|---|---|---|---|---|
| `background.webp` | Dark screen backdrop with warm haze (opaque RGB) | Whole Nest screen 0, 0, 390 × 844; `background-size: cover`, top-aligned, under colour `#03060B` | 780 × 1688 (@2x) | 390 × 844 | 0 | no | yes (literal) |
| `ember_01.webp` … `ember_06.webp` | Single floating ember sprites (6 variants) | Spawned along the screen edges (x < 30 or x > 360) in the bottom 60% of the screen, occasionally behind the cabinet; `mix-blend-mode: screen` | 48 × 48 each (@2x) | 24 × 24 | 1 (back) and 17 (front) | animated in CSS (rise and fade, 4–7 s lifetime); the sprite itself is still | yes (template `ember_0${n}`) |

### 1.2 Panels (banner and info card)

| File | What it is | Where it goes | File px | Display (pt) | Layer | Loops | In index.html |
|---|---|---|---|---|---|---|---|
| `banner_panel.webp` | Top message panel with gold border | 21, 24, 348 × 78 (visible panel 27, 30, 336 × 66) | 1044 × 234 | 348 × 78 | 12 | no | yes (literal) |
| `info_card_panel.webp` | Bottom info card with double gold rim | 18, 628, 354 × 136 (visible panel 24, 634, 342 × 124) | 1062 × 408 | 354 × 136 | 14 | no | yes (literal) |
| `portrait_backing.webp` | Dark round disc behind the card's egg | 37.5, 639, 112 × 112 | 336 × 336 | 112 × 112 | 15 (under the egg) | no | yes (literal) |
| `portrait_frame.webp` | Gold ring frame over the card's egg | 37.5, 639, 112 × 112 | 336 × 336 | 112 × 112 | 15 (over the egg) | no | yes (literal) |

### 1.3 Cabinet and shelf

| File | What it is | Where it goes | File px | Display (pt) | Layer | Loops | In index.html |
|---|---|---|---|---|---|---|---|
| `cabinet_back.webp` | Wooden back wall inside the glass cabinet | 20, 90, 350 × 488; 9-slice (see nest-spec §8) | 1050 × 1464 | 350 × 488 | 2 | no | yes (literal) |
| `cabinet_frame.webp` | Glass cabinet frame and plinth, transparent centre | 20, 90, 350 × 488; 9-slice | 1050 × 1464 | 350 × 488 | 11 | no | yes (literal) |
| `shelf.webp` | Dark wood plank with gold front lip | x 29, y = tubeY − 6 (233 / 378 / 523), 332 × 46; 3-slice horizontally | 996 × 138 | 332 × 46 | 5 | no | yes (literal) |

### 1.4 Eggs and nests (one per dragon line)

Egg mapping: `cinder` = red Ember Egg, `inferno` = orange Forge Egg, `brine` = teal Tide Egg, `voidling` = purple Night Egg, `stormling` = indigo lattice sapphire Squall Egg, `moss` = green Grove Egg, `tempest` = slate lightning-crack Storm Egg.

| File | What it is | Where it goes | File px | Display (pt) | Layer | Loops | In index.html |
|---|---|---|---|---|---|---|---|
| `<dragon>_nest.webp` (7: `cinder_nest`, `inferno_nest`, `brine_nest`, `voidling_nest`, `stormling_nest`, `moss_nest`, `tempest_nest`) | Egg sitting in its golden straw nest. **This is the nest-slot image.** (The source kit called it `<egg>_on_nest`.) | Nest slot: left = colX − 50, top = tubeY − 92, 100 × 100 | 360 × 360 | 100 × 100 | 7 | no (the ready egg wobbles in CSS) | yes (template `${it.line}_nest.webp`) |
| `nest_empty.webp` | Empty nest, same canvas as `_nest` | Empty slots, same box as above | 360 × 360 | 100 × 100 | 7 | no | yes (literal) |
| `<dragon>_egg.webp` (7: `cinder_egg` … `tempest_egg`) | The egg by itself, transparent, at the same scale and position as in `_nest` | (a) info-card portrait: cropped to its alpha bounds and fitted into an 84 × 84 box centred at 93.5, 695 (nest-spec §6); (b) Vendors shop row thumbnail; (c) hatch overlay egg halves | 360 × 360 (egg alpha box ≈ x 91–269, y 80–342) | (a) about 84 tall; (b) 92 × 92 px box (`.thumb .shopegg`); (c) 220 × 220 px (`.hstage .halves img`) | 15 on Nest | no | yes (template `${it.line}_egg.webp`) |

### 1.5 Progress tubes

All tube pieces share one 96 × 28 pt canvas (288 × 84 px). Stack them in the same box: left = colX − 48, top = tubeY − 4.

| File | What it is | Where it goes | File px | Display (pt) | Layer | Loops | In index.html |
|---|---|---|---|---|---|---|---|
| `tube_track_back.webp` | Empty glass tube body and gold caps, back half | Tube box | 288 × 84 | 96 × 28 | 10 (inside the tube: 1st) | no | yes (literal) |
| `fill_<dragon>.webp` (7: `fill_cinder` red, `fill_inferno` orange, `fill_brine` teal, `fill_voidling` purple, `fill_stormling` indigo, `fill_moss` green, `fill_tempest` slate) | 100% liquid fill in the egg's colour, with glow, bubbles, and sparkles. Cropped by progress (nest-spec §4). | Tube box | 288 × 84 (liquid ≈ x 23–264, y 20–63 px) | 96 × 28 | 10 (2nd) | no (shimmer is CSS) | yes (template `fill_${line}.webp`) |
| `fill_ready.webp` | Gold version of the liquid fill | Tube box | 288 × 84 | 96 × 28 | 10 (2nd) | no | **NO**. Not referenced. TODO for Ryan: the spec's ready flow uses `tube_ready_full`; decide whether `fill_ready` should be the target of the 500 ms colour-to-gold crossfade or be dropped. |
| `tube_track_front.webp` | Glass highlights and front rim, over the liquid | Tube box | 288 × 84 | 96 × 28 | 10 (3rd, last for warming tubes) | no | yes (literal) |
| `tube_ready_full.webp` | Complete gold "ready" tube (full gold liquid) | Tube box, in place of fill and front track when progress ≥ 1 | 288 × 84 | 96 × 28 | 10 (2nd, ready only) | no (brightness breathes in CSS) | yes (literal) |
| `tube_ready_label.webp` | The word "Ready" for the tube | Tube box, over `tube_ready_full` | 288 × 84 (text ≈ x 84–206, y 19–71 px) | 96 × 28 | 10 (3rd, ready only) | no | yes (literal) |
| `tube_connector.webp` | Short gold link between two tubes | left = colX + 42 (135 and 237), top = tubeY − 4, 18 × 28; two per row | 54 × 84 | 18 × 28 | 9 (under the tubes) | no | yes (literal) |

### 1.6 Ready ring

| File | What it is | Where it goes | File px | Display (pt) | Layer | Loops | In index.html |
|---|---|---|---|---|---|---|---|
| `ring_sheet.webp` | **Sprite sheet** of the gold spinning ring: 96 frames, 12 columns × 8 rows, 256 × 256 px cells, row-major. 24 fps = 4.0 s seamless loop. (This is the kit's `ring_spin_sheet_256_12x8_96f_24fps`; I verified it cell by cell against the source frames.) | Ring box: left = slotX − 25, top = slotY − 50, 150 × 150, behind the shelf and egg. Only around eggs in the Ready state. | 3072 × 2048 (2.7 MB) | 150 × 150 | 4 | **yes**: 4 s loop, CSS `steps()` (nest-spec §5) | yes (literal) |
| `ring.webp` | Still ring (master still, @3x) | Same ring box. Fallback for `prefers-reduced-motion`; can also be rotated 360° every 4 s as a cheap spin. | 540 × 540 | 150 × 150 | 4 | no (optional CSS rotation) | yes (literal, reduced-motion branch only) |

Note: on a 3× phone the ring shows at 450 device px, but the sheet cells are 256 px, so the ring is upscaled about 1.76×. The source kit also has a sharper 512 px sheet (`ring_spin_sheet_512_8x6_48f_12fps.png`, 4096 × 3072, 48 frames at 12 fps) that isn't in the repo. TODO for Ryan: add it only if the ring looks soft on device.

### 1.7 Bottom nav (shared by every screen)

| File | What it is | Where it goes | File px | Display (pt) | Layer | Loops | In index.html |
|---|---|---|---|---|---|---|---|
| `nav_bar_bg.webp` | Dark nav panel with gold border | 2, 756, 386 × 83 (visible panel 8, 762, 374 × 71); 9-slice | 1158 × 249 | 386 × 83 | 16 | no | yes (literal) |
| `icon_bank_inactive.webp` / `icon_bank_active.webp` | Bank tab icon (muted / gold) | 30 × 30 centred at x 54.75, y 787 | 90 × 90 | 30 × 30 | 16 | no | yes (literal) |
| `icon_vendors_inactive.webp` / `icon_vendors_active.webp` | Vendors tab icon | 30 × 30 centred at x 148.25, y 787 | 90 × 90 | 30 × 30 | 16 | no | yes (literal) |
| `icon_nest_inactive.webp` / `icon_nest_active.webp` | Nest tab icon | 30 × 30 centred at x 241.75, y 787 | 90 × 90 | 30 × 30 | 16 | no | yes (literal) |
| `icon_dragon_inactive.webp` / `icon_dragon_active.webp` | Dragon tab icon | 30 × 30 centred at x 335.25, y 787 | 90 × 90 | 30 × 30 | 16 | no | yes (literal) |
| `nav_active_underline.webp` | Gold bar marking the active tab (sits on the nav's top edge) | 50 × 12 centred at (tabX, 763.8) | 150 × 36 | 50 × 12 | 16 (over the icons) | no (slides 250 ms between tabs) | yes (literal) |
| `nav_notification_dot.webp` | Red glowing dot on the NEST tab while any egg is ready | 20 × 20 centred at (tabX + 15, 776) | 60 × 60 | 20 × 20 | 16 (top of the nav) | no (CSS pulse 70–100% opacity, 1.6 s) | yes (literal) |

---

## 2. Vendors screen (`art/`, scene videos)

One scene per vendor, shown in the vendor card `.art` box (`aspect-ratio: 6/5`, full card width; at a 390 px viewport that's about 356 × 297 px). Use `object-fit: cover` with the per-scene `object-position`, which is already in `SCENES[].pos`. Layer: the video is the card's base, with the `.shade` gradient and title on top.

| Files | What it is | Video px | Duration / frames | Poster px | Display | Loops | In index.html |
|---|---|---|---|---|---|---|---|
| `stall.webm` (2924 KB), `stall.mp4` (2894 KB), `stall-poster.webp` (91 KB) | Lantern Stall: hooded egg seller with glowing eggs | 600 × 912 | 20.04 s, 481 frames @ 24 fps | 600 × 912 | `.art` box, `object-position: 50% 62%` | yes (`loop`; JS plays only the visible scene) | yes (template `art/${name}…`) |
| `kiln.webm` (2221 KB), `kiln.mp4` (1976 KB), `kiln-poster.webp` (66 KB) | Moon Kiln: the Kilnwright at the anvil | 600 × 1066 | 13.54 s, 325 frames @ 24 fps | 600 × 1066 | `.art` box, `object-position: 50% 42%` | yes | yes (template) |
| `roost.webm` (2000 KB), `roost.mp4` (2155 KB), `roost-poster.webp` (62 KB) | Cliff Roost: hooded stranger on a rainy cliff | 600 × 1066 | 18.50 s, 444 frames @ 24 fps | 600 × 1066 | `.art` box, `object-position: 50% 30%` | yes | yes (template) |

The Vendors shop rows also use `art/nest/<dragon>_egg.webp` as 92 × 92 px egg thumbnails (§1.4).

---

## 3. Dragon screen, Hoard, hatch overlay, share card (`art/dragons/`), 84 files

Pattern: `art/dragons/<dragon>-<stage>.{webp,webm,mp4}`, where stage 1 = Hatchling, 2 = Juvenile, 3 = Adult, 4 = Elder.
Every stage is the same format:
- Video: 480 × 716 px, 6.04 s (145 frames @ 24 fps), opaque, parchment background.
- Poster: `.webp`, 480 × 715 px, opaque RGB. It's 1 px shorter than the video, which is harmless with `object-fit: cover`.

Where it's shown (box `.dart`, `aspect-ratio: 784/1168`, `object-fit: cover`, background = the measured edge colour in `EDGES[]`):

| Context | Box width (CSS) | Media | Loops |
|---|---|---|---|
| Dragon screen prize card (`.stage .dart`) | `min(240px, 62vw)` (240 × 357.6 at a 390 px viewport) | live video (webm, then mp4; poster webp) | yes |
| Hatch overlay, new dragon (`.hstage .born .dart`) | 160 px (about 238 tall) | live video | yes |
| Share card (`.sharecard .stage .dart`) | 170 px (about 253 tall) | live video | yes |
| Hoard grid tile (`.hd .dart`) | 72 px (about 107 tall) | still `<img>` of the `.webp` poster (`loading="lazy"`) | no |
| Empty prize slot (ghost) | `min(240px, 62vw)` | no media (CSS gradient only) | no |

At 240 CSS px on a 3× phone the video shows at 720 device px from a 480 px source, so it's upscaled 1.5×. That's acceptable for painterly art; just noting it.

| Stage file | `.webp` poster KB | `.webm` KB | `.mp4` KB |
|---|---|---|---|
| `cinder-1` | 26.4 | 631.1 | 574.7 |
| `cinder-2` | 25.2 | 616.4 | 601.0 |
| `cinder-3` | 28.2 | 830.8 | 770.2 |
| `cinder-4` | 58.5 | 1190.7 | 1118.2 |
| `inferno-1` | 32.1 | 666.4 | 616.0 |
| `inferno-2` | 29.5 | 808.9 | 739.4 |
| `inferno-3` | 25.7 | 743.0 | 677.3 |
| `inferno-4` | 34.1 | 942.0 | 858.9 |
| `brine-1` | 26.0 | 502.1 | 514.5 |
| `brine-2` | 24.9 | 512.7 | 502.0 |
| `brine-3` | 34.5 | 996.6 | 890.6 |
| `brine-4` | 56.2 | 1424.5 | 1208.5 |
| `voidling-1` | 18.7 | 360.3 | 372.3 |
| `voidling-2` | 22.8 | 636.0 | 603.9 |
| `voidling-3` | 32.6 | 888.0 | 762.6 |
| `voidling-4` | 38.6 | 957.9 | 890.3 |
| `stormling-1` | 25.0 | 624.6 | 588.5 |
| `stormling-2` | 25.6 | 623.0 | 583.3 |
| `stormling-3` | 24.0 | 562.7 | 539.1 |
| `stormling-4` | 33.9 | 564.8 | 633.4 |
| `moss-1` | 28.4 | 453.5 | 492.9 |
| `moss-2` | 24.5 | 584.8 | 544.6 |
| `moss-3` | 32.2 | 711.4 | 699.2 |
| `moss-4` | 35.6 | 593.3 | 617.9 |
| `tempest-1` | 20.6 | 488.1 | 465.4 |
| `tempest-2` | 25.6 | 552.0 | 515.2 |
| `tempest-3` | 23.3 | 639.6 | 598.0 |
| `tempest-4` | 28.3 | 822.5 | 751.2 |

All 84 are used by `index.html` through `stageSrc()` (`` `art/dragons/${line}-${si + 1}` `` + `.webp` / `.webm` / `.mp4`).
Note: the design bible targets 3–5 s loops at 720 × 1080. The shipped files are 6.04 s at 480 × 716. That's fine as is; it's just not what the bible says.

---

## 4. Usage summary

- **Used (147 of 148)**:
  - 27 by literal file name.
  - 120 through template paths:
    - `<dragon>_egg`, `<dragon>_nest`, `fill_<dragon>`, and `ember_0n` in the Nest code.
    - Every `art/dragons/*` file.
    - Every `stall`, `kiln`, and `roost` file.
- **Not used (1)**: `art/nest/fill_ready.webp`.
- **Used only in an edge case**: `art/nest/ring.webp` appears only when `prefers-reduced-motion: reduce` is on.
- **In the source kit but not in the repo** (add them only if a feature needs them):
  - `ring_front_mask` (optional front strands over the nest rim)
  - the 512 px ring sheet and `ring_spin.webm` (alpha video)
  - `tube_track_empty`, `fill_mask_capsule`
  - `portrait_full`, `ember_sheet_6x1`
  - `<egg>_on_nest_ready`, `<egg>_portrait`, `<egg>_shadow`
  - `cabinet_full`
  - the font files. Fonts are loaded from Google Fonts instead, which is fine.
