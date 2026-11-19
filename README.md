# Auckland Mapping

An interactive map of major companies in central Auckland and how many roles
each one is hiring for, updated automatically every week.

**Live site:** https://jwon253.github.io/Mapping/

Click a company to see its open roles, with posted dates and links to each ad.

| Pin badge | Meaning |
|---|---|
| Blue number | Open roles found |
| Grey 0 | No openings right now |
| Orange dot | Count not available; careers link in the popup |

## How the data is collected

`scripts/fetch-jobs.mjs` reads each company's careers system (Workday,
SuccessFactors, Workable and others), skips placeholder ads, and saves the
results to `data/jobs.js`. It only uses sites whose `robots.txt` and terms allow
automated access. Companies that opt out, or only advertise on Seek, are shown
with a careers link instead of a count.

A GitHub Action runs this every **Monday morning** and publishes the results.
To run it manually: **Actions → Weekly job update → Run workflow**.

## Development

Plain HTML/CSS/JS with [Leaflet](https://leafletjs.com) and no build step.

```
python -m http.server 8000            # view at http://localhost:8000
node scripts/fetch-jobs.mjs           # refresh role counts (Node 18+)
node scripts/fetch-jobs.mjs "ANZ"     # refresh only some companies
```

- **Add a company:** add a logo to `img/` and an entry to `data/companies.js`.
  Open `index.html?edit` and click the map to copy coordinates.
- **Basemap:** Google Maps (key in `js/app.js`, restricted to this site), with
  Esri as an automatic fallback. Locally you'll see Esri.
- Run `git pull` before making changes, so you have the weekly bot's latest commit.

```
index.html                          page layout
css/style.css                       styles
js/app.js                           map, pins, sidebar, roles panel
data/companies.js                   companies: location, logo, careers link
data/jobs.js                        open roles (generated, don't edit)
img/                                company logos
scripts/fetch-jobs.mjs              fetches open roles
.github/workflows/weekly-jobs.yml   weekly automatic update
```

## Ideas for later

- Track hiring trends over time
- Extract the tech stack each role asks for
