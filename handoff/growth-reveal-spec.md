# Scale Bank: Growth reveal spec (build sheet)

For Claude Code, working in the public repo `rmackey01/scalebank` (one file: `index.html`). Source checked: `https://raw.githubusercontent.com/rmackey01/scalebank/main/index.html` (1,065 lines, fetched 2026-10-04 00:41 CT). Line numbers below refer to that file.
Rule: if a number isn't here, don't guess. Ask, or leave a TODO. Don't change the stage thresholds, the step buttons or the save format beyond what this file says.

**Status today:** only the 7 Hatchling → Juvenile reveals exist (`art/reveals/<line>-h2j.*`). Juvenile → Adult (`j2a`) and Adult → Elder (`a2e`) files will be added later **with the same naming**. The code must:
- play a reveal when its files exist,
- fall back to the **current stage-up behaviour** (the toast plus the Dragon-screen grow-in, unchanged) when they don't,
- pick up new files automatically, with no code change, once they're committed.

---

## 1. Stage thresholds (from index.html, do not change)

`index.html` line 420:
```js
const STAGES = [{name:"Hatchling", at:0}, {name:"Juvenile", at:30000}, {name:"Adult", at:120000}, {name:"Elder", at:400000}];
```
- The stage comes from the dragon's own `d.xp` (line 454: `stageIdx(d)` returns the highest `k` with `d.xp >= STAGES[k].at`).

| Stage-up | Triggers when `d.xp` goes from | Reveal key |
|---|---|---|
| Hatchling → Juvenile | `< 30,000` to `>= 30,000` | `h2j` |
| Juvenile → Adult | `< 120,000` to `>= 120,000` | `j2a` |
| Adult → Elder | `< 400,000` to `>= 400,000` | `a2e` |

- Only the **prize dragon** gains xp. It happens in `addSteps(n)` (line 866): `p.xp += n`, for `p = prizeDragon()`.
- Steps are added only by the two Bank buttons, `+2,000` and `+10,000` (lines 338–339, `data-act="add"`).
- The smallest gap between thresholds is 30,000, so **with today's buttons one add can never cross two stages**. The multi-stage case (§10) still has to be built for future real step sync and for a debug panel (`bugs.md` line 40). The smallest add that crosses two stages is:

| Jump | Smallest add |
|---|---|
| Hatchling → Adult | 90,001 |
| Juvenile → Elder | 280,001 |
| Hatchling → Elder | 370,001 |

Transition key for "grew into stage `k`": `const REVEAL_KEY = [null, "h2j", "j2a", "a2e"]; // index = new stage`.

---

## 2. Files (repo paths)

Folder `art/reveals/`, alongside the existing `art/dragons/`. Naming:
```
art/reveals/<line>-<key>.webm          VP9 + Opus, 720×1280, 24 fps
art/reveals/<line>-<key>.mp4           H.264 High + AAC, 720×1280, 24 fps, faststart
art/reveals/<line>-<key>-poster.webp   720×1280, the video's LAST frame (new stage + payoff card)
```
- `<line>` is one of `cinder, brine, moss, inferno, stormling, voidling, tempest` (the keys of `DRAGONS`).
- `<key>` is `h2j | j2a | a2e`.
- Sizes are about 2–4 MB per video.

In the repo now:

| Line | `-h2j.mp4` | `-h2j.webm` | `-h2j-poster.webp` |
|---|---|---|---|
| brine | 2,278,084 B | 2,495,990 B | 44,456 B |
| cinder | 2,879,857 B | 3,231,681 B | 48,678 B |
| inferno | 2,239,611 B | 2,462,814 B | 48,568 B |
| moss | 1,930,144 B | 2,217,713 B | 45,156 B |
| stormling | 3,317,641 B | 4,071,396 B | 42,858 B |
| tempest | 1,972,317 B | 1,896,989 B | 47,442 B |
| voidling | 1,939,926 B | 1,984,341 B | 45,570 B |

Not there yet: all `-j2a.*` and `-a2e.*` (14 sets).

```js
function revealSrc(line, key){ return `art/reveals/${line}-${key}`; }   // + ".webm" / ".mp4" / "-poster.webp"
```

### 2.1 Is a reveal available? (runtime check, no hard-coded list)
```js
const REVEAL_OK = new Map();           // "line-key" -> Promise<boolean>, per session
function revealAvailable(line, key){
  const id = `${line}-${key}`;
  if (!REVEAL_OK.has(id)) REVEAL_OK.set(id,
    fetch(`${revealSrc(line, key)}-poster.webp`, {method: "HEAD", cache: "no-cache"})
      .then(r => r.ok).catch(() => false));
  return REVEAL_OK.get(id);
}
```
- The poster is the existence check because it's tiny and always ships with the two videos.
- If the check doesn't resolve within **1,500 ms**, treat the reveal as unavailable (§11).

---

## 3. When it triggers, and what happens after

Change `addSteps(n)` (line 866) to this. The behaviour is the same except for the reveal branch.
```js
function addSteps(n){
  S.bank += n; S.lifetime += n;
  const msgs = [], p = prizeDragon();
  let grow = null;
  if (p){
    const was = stageIdx(p); p.xp = (p.xp || 0) + n;
    const now = stageIdx(p);
    if (now > was) grow = {d: p, was, now};
  }
  save(); render();                       // bank count-up and new stage are saved first
  if (grow) startGrowth(grow, msgs);      // may play the reveal (§4) or fall back (§11)
  else { if (msgs.length) toast(msgs.join(" ")); autoHatch(); }
}
```
- `startGrowth({d, was, now})`:
  - Picks `key = REVEAL_KEY[now]`.
  - Awaits `revealAvailable(d.line, key)` (max 1,500 ms).
  - If true, opens the reveal overlay (§4).
  - If false, runs the **fallback**: `toast(`${d.name} grew into ${an(STAGES[now].name)}.`)` (the exact current message), then `autoHatch()`. This is the existing stage-up behaviour, and the Dragon screen still shows its `grow-in` and "Grew into…" note on the next visit (lines 806–815). Don't touch `seenStage` in the fallback.
- The reveal starts **immediately after the step add**, on whatever screen is showing (in practice the Bank tab). There's no delay and no toast while it plays.
- **While the reveal is open:**
  - Don't call `autoHatch()`. Eggs that came due wait.
  - The `+2,000` / `+10,000` buttons sit under the overlay and can't be reached.
- **After the reveal closes** (Continue, or Escape when allowed, §8):
  1. `d.seenStage = now;` so the Dragon screen doesn't play its grow-in a second time.
  2. Mark seen (§9), `save()`.
  3. Hide and empty the overlay, pause and unload the video (`video.removeAttribute("src"); video.load()`).
  4. `render()`. The user is back on the same tab they were on. Every `dragonArt()` already uses `stageIdx(d)`, so the dragon art now shows the new stage everywhere: Dragon screen, hoard, share card.
  5. `autoHatch()` (runs any egg hatches that came due in the meantime).
  6. Return focus to the button that added the steps, if it's still in the DOM.

---

## 4. Overlay and video element

Add a third overlay next to `#hatchOv` / `#shareOv` (lines 370–371):
```html
<div class="overlay reveal-ov" id="revealOv" hidden></div>
```
CSS: keep `.overlay` (line 241). Add:
```css
.reveal-ov{padding:0;background:#03060B;backdrop-filter:none;z-index:30}
.rv-frame{position:relative;overflow:hidden}            /* exact 9:16 box, sized by JS */
.rv-frame video,.rv-frame .rv-still{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block}
.rv-hit{position:absolute;inset:0;background:none;border:0;padding:0;cursor:pointer}  /* tap-to-skip layer */
```
Markup (built when the overlay opens):
```html
<div class="rv-frame" role="dialog" aria-modal="true" aria-label="{Name} grew into {a/an} {Stage}">
  <video muted playsinline autoplay preload="auto" disablepictureinpicture
         poster="art/reveals/{line}-{key}-poster.webp">   <!-- no loop, no controls -->
    <source src="art/reveals/{line}-{key}.webm" type="video/webm">
    <source src="art/reveals/{line}-{key}.mp4"  type="video/mp4">
  </video>
  <button class="rv-hit" aria-label="Skip to the result"></button>
  <div class="rv-card" hidden>…live payoff card (§7)…</div>
  <button class="rv-continue" hidden>Continue</button>
  <p class="sr-only" aria-live="polite">{Name} grew into {a/an} {Stage}.</p>
</div>
```
**Sizing (JS, on open and on `resize`).** Every position in this spec is in **frame px**, on a 1080 × 1920 reference frame. Convert with:
```js
const k = Math.min(ov.clientWidth / 1080, ov.clientHeight / 1920);
frame.style.width = `${1080 * k}px`; frame.style.height = `${1920 * k}px`;
// a frame-px value v is placed at v * k CSS px; percentages: left% = x/1080*100, top% = y/1920*100
```
- The 720 × 1280 files are exactly 1080 × 1920 scaled by 2/3, so frame px map straight onto the video.
- The overlay's leftover area stays `#03060B`. The video's own edges are near-black, so the letterbox doesn't show.

---

## 5. Playback

- **Muted autoplay** with `playsinline` (as above). Call `video.play()` after inserting it. If the promise rejects, show the still path (§6), not an error.
- **Sound:** none. `index.html` has no audio anywhere (no `<audio>`, no `new Audio`, no sound setting), so the reveal stays muted with no sound toggle. The files carry an audio track. Leave it muted. Only add an unmute path if the app gets sound in the future (TODO, not now).
- **No looping.** When the video ends, it holds on its last frame. That frame is the same picture as the poster.
- **Visibility:** if `document.hidden` becomes true while playing, `pause()`; when visible again, `play()`.
- **Load guard:** if `loadeddata` hasn't fired within **4,000 ms** of opening, or both `<source>`s error, close the overlay and run the fallback (§11).

---

## 6. Reduced motion

If `matchMedia("(prefers-reduced-motion: reduce)").matches` when the reveal starts:
- Don't create the `<video>`. Put `<img class="rv-still" src="art/reveals/{line}-{key}-poster.webp" alt="">` in the frame.
  - The poster is the last frame: the new-stage card plus the payoff panel. It doubles as the reduce-motion still, so there's no separate still file.
- Show the live payoff card (§7) **in its final state, with no slide and no fade**, and the Continue button (§8), immediately.
- No skip layer is needed.
- This is the same check `index.html` already uses (lines 521, 564, 617, 719, 626).
- Same still path if `video.play()` rejects (§5).

---

## 7. Timeline (video time, seconds)

These come from the render script's timeline (`growth_reveal.py`). Normal = `h2j` and `j2a`; Elder = `a2e`.
- The Elder version stretches the cocoon build, so **every event after 4.6 s is later by `shift`**.
- Compute `shift` from the file, so the code doesn't care which version it got:
```js
const shift = video.duration > 14.5 ? video.duration - 14.0 : 0;   // h2j/j2a ≈ 0; a2e ≈ 1.45
const T = x => x + (x > 4.6 ? shift : 0);
```

| Event | Normal (s) | Elder ≈ (s) | Use |
|---|---|---|---|
| Video length | 14.0 | 15.45 | `ended` → hold last frame |
| Burst (white flash) | 6.10 | 7.55 | `T(6.10)`: **skip unlocks here on a first viewing** (§9) |
| New card fully visible | 6.30 | 7.75 | |
| Card starts shrinking up | 9.80 | 11.25 | |
| Card finishes shrinking | 10.35 | 11.80 | |
| Payoff panel slides in (baked) | 10.25 → 10.85 | 11.70 → 12.30 | live card follows it (§7.2) |
| Baked panel text starts appearing | 10.70 | 12.15 | the live card must already cover the panel |
| Continue button (baked) fades in | 12.45 → 12.90 | 13.90 → 14.35 | enable the real button at `T(12.45)` |
| **Payoff ready** | **12.95** | **14.40** | **skip target**: `video.currentTime = T(12.95)` |

Elder values assume duration 15.45 s. Always use `T()`, not the Elder column.

### 7.1 Why there's a live payoff card

The videos bake a payoff panel that contains **example data**: "12,400 steps walked together" (j2a uses 121,400 and a2e 402,000) and a "+15% Scale yield" chip. The app has no such reward, and the step count is fake. The baked panel also always reads one stage to the next, which is wrong for multi-stage jumps (§10).

So the app draws its own **opaque payoff card exactly over the baked panel**, with real data. The baked panel is never visible once it lands.

### 7.2 Live card rectangle (frame px) and motion

- Baked panel canvas: `x = 36, width = 1008`, `top = 1724 − panelH`, `bottom = 1760`.
- Draw the live card at exactly that rect.
- Background: `art/nest/info_card_panel.webp` as a 9-slice, `border-image: url(art/nest/info_card_panel.webp) 132 fill / {121.85*k}px` (the same slice as `nest-spec.md` §9; the width is in frame px × k).

| File | `panelH` (frame px) | Live card top (frame px) |
|---|---|---|
| cinder, brine, moss, voidling, stormling `-h2j` | 600 | 1124 |
| inferno, tempest `-h2j` | 640 | 1084 |
| all `-j2a` except tempest | 600 | 1124 |
| tempest `-j2a` | 640 | 1084 |
| moss `-a2e` | 636 | 1088 |
| cinder, inferno, brine, stormling `-a2e` | 672 | 1052 |
| voidling `-a2e` | 680 | 1044 |
| tempest `-a2e` | 720 | 1004 |

Put this table in code as `PANEL_H[line + "-" + key]`. A key that's missing defaults to 600.

**Motion:** the card moves in lockstep with the baked slide.
- Start at video time `T(10.25)`. Watch it with `requestVideoFrameCallback`, falling back to `timeupdate` plus rAF.
- Animate `transform: translateY(d) → 0` over **600 ms** with `cubic-bezier(0.215, 0.61, 0.355, 1)` (easeOutCubic). `d = (2280 − (1742 − panelH/2)) * k` px.
- Opacity goes `0 → 1` over the first **375 ms**.
- On skip or reduced motion, show it in its final state with no animation.

### 7.3 Live card contents (frame px, relative to `top = 1742 − panelH`, x centred on 540 unless stated)

| Item | Position | Content / style |
|---|---|---|
| From portrait | centre (290, top+130), 210 × 210 | `art/nest/portrait_backing.webp`, then `stageSrc(line, was) + ".webp"` (line 516, i.e. `art/dragons/{line}-{was+1}.webp`) clipped to a circle of diameter 191, then `art/nest/portrait_frame.webp` |
| To portrait | centre (790, top+130), 210 × 210 | same, with `stageSrc(line, now) + ".webp"` |
| Arrow | centre (540, top+130), 170 × 64 | three gold chevrons (inline SVG), gradient `#FFE6A0` → `#F3C859` → `#C68A30` |
| From label | centre (290, top+258) | `STAGES[was].name`, uppercase, Lato 700, 24, letter-spacing 4, `#C3B197` |
| To label | centre (790, top+258) | `STAGES[now].name`, uppercase, Lato 700, 24, letter-spacing 4, `#EECA74` |
| Change line | first line centred at top+330; next lines +40 (or +36 at size 28) | text from §7.4, Lato 400, `#EDEDEA`. Size 31; use size 28 for the files whose `panelH` is 636 or 672. Break only at " · ". Use the line count implied by `panelH`: (panelH − 600)/40 + 1 at size 31, (panelH − 600)/36 + 1 at size 28 |
| Divider | centre (540, top+380+extra), 760 wide | thin gold rule `#E1B567` with a centre diamond; `extra = panelH − 600` |
| Steps | centre (540, top+438+extra) | `{fmt(d.xp)}` in Cormorant Garamond 700, 56, `#F3C859`, then " steps walked together" in Cormorant Garamond 600, 46, `#F3DBA0` |
| Reward chip | none | the baked chip was example data. Leave this area empty |

All font sizes are frame px, so multiply by `k`. Fonts: `font-family:"Cormorant Garamond",var(--display)` and `font-family:"Lato",var(--body)`, the same stacks the Nest screen already uses (lines 173, 215).

### 7.4 Change line text (from `/workspace/dragons/design_bible.md`)

`a2e` lines are long and wrap as §7.3 says.

| Line | h2j | j2a | a2e |
|---|---|---|---|
| cinder | The body lengthens · The frill opens halfway | Full disc frill, long wick tail and wings | The frill is huge and edged with embers · The ash-crust is thick and the ember glow shows through deep cracks · The tail flame is steady and bright |
| inferno | Plates harden · The horns make half a curl · A stubby mace appears | Full armor, full ram curl and bright seams | Massive · Horns curl twice · Plates are cracked like a lava field and the back cones smoke constantly · The rock pedestal is scorched |
| brine | The body stretches into an S · The crest fin grows | Full fin-wings and long barbels | Very long trailing barbels and a few barnacles and coral crusting on the shoulders · Fins are ragged and frilly · The rock is wet with seaweed |
| moss | Antlers branch once · Ferns appear · The leaf wings unfurl | Full antler crown and a mossy shell with flowers | Antlers become a small tree canopy with birds’ nests and blossoms · The shell is a tiny landscape with mushrooms · Roots grip the pedestal |
| tempest | Long legs · Horns fork once · Wings now outgrow the body · Markings reach the shoulders | Double-forked horns · Huge tattered wings held high · Markings cover the whole body | Horns branch three or more times into a lightning crown · Wing membranes are scorched and torn · Markings glow constantly · A beard of thin crackling filaments · The tallest dragon in the roster |
| voidling | Lengthens and gets slinkier · The first constellations appear | Full cloak wings and crisp constellations | Wing edges fray into living smoke · Constellations cover the body · The eyes glow faintly in the dark |
| stormling | Wings straighten · The second streamer grows | Full four-wing “X” · Long streamers | Streamers become long and trailing · The wings have a stained-glass shimmer and the fins look like lace · A small swirl of cloud orbits it |

For multi-stage jumps, use the line for the **destination** stage (the column of the reveal that plays).

---

## 8. Continue and closing

- Real `<button class="rv-continue">Continue</button>` placed exactly over the baked button:
  - Frame px `x 240, y 1766, w 600, h 108`, which is `left 22.222%, top 91.979%, width 55.556%, height 5.625%`.
  - Transparent background, no border, the text visually hidden. The baked gold button shows through.
  - Visible focus ring: `outline: 2px solid var(--gold-hi); outline-offset: 4px; border-radius: 54px`.
- **Enable it** (remove `hidden`) at video time `T(12.45)`, at once on skip or reduced motion, or on `ended`. Move focus to it.
- **Activating Continue closes the reveal** (§3 "after the reveal closes").
- **Escape:**
  - Acts as skip when skip is allowed (§9).
  - Once the payoff is ready, acts as Continue.
  - Add it to the existing `keydown` handler (line 1013), checked before the share and hatch overlays.
- Taps outside the Continue rect **after** the payoff is ready do nothing.

---

## 9. Tap to skip, and "seen" tracking

- **Skip:** tapping anywhere (the `.rv-hit` layer) jumps to the payoff:
  - `video.currentTime = T(12.95)`
  - live card in its final state
  - Continue enabled
  - `video.play()` (it runs on to the end and holds).
  - Once the payoff is ready, remove `.rv-hit` (or set `pointer-events:none`).
- **First viewing:**
  - Skip is **ignored** until `video.currentTime >= T(6.10)` (the burst).
  - Before that, a tap does nothing. No feedback, no cursor change.
- **Replay** (this dragon has already seen this reveal): skip works from the first frame.
- **Data:** store on the dragon object, which persists through the existing `save()`:
```js
d.reveals = d.reveals || {};          // e.g. {h2j: true}
const seen = !!d.reveals[key];        // read when the reveal opens
// mark seen: d.reveals[key] = true when the payoff is reached (T(12.95), skip, or reduced-motion open) or on close, whichever comes first
```
- "Seen" is per dragon **instance** (`d.id`) per transition. Two Cinders track separately.
- `migrate()` (line 1032): add `if (!d.reveals) d.reveals = {};`.
- `hatch()` (line 926): new dragons start with `reveals: {}`.
- **Replay entry.** Without one, "replays" can't happen.
  - On the Dragon screen, inside `.growth` (line 819), when `si >= 1`, add a text button `<button class="reset" data-act="replay-reveal">Watch it grow again</button>`.
  - Show it only if `revealAvailable(p.line, REVEAL_KEY[si])` resolves true. Render it hidden, then unhide it.
  - It plays the reveal into the **current** stage: from `si − 1` to `si`.
  - It changes no state except `d.reveals[key] = true`.
  - Skip works at once if already seen.
  - Drop the button if Ryan doesn't want it. Everything else still works.

---

## 10. Multi-stage jump (one add crosses two or three stages)

- Play **only the newest reveal**: `key = REVEAL_KEY[now]` (for example Hatchling → Adult plays `<line>-j2a`).
- The live payoff card reads the **real span**:
  - From portrait and label use `was` (e.g. "HATCHLING").
  - To portrait and label use `now` (e.g. "ADULT").
  - The change line comes from the `now` column (§7.4).
  - The dialog `aria-label` and the sr-only text say "{Name} grew into an Adult." (the toast wording).
- Mark seen only `d.reveals[REVEAL_KEY[now]]`.
- `d.seenStage = now` on close.
- If the newest reveal's file doesn't exist, run the fallback (§11) with the same toast as today.
- **Known limitation:** the video's opening card shows the stage just before `now` (Juvenile for `j2a`), and its baked title is generic to the stage reached. That's accepted.

---

## 11. Fallback (the current behaviour)

Use the fallback when the poster check is false or times out (1,500 ms), when the video fails to load (4,000 ms or source errors), or when there's no file for the key:
- `toast(`${d.name} grew into ${an(STAGES[now].name)}.`)`, the exact current message from line 872.
- Don't change `d.seenStage`. The Dragon screen's existing grow-in and "Grew into …" note still run on the next visit.
- `autoHatch()`.

So today `j2a` and `a2e` stage-ups behave exactly as they do now. When `art/reveals/<line>-j2a.*` / `-a2e.*` are committed with the same naming, they start playing with no code change. The availability cache is per session, so a reload picks up new files.

---

## 12. Other cases

- **Share overlay or hatch overlay already open:** can't happen from the Bank buttons. If it ever does (debug panel), queue the reveal and start it when that overlay closes.
- **Prize changes or reset during a reveal:** can't happen, because the overlay covers the UI.
- "Reset to first run" while closed: `S = fresh()` drops all `d.reveals`. Fine.
- **Renamed dragons:** the live card, `aria-label` and toast use `d.name`. The video's baked texts say the **species** name ("Cinder is ready to grow!", "Cinder grew into a Juvenile!"). Known limitation, see §14.
- The baked **"TAP TO GROW"** prompt at 0.3–1.4 s autoplays past with no tap needed. The tap ripple at 1.0 s is part of the video. Don't pause on it.
- **Mutations and trails** (`d.mut`, `d.trail`) aren't shown in the reveal. The new art after close shows them as usual.

---

## 13. Test checklist (App Tester)

Set up with a fresh run (Reset), buy and hatch an Ember Egg so Cinder is the prize, then use the Bank buttons. For later stages, use a debug panel or edit `localStorage["scalebank.v1"]` (`dragons[i].xp`) and reload.

1. **Thresholds:**
   - At xp 28,000, press +2,000 → reveal `cinder-h2j` plays (xp 30,000 = Juvenile).
   - At xp 26,000, press +2,000 → no reveal, no toast (28,000).
2. **Autoplay:** fullscreen, muted, no controls. Plays inline on iOS Safari (no native fullscreen player) and on Android Chrome.
3. **First viewing, skip:** taps before the burst (~6.1 s) do nothing. A tap after the burst jumps straight to the payoff card with Continue showing.
4. **Replay:** Dragon screen → "Watch it grow again" → a tap at 1 s skips straight to the payoff.
5. **Seen tracking:**
   - After a first viewing, reload and replay: skip works immediately.
   - A second Cinder hatched later has its own `reveals` (skip locked on its first view).
6. **Live payoff card:**
   - The card lands exactly over the baked panel, with no baked text, "12,400" or "+15% Scale yield" visible at any moment, including during the slide.
   - The step number equals the dragon's real `xp`.
   - Check 1-line (`cinder-h2j`) and 2-line (`tempest-h2j`, `inferno-h2j`) panels.
7. **Continue:**
   - Disabled until ~12.45 s, then focusable, with a visible focus ring.
   - Closing returns to the Bank tab.
   - The Dragon tab shows the Juvenile art with **no** second grow-in or "Grew into" note.
8. **Escape:** before the burst on a first view, nothing. After the burst, skips. On the payoff, closes.
9. **Reduced motion** (OS setting on): the poster still shows at once with the live card and Continue. No video element in the DOM.
10. **Missing file (today):**
    - At xp 118,000, press +2,000 (Adult) → no overlay, the toast "Cinder grew into an Adult.", and the Dragon tab shows the existing grow-in.
    - Same at 398,000 → Elder.
11. **File added later:** with `art/reveals/cinder-j2a.*` present (local copy), the same test plays the reveal.
12. **Multi-stage** (debug: xp 25,000, add 100,000): plays `cinder-j2a`, and the live card reads HATCHLING → ADULT with the Adult change line. Toast-style text reads "grew into an Adult".
13. **Eggs:** an egg that comes due on the same add hatches **after** the reveal closes, not on top of it.
14. **Background:** switch apps mid-reveal → it pauses. Return → it resumes.
15. **Slow network** (DevTools "Slow 3G"):
    - If the video hasn't loaded in 4 s, the overlay closes and the toast shows (fallback).
    - The poster check times out at 1.5 s → fallback.
16. **Rotation and resize:** the frame stays 9:16, and the live card and Continue stay aligned with the video.
17. **All 7 lines:** each `-h2j` plays and its live card shows the right change line (§7.4).
18. **Screen reader:** opening announces "{Name} grew into a Juvenile". Continue is reachable and labelled.

---

## 14. Known limitations / open items

- **The baked species name** shows on the opening banner and the reveal title. A renamed dragon shows its species there, while the live card uses the real name. The render script can export text-free "app" variants (`growth_reveal.py --app`) if Ryan wants every name drawn live. That would be new files, so don't build it now.
- **Elder (`a2e`) times** come from the render script (duration ≈ 15.45 s). The code derives them from `video.duration` via `T()`, so it won't need changes. Re-check §7.2 alignment when the files land.
- **Example data** (steps 12,400 / 121,400 / 402,000; "+15% Scale yield") exists only inside the videos and the posters. The live card always covers it.
