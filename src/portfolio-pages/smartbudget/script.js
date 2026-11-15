// Scroll-driven stage with ONE transition for every slide: a curtain of money falls from the
// top of the screen. The next slide is revealed above the falling cash (the slide's clip edge
// follows the money front), with loose bills and coins tumbling ahead of it. Drawn on a canvas.
(() => {
  const root = document.getElementById("closet");
  if (!root) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; // plain stacked sections

  const slides = [...root.querySelectorAll(".slide")];
  const cv = document.getElementById("water"); // canvas (id kept from the shared template)
  const ctx = cv.getContext("2d");
  const bar = document.getElementById("bar");
  const cur = document.getElementById("cur");
  const hint = root.querySelector(".hint");
  const n = slides.length;
  root.classList.add("enhanced");

  const STEPS = 48;                                   // samples across the width for the clip edge
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const TAU = Math.PI * 2;
  const rnd = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

  // Real sprites (512px canvases with padding): the bill art fills ~76% of the width, the coin ~82%.
  const load = (name) => { const im = new Image(); im.src = `/assets/images/money/${name}.png`; return im; };
  const BILL_IMGS = ["one-dollar", "two-dollar", "five-dollar", "ten-dollar", "twenty-dollar", "fifty-dollar", "one-hundred-dollar"].map(load);
  const COIN_IMGS = ["penny", "nickel", "dime", "quarter"].map(load);
  // Pieces of money. `off` is how far (in band-heights) from the money front it sits:
  // negative = inside the dense curtain above the front, positive = loose pieces falling ahead of it.
  const WALL = 260, LOOSE = 70;
  const pieces = [];
  for (let i = 0; i < WALL + LOOSE; i++) {
    const loose = i >= WALL;
    pieces.push({
      x: (i * 0.6180339 + rnd(i, 1) * 0.15) % 1,
      off: loose ? rnd(i, 2) * 2.6 : -rnd(i, 3) * 0.95,
      coin: rnd(i, 4) < (loose ? 0.4 : 0.14),
      w: 0.8 + rnd(i, 5) * 0.55,
      rot: (rnd(i, 6) - 0.5) * 1.1,
      spin: (rnd(i, 7) - 0.5) * (loose ? 5 : 1.6),
      img: null, // chosen below once we know bill vs coin
    });
  }

  pieces.forEach((p, i) => { p.img = p.coin ? COIN_IMGS[i % COIN_IMGS.length] : BILL_IMGS[i % BILL_IMGS.length]; });

  let vw = 0, vh = 0, dpr = 1;
  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    vw = innerWidth; vh = innerHeight;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // the money front's height at x (0..1): ragged, like cash tumbling at different speeds
  const front = (x, base, amp, ph) => base + amp * (0.6 * Math.sin(x * TAU * 2.1 + ph) + 0.4 * Math.sin(x * TAU * 5.3 - ph * 1.7));

  function sprite(im, x, y, size, rot) {
    if (!im.complete || !im.naturalWidth) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowOffsetY = 4; ctx.shadowBlur = 0;
    ctx.drawImage(im, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  // Draws the money for progress t and returns the clip edge (y per sample) for the new slide.
  function draw(t, ph) {
    const amp = vh * 0.035, band = vh * 0.16;
    const start = -(band * 2.6 + amp), end = vh + band + amp;      // front travels top -> bottom
    const base = start + ease(t) * (end - start);
    ctx.clearRect(0, 0, vw, vh);

    // the new slide is revealed above this edge; a dark green strip of cash hides the seam
    const ys = [];
    for (let i = 0; i <= STEPS; i++) ys.push(front(i / STEPS, base, amp, ph));
    ctx.beginPath(); ctx.moveTo(0, ys[0] - band * 0.95);
    for (let i = 0; i <= STEPS; i++) ctx.lineTo((i / STEPS) * vw, ys[i] - band * 0.95);
    for (let i = STEPS; i >= 0; i--) ctx.lineTo((i / STEPS) * vw, ys[i]);
    ctx.closePath(); ctx.fillStyle = "#2e7d3e"; ctx.fill();

    pieces.forEach((p, i) => {
      const edge = front(p.x, base, amp, ph);
      const y = edge + p.off * band;
      if (y < -band || y > vh + band) return;
      const x = p.x * vw, rot = p.rot + p.spin * t * 2 + Math.sin(ph + i) * 0.15;
      const size = (p.coin ? 62 : 150) * p.w * (vh / 900 * 0.5 + 0.5); // canvas size incl. padding
      sprite(p.img, x, y, size, rot);
    });
    return ys.map((y) => y - band * 0.1); // slide edge sits inside the cash strip
  }

  function clipFor(ys) {
    const pts = [`0px -20px`];
    ys.forEach((y, i) => pts.push(`${((i / STEPS) * vw).toFixed(1)}px ${y.toFixed(1)}px`));
    pts.push(`${vw}px -20px`);
    return `polygon(${pts.join(",")})`;
  }

  let ticking = false, active = -1, hintOn = true, drawn = false;
  const shown = slides.map(() => null);

  function update() {
    ticking = false;
    const p = Math.min(n - 1, Math.max(0, (scrollY - root.offsetTop) / vh));
    const now = Math.round(p);
    const k = Math.floor(p), t = p - k;
    const ph = p * 9; // the front wobbles as you scroll
    const flying = k + 1 < n && t > 0.001 && t < 0.999;

    slides.forEach((s, i) => {
      let vis = "hidden", clip = "none";
      if (i <= k) vis = i >= now - 1 || i === k ? "visible" : "hidden";
      else if (i === k + 1 && flying) { vis = "visible"; clip = clipFor(draw(t, ph)); cv.style.visibility = "visible"; drawn = true; }
      else if (i === k + 1 && t >= 0.999) vis = "visible";
      if (i === 0) clip = "none";
      if (shown[i] !== vis) { s.style.visibility = vis; shown[i] = vis; }
      s.style.clipPath = clip;
    });
    if (!flying && drawn) { cv.style.visibility = "hidden"; drawn = false; }

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
