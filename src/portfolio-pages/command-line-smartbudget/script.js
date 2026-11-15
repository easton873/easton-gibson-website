// Horizontal timeline, driven by vertical scroll. A line that rises and falls is drawn as you
// travel left to right; events sit on it at different heights and "decrypt" into view when the
// line reaches them. Matrix-style code rain falls behind everything (black & white only).
(() => {
  const tl = document.getElementById("tl");
  if (!tl) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; // plain vertical list

  const track = document.getElementById("track");
  const svg = document.getElementById("line");
  const dim = document.getElementById("lineDim");
  const lit = document.getElementById("lineLit");
  const head = document.getElementById("head");
  const ruler = document.getElementById("ruler");
  const pct = document.getElementById("pct");
  const hint = document.getElementById("hint");
  const events = [...track.querySelectorAll(".event")];
  tl.classList.add("enhanced");

  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const SLOW = 1.1; // scroll distance per pixel of sideways travel

  // ---- text "decryption" ---------------------------------------------------------------
  const GLYPHS = "01#$%&*+<>/\\|=_?";
  function decode(el) {
    const text = el.dataset.t || (el.dataset.t = el.innerHTML);
    // keep markup (like <br>) intact: only scramble text outside tags
    const parts = text.split(/(<[^>]+>|&[a-z]+;)/);
    const plain = parts.filter((_, i) => i % 2 === 0).join("");
    const t0 = performance.now(), dur = Math.min(1500, 350 + plain.length * 9);
    cancelAnimationFrame(el._raf);
    const tick = (now) => {
      const k = Math.floor(clamp((now - t0) / dur) * plain.length);
      let seen = 0;
      el.innerHTML = parts.map((s, i) => {
        if (i % 2) return s;
        return [...s].map((ch) => (seen++ < k || ch === " " ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("");
      }).join("");
      if (k < plain.length) el._raf = requestAnimationFrame(tick); else el.innerHTML = text;
    };
    el._raf = requestAnimationFrame(tick);
  }

  // ---- layout --------------------------------------------------------------------------
  let vw = 0, vh = 0, W = 0, L = 0, spacing = 0, total = 0;
  const xs = [], ys = [];
  const samples = []; // [x, length, y] along the path, for drawing the line up to a given x

  function layout() {
    vw = innerWidth; vh = innerHeight;
    const cardHalf = Math.min(480, vw * 0.86) / 2;
    const pad = Math.max(vw * 0.3, cardHalf + 24);
    spacing = Math.max(560, Math.min(780, vw * 0.8));
    events.forEach((ev, i) => {
      xs[i] = pad + i * spacing;
      ys[i] = parseFloat(ev.dataset.y) * vh;
      ev.style.left = xs[i] + "px"; ev.style.top = ys[i] + "px";
      ev.classList.toggle("event--below", ys[i] < vh * 0.5 - 1);
      ev.classList.toggle("event--above", ys[i] > vh * 0.5 + 1);
      if (Math.abs(ys[i] - vh * 0.5) <= 1) ev.classList.add("event--below");
    });
    W = xs[xs.length - 1] + pad;
    L = W - vw;
    track.style.width = W + "px";
    svg.setAttribute("viewBox", `0 0 ${W} ${vh}`);
    svg.setAttribute("width", W); svg.setAttribute("height", vh);
    tl.style.height = Math.round(vh + L * SLOW) + "px";

    // smooth S-curves between the event heights
    const pts = [[0, vh * 0.5], ...xs.map((x, i) => [x, ys[i]]), [W, vh * 0.5]];
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2;
      d += ` C ${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`;
    }
    dim.setAttribute("d", d); lit.setAttribute("d", d);
    total = lit.getTotalLength();
    lit.style.strokeDasharray = total;
    samples.length = 0;
    const N = 700;
    for (let i = 0; i <= N; i++) { const l = (i / N) * total, p = lit.getPointAtLength(l); samples.push([p.x, l, p.y]); }

    // address ruler along the bottom
    ruler.innerHTML = "";
    for (let x = 0; x < W; x += 200) {
      const s = document.createElement("span");
      s.style.left = x + "px"; s.textContent = "0x" + Math.round(x / 4).toString(16).padStart(4, "0");
      ruler.appendChild(s);
    }
  }
  function atX(x) { // binary search the sample whose x is closest
    let lo = 0, hi = samples.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; samples[m][0] < x ? (lo = m + 1) : (hi = m); }
    return samples[lo];
  }

  // ---- scroll --------------------------------------------------------------------------
  let ticking = false, lastY = scrollY, vel = 0;
  function update() {
    ticking = false;
    const span = L * SLOW;
    const p = clamp((scrollY - tl.offsetTop) / span);
    const tx = -p * L;
    track.style.transform = `translate3d(${tx.toFixed(1)}px,0,0)`;

    const headX = clamp(-tx + vw * 0.62, 0, W);
    const s = atX(headX);
    lit.style.strokeDashoffset = total - s[1];
    head.style.transform = `translate(${s[0].toFixed(1)}px, ${s[2].toFixed(1)}px)`;

    events.forEach((ev, i) => {
      const on = xs[i] <= headX - 10;
      if (on !== ev.classList.contains("is-on")) {
        ev.classList.toggle("is-on", on);
        if (on) ev.querySelectorAll("[data-decode]").forEach(decode);
      }
    });

    const n = Math.round(p * 20);
    pct.textContent = `[${"#".repeat(n)}${"-".repeat(20 - n)}] ${String(Math.round(p * 100)).padStart(3, "0")}%`;
    hint.style.opacity = p < 0.03 ? 1 : 0;
    vel = Math.abs(scrollY - lastY); lastY = scrollY;
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", () => { layout(); resize(); update(); });

  // ---- matrix rain (greyscale) ----------------------------------------------------------
  const cv = document.getElementById("rain");
  const cx = cv.getContext("2d");
  const CH = "01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ$#<>/{}[]=+";
  const FS = 16;
  let cols = [], drops = [];
  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.fillStyle = "#000"; cx.fillRect(0, 0, innerWidth, innerHeight);
    cols = Math.ceil(innerWidth / FS);
    drops = Array.from({ length: cols }, () => ({ y: Math.random() * -60, v: 0.25 + Math.random() * 0.6 }));
  }
  function rain() {
    cx.fillStyle = "rgba(0,0,0,.09)"; cx.fillRect(0, 0, innerWidth, innerHeight);
    cx.font = `${FS}px "JetBrains Mono", monospace`;
    const boost = 1 + Math.min(5, vel / 18); // the code speeds up as you scroll
    for (let i = 0; i < cols; i++) {
      const d = drops[i];
      const ch = CH[(Math.random() * CH.length) | 0];
      cx.fillStyle = "rgba(255,255,255,.95)"; cx.fillText(ch, i * FS, d.y * FS);
      cx.fillStyle = "rgba(255,255,255,.32)"; cx.fillText(CH[(Math.random() * CH.length) | 0], i * FS, (d.y - 1) * FS);
      d.y += d.v * boost;
      if (d.y * FS > innerHeight && Math.random() > 0.975) { d.y = Math.random() * -20; d.v = 0.25 + Math.random() * 0.6; }
    }
    vel *= 0.92;
    requestAnimationFrame(rain);
  }

  layout(); resize(); update(); rain();
})();
