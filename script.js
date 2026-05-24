const year = document.getElementById("year");
year.textContent = new Date().getFullYear();

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
const lines = [
  "scan content backlog... TECH / PRIVACY / GAMES / RPG",
  "compile chiptune loop... READY",
  "calibrate CRT glow... OK",
  "sync asset forge... OK",
  "publish target... GitHub Pages",
  "privacy stance... no trackers, no CDN"
];
let lineIndex = 0;
setInterval(() => {
  terminal.textContent += `\n${lines[lineIndex]}`;
  lineIndex = (lineIndex + 1) % lines.length;
  const all = terminal.textContent.split("\n");
  if (all.length > 10) terminal.textContent = all.slice(-10).join("\n");
}, 2400);

// Browser-native chiptune. No external audio, no dependency.
// Note: browsers require a user gesture before starting AudioContext.
let audioCtx;
let playing = false;
let intervalId;
let masterGain;

const btn = document.getElementById("music-toggle");
const notes = [
  220, 277.18, 329.63, 440, 329.63, 277.18, 246.94, 329.63,
  220, 293.66, 349.23, 440, 392.00, 329.63, 293.66, 246.94
];
const bass = [55, 55, 82.41, 82.41, 73.42, 73.42, 65.41, 65.41];

function beep(freq, time, duration, type = "square", gain = 0.05) {
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(gain, time + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(time);
  osc.stop(time + duration + 0.02);
}

function startTune() {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  masterGain = masterGain || audioCtx.createGain();
  masterGain.gain.value = 0.28;
  masterGain.connect(audioCtx.destination);

  let step = 0;
  intervalId = setInterval(() => {
    const t = audioCtx.currentTime;
    const n = notes[step % notes.length];
    const b = bass[Math.floor(step / 2) % bass.length];

    beep(n, t, 0.105, "square", 0.052);
    if (step % 2 === 0) beep(n * 2, t + 0.055, 0.07, "triangle", 0.025);
    if (step % 4 === 0) beep(b, t, 0.18, "square", 0.038);

    // tiny noise hat
    const bufferSize = audioCtx.sampleRate * 0.025;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.18;
    const noise = audioCtx.createBufferSource();
    const ng = audioCtx.createGain();
    ng.gain.setValueAtTime(0.03, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
    noise.buffer = buffer;
    noise.connect(ng);
    ng.connect(masterGain);
    noise.start(t);
    noise.stop(t + 0.03);

    step++;
  }, 145);
}

function stopTune() {
  clearInterval(intervalId);
  intervalId = undefined;
  if (masterGain) {
    masterGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.04);
    setTimeout(() => {
      try { masterGain.disconnect(); } catch {}
      masterGain = undefined;
    }, 180);
  }
}

btn.addEventListener("click", async () => {
  if (!playing) {
    if (audioCtx?.state === "suspended") await audioCtx.resume();
    startTune();
    playing = true;
    btn.textContent = "■ Stop chiptune";
    btn.setAttribute("aria-pressed", "true");
  } else {
    stopTune();
    playing = false;
    btn.textContent = "▶ Start chiptune";
    btn.setAttribute("aria-pressed", "false");
  }
});
