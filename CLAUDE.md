## Team handoff
Before starting any work, pull the latest and read the handoff/ folder:
- handoff/bugs.md: bugs from App Tester. Fix entries marked open, then change them to fixed with a one-line note. Never delete entries.
- handoff/nest-spec.md and other *-spec.md: art specs from Animator. Follow positions, sizes, colors, and layer order exactly. Don't improvise design.
- handoff/assets.md: which file in art/ goes on which screen.
- handoff/feature-*.md: approved features to build.
- handoff/ideas.md: brainstorm only. Never build from it unless Ryan says so.

## Debug URL params
Only active with `?debug=1`. For testing growth reveals and late-game states:
- `&xp=N` — Set the active/prize dragon's xp directly (e.g., `?debug=1&xp=29999` to trigger h2j reveal with +2,000)
- `&dragon=line` — Select which dragon to set as prize (e.g., `&dragon=voidling`)
- `&eggsteps=N` — Set all eggs' steps-left to exact value (e.g., `&eggsteps=1` to nearly hatch)

Threshold values for reveal testing: h2j at 30,000 xp, j2a at 120,000 xp, a2e at 400,000 xp.
