// Scroll-driven stage with ONE transition for every slide: a wave of blue water rises up the
// screen. The next slide is revealed below the waterline (the slide's clip edge IS the wave),
// while layered, rippling water with a foam crest is drawn above it on a canvas.
(() => {
  const root = document.getElementById("closet");
  if (!root) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; // plain stacked sections

  const slides = [...root.querySelectorAll(".slide")];
  const cv = document.getElementById("water");
  const ctx = cv.getContext("2d");
  const bar = document.getElementById("bar");
  const cur = document.getElementById("cur");
  const hint = root.querySelector(".hint");
  const n = slides.length;
  root.classList.add("enhanced");

  const STEPS = 48;                                   // samples across the width
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const TAU = Math.PI * 2;
  // water layers, back (light, tallest) to front (deep, shortest): colour, share of band height, phase offset
  const LAYERS = [
    { c: "#bfe6ff", h: 1.0,  o: 0.0 },
    { c: "#6cbcf2", h: 0.72, o: 1.7 },
    { c: "#2f95e0", h: 0.44, o: 3.1 },
    { c: "#1769b8", h: 0.18, o: 4.6 },
  ];

  let vw = 0, vh = 0, dpr = 1;
  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    vw = innerWidth; vh = innerHeight;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // waterline height at x (0..1): two sines so it never looks like a plain wave
  const line = (x, base, amp, ph) => base + amp * (0.62 * Math.sin(x * TAU * 1.4 + ph) + 0.38 * Math.sin(x * TAU * 2.9 - ph * 1.35));

  function draw(t, ph) {
    const amp = vh * 0.05, band = vh * 0.2;
    const base = (vh + band + amp) - ease(t) * (vh + band + amp * 2); // waterline travels bottom -> top
    ctx.clearRect(0, 0, vw, vh);

    const ys = [];
    for (let i = 0; i <= STEPS; i++) ys.push(line(i / STEPS, base, amp, ph));

    LAYERS.forEach((L) => {
      ctx.beginPath();
      for (let i = 0; i <= STEPS; i++) {
        const x = (i / STEPS) * vw;
        const y = ys[i] - band * L.h + Math.sin((i / STEPS) * TAU * 3 + ph * 1.6 + L.o) * amp * 0.35;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      for (let i = STEPS; i >= 0; i--) ctx.lineTo((i / STEPS) * vw, ys[i] + 1); // down to the slide edge
      ctx.closePath();
      ctx.fillStyle = L.c;
      ctx.fill();
    });

    // foam: a white crest along the tallest layer, plus a few bubbles
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const x = (i / STEPS) * vw;
      const y = ys[i] - band + Math.sin((i / STEPS) * TAU * 3 + ph * 1.6) * amp * 0.35;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.lineWidth = 5; ctx.lineJoin = "round"; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.7)";
    for (let i = 0; i < 26; i++) {
      const fx = (i * 0.618 + ph * 0.05) % 1, fy = ys[Math.round(fx * STEPS)] - band * (0.1 + ((i * 37) % 100) / 100 * 0.8);
      ctx.beginPath(); ctx.arc(fx * vw, fy, 2 + (i % 4) * 2, 0, TAU); ctx.fill();
    }
    return ys;
  }

  function clipFor(ys) {
    const pts = [`0px ${vh + 20}px`];
    ys.forEach((y, i) => pts.push(`${((i / STEPS) * vw).toFixed(1)}px ${y.toFixed(1)}px`));
    pts.push(`${vw}px ${vh + 20}px`);
    return `polygon(${pts.join(",")})`;
  }

  let ticking = false, active = -1, hintOn = true, drawn = false;
  const shown = slides.map(() => null);

  function update() {
    ticking = false;
    const p = Math.min(n - 1, Math.max(0, (scrollY - root.offsetTop) / vh));
    const now = Math.round(p);
    const k = Math.floor(p), t = p - k;
    const ph = p * 14; // ripples travel as you scroll

    // slide i being revealed = k+1; everything else is fully shown or hidden
    slides.forEach((s, i) => {
      let vis, clip = "none";
      if (i <= k) vis = i >= now - 1 || i === k ? "visible" : "hidden";
      else if (i === k + 1 && t > 0.001 && t < 0.999) vis = "visible";
      else vis = "hidden";
      if (i === k + 1 && vis === "visible") {
        const ys = draw(t, ph); clip = clipFor(ys); cv.style.visibility = "visible"; drawn = true;
      }
      if (i === k + 1 && t >= 0.999) { vis = "visible"; clip = "none"; }
      if (i === 0) clip = "none";
      if (shown[i] !== vis) { s.style.visibility = vis; shown[i] = vis; }
      s.style.clipPath = clip;
    });
    if (!(k + 1 < n && t > 0.001 && t < 0.999) && drawn) { cv.style.visibility = "hidden"; drawn = false; }

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
  addEventListener("resize", () => { resize(); onScroll(); });
  resize();
  update();
})();
