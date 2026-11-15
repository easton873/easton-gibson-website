// Scroll-driven stage: a pinned viewport where each slide is revealed by the SAME
// transition: an 8-bit "equalizer" wipe. Columns rise from the bottom in stepped
// (quantised) increments, staggered left to right, with an accent-coloured edge trailing it.
(() => {
  const root = document.getElementById("quest");
  if (!root) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; // plain stacked sections

  const slides = [...root.querySelectorAll(".slide")];
  const edges = [...root.querySelectorAll(".edge")];
  const bar = document.getElementById("bar");
  const cur = document.getElementById("cur");
  const hint = root.querySelector(".hint");
  const n = slides.length;
  root.classList.add("enhanced");

  const COLS = 16;      // pixel columns across the screen
  const STEPS = 10;     // vertical quantisation: how chunky the rise looks
  const SPREAD = 0.9;   // how much the columns are staggered
  const LEAD = 0.12;    // how far the accent edge sits ahead of the slide
  const clamp = (v) => Math.min(1, Math.max(0, v));

  // Polygon whose column heights rise in whole steps, left to right.
  function stairs(t, lead = 0) {
    const pts = ["0% 100%"];
    for (let j = 0; j < COLS; j++) {
      const f = clamp((t * (1 + SPREAD) - (j / COLS) * SPREAD) + lead * (t > 0 && t < 1 ? 1 : 0));
      const y = (100 - Math.round(f * STEPS) / STEPS * 100).toFixed(2);
      const x0 = ((j / COLS) * 100).toFixed(2), x1 = (((j + 1) / COLS) * 100).toFixed(2);
      pts.push(`${x0}% ${y}%`, `${x1}% ${y}%`);
    }
    pts.push("100% 100%");
    return `polygon(${pts.join(",")})`;
  }

  const state = slides.map(() => -1);
  let ticking = false, active = -1, hintOn = true;

  function update() {
    ticking = false;
    const vh = innerHeight;
    const p = Math.min(n - 1, Math.max(0, (scrollY - root.offsetTop) / vh)); // 0 … n-1
    const now = Math.round(p);

    slides.forEach((s, i) => {
      if (i < now - 1 || i > now + 1) {
        if (state[i] !== -2) { s.style.visibility = edges[i].style.visibility = "hidden"; state[i] = -2; }
        return;
      }
      const t = i === 0 ? 1 : clamp(p - (i - 1));
      const q = Math.round(t * 400); // skip redundant writes
      if (q === state[i]) return;
      state[i] = q;
      s.style.visibility = t <= 0 ? "hidden" : "visible";
      s.style.clipPath = i === 0 || t >= 1 ? "none" : stairs(t);
      edges[i].style.visibility = t > 0 && t < 1 ? "visible" : "hidden";
      edges[i].style.clipPath = stairs(t, LEAD);
    });

    // z-order: each edge sits just beneath its own slide, both above earlier slides
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
  slides.forEach((s, i) => { s.style.zIndex = 2 * i + 2; edges[i].style.zIndex = 2 * i + 1; });
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", () => { state.fill(-1); onScroll(); });
  update();
})();
