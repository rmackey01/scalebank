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
