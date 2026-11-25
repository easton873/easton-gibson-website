(() => {
  const slides = [...document.querySelectorAll("#show .slide")];
  const dots = document.getElementById("dots");
  let i = 0;
  const btns = slides.map((s, n) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", `Show game ${n + 1}`);
    b.onclick = () => go(n);
    dots.append(b);
    return b;
  });
  function go(n) {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => { s.classList.toggle("is-active", k === i); s.setAttribute("aria-hidden", k !== i); });
    btns.forEach((b, k) => b.setAttribute("aria-current", k === i));
    start();
  }
  // Auto-advance every 5s; pauses while hovered/focused, off for reduced motion.
  const show = document.getElementById("show");
  let timer, paused = false;
  function start() {
    clearInterval(timer);
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer = setInterval(() => go(i + 1), 5000);
  }
  const pause = (p) => { paused = p; start(); };
  show.addEventListener("mouseenter", () => pause(true));
  show.addEventListener("mouseleave", () => pause(false));
  show.addEventListener("focusin", () => pause(true));
  show.addEventListener("focusout", () => pause(false));
  document.getElementById("prev").onclick = () => go(i - 1);
  document.getElementById("next").onclick = () => go(i + 1);
  document.getElementById("show").addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") go(i - 1);
    if (e.key === "ArrowRight") go(i + 1);
  });
  go(0);
})();
