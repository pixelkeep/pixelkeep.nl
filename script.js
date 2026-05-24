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

const boot = [
`  ____  _          _ _  __                 _`,
` |  _ \\(_)_  _____| | |/ /___  ___ _ __  | |`,
` | |_) | \\ \\/ / _ \\ | ' // _ \\/ _ \\ '_ \\ | |`,
` |  __/| |>  <  __/ | . \\  __/  __/ |_) ||_|`,
` |_|   |_/_/\\_\\___|_|_|\\_\\___|\\___| .__/ (_)`,
`                                  |_|`,
``,
`[CONNECT 57600] PixelKeep BBS / node-01`,
`login: guest`,
`password: ********`,
`last login: never — new node provisioned`,
``,
`$ uname -a`,
`pixelkeep 0.1.0-retro #1 SMP AMIGA-ish x86_64 GNU/Linux`,
`$ mount /dev/keep /mnt/pixelkeep`,
`/mnt/pixelkeep mounted read-only until launch`,
`$ rsync -av tech/ privacy/ homelab/ games/ rpg/ /site/`,
`sending incremental file list`,
`tech/architecture-patterns.md`,
`privacy/privacy-by-design.md`,
`homelab/services-and-backups.md`,
`games/retro-notes.md`,
`rpg/items-and-lore.md`,
``,
`$ ./build-site --target github-pages`,
`compiling sprites... OK`,
`packing modules... OK`,
`checking trackers... NONE`,
`status: UNDER CONSTRUCTION`
];

terminal.textContent = "";
let bootIndex = 0;
function typeBoot() {
  if (bootIndex < boot.length) {
    terminal.textContent += (bootIndex ? "\\n" : "") + boot[bootIndex];
    terminal.scrollTop = terminal.scrollHeight;
    bootIndex++;
    setTimeout(typeBoot, bootIndex < 7 ? 45 : 160);
  }
}
typeBoot();

const liveLines = [
  "$ tail -f /var/log/pixelkeep/build.log",
  "GET /topics/tech ................. 200 cached",
  "GET /topics/privacy ............. 200 cached",
  "GET /topics/homelab ............. 200 cached",
  "GET /topics/games ............... 200 cached",
  "GET /topics/rpg ................. 200 cached",
  "bbs: downloading content manifest [####------] 42%",
  "bbs: downloading content manifest [########--] 86%",
  "bbs: verifying checksum ......... OK",
  "cron: next build window scheduled",
];

setInterval(() => {
  if (bootIndex < boot.length) return;
  terminal.textContent += "\\n" + liveLines[Math.floor(Math.random() * liveLines.length)];
  const all = terminal.textContent.split("\\n");
  if (all.length > 22) terminal.textContent = all.slice(-22).join("\\n");
  terminal.scrollTop = terminal.scrollHeight;
}, 2800);

const audio = document.getElementById("track");
const btn = document.getElementById("music-toggle");
const label = document.getElementById("music-label");
const select = document.getElementById("track-select");

async function tryAutoplay() {
  audio.volume = 0.36;
  try {
    await audio.play();
    btn.setAttribute("aria-pressed", "true");
    label.textContent = "STOP";
  } catch {
    btn.setAttribute("aria-pressed", "false");
    label.textContent = "START";
  }
}

btn.addEventListener("click", async () => {
  if (audio.paused) {
    audio.volume = 0.36;
    try {
      await audio.play();
      btn.setAttribute("aria-pressed", "true");
      label.textContent = "STOP";
    } catch {
      label.textContent = "BLOCKED";
    }
  } else {
    audio.pause();
    btn.setAttribute("aria-pressed", "false");
    label.textContent = "START";
  }
});

select.addEventListener("change", async () => {
  const wasPlaying = !audio.paused;
  audio.src = select.value;
  audio.load();
  if (wasPlaying) {
    try { await audio.play(); } catch {}
  }
});

document.addEventListener("visibilitychange", () => {
  audio.volume = document.hidden ? 0.16 : 0.36;
});

tryAutoplay();
