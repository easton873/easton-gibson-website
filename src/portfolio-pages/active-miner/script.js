// Scroll-driven stage with ONE transition for every slide: a vertical, pixelated wave of
// static sweeps left to right. The new slide is revealed behind it; the line's edge is
// ragged (each pixel row jitters independently) and shimmers as you scroll.
(() => {
  const root = document.getElementById("mine");
  if (!root) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; // plain stacked sections

  const slides = [...root.querySelectorAll(".slide")];
  const wave = document.getElementById("wave");
  const bar = document.getElementById("bar");
  const cur = document.getElementById("cur");
  const hint = root.querySelector(".hint");
  const n = slides.length;
  root.classList.add("enhanced");

  const ROWS = 45;       // pixel rows down the line
  const COL = 1.25;      // horizontal pixel size, % of width
  const JITTER = 7;      // max sideways wobble per row, % of width
  const BAND = 3;        // min thickness of the static band, % of width
  const BAND_VAR = 6;    // extra random thickness per row
  const clamp = (v, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
  const snap = (x) => Math.round(x / COL) * COL;
  const rnd = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

  // Static texture: black / green / red / white pixels, generated once, tiled and pixelated.
  const cv = document.createElement("canvas");
  cv.width = cv.height = 32;
  const cx = cv.getContext("2d");
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const r = Math.random();
    cx.fillStyle = r < 0.45 ? "#000" : r < 0.7 ? "#33d233" : r < 0.88 ? "#ed1c24" : "#e9ffe9";
    cx.fillRect(x, y, 1, 1);
  }
  wave.style.backgroundImage = `url(${cv.toDataURL()})`;

  // Per-row edge positions for progress t. `seed` changes as you scroll, so the line crawls.
  function edge(t, seed) {
    const travel = 100 + JITTER + BAND + BAND_VAR;
    const base = t * travel - JITTER;
    const lead = [], tail = [];
    for (let r = 0; r < ROWS; r++) {
      const x = snap(base + (rnd(r, seed) - 0.5) * 2 * JITTER);
      lead.push(x);                                           // right edge of the new slide
      tail.push(snap(x + BAND + rnd(r, seed + 99) * BAND_VAR)); // right edge of the static band
    }
    return { lead, tail };
  }
  const pct = (v) => clamp(v).toFixed(2) + "%";
  const rowY = (r) => ((r / ROWS) * 100).toFixed(2) + "%";

  function slidePoly(lead) {
    const pts = ["0% 0%"];
    lead.forEach((x, r) => pts.push(`${pct(x)} ${rowY(r)}`, `${pct(x)} ${rowY(r + 1)}`));
    pts.push("0% 100%");
    return `polygon(${pts.join(",")})`;
  }
  function bandPoly(lead, tail) {
    const pts = [];
    lead.forEach((x, r) => pts.push(`${pct(x)} ${rowY(r)}`, `${pct(x)} ${rowY(r + 1)}`));
    for (let r = ROWS - 1; r >= 0; r--) pts.push(`${pct(tail[r])} ${rowY(r + 1)}`, `${pct(tail[r])} ${rowY(r)}`);
    return `polygon(${pts.join(",")})`;
  }

  const state = slides.map(() => -1);
  let ticking = false, active = -1, hintOn = true, waving = false;

  function update() {
    ticking = false;
    const vh = innerHeight;
    const p = Math.min(n - 1, Math.max(0, (scrollY - root.offsetTop) / vh));
    const now = Math.round(p);
    const seed = Math.floor(p * 90); // static re-rolls ~90 times per slide of scroll

    slides.forEach((s, i) => {
      if (i < now - 1 || i > now + 1) {
        if (state[i] !== -2) { s.style.visibility = "hidden"; state[i] = -2; }
        return;
      }
      const t = i === 0 ? 1 : Math.min(1, Math.max(0, p - (i - 1)));
      const key = Math.round(t * 5000) + seed * 1e6;
      if (key === state[i]) return;
      state[i] = key;
      s.style.visibility = t <= 0 ? "hidden" : "visible";
      s.style.clipPath = i === 0 || t >= 1 ? "none" : slidePoly(edge(t, seed).lead);
    });

    // the static band for the transition currently in flight
    const k = Math.floor(p), t = p - k;
    if (k + 1 < n && t > 0.001 && t < 0.999) {
      const { lead, tail } = edge(t, seed);
      wave.style.visibility = "visible";
      wave.style.clipPath = bandPoly(lead, tail);
      wave.style.backgroundPosition = `${(rnd(seed, 1) * 128) | 0}px ${(rnd(seed, 2) * 128) | 0}px`;
      waving = true;
    } else if (waving) {
      wave.style.visibility = "hidden";
      waving = false;
    }

    if (now !== active) {
      active = now;
      slides.forEach((s, i) => s.classList.toggle("is-active", i === now));
      cur.textContent = String(now + 1).padStart(2, "0");
    }
    bar.style.width = ((p / (n - 1)) * 100).toFixed(2) + "%";
    const showHint = p < 0.1;
    if (hint && showHint !== hintOn) { hintOn = showHint; hint.style.opacity = showHint ? 1 : 0; }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  slides.forEach((s, i) => { s.style.zIndex = i + 1; });
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", () => { state.fill(-1); onScroll(); });
  update();
})();
