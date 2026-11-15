// Scroll-driven About page: a pinned stage whose slides are revealed by
// clip-path transitions tied to scroll position, with parallax layers.
(() => {
  const root = document.getElementById("about");
  if (!root) return;
  const slides = [...root.querySelectorAll(".slide")];
  const dots = [...root.querySelectorAll(".about__dots li")];
  const hint = root.querySelector(".about__hint");
  const n = slides.length;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // plain stacked sections

  root.classList.add("enhanced");
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // easeInOutCubic

  const clips = {
    circle:     (t) => `circle(${(t * 76).toFixed(2)}% at 50% 55%)`,
    "wipe-up":  (t) => `inset(${((1 - t) * 100).toFixed(2)}% 0 0 0)`,
    "wipe-left":(t) => `inset(0 0 0 ${((1 - t) * 100).toFixed(2)}%)`,
    diagonal:   (t) => { const x = t * 140; return `polygon(0 0, ${x}% 0, ${x - 40}% 100%, 0 100%)`; },
    iris:       (t) => `inset(${((1 - t) * 50).toFixed(2)}% ${((1 - t) * 50).toFixed(2)}% round ${((1 - t) * 50).toFixed(1)}vmin)`,
  };

  const els = slides.map((s) => ({
    s,
    bg: s.querySelector(".slide__bg"),
    card: s.querySelector(".slide__card"),
    dim: s.querySelector(".slide__dim"),
    last: -1, // last progress key rendered, to skip redundant style writes
  }));

  let ticking = false;
  let activeIdx = -1;
  let hintOn = true;
  function update() {
    ticking = false;
    const vh = window.innerHeight;
    const top = root.offsetTop - window.scrollY; // avoids forced layout from getBoundingClientRect
    const p = Math.min(n - 1, Math.max(0, -top / vh)); // 0 … n-1
    const active = Math.round(p);

    els.forEach((e, i) => {
      // only slides near the current position can be visibly changing
      if (i < active - 1 || i > active + 1) {
        if (e.last !== -2) { e.s.style.visibility = "hidden"; e.last = -2; }
        return;
      }
      const raw = i === 0 ? 1 : clamp(p - (i - 1));
      const out = i < n - 1 ? clamp(p - i) : 0;
      const key = raw * 1000 + out;
      if (key === e.last) return;
      e.last = key;

      const t = ease(raw);
      e.s.style.clipPath = i === 0 ? "none" : clips[e.s.dataset.transition](t);
      e.s.style.visibility = raw <= 0 ? "hidden" : "visible";

      // background parallax: slide settles from zoomed-in; as the next one covers it, it drifts up & dims
      const scale = 1 + (1 - t) * 0.25 + out * 0.06;
      const y = -out * 14 + (1 - t) * 6;
      e.bg.style.transform = `translate3d(0, ${y.toFixed(2)}%, 0) scale(${scale.toFixed(4)})`;
      e.dim.style.opacity = (out * 0.55).toFixed(3);
      // foreground card moves faster than the bg for depth
      e.card.style.transform = `translate3d(0, ${((1 - t) * 18 - out * 22).toFixed(2)}vh, 0) rotate(${((1 - t) * 6 - out * 3).toFixed(2)}deg)`;
    });

    if (active !== activeIdx) {
      activeIdx = active;
      els.forEach((e, i) => e.s.classList.toggle("is-active", i === active));
      dots.forEach((d, i) => d.classList.toggle("on", i === active));
    }
    const showHint = p < 0.15;
    if (hint && showHint !== hintOn) { hintOn = showHint; hint.style.opacity = showHint ? 1 : 0; }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  update();
})();
