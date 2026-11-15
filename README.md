# Auckland Company Map

An interactive map of where major companies are located in central Auckland.
It opens on the CBD, shows each company's logo as a pin, and has a searchable,
filterable list beside the map.

Built with [Leaflet](https://leafletjs.com) and Esri Light Gray Canvas tiles (free, no API key).
It has no build step: it's plain HTML, CSS and JS.

## Run locally

Double-click `index.html`, or serve the folder:

```
python -m http.server 8000
```

Then open http://localhost:8000

## Add or edit a company

1. Put a square logo in `img/`.
2. Add an entry to `data/companies.js`.
3. To get exact coordinates, open `index.html?edit` and click the map. The
   lat/lng is copied to your clipboard.

Entries marked `verify: true` have approximate locations that still need checking.

## Host on GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**, set **Source** to *Deploy from a branch*, then
   choose `main` and `/ (root)`.
3. The site goes live at `https://<username>.github.io/Mapping/`.
