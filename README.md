# pixelkeep.nl

[![HTML](https://img.shields.io/badge/HTML-static%20site-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS](https://img.shields.io/badge/CSS-vanilla-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-deployed-222222?style=for-the-badge&logo=github&logoColor=white)](https://pages.github.com)
[![Privacy](https://img.shields.io/badge/Privacy-no%20trackers%2C%20no%20CDN-35f2a5?style=for-the-badge)](https://pixelkeep.nl)

Personal site for [pixelkeep.nl](https://pixelkeep.nl). Static, no dependencies, no trackers, no CDN.

Deployed via GitHub Pages. Under active construction.

---

## What this is

A retro-styled landing page with a starfield, CRT scanlines, and a scrolling terminal window. All content is defined in `index.html`. No frameworks, no build step, no external scripts.

Topics covered when the site goes live:

```
TECH  |  PRIVACY  |  HOMELAB  |  GAMES  |  RPG  |  RETRO
```

---

## Structure

```
pixelkeep.nl/
├── index.html          # markup and terminal text content
├── styles.css          # all styling
├── script.js           # starfield animation, terminal scroll, audio toggle
└── assets/
    ├── pixelkeep_logo.png
    ├── privacy-crest.png
    └── drozerix_-_crush.wav
```

---

## Design decisions

- No JavaScript frameworks — vanilla JS only
- No external fonts or CDN dependencies
- Terminal text content lives in `index.html` as a JSON block — easy to edit without touching JS
- Starfield rendered on a `<canvas>` element
- Audio defaults to autoplay with graceful fallback for browsers that block it
- Privacy: no analytics, no tracking pixels, no third-party requests

---

## Local development

No build step required. Open `index.html` directly in a browser, or serve locally:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

---

## Related

- [pixelkeep on GitHub](https://github.com/pixelkeep)
- [pihole-unbound](https://github.com/pixelkeep/pihole-unbound) — Pi-hole with Unbound recursive DNS
- [raspberry-pi](https://github.com/pixelkeep/raspberry-pi) — Raspberry Pi OS Lite homelab baseline
- [pathfinder1e-sheet](https://github.com/pixelkeep/pathfinder1e-sheet) — Offline Pathfinder 1e character sheet
