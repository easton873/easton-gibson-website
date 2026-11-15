// Scroll-driven stage with ONE transition for every slide: a lime-edged curtain
// wipes down from the top, while a shower of food rains down over it.
(() => {
  const root = document.getElementById("nug");
  if (!root) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; // plain stacked sections

  const slides = [...root.querySelectorAll(".slide")];
  const rings = [...root.querySelectorAll(".ring")];
  const foods = [...root.querySelectorAll("#fx img")];
  const bar = document.getElementById("bar");
  const rider = document.getElementById("rider");
  const cur = document.getElementById("cur");
  const hint = root.querySelector(".hint");
  const n = slides.length;
  root.classList.add("enhanced");

  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const EDGE = 3;     // thickness of the lime leading edge, in % of viewport height

  // Food rain: the 12 sprites are cloned into a larger shower. Each drop has a fixed column,
  // start delay, fall speed, size and tumble so the shower looks random but scrubs smoothly with scroll.
  const fx = document.getElementById("fx");
  const DROPS = 42;
  const rnd = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
  const base = foods.slice();
  while (fx.children.length < DROPS) fx.appendChild(base[fx.children.length % base.length].cloneNode());
  const drops = [...fx.children].map((el, i) => ({
    el,
    x: (i + rnd(i, 1) * 0.9) / DROPS,            // column, spread evenly across the width
    delay: rnd(i, 2) * 0.4,                      // when it starts falling during the transition
    span: 0.45 + rnd(i, 3) * 0.15,               // share of the transition it spends falling
    size: 0.7 + rnd(i, 4) * 0.8,
    spin: (rnd(i, 5) - 0.5) * 900,
    sway: (rnd(i, 6) - 0.5) * 60,
  }));
  // shuffle which sprite lands in which column so neighbours differ
  drops.forEach((d, i) => { d.el.src = base[(i * 5) % base.length].src; }); // 5 is coprime with 12: even mix, neighbours differ

  const state = slides.map(() => -1);
  let ticking = false, active = -1, hintOn = true, raining = false;

  function update() {
    ticking = false;
    const vw = innerWidth, vh = innerHeight;
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

    // Food rain for the transition currently in flight (if any)
    const k = Math.floor(p) + 1, t = p - Math.floor(p);
    const flying = k < n && t > 0.001 && t < 0.999;
    if (flying) {
      drops.forEach((d) => {
        const u = clamp((t - d.delay) / d.span);
        if (u <= 0 || u >= 1) { d.el.style.opacity = 0; return; }
        const size = d.el.offsetWidth || 80;
        const y = -size + (vh + size * 2) * (u * u * 0.35 + u * 0.65); // slight gravity
        const x = d.x * vw + Math.sin(u * 6 + d.x * 20) * d.sway;
        d.el.style.opacity = 1;
        d.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, 0) rotate(${(u * d.spin).toFixed(1)}deg) scale(${d.size.toFixed(2)})`;
      });
      raining = true;
    } else if (raining) {
      drops.forEach((d) => { d.el.style.opacity = 0; });
      raining = false;
    }

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
