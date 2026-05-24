const canvas = document.getElementById("field");
const ctx = canvas.getContext("2d", { alpha: true });
let pixels = [];

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  pixels = Array.from({ length: Math.min(220, Math.floor(innerWidth / 6)) }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    s: Math.random() > .88 ? 2 : 1,
    v: .12 + Math.random() * .42,
    c: Math.random() > .76 ? "rgba(242,191,76,.52)" : Math.random() > .45 ? "rgba(55,240,163,.56)" : "rgba(50,201,255,.38)"
  }));
}
addEventListener("resize", resize);
resize();

function render() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (const p of pixels) {
    ctx.fillStyle = p.c;
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.s, p.s);
    p.y += p.v;
    if (p.y > innerHeight + 4) {
      p.y = -4;
      p.x = Math.random() * innerWidth;
    }
  }
  requestAnimationFrame(render);
}
render();

const audio = document.getElementById("track");
const btn = document.getElementById("music");
const label = document.getElementById("music-label");
const state = document.getElementById("audio-state");

async function tryAutoplay() {
  audio.volume = 0.42;
  try {
    await audio.play();
    btn.setAttribute("aria-pressed", "true");
    label.textContent = "STOP MODULE";
    state.textContent = "AMIGA-STYLE LOOP";
  } catch {
    btn.setAttribute("aria-pressed", "false");
    label.textContent = "START MODULE";
    state.textContent = "CLICK TO ENABLE AUDIO";
  }
}

btn.addEventListener("click", async () => {
  if (audio.paused) {
    audio.volume = 0.42;
    try {
      await audio.play();
      btn.setAttribute("aria-pressed", "true");
      label.textContent = "STOP MODULE";
      state.textContent = "AMIGA-STYLE LOOP";
    } catch {
      state.textContent = "AUDIO BLOCKED";
    }
  } else {
    audio.pause();
    btn.setAttribute("aria-pressed", "false");
    label.textContent = "START MODULE";
    state.textContent = "MODULE PAUSED";
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && !audio.paused) audio.volume = 0.22;
  else audio.volume = 0.42;
});

tryAutoplay();
