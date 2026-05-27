const canvas = document.getElementById("starfield");
const ctx = canvas.getContext("2d", { alpha: true });
let stars = [];

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  stars = Array.from({ length: Math.min(180, Math.floor(window.innerWidth / 7)) }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    s: Math.random() > 0.82 ? 2 : 1,
    v: 0.15 + Math.random() * 0.45,
    c: Math.random() > 0.7 ? "rgba(53,242,165,.75)" : "rgba(244,198,79,.45)"
  }));
}
resize();
window.addEventListener("resize", resize);

function drawStars() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (const star of stars) {
    ctx.fillStyle = star.c;
    ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.s, star.s);
    star.y += star.v;
    if (star.y > window.innerHeight) {
      star.y = -4;
      star.x = Math.random() * window.innerWidth;
    }
  }
  requestAnimationFrame(drawStars);
}
drawStars();

const terminal = document.getElementById("terminal-output");
const lines = JSON.parse(document.getElementById("terminal-lines").textContent);
let lineIndex = 0;
setInterval(() => {
  terminal.textContent += `\n${lines[lineIndex]}`;
  lineIndex = (lineIndex + 1) % lines.length;
  const all = terminal.textContent.split("\n");
  if (all.length > 18) terminal.textContent = all.slice(-18).join("\n");
}, 2600);

const audio = document.getElementById("track");
const btn = document.getElementById("music-toggle");
const label = document.getElementById("music-label");

async function tryAutoplay() {
  audio.volume = 0.38;
  try {
    await audio.play();
    btn.setAttribute("aria-pressed", "true");
    label.textContent = "STOP MUSIC";
  } catch {
    btn.setAttribute("aria-pressed", "false");
    label.textContent = "START MUSIC";
  }
}

btn.addEventListener("click", async () => {
  if (audio.paused) {
    audio.volume = 0.38;
    try {
      await audio.play();
      btn.setAttribute("aria-pressed", "true");
      label.textContent = "STOP MUSIC";
    } catch {
      label.textContent = "AUDIO BLOCKED";
    }
  } else {
    audio.pause();
    btn.setAttribute("aria-pressed", "false");
    label.textContent = "START MUSIC";
  }
});

document.addEventListener("visibilitychange", () => {
  audio.volume = document.hidden ? 0.18 : 0.38;
});

tryAutoplay();
