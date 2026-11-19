/*
 * Fetches the open roles for each company and writes data/jobs.js.
 *
 *   Run:  node scripts/fetch-jobs.mjs
 *   Just some companies:  node scripts/fetch-jobs.mjs "ANZ" "One NZ"
 *
 * Only uses careers systems whose robots.txt allows automated access, or that
 * publish an official job feed / sitemap. Companies that opt out of bots
 * (e.g. ASB, Mercury, Contact) are deliberately NOT included here.
 *
 * For each company we save the list of roles (title, link, location, posted
 * date where available). The count shown on the map = number of roles, after
 * removing placeholder ads such as "Expressions of Interest".
 *
 * Keys in SOURCES must match the `name` field in data/companies.js exactly.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Identifies this script honestly to each careers site, with a link so site
// owners can see what it is and get in touch (via the repo) if they have concerns.
const UA = "AucklandCompanyMap/1.0 (+https://github.com/jwon253/Mapping; personal portfolio project; weekly job count)";

// Ads that aren't real openings.
const PLACEHOLDER = /expressions? of interest|share your details|register your interest|talent (pool|community)|general application/i;

// ---------- helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// opts.retryWaits = how long to wait (ms) before each retry after a 429.
async function get(url, opts = {}) {
  const { retryWaits = [15000, 15000], ...fetchOpts } = opts;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      ...fetchOpts,
      headers: { "User-Agent": UA, Accept: "application/json, text/html, application/xml", ...(fetchOpts.headers || {}) }
    });
    // 429 = "too many requests": wait (as long as the site asks, if it says) and try again.
    if (res.status === 429 && attempt < retryWaits.length) {
      const asked = parseInt(res.headers.get("retry-after") || "", 10) * 1000;
      const wait = Math.max(retryWaits[attempt], asked || 0);
      console.log(`  … ${new URL(url).host} says too many requests, waiting ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res;
  }
}
const getText = async (url, opts) => (await get(url, opts)).text();
const getJson = async (url, opts) => (await get(url, opts)).json();

const decode = (s) =>
  String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
    .replace(/[​-‍﻿]/g, "") // invisible zero-width characters
    .replace(/\s+/g, " ")
    .trim();

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

const isoDate = (v) => {
  if (v == null || v === "") return undefined;
  // "12 Nov 2026" -> read as a calendar date (avoids timezone shifting it a day)
  const m = String(v).trim().match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) {
    return new Date(Date.UTC(+m[3], MONTHS[m[2].toLowerCase()], +m[1])).toISOString().slice(0, 10);
  }
  const d = new Date(v);
  return isNaN(d) ? undefined : d.toISOString().slice(0, 10);
};

// Workday shows "Posted Today" / "Posted Yesterday" / "Posted 5 Days Ago".
// "30+ Days Ago" isn't an exact date, so it's left blank.
const workdayPosted = (text = "") => {
  const days = /today/i.test(text) ? 0 : /yesterday/i.test(text) ? 1
    : /^\D*(\d+) days? ago/i.test(text) && !/\+/.test(text) ? +text.match(/(\d+)/)[1] : null;
  return days == null ? undefined : new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
};

const absolute = (url, base) => new URL(url, base).href;

// "senior-network-engineer-in-auckland-nz-jid-982" -> "Senior Network Engineer"
const titleFromSlug = (slug) =>
  slug.replace(/-in-[a-z-]+-nz-jid-\d+$/, "").replace(/-jid-\d+$/, "")
    .split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

// ---------- one reader per careers system (each returns a list of roles) ----------
const readers = {
  // Workday (public careers site JSON). `facets` = the filters from the careers URL,
  // e.g. ?locations=abc123  ->  { locations: ["abc123"] }
  // Workday limits request rates, so go slowly: pause before starting, 6s between
  // pages, and back off for 30s / 60s / 120s if it still says "too many requests".
  async workday({ host, tenant, site, facets = {} }) {
    const roles = [];
    await sleep(10000);
    for (let offset = 0; ; offset += 20) {
      const d = await getJson(`https://${host}/wday/cxs/${tenant}/${site}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20, offset, searchText: "", appliedFacets: facets }),
        retryWaits: [30000, 60000, 120000]
      });
      for (const j of d.jobPostings || []) {
        roles.push({
          title: j.title,
          url: `https://${host}/${site}${j.externalPath}`,
          location: j.locationsText,
          posted: workdayPosted(j.postedOn)
        });
      }
      if (!d.jobPostings?.length || roles.length >= d.total) break;
      await sleep(6000);
    }
    return roles;
  },

  // Eightfold (robots.txt explicitly allows /api/pcsx). `params` = location filters.
  async eightfold({ host, domain, microsite, params = "" }) {
    const roles = [];
    for (let start = 0; ; ) {
      const d = (await getJson(
        `https://${host}/api/pcsx/search?domain=${domain}&microsite=${microsite}&query=&start=${start}${params}`
      )).data;
      for (const j of d.positions || []) {
        roles.push({
          title: j.name,
          url: j.positionUrl ? absolute(j.positionUrl, `https://${host}`) : `https://${host}/careers?microsite=${microsite}&pid=${j.id}`,
          location: (j.locations || []).join("; "),
          posted: j.postedTs ? isoDate(j.postedTs * 1000) : undefined
        });
      }
      start += (d.positions || []).length;
      if (!d.positions?.length || start >= d.count) break;
      await sleep(2000);
    }
    return roles;
  },

  // SAP SuccessFactors career site search pages (One NZ, ANZ, Auckland Council).
  // Two page layouts exist: a table (ANZ, Council) and tiles (One NZ). In both,
  // a job's date and location appear after its title link and before the next job.
  async successfactors({ url }) {
    const roles = new Map();
    for (let startrow = 0; ; startrow += 25) {
      const html = await getText(`${url}&startrow=${startrow}`);
      const before = roles.size;
      const links = [...html.matchAll(/<a\b(?=[^>]*class="jobTitle-link)[^>]*href="([^"]+)"[^>]*>\s*([^<]+?)\s*<\/a>/g)];
      links.forEach((m, i) => {
        const link = absolute(decode(m[1]), url);
        if (roles.has(link)) return; // same job is repeated for phone/tablet layouts
        const next = links.slice(i + 1).find((n) => n[1] !== m[1]); // next *different* job
        const chunk = html.slice(m.index, next?.index ?? m.index + 6000);
        const date = (chunk.match(/class="jobDate[^"]*">\s*([^<]+)/) ||
                      chunk.match(/section-date-value">\s*([^<]+)/) || [])[1];
        const loc = (chunk.match(/<span class="jobLocation">\s*([^<]+)/) ||
                     chunk.match(/section-(?:multi)?location-value">\s*([^<]+)/) || [])[1];
        roles.set(link, { title: decode(m[2]), url: link, location: loc ? decode(loc) : undefined, posted: isoDate(decode(date)) });
      });
      // "1 – 25 of <b>41</b>" (table) or "Showing 1 to 16 of 16 Jobs" (tiles)
      const t = html.match(/of\s+<b>([\d,]+)<\/b>/i) || html.match(/of\s+([\d,]+)\s+Jobs/i);
      const total = parseInt((t || [])[1]?.replace(/,/g, "") || "0", 10);
      if (roles.size === before || roles.size >= total) break;
      await sleep(2000);
    }
    return [...roles.values()];
  },

  // Oracle Recruiting Cloud public job search (the same API its careers site uses).
  async oracle({ host, siteNumber, locationTest }) {
    const roles = [];
    for (let offset = 0; ; offset += 25) {
      const d = await getJson(
        `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList` +
        `&finder=findReqs;siteNumber=${siteNumber},limit=25,offset=${offset},sortBy=POSTING_DATES_DESC`
      );
      const r = d.items?.[0] || {};
      for (const j of r.requisitionList || []) {
        if (locationTest && !locationTest.test(j.PrimaryLocation || "")) continue;
        roles.push({
          title: j.Title,
          url: `https://${host}/hcmUI/CandidateExperience/en/sites/${siteNumber}/job/${j.Id}`,
          location: j.PrimaryLocation,
          posted: isoDate(j.PostedDate)
        });
      }
      if (!r.requisitionList?.length || offset + 25 >= (r.TotalJobsCount || 0)) break;
      await sleep(2000);
    }
    return roles;
  },

  // Phenom careers sites build the results into the page as JSON (phApp.ddo).
  async phenom({ url }) {
    const roles = [];
    for (let from = 0; ; ) {
      const html = await getText(from ? `${url}&from=${from}` : url);
      const start = html.indexOf("phApp.ddo = ");
      if (start < 0) throw new Error("job data not found on page");
      const s = html.slice(start + 12);
      let depth = 0, end = 0, inStr = false;
      for (; end < s.length; end++) {          // find the end of the JSON object
        const ch = s[end];
        if (inStr) { if (ch === "\\") end++; else if (ch === '"') inStr = false; }
        else if (ch === '"') inStr = true;
        else if (ch === "{") depth++;
        else if (ch === "}" && --depth === 0) break;
      }
      const r = JSON.parse(s.slice(0, end + 1)).eagerLoadRefineSearch || {};
      const jobs = r.data?.jobs || [];
      for (const j of jobs) {
        roles.push({
          title: j.title,
          url: (j.applyUrl || "").replace(/\/apply\/?$/, "") || absolute(`job/${j.jobId}`, url),
          location: j.cityStateCountry || j.location,
          posted: isoDate(j.postedDate)
        });
      }
      from += jobs.length;
      if (!jobs.length || from >= (r.totalHits || 0)) break;
      await sleep(2000);
    }
    return roles;
  },

  // Avature RSS job feed (Spark).
  async avatureFeed({ feed }) {
    const xml = await getText(feed);
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, it]) => ({
      title: decode((it.match(/<title>([\s\S]*?)<\/title>/) || [])[1]),
      url: decode((it.match(/<link>([\s\S]*?)<\/link>/) || [])[1]),
      posted: isoDate((it.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1])
    }));
  },

  // Air NZ: the vacancies sitemap lists every job (the paged /jobs?… search is
  // blocked by robots.txt). Real titles come from the /jobs page where shown;
  // otherwise the title is rebuilt from the job's web address.
  async airnz({ sitemap, listing, locationSlug }) {
    const xml = await getText(sitemap);
    const urls = [...xml.matchAll(/<loc>([^<]*\/job\/[^<]+)<\/loc>/g)].map((m) => decode(m[1]));
    await sleep(1500);
    const html = await getText(listing);
    const titles = {};
    for (const m of html.matchAll(/class="attrax-vacancy-tile__title[^"]*"[^>]*href="([^"]+)"[^>]*>\s*([^<]+?)\s*</g)) {
      titles[absolute(m[1], listing)] = decode(m[2]);
    }
    return urls
      .filter((u) => !locationSlug || u.includes(locationSlug))
      .map((u) => ({ title: titles[u] || titleFromSlug(u.split("/job/")[1] || u), url: u }));
  },

  // Workable public job board API.
  async workable({ account, country }) {
    const all = [];
    for (let token; ; ) {
      const d = await getJson(`https://apply.workable.com/api/v3/accounts/${account}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { token } : {})
      });
      all.push(...(d.results || []));
      token = d.nextPage;
      if (!token || !d.results?.length) break;
      await sleep(1500);
    }
    return all
      .filter((j) => country.test(j.location?.countryCode || j.location?.country || ""))
      .map((j) => ({
        title: j.title,
        url: `https://apply.workable.com/${account}/j/${j.shortcode}/`,
        location: [j.location?.city, j.location?.country].filter(Boolean).join(", "),
        posted: isoDate(j.published)
      }));
  },

  // Workable job widget (what "embed.js" on a company's own careers page loads).
  // Lists one entry per city, so the same job can appear several times.
  async workableWidget({ id, city }) {
    const d = await getJson(`https://apply.workable.com/api/v1/widget/accounts/${id}?details=true`);
    const roles = new Map();
    for (const j of d.jobs || []) {
      if (city && !city.test(j.city || "")) continue;
      const url = j.shortlink || j.url;
      if (!roles.has(url)) {
        roles.set(url, {
          title: j.title, url,
          location: [j.city, j.country].filter(Boolean).join(", "),
          posted: isoDate(j.published_on || j.created_at)
        });
      }
    }
    return [...roles.values()];
  },

  // Lever public postings API.
  async lever({ account }) {
    const d = await getJson(`https://api.lever.co/v0/postings/${account}?mode=json`);
    return d
      .filter((j) => /new zealand|auckland|wellington|christchurch/i.test(j.categories?.location || ""))
      .map((j) => ({ title: j.text, url: j.hostedUrl, location: j.categories?.location, posted: isoDate(j.createdAt) }));
  },

  // Breezy HR public JSON feed.
  async breezy({ account }) {
    const d = await getJson(`https://${account}.breezy.hr/json`);
    return d
      .filter((j) => /NZ|New Zealand/i.test(j.location?.name || j.location?.country?.name || ""))
      .map((j) => ({ title: j.name, url: j.url, location: j.location?.name, posted: isoDate(j.published_date) }));
  },

  // HiBob careers site (the same /api/job-ad list the public careers page loads).
  async hibob({ host, site, careers }) {
    // The API identifies the company from the careers page it's requested from.
    const d = await getJson(`https://${host}/api/job-ad`, { headers: { Referer: careers } });
    return (d.jobAdDetails || [])
      .filter((j) => site.test(j.site || ""))
      .map((j) => ({ title: j.title, url: `https://${host}/jobs/${j.id}`, location: j.site, posted: isoDate(j.publishedAt) }));
  }
};

// ---------- companies ----------
// area: what the count covers: "Auckland" where the careers system can filter
// by location, otherwise "NZ". Shown on the map next to the number.
const SOURCES = {
  "Westpac": {
    reader: "workday", area: "Auckland",
    careers: "https://westpacnz.wd105.myworkdayjobs.com/Westpac_Careers?locations=cda8a2a59ea710075dcd875752d30000",
    host: "westpacnz.wd105.myworkdayjobs.com", tenant: "westpacnz", site: "Westpac_Careers",
    facets: { locations: ["cda8a2a59ea710075dcd875752d30000"] } // = Auckland
  },
  "BNZ": {
    reader: "eightfold", area: "Auckland",
    careers: "https://nab.eightfold.ai/careers?microsite=bnz&location=Auckland%2C+New+Zealand&sort_by=distance&filter_distance=160&filter_include_remote=1&filter_include_relocation=0",
    host: "nab.eightfold.ai", domain: "nab.com.au", microsite: "bnz",
    params: "&location=Auckland%2C%20New%20Zealand&sort_by=distance&filter_distance=160&filter_include_remote=1&filter_include_relocation=0"
  },
  "One NZ": {
    reader: "successfactors", area: "Auckland",
    careers: "https://careers.one.nz/search/?createNewAlert=false&q=&locationsearch=auckland",
    url: "https://careers.one.nz/search/?createNewAlert=false&q=&locationsearch=auckland"
  },
  "ANZ": {
    reader: "successfactors", area: "Auckland",
    careers: "https://careers.anz.com/search/?createNewAlert=false&q=&locationsearch=auckland",
    url: "https://careers.anz.com/search/?createNewAlert=false&q=&locationsearch=auckland"
  },
  "Kordia": {
    reader: "hibob", area: "Auckland",
    careers: "https://kordia.careers.hibob.com/jobs?site=2551121",
    host: "kordia.careers.hibob.com", site: /auckland/i
  },
  "Spark": {
    reader: "avatureFeed", area: "NZ",
    careers: "https://careers.sparknz.co.nz/careers/SearchJobs",
    feed: "https://careers.sparknz.co.nz/careers/SearchJobs/feed/?jobRecordsPerPage=100"
  },
  "Air New Zealand": {
    reader: "airnz", area: "Auckland",
    careers: "https://careers.airnewzealand.co.nz/jobs",
    sitemap: "https://careers.airnewzealand.co.nz/vacanciessitemap.xml",
    listing: "https://careers.airnewzealand.co.nz/jobs", // robots.txt allows /jobs (only /jobs?… is disallowed)
    locationSlug: "-in-auckland-"
  },
  "Vista Group": {
    reader: "workable", area: "NZ",
    careers: "https://apply.workable.com/vista-group/",
    account: "vista-group", country: /^(NZ|New Zealand)$/i
  },
  "ClearPoint": {
    reader: "lever", area: "NZ",
    careers: "https://jobs.lever.co/clearpoint",
    account: "clearpoint"
  },
  "Serato": {
    reader: "breezy", area: "NZ",
    careers: "https://serato.com/careers",
    account: "serato-limited"
  },

  "Serko": {
    reader: "workable", area: "NZ",
    careers: "https://www.serko.com/careers#open-positions",
    account: "serko-ltd", country: /^(NZ|New Zealand)$/i
  },
  "Auckland Council": {
    reader: "successfactors", area: "Auckland",
    careers: "https://careers.aucklandcouncil.govt.nz/search/?createNewAlert=false&q=&locationsearch=auckland",
    url: "https://careers.aucklandcouncil.govt.nz/search/?createNewAlert=false&q=&locationsearch=auckland"
  },
  "Fujifilm NZ": {
    reader: "oracle", area: "NZ",
    careers: "https://hcjq.fa.ap1.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_9/jobs",
    host: "hcjq.fa.ap1.oraclecloud.com", siteNumber: "CX_9", locationTest: /new zealand/i
  },
  "Fiserv": {
    reader: "phenom", area: "Auckland",
    careers: "https://careers.fiserv.com/us/en/search-results?m=3&qkcityState=Auckland",
    url: "https://careers.fiserv.com/us/en/search-results?m=3&qkcityState=Auckland"
  },
  "DXC Technology": {
    // Workday has no city filter for DXC, only country.
    reader: "workday", area: "NZ",
    careers: "https://dxctechnology.wd1.myworkdayjobs.com/DXCJobs?locationCountry=55273a1b49934d97ae15342ef51f6b95",
    host: "dxctechnology.wd1.myworkdayjobs.com", tenant: "dxctechnology", site: "DXCJobs",
    facets: { locationCountry: ["55273a1b49934d97ae15342ef51f6b95"] } // = New Zealand
  },
  "Theta": {
    reader: "workableWidget", area: "Auckland",
    careers: "https://www.theta.co.nz/careers#opportunities",
    id: 7472, city: /auckland/i
  },
  "Orion Health": {
    reader: "workableWidget", area: "Auckland",
    careers: "https://orionhealth.com/nz/job-search/",
    id: 713716, city: /auckland/i
  }
  // Not included:
  //   Datacom  – its site blocks automated requests (Cloudflare).
  //   Fujitsu  – results load through /services/, which its robots.txt disallows.
  //   Trade Me, Kiwibank – Cornerstone (csod) sites need a session token; not a stable public feed.
  //   ASB, Mercury, Contact – robots.txt / API rules opt out of bots.
  //   Ricoh, The Instillery – only on Seek, which doesn't allow automated collection.
};

// ---------- run ----------
const here = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(here, "..", "data", "jobs.js");
const today = new Date().toISOString().slice(0, 10);

// Load last run's results so a temporary failure keeps the previous data.
let previous = {};
try {
  const sandbox = {};
  new Function("window", await readFile(outFile, "utf8"))(sandbox);
  previous = sandbox.JOBS || {};
} catch { /* first run */ }

// Optional: only refresh some companies, e.g.  node scripts/fetch-jobs.mjs "ANZ" "One NZ"
// (everyone else keeps their previous data).
const only = process.argv.slice(2);

const results = {};
let failed = 0;
for (const [name, src] of Object.entries(SOURCES)) {
  if (only.length && !only.includes(name)) {
    if (previous[name]) results[name] = previous[name];
    continue;
  }
  try {
    const all = await readers[src.reader](src);
    if (!Array.isArray(all)) throw new Error("reader did not return a list");
    const roles = all
      .filter((r) => r.title && !PLACEHOLDER.test(r.title))
      .sort((a, b) => (b.posted || "").localeCompare(a.posted || "") || a.title.localeCompare(b.title));
    results[name] = { count: roles.length, area: src.area, careers: src.careers, updated: today, roles };
    const skipped = all.length - roles.length;
    console.log(`✔ ${name.padEnd(18)} ${String(roles.length).padStart(3)} roles${skipped ? `  (${skipped} placeholder skipped)` : ""}`);
  } catch (e) {
    failed++;
    if (previous[name]) {
      results[name] = previous[name]; // keep last good data (with its old date)
      console.log(`✘ ${name.padEnd(18)} ${e.message} — kept previous (${previous[name].count} on ${previous[name].updated})`);
    } else {
      console.log(`✘ ${name.padEnd(18)} ${e.message}`);
    }
  }
  await sleep(1500); // be gentle between sites
}

const out =
  "// Generated by scripts/fetch-jobs.mjs — do not edit by hand.\n" +
  `window.JOBS_UPDATED = ${JSON.stringify(today)};\n` +
  `window.JOBS = ${JSON.stringify(results, null, 2)};\n`;

await writeFile(outFile, out);
console.log(`\nWrote data/jobs.js (${Object.keys(results).length} companies, ${failed} failed)`);
process.exit(0); // don't wait for idle network connections to time out
