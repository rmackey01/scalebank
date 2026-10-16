# Keeper's Ledger UI assets

## Background
- `../ledger-v3.webp` — 1008×1792, clean parchment page (no baked UI). Original backup: `../../keep_ledger_old/ledger-v3.webp`.
- Writing area (clear of corner flourishes): x 235, y 140, w 597, h 1150.
- Full page interior: x 211, y 43, w 645, h 1346.
- Wooden board under the book (button row): about y 1425–1545.
- Header, title, rows, buttons and tab bar are NOT in the image; the app draws them.

## Portraits — `portraits/`
- Transparent lossless WebP, every file 144×112, pixel chunk 2 px, dragon centred horizontally, feet 3 px above the bottom edge. Scale by integer factors (NEAREST) to keep pixels crisp.
- Base breeds: `<breed>-<stage>.webp` — 28 files.
  - breeds: cinder, brine, voidling, inferno, moss, stormling, tempest
  - stages: hatchling, juvenile, adult, elder
  - source: `../sprites/pixel/<breed>-<stage>-still.webp` (curled pixel stills), shadow removed.
- Mutations: `<breed>-<mutation>-<stage>.webp` — 112 files.
  - mutations: moonlit, obsidian, gilded, aurora
  - source: `../sprites/mut/<breed>-<mutation>-<stage>-still.webp` (painted stills, re-pixelated to 2 px, 64 colours). Poses vary (some standing), unlike the curled base stills.

## Rarity wax seals — `seals/`
- `seal-<color>.webp`, 40×40 transparent, cut from the original ledger art: blue, purple, red, green, gold, brown, grey.
- The color→rarity mapping isn't defined in these assets; the app sets it.

## Rebuild
- `sprites_work/ledger_ui.py` (portraits + seals), `sprites_work/ledger_clean.py` (background).

## Kit pieces (cut from `keep_ledger_old/ledger-v3.webp` at full resolution, transparent lossless WebP)
| file | size | original position (x, y) | notes |
|---|---|---|---|
| `title.webp` | 580×122 | 255, 62 | "The Keeper's Ledger" + subtitle line with flourishes |
| `capital-T.webp` | 82×96 | 280, 188 | gold drop capital |
| `divider.webp` | 580×26 | 248, 786 | left + right flourish lines; the gap x 388–682 is transparent for the heading text |
| `star.webp` | 30×30 | 322, 482 | rating star (one per star) |
| `card-frame.webp` | 176×231 | 437, 288 | empty parchment Keep card (dragon/name/star painted out) |
| `card-empty.webp` | 176×231 | 635, 530 | dashed empty slot |
| `stall-frame.webp` | 144×172 | 229, 824 | empty arched Stables stall (dragon/name/seal/star removed, back wall rebuilt) |
| `btn-swap.webp` | 246×92 | 248, 1440 | label baked in |
| `btn-send.webp` | 310×92 | 506, 1440 | label baked in |
| `cross.webp` | 68×80 | 90, 1445 | gold cross icon on the wood bar |

## Original layout (1008×1792)
- Title block: y 62–184 (title glyphs ~y 70–140, subtitle ~y 145–180), centred on x ≈ 540.
- Capital T at (280,188); section heading "Roaming in the Keep (n/m)" left-aligned at x ≈ 372, baseline ≈ y 255, ~34 px.
- Keep grid: 3 columns, card 176×231, column x = 250 / 437 / 635 (gap ≈ 11–22 px), row y = 288 / 530 (gap 11 px).
  - In a card, the portrait sits at the top centre (~y+14), the name is centred at ~y+180 (~28 px), and the star is centred at ~y+196.
  - For 7 slots, a third row would end below the divider. Either scale cards to 0.8 (141×185), as the mock does, or scroll.
- Divider line: y ≈ 798 (strip 786–812), heading "Resting in the Stables" centred x ≈ 538, ~28 px.
- Stables grid: 4 columns, stall 144×172, column x = 229 / 381 / 532 / 684 (pitch ≈ 152), row y = 822 / 1007 / 1192 (pitch 185).
  - In a stall, the name is centred at ~y+140 in light text, the seal (40×40) sits at ~(x+100, y+120), and the star is on the bottom edge.
- Buttons: cross (90,1445), Swap (248,1440), Send to Keep (506,1440) on the wood board y ≈ 1425–1545.

## Suggested fonts (installed on the box, Google Fonts)
- Title (if re-typeset): **Pirata One** or **UnifrakturCook** (blackletter); the kit's title.webp already has it baked in.
- Headings, names, body: **IM Fell French Canon** / **IM Fell English** (old-style serif, matches the original lettering). Small caps: **IM Fell English SC**.
- Numbers/UI accents: **Cinzel**.
- Text colours: dark ink #342214 on parchment; cream #F0E4C8 on wood.

## Mock
- `out/ledger-kit-mock.jpg`: original on the left, re-composed from the kit on the right (7 Keep cards at 0.8 scale, 8 stalls). Rebuild with `sprites_work/ledger_mock.py`. The stall piece is rebuilt with `sprites_work/ledger_kit_stall.py` and the other pieces with `sprites_work/ledger_kit.py`.

## Full-width background (current `../ledger-v3.webp`)
- 1008×1792, made by `sprites_work/ledger_wide.py` with no AI generation. The narrow version is backed up at `keep_ledger_old/ledger-v3-narrow.webp`.
- 0–92: dark strip for the app header.
- Gold-studded book-cover frame, 22 px thick: outer edge x 0–1008, y 92–1446.
- Parchment page interior: x 22, y 114, w 964, h 1310 (to y 1424). Corner flourishes are scaled 1.4× and sit about 105×123 px in each corner.
- Writing area (clear of flourishes): x 40, y 130, w 928, h 1280. Keep the rows between the corner flourishes, or inset to x 140–868, at y < 245 and y > 1300.
- Wooden board for Swap/Send: y 1458–1574, full width.
- 1580+: dark strip for the tab bar.

## Suggested scale at the full width (matches the other tabs)
| piece | scale | size | layout |
|---|---|---|---|
| title.webp | 1.3 | 754×159 | centred, y 124 |
| capital-T.webp | 1.3 | 107×125 | (60, 292), with the heading text at x ≈ 181, 46 px |
| card-frame / card-empty | **1.65** | 290×381 | 3 columns, x = 53 / 359 / 665, gap 16 |
| portraits (in cards) | 2× NEAREST | 288×224 | top-centre of the card, +24 px |
| card name / star | 44 px font / star 1.5× | — | name at card bottom −76, star at −50 |
| divider.webp | 1.6 | 928×42 | centred, heading 44 px |
| stall-frame.webp | **1.5** | 216×258 | 4 columns, x = 54 / 282 / 510 / 738, gap 12 |
| portraits (in stalls) | 1.5× NEAREST | 216×168 | |
| seals | 1.5 | 60×60 | (x+146, y+180) |
| btn-swap / btn-send / cross | 1.0–1.25 | 246×92 / 310×92 / 68×80 | on the board, y ≈ 1470 |
- Two rows of cards fill the page to about y 1220. With 7 Keep dragons plus the Stables, the content inside the page interior (y ≈ 420–1420) must scroll. The title and heading can stay fixed.
- Mock: `out/ledger-wide-mock.jpg` (original on the left, new full-width layout on the right), built by `sprites_work/ledger_wide_mock.py`.
