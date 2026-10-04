# Bugs (from App Tester)

Claude Code: fix entries marked **open**. When you fix one, change its status to **fixed** and add a one-line note on what you changed. Don't delete entries; App Tester will retest and either close them or reopen them.

Last tested: Oct 3, 2026, live artifact build (before the repo existed).

---

## B1. Nest only gives one egg an accessible name when two are warming
- **Status:** open
- **Severity:** medium (accessibility)
- **Steps:** Fresh run → Bank: tap +2,000 and +10,000 → Vendors: buy Ember Egg, then Tide Egg → open Nest.
- **Expected:** Each egg in the Nest has its own accessible name and status (e.g. `aria-label="Tide Egg, warming, 1,200 steps to hatch"`).
- **Actual:** Both eggs are drawn, and the summary text says "2 eggs warming," but only Ember Egg is named in the accessible text. Tide Egg has no name or status.
- **Fix hint:** Generate the label per egg inside the loop that renders Nest slots, rather than once for the first egg.

## B2. Nest board scrolls both horizontally and vertically inside a narrow column
- **Status:** open
- **Severity:** low (layout)
- **Steps:** Open Nest with 2+ eggs on a desktop-width window (1280px wide).
- **Expected:** The whole egg board fits without inner scrollbars, or scrolls in one direction only.
- **Actual:** The board has both scrollbars inside a narrow center column, with large empty margins left and right.
- **Note:** Animator's `handoff/nest-spec.md` defines the intended layout. Follow it, and this should go away.

## B3. Two-tap confirm isn't explained until after the first tap
- **Status:** open
- **Severity:** low (UX)
- **Steps:** Vendors → tap any affordable item once. Separately: tap "Reset to first run" once.
- **Expected:** It's clear before tapping that a second tap is needed, and the reset (which wipes all progress) looks clearly destructive.
- **Actual:** "Tap again to buy" / "Tap again to wipe everything and start at 0" only appear after the first tap. The reset button looks like any other button.
- **Fix hint:** Give the reset a red/danger style, and give the armed state a visible change (color + label) that times out after ~3 s.

---

## Not a bug (for reference)
- **First +2,000 click giving only 10 spendable steps:** reported once. It didn't reproduce in 4 tries (2 from reset, 2 first visits in a private window). Every first click added exactly 2,000. Reopen if it happens again.
- **Console 403 on `claude.ai/api/account`:** comes from the claude.ai artifact wrapper on page load, not from this app. Ignore.

## Testing request
- **Debug panel (requested):** a hidden panel (e.g. `?debug=1`) to set step count, time of day, and streak length directly. Needed so late-game stages, growth reveals, and future night-step/streak overlays can be tested without tens of thousands of taps.
