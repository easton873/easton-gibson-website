// Scroll-driven stage with ONE transition for every slide: a lime-edged curtain
// wipes down from the top, revealing the next slide.
(() => {
  const root = document.getElementById("nug");
  if (!root) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; // plain stacked sections

  const slides = [...root.querySelectorAll(".slide")];
  const rings = [...root.querySelectorAll(".ring")];
  const bar = document.getElementById("bar");
  const rider = document.getElementById("rider");
  const cur = document.getElementById("cur");
  const hint = root.querySelector(".hint");
  const n = slides.length;
  root.classList.add("enhanced");

  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const EDGE = 3;     // thickness of the lime leading edge, in % of viewport height

  const state = slides.map(() => -1);
  let ticking = false, active = -1, hintOn = true;

  function update() {
    ticking = false;
    const vh = innerHeight;
    const p = Math.min(n - 1, Math.max(0, (scrollY - root.offsetTop) / vh));
    const now = Math.round(p);

    slides.forEach((s, i) => {
      if (i < now - 1 || i > now + 1) {
        if (state[i] !== -2) { s.style.visibility = rings[i].style.visibility = "hidden"; state[i] = -2; }
        return;
      }
      const t = i === 0 ? 1 : clamp(p - (i - 1));
      const q = Math.round(t * 600);
      if (q === state[i]) return;
      state[i] = q;
      const r = ease(t) * 100; // % of the viewport revealed from the top
      s.style.visibility = t <= 0 ? "hidden" : "visible";
      s.style.clipPath = i === 0 || t >= 1 ? "none" : `inset(0 0 ${(100 - r).toFixed(2)}% 0)`;
      const inFlight = i > 0 && t > 0 && t < 1;
      rings[i].style.visibility = inFlight ? "visible" : "hidden";
      rings[i].style.clipPath = `inset(0 0 ${Math.max(0, 100 - r - EDGE).toFixed(2)}% 0)`;
    });

    if (now !== active) {
      active = now;
      slides.forEach((s, i) => s.classList.toggle("is-active", i === now));
      cur.textContent = String(now + 1).padStart(2, "0");
    }
    const pct = (p / (n - 1)) * 100;
    bar.style.width = pct + "%";
    rider.style.left = pct + "%";
    const showHint = p < 0.1;
    if (hint && showHint !== hintOn) { hintOn = showHint; hint.style.opacity = showHint ? 1 : 0; }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  slides.forEach((s, i) => { s.style.zIndex = 2 * i + 2; rings[i].style.zIndex = 2 * i + 1; });
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", () => { state.fill(-1); onScroll(); });
  update();
})();
