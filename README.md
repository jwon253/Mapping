# Auckland Mapping

An interactive map showing where major companies are located in central Auckland,
and how many roles each one is currently hiring for.

**Live site:** https://jwon253.github.io/Mapping/

It's plain HTML, CSS and JavaScript with no build step, built on
[Leaflet](https://leafletjs.com). Open-role counts are refreshed automatically
every week by a GitHub Action.

## Features

- **Logo pins** for 26 companies across banking, telecommunications, energy,
  transport, government and technology. The map opens on the Auckland CBD.
- **Open-role badges** on each pin:

  | Badge | Meaning |
  |---|---|
  | Blue number | Open roles found (Auckland, or NZ where the careers site can't filter by city) |
  | Grey **0** | Checked, and there are no openings right now |
  | Orange dot | Count not available, but the popup links to the careers page |
  | Red dot | Count not available and there's no careers link |

- **Roles panel:** click a company to open a panel beside the sidebar listing
  each role with its location and posted date, linked to the job ad.
- **Sidebar:** search, category filters, and show/hide checkboxes per company
  (remembered in your browser). "Show all" / "Hide all" apply to the companies
  currently listed.
- **Basemap:** Google Maps in a quiet grey style, with Esri Light Gray Canvas as
  an automatic backup.
- **Mobile:** the sidebar and roles panel become bottom sheets.

## Project structure

```
index.html                     page layout
css/style.css                  styles
js/app.js                      map, pins, sidebar, roles panel
data/companies.js              company list: name, location, logo, careers link
data/jobs.js                   open roles (generated: don't edit by hand)
img/                           company logos (~128px squares)
scripts/fetch-jobs.mjs         fetches open roles and writes data/jobs.js
.github/workflows/weekly-jobs.yml   weekly automatic update
```

## Run locally

Double-click `index.html`, or serve the folder:

```
python -m http.server 8000
```

Then open http://localhost:8000. Locally the map shows the Esri basemap, because
the Google key only works on the live site (see below).

## Add or edit a company

1. Put a square logo in `img/`.
2. Add an entry to `data/companies.js` (copy an existing block). Fields:
   - `name`, `category`, `lat`, `lng`, `logo`, `description`
   - `careers`: link shown as "View jobs" when the role count can't be fetched
     automatically. Leave it out for companies listed in `fetch-jobs.mjs`,
     which supply their own link.
   - `// address:` kept as a comment for reference.
   - `verify: true` marks a location that still needs checking.
3. To get exact coordinates, open `index.html?edit` and click the map. The
   lat/lng is copied to your clipboard.

To count a new company's roles automatically, add it to `SOURCES` in
`scripts/fetch-jobs.mjs` (the key must match `name` exactly).

## Open-role counts

```
node scripts/fetch-jobs.mjs                    # all companies
node scripts/fetch-jobs.mjs "ANZ" "One NZ"     # only these; others keep their last data
```

Requires Node 18+. The script reads each company's careers system, skips
placeholder ads ("Expressions of Interest", talent pools, etc.), and saves every
role's title, link, location and posted date to `data/jobs.js`. If a site fails,
that company keeps its previous data.

### Where the data comes from

Only sources whose `robots.txt` and terms allow automated access are used. The
script identifies itself honestly (`AucklandCompanyMap/1.0`) and pauses between
requests.

| Careers system | Companies |
|---|---|
| Workday | Westpac, DXC Technology |
| SAP SuccessFactors | One NZ, ANZ, Auckland Council |
| Eightfold | BNZ |
| Workable | Vista Group, Serko, Theta, Orion Health |
| Lever / Breezy / HiBob | ClearPoint / Serato / Kordia |
| Avature RSS feed | Spark |
| Attrax sitemap | Air New Zealand |
| Oracle Recruiting Cloud | Fujifilm NZ |
| Phenom | Fiserv |

**Link only (orange dot):**

| Company | Why it isn't counted |
|---|---|
| ASB, Mercury, Contact Energy | Their careers sites opt out of bots in `robots.txt` / API rules |
| Datacom | Blocks automated requests (Cloudflare) |
| Fujitsu NZ | Results load from a path `robots.txt` disallows |
| Kiwibank, Trade Me | Cornerstone sites with no stable public feed |
| Ricoh NZ, The Instillery | Only advertise on Seek, which doesn't allow automated collection |

Workday sites sometimes reply "too many requests". The script waits 10s before
each Workday site, 6s between pages, and retries after 30s / 60s / 120s.

### Weekly automatic update

`.github/workflows/weekly-jobs.yml` runs the script on GitHub every **Monday at
about 7am NZ time** and commits the new `data/jobs.js`, so the live site updates
itself. To run it straight away: **Actions → Weekly job update → Run workflow**.

Run `git pull` before making your own changes, so you have the bot's latest commit.

## Basemap (Google Maps + Esri backup)

The map uses Google's [Map Tiles API](https://developers.google.com/maps/documentation/tile)
when `GOOGLE_MAPS_KEY` is set near the top of `js/app.js`. It falls back to the
free Esri map if the key is empty or rejected, or if Google's tiles stop loading.

The key is visible in the page source, so keep it restricted in Google Cloud Console:

- **Website restriction:** `https://jwon253.github.io/*`
- **API restriction:** Map Tiles API only
- Optional: a daily quota cap, so it can never be billed

The free tier is far more than this site uses. To check which map is showing,
look for the Google logo bottom-left. If Esri shows unexpectedly, the browser
console (F12) prints the reason.

## Map settings

At the top of `js/app.js`:

| Setting | What it does |
|---|---|
| `CBD_BOUNDS` | Area shown on load and by "Reset view" |
| `MAX_ZOOM` | How far you can zoom in |
| `PIN_MARGIN` | How far you can zoom out (extra room around the pins) |
| `EDGE_PX` | How far you can pan: this many pixels past the outermost pins always stay on screen |
| `SIDE_PX` | Cap on sideways panning, so wide screens don't show empty suburbs |
| `GOOGLE_STYLE` | Google map styling (labels, colours, hidden icons) |

## Hosting (GitHub Pages)

The repo is public and served from **Settings → Pages → Deploy from a branch →
`main` / `(root)`**. Every push to `main` goes live within a couple of minutes.
Browsers may cache the old version for up to 10 minutes, so use
**Ctrl + Shift + R** to see changes straight away.

## Ideas for later

- A database of job history to track hiring trends over months
- Tech-stack extraction from job descriptions (e.g. which roles ask for React,
  AWS or Python)
