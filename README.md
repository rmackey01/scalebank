# Scale Bank

A mobile-first pedometer game. Walk to bank steps, spend them at the vendors on eggs and trails,
and hatch and grow dragons in your Nest. The bank never expires.

- `index.html`: the whole game in one file (vanilla JS, saves to `localStorage` under `scalebank.v1`)
- `art/dragons/`: stage loops for the seven dragon lines (WebM, MP4 fallback, WebP poster)
- `art/nest/`: the Nest screen asset pack
- `art/stall|kiln|roost.*`: vendor scene videos

To run it locally, serve the folder and open it in a browser, e.g. `python3 -m http.server`.
Until real step tracking is added, the step buttons on the Walk screen stand in for walking.
