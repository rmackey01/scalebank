/* Keep ambient life: environment only (no dragon sprites are touched).
   Scene space is the Keep painting, 1008 x 1792 px. Everything is a pure function of time t (seconds),
   so frames are deterministic, loop-safe, and cost no state. No image assets except fog-tile.webp and the water masks.
   Layers (z-index inside #keepWorld; slots use drawOrder*2, fences use penFenceZ):
     back  z 1   water, glows, crystals, stars, smoke, fireflies   (under every dragon)
     ember z 5   embers over the ember pen   (same z as the ember fence, inserted BEFORE it so the fence paints on top)
     pond  z 15  mist over the pond pen       (same rule, before the pond fence)
     front z 40  rain, snow, fog, lightning   (over all dragons and fences) */
(function (root) {
  "use strict";
  const W = 1008, H = 1792, TAU = Math.PI * 2;
  const MAP = {
    water: {
      moonpool:  {file: "water-mask-moonpool.png",  x: 141, y: 744,  w: 269, h: 104, amp: 1.0, period: 4.2, glints: 22, ripples: 5},
      fountain:  {file: "water-mask-fountain.png",  x: 351, y: 898,  w: 278, h: 89,  amp: 1.4, period: 2.6, glints: 18, ripples: 4, churn: [470, 950]},
      waterfall: {file: "water-mask-waterfall.png", x: 444, y: 862,  w: 57,  h: 106, fall: 230, streaks: 14},
      pond:      {file: "water-mask-pond.png",      x: 125, y: 1446, w: 485, h: 113, amp: 1.2, period: 5.0, glints: 26, ripples: 8}
    },
    glows: [ // x, y, radius, rgb, strength, flicker speed. Additive. Forge glow is the .keep-forge.is-live light already in index.html.
      {id: "torch-hoardL",x: 183, y: 455,  r: 34, c: [255, 170, 70],  a: .40, f: 2.6},
      {id: "torch-hoardR",x: 735, y: 420,  r: 34, c: [255, 170, 70],  a: .40, f: 2.3},
      {id: "torch-nest",  x: 378, y: 182,  r: 30, c: [255, 170, 70],  a: .36, f: 2.9},
      {id: "candle-libL", x: 552, y: 765,  r: 28, c: [255, 190, 90],  a: .38, f: 3.1},
      {id: "candle-libR", x: 895, y: 790,  r: 28, c: [255, 190, 90],  a: .38, f: 2.7},
      {id: "lantern",     x: 297, y: 1215, r: 40, c: [255, 180, 80],  a: .42, f: 2.2},
      {id: "orb-towerR",  x: 650, y: 100,  r: 20, c: [255, 200, 110], a: .25, f: .9},
      {id: "orb-towerL",  x: 289, y: 88,   r: 18, c: [255, 200, 110], a: .22, f: .8}
    ],
    crystals: [ // slow breathing glow, period s
      {x: 625, y: 785, r: 22, c: [180, 90, 255], p: 5.0}, {x: 597, y: 810, r: 18, c: [180, 90, 255], p: 6.2},
      {x: 855, y: 840, r: 22, c: [180, 90, 255], p: 5.6}, {x: 908, y: 758, r: 16, c: [180, 90, 255], p: 4.6},
      {x: 165, y: 760, r: 26, c: [90, 170, 255],  p: 5.4}, {x: 300, y: 755, r: 26, c: [90, 170, 255], p: 6.0},
      {x: 165, y: 1312, r: 20, c: [80, 170, 255], p: 4.8}, {x: 140, y: 1332, r: 16, c: [80, 170, 255], p: 5.8},
      {x: 190, y: 1362, r: 18, c: [80, 170, 255], p: 5.2}, {x: 596, y: 1468, r: 16, c: [80, 170, 255], p: 6.4}
    ],
    sparks: {x: 475, y: 575, w: 50, rise: 70, n: 7},                       // forge sparks
    smoke: [ {x: 475, y: 520, n: 4, rise: 70, s: 9}, {x: 183, y: 440, n: 2, rise: 40, s: 5}, {x: 735, y: 405, n: 2, rise: 40, s: 5} ],
    fireflies: [ {x: 130, y: 560, rx: 70, ry: 40, n: 4}, {x: 870, y: 610, rx: 80, ry: 50, n: 5},
                 {x: 120, y: 1200, rx: 60, ry: 30, n: 3}, {x: 380, y: 1440, rx: 220, ry: 30, n: 5}, {x: 760, y: 1010, rx: 70, ry: 40, n: 3} ],
    stars: {y0: 0, y1: 105, n: 34},
    embers: {x0: 70, x1: 370, y0: 1000, y1: 1100, rise: 110, n: 16},       // ember pen floor
    mist:   {x0: 130, x1: 620, y0: 1440, y1: 1560, n: 7},                  // pond pen
    fog:    {bands: [{y: 330, h: 300, v: 9, a: .40}, {y: 900, h: 320, v: -6, a: .34}, {y: 1380, h: 340, v: 12, a: .42}]}
  };
  /* Per weather variant. Names match fenceVariant(): v6 (night / weather off), sunny, overcast, rain, snow, storm, fog. */
  const WX = {
    v6:       {glow: 1.0, fire: 1, stars: 1,  ff: 1,  water: 1,   glint: 1,   ripple: 0,  rain: 0,   snow: 0,   fog: 0,   bolt: 0, mist: .8, ember: 1,  tint: [1, 1, 1]},
    sunny:    {glow: .65, fire: 1, stars: .6, ff: 0,  water: 1,   glint: 1.3, ripple: 0,  rain: 0,   snow: 0,   fog: 0,   bolt: 0, mist: .5, ember: 1,  tint: [1.08, 1.02, .9]},
    overcast: {glow: .9,  fire: 1, stars: 0,  ff: .8, water: .9,  glint: .7,  ripple: 0,  rain: 0,   snow: 0,   fog: 0,   bolt: 0, mist: 1,  ember: 1,  tint: [.92, .95, 1]},
    rain:     {glow: .8,  fire: .8,stars: 0,  ff: 0,  water: 1.2, glint: .6,  ripple: 1,  rain: 1,   snow: 0,   fog: 0,   bolt: 0, mist: 1.2,ember: .4, tint: [.82, .88, 1]},
    storm:    {glow: .75, fire: .7,stars: 0,  ff: 0,  water: 1.6, glint: .5,  ripple: 1.7,rain: 1.5, snow: 0,   fog: 0,   bolt: 1, mist: 1.2,ember: .3, tint: [.68, .72, .9]},
    snow:     {glow: 1.0, fire: 1, stars: 0,  ff: 0,  water: .35, glint: .8,  ripple: 0,  rain: 0,   snow: 1,   fog: 0,   bolt: 0, mist: .6, ember: .6, tint: [.9, .95, 1.08], slow: 3},
    fog:      {glow: .85, fire: .9,stars: 0,  ff: .4, water: .8,  glint: .5,  ripple: 0,  rain: 0,   snow: 0,   fog: 1,   bolt: 0, mist: 1.6,ember: .8, tint: [.92, .94, .97]}
  };
  // ---- deterministic helpers ----
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const fr = v => v - Math.floor(v);
  const snap = v => Math.round(v / 3) * 3;               // 3 px art grid
  const rgba = (c, a, k) => "rgba(" + (c[0] * (k ? k[0] : 1) | 0) + "," + (c[1] * (k ? k[1] : 1) | 0) + "," + (c[2] * (k ? k[2] : 1) | 0) + "," + a.toFixed(3) + ")";
  const flick = (t, f, s) => .82 + .1 * Math.sin(t * f * 6.1 + s) + .06 * Math.sin(t * f * 13.7 + s * 2) + .04 * Math.sin(t * f * 27.3 + s * 3);
  function glow(ctx, x, y, r, c, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(c, a)); g.addColorStop(.45, rgba(c, a * .45)); g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // ---- assets ----
  function loadAssets(base, done) {
    const A = {masks: {}, fog: null}; let left = 1 + Object.keys(MAP.water).length;
    const one = () => { if (--left === 0 && done) done(A); };
    const img = (src, set) => { const i = new Image(); i.onload = () => { set(i); one(); }; i.onerror = one; i.src = base + src; };
    img("fog-tile.webp", i => A.fog = i);
    Object.keys(MAP.water).forEach(k => img(MAP.water[k].file, i => A.masks[k] = i));
    return A;
  }
  const scratch = {};
  function buf(k, w, h) { let c = scratch[k]; if (!c) { c = scratch[k] = document.createElement("canvas"); } if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return c; }
  // ---- water: surface wobble resampled from the live background, glints, rain ripples. Masked to the water. ----
  function drawWater(ctx, t, wx, bg, A) {
    const slow = wx.slow || 1;
    Object.keys(MAP.water).forEach(k => {
      const b = MAP.water[k], mask = A.masks[k]; if (!mask) return;
      const c = buf("w" + k, b.w, b.h), g = c.getContext("2d");
      g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, b.w, b.h);
      if (b.fall) {                                  // waterfall: falling light streaks
        if (bg) g.drawImage(bg, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
        for (let i = 0; i < b.streaks; i++) {
          const sx = snap(hash(i + 3) * b.w), len = 12 + hash(i + 9) * 18;
          const y = fr(t * b.fall / slow / (b.h + 40) + hash(i + 17)) * (b.h + 40) - 20;
          g.fillStyle = rgba([225, 248, 255], .35 * wx.water, wx.tint); g.fillRect(sx, y, 3, len);
        }
      } else {
        if (bg) {                                    // gentle surface movement: 3 px rows shifted by a slow sine
          const amp = b.amp * wx.water, ph = TAU * t / (b.period * slow);
          for (let y = 0; y < b.h; y += 3) {
            const dx = amp * Math.sin(ph + y * .19) + amp * .5 * Math.sin(ph * 1.7 - y * .07);
            g.drawImage(bg, b.x, b.y + y, b.w, 3, dx, y, b.w, 3);
          }
        }
        g.globalCompositeOperation = "lighter";
        const n = Math.round(b.glints * wx.glint);   // twinkling glints, each lives on its own 2-5 s cycle
        for (let i = 0; i < n; i++) {
          const per = (2 + hash(i * 7 + b.x) * 3) * slow, cyc = Math.floor((t + hash(i) * per) / per);
          const ph = fr((t + hash(i) * per) / per), on = Math.pow(Math.sin(Math.PI * ph), 6);
          const gx = snap(hash(i * 13 + cyc * 3.1 + b.y) * b.w), gy = snap(hash(i * 29 + cyc * 5.3 + b.x) * b.h);
          g.fillStyle = rgba([200, 240, 255], .55 * on, wx.tint); g.fillRect(gx, gy, 3, 3);
          if (on > .6) { g.fillStyle = rgba([200, 240, 255], .25 * on, wx.tint); g.fillRect(gx - 3, gy, 9, 3); }
        }
        g.globalCompositeOperation = "source-over";
        const rn = Math.round(b.ripples * wx.ripple * 2);   // raindrop rings: 0.9 s each
        for (let i = 0; i < rn; i++) {
          const life = .9, off = hash(i * 3.3 + b.w) * life, cyc = Math.floor((t + off) / life), p = fr((t + off) / life);
          const rx0 = hash(i * 11 + cyc * 1.7 + b.h) * b.w, ry0 = hash(i * 17 + cyc * 2.9 + b.w) * b.h;
          g.strokeStyle = rgba([210, 235, 255], .5 * (1 - p), wx.tint); g.lineWidth = 2;
          g.beginPath(); g.ellipse(rx0, ry0, 2 + p * 11, (2 + p * 11) * .38, 0, 0, TAU); g.stroke();
        }
        if (b.churn) {                               // foam where the waterfall lands
          for (let i = 0; i < 6; i++) {
            const p = fr(t * .9 / slow + i / 6), r = 6 + p * 22;
            g.strokeStyle = rgba([220, 245, 255], .35 * (1 - p) * wx.water, wx.tint); g.lineWidth = 2;
            g.beginPath(); g.ellipse(b.churn[0] - b.x, b.churn[1] - b.y, r, r * .35, 0, 0, TAU); g.stroke();
          }
        }
      }
      g.globalCompositeOperation = "destination-in"; g.drawImage(mask, 0, 0);
      ctx.drawImage(c, b.x, b.y);
    });
  }
  // ---- back layer ----
  function drawBack(ctx, t, wx, bg, A) {
    drawWater(ctx, t, wx, bg, A);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    if (wx.stars) for (let i = 0; i < MAP.stars.n; i++) {
      const x = snap(hash(i + 50) * W), y = snap(MAP.stars.y0 + hash(i + 90) * (MAP.stars.y1 - MAP.stars.y0));
      const on = .5 + .5 * Math.sin(t * (.8 + hash(i) * 1.6) + i * 2.1);
      ctx.fillStyle = rgba([235, 240, 255], .55 * on * on * wx.stars); ctx.fillRect(x, y, 3, 3);
    }
    MAP.glows.forEach((g, i) => glow(ctx, g.x, g.y, g.r * (.96 + .06 * flick(t, g.f, i)), g.c, g.a * wx.glow * flick(t, g.f, i * 1.3)));
    MAP.crystals.forEach((c, i) => glow(ctx, c.x, c.y, c.r, c.c, (.14 + .12 * Math.sin(TAU * t / c.p + i)) * wx.glow));
    const s = MAP.sparks;                           // forge sparks: rise and fade over 1.4 s
    for (let i = 0; i < s.n; i++) {
      const p = fr(t / 1.4 + hash(i + 7)), cyc = Math.floor(t / 1.4 + hash(i + 7));
      const x = snap(s.x + (hash(i + cyc * 3) - .5) * s.w + Math.sin(p * 5 + i) * 4), y = snap(s.y - p * s.rise);
      ctx.fillStyle = rgba([255, 200 - p * 120, 90 - p * 60], (1 - p) * .9 * wx.fire); ctx.fillRect(x, y, 3, 3);
    }
    ctx.restore();
    MAP.smoke.forEach((m, j) => {                    // soft grey wisps, 4.5 s lifetime
      for (let i = 0; i < m.n; i++) {
        const p = fr(t / 4.5 + i / m.n + j * .37), r = m.s * (1 + p * 1.6);
        const x = m.x + Math.sin(p * 4 + i + t * .3) * 6 + p * 8, y = m.y - p * m.rise;
        glow(ctx, x, y, r, [150, 145, 140], .16 * Math.sin(Math.PI * p) * wx.fire);
      }
    });
    if (wx.ff) { ctx.save(); ctx.globalCompositeOperation = "lighter";
      MAP.fireflies.forEach((z, j) => { for (let i = 0; i < z.n; i++) {
        const k = j * 10 + i, sp = .12 + hash(k) * .1;
        const x = z.x + z.rx * Math.sin(TAU * sp * t + hash(k + 1) * 9) * Math.cos(TAU * sp * .37 * t + k);
        const y = z.y + z.ry * Math.sin(TAU * sp * 1.31 * t + hash(k + 2) * 9);
        const on = Math.pow(.5 + .5 * Math.sin(TAU * t / (2.2 + hash(k + 3) * 2) + k), 3) * wx.ff;
        glow(ctx, x, y, 10, [200, 255, 120], .35 * on); ctx.fillStyle = rgba([235, 255, 170], .9 * on); ctx.fillRect(snap(x), snap(y), 3, 3);
      } }); ctx.restore(); }
  }
  // ---- pen layers ----
  function drawEmbers(ctx, t, wx) {
    const e = MAP.embers, n = Math.round(e.n * wx.ember);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) {
      const life = 2.6 + hash(i) * 1.8, p = fr(t / life + hash(i + 4)), cyc = Math.floor(t / life + hash(i + 4));
      const x = e.x0 + hash(i * 5 + cyc) * (e.x1 - e.x0) + Math.sin(p * 6 + i) * 7;
      const y = e.y0 + hash(i * 9 + cyc) * (e.y1 - e.y0) - p * e.rise;
      const a = Math.sin(Math.PI * Math.min(1, p * 1.4)) * .9;
      ctx.fillStyle = rgba([255, 170 - p * 100, 60 - p * 40], a); ctx.fillRect(snap(x), snap(y), 3, 3);
      glow(ctx, x + 1.5, y + 1.5, 7, [255, 120, 40], a * .25);
    }
    ctx.restore();
  }
  function drawMist(ctx, t, wx) {
    const m = MAP.mist;
    for (let i = 0; i < m.n; i++) {
      const x = m.x0 + fr(hash(i) + t * (.012 + hash(i + 2) * .01)) * (m.x1 - m.x0), y = m.y0 + hash(i + 5) * (m.y1 - m.y0);
      const r = 46 + hash(i + 8) * 40, a = (.07 + .05 * Math.sin(TAU * t / 7 + i)) * wx.mist;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, .38); glow(ctx, 0, 0, r, [210, 225, 235], a); ctx.restore();
    }
  }
  // ---- front layer ----
  function boltAt(t) { const per = 9, k = Math.floor(t / per), at = k * per + 1 + hash(k) * 5; return {dt: t - at, k}; }
  function drawFront(ctx, t, wx, A) {
    if (wx.rain) {
      const n = Math.round(200 * wx.rain), len = 20 + 8 * wx.rain, vx = .2 + .12 * wx.rain, sp = 1000 + 400 * wx.rain;
      ctx.strokeStyle = rgba([185, 205, 240], .3); ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const per = (H + 200) / sp, p = fr(t / per + hash(i)), y = p * (H + 200) - 100;
        const x = fr(hash(i + 31) + p * vx * (H + 200) / W) * (W + 60) - 30;
        ctx.moveTo(x, y); ctx.lineTo(x + len * vx, y + len);
      }
      ctx.stroke();
    }
    if (wx.snow) {
      for (let i = 0; i < 150; i++) {
        const sp = 40 + hash(i) * 45, per = (H + 40) / sp, p = fr(t / per + hash(i + 3)), y = p * (H + 40) - 20;
        const x = hash(i + 11) * W + Math.sin(t * (.6 + hash(i + 5) * .6) + i) * 12 + p * 30;
        const s = hash(i + 7) > .7 ? 6 : 3;
        ctx.fillStyle = rgba([245, 248, 255], .55 + .35 * hash(i + 9)); ctx.fillRect(snap(x), snap(y), s, s);
      }
    }
    if (wx.fog && A.fog) {
      MAP.fog.bands.forEach(b => {
        const tw = A.fog.width * (b.h / A.fog.height), off = fr(t * b.v / tw) * tw;
        ctx.globalAlpha = b.a * wx.fog;
        for (let x = -tw + off; x < W; x += tw) ctx.drawImage(A.fog, x, b.y - b.h / 2, tw, b.h);
        ctx.globalAlpha = 1;
      });
    }
    if (wx.bolt) {
      const {dt, k} = boltAt(t);
      if (dt >= 0 && dt < .6) {                      // double flash: 0-0.12 s, 0.2-0.32 s
        const f = dt < .12 ? 1 - dt / .12 : (dt > .2 && dt < .32 ? .6 * (1 - (dt - .2) / .12) : 0);
        if (f > 0) {
          ctx.fillStyle = rgba([210, 220, 255], .26 * f); ctx.fillRect(0, 0, W, H);
          let x = 620 + hash(k) * 240, y = 0; ctx.strokeStyle = rgba([240, 245, 255], .9 * f); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y);
          for (let s = 0; s < 6; s++) { x += (hash(k * 7 + s) - .5) * 36; y += 18; ctx.lineTo(snap(x), y); }
          ctx.stroke();
        }
      }
    }
  }
  /* Renders one layer at time t into ctx, which must already be scaled so 1 unit = 1 scene px. */
  function render(ctx, layer, t, variant, bg, A) {
    const wx = WX[variant] || WX.v6;
    if (layer === "back") drawBack(ctx, t, wx, bg, A);
    else if (layer === "ember") drawEmbers(ctx, t, wx);
    else if (layer === "pond") drawMist(ctx, t, wx);
    else if (layer === "front") drawFront(ctx, t, wx, A);
  }
  /* DOM mount for index.html. opts: {world, bg (the .keep-bg img), base ("art/keep/ambient/"), fenceZ: {ember, pond}} */
  function mount(opts) {
    const world = opts.world, base = opts.base || "art/keep/ambient/";
    const reduce = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const A = loadAssets(base);
    const boxes = {back: [0, 0, W, H], ember: [40, 860, 380, 260], pond: [110, 1360, 540, 220], front: [0, 0, W, H]};
    const z = {back: 1, ember: (opts.fenceZ && opts.fenceZ.ember) || 5, pond: (opts.fenceZ && opts.fenceZ.pond) || 15, front: 40};
    const cv = {};
    Object.keys(boxes).forEach(k => {
      const c = document.createElement("canvas"), b = boxes[k];
      c.className = "keep-amb keep-amb-" + k; c.setAttribute("aria-hidden", "true");
      Object.assign(c.style, {position: "absolute", pointerEvents: "none", zIndex: String(z[k]),
        left: b[0] / W * 100 + "%", top: b[1] / H * 100 + "%", width: b[2] / W * 100 + "%", height: b[3] / H * 100 + "%"});
      const fence = (k === "ember" || k === "pond") && world.querySelector('.keep-fence[data-pen="' + k + '"]');
      if (fence) world.insertBefore(c, fence); else world.appendChild(c);   // same z as the fence, earlier in DOM = under it
      cv[k] = c;
    });
    let variant = opts.variant || "v6", raf = 0, last = 0;
    function size() {
      const px = world.clientWidth / W * Math.min(2, root.devicePixelRatio || 1);
      Object.keys(cv).forEach(k => { const b = boxes[k]; cv[k].width = Math.max(1, Math.round(b[2] * px)); cv[k].height = Math.max(1, Math.round(b[3] * px)); cv[k]._s = px; });
    }
    function frame(ms) {
      raf = root.requestAnimationFrame(frame);
      if (ms - last < 1000 / 30) return; last = ms;           // 30 fps is plenty for ambient life
      const t = ms / 1000;
      Object.keys(cv).forEach(k => {
        const c = cv[k], g = c.getContext("2d"), b = boxes[k];
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
        g.setTransform(c._s, 0, 0, c._s, -b[0] * c._s, -b[1] * c._s);
        render(g, k, t, variant, opts.bg, A);
      });
    }
    size();
    const api = {
      setVariant(v) { variant = WX[v] ? v : "v6"; },
      resize: size,
      start() { if (!raf && !reduce) raf = root.requestAnimationFrame(frame); },
      stop() { if (raf) root.cancelAnimationFrame(raf); raf = 0; },
      destroy() { api.stop(); Object.keys(cv).forEach(k => cv[k].remove()); }
    };
    return api;
  }
  root.KeepAmbient = {MAP, WX, render, mount, loadAssets};
})(typeof window !== "undefined" ? window : globalThis);
