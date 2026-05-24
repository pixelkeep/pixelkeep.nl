# PixelKeep.nl — GitHub Pages refresh package

Complete schone static-site package voor `https://pixelkeep.github.io/pixelkeep.nl/`.

## Inhoud
- `index.html`
- `styles.css`
- `script.js`
- `assets/` met logo's, web-assets, ASCII en ANSI banners
- `ASSET-MANIFEST.json`

## Full refresh deploy
Pak de ZIP uit en push de inhoud naar de root van je GitHub repository.

```bash
git clone https://github.com/pixelkeep/pixelkeep.nl.git
cd pixelkeep.nl
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} \;
cp -R /path/to/pixelkeep-site-refresh-flat-root/* .
git add .
git commit -m "Refresh PixelKeep under construction site"
git push
```

GitHub Pages: `Settings -> Pages -> Deploy from branch -> main / root`.

Gebruik na deploy een hard refresh: `Ctrl+F5` of `Cmd+Shift+R`.

## Technische keuzes
- Geen framework
- Geen CDN
- Geen trackers
- Geen externe audiofiles
- Chiptune via Web Audio, start pas na klik
- Harde anti-overflow CSS voor brede logo-assets
- Relatieve asset-paden, geschikt voor GitHub Pages subpath-hosting
