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

  let ticking = false;
  function update() {
    ticking = false;
    const vh = window.innerHeight;
    const top = root.getBoundingClientRect().top;
    const p = Math.min(n - 1, Math.max(0, -top / vh)); // 0 … n-1
    let active = Math.round(p);

    slides.forEach((s, i) => {
      const raw = i === 0 ? 1 : clamp(p - (i - 1));
      const t = ease(raw);
      s.style.clipPath = i === 0 ? "none" : clips[s.dataset.transition](t);
      s.style.visibility = raw <= 0 ? "hidden" : "visible";

      // background parallax: slide settles from zoomed-in; as the next one covers it, it drifts up & dims
      const out = i < n - 1 ? clamp(p - i) : 0;
      const zoomIn = 1 + (1 - t) * 0.25;
      s.style.setProperty("--bgScale", (zoomIn + out * 0.06).toFixed(4));
      s.style.setProperty("--bgY", `${(-out * 14 + (1 - t) * 6).toFixed(2)}%`);
      s.style.setProperty("--dim", (out * 0.55).toFixed(3));
      // foreground card moves faster than the bg for depth
      s.style.setProperty("--cardY", `${((1 - t) * 18 - out * 22).toFixed(2)}vh`);
      s.style.setProperty("--cardR", `${((1 - t) * 6 - out * 3).toFixed(2)}deg`);

      s.classList.toggle("is-active", i === active);
    });
    dots.forEach((d, i) => d.classList.toggle("on", i === active));
    if (hint) hint.style.opacity = p < 0.15 ? 1 : 0;
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  update();
})();
