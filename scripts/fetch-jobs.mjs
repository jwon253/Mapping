/*
 * Fetches the number of open roles for each company and writes data/jobs.js.
 *
 *   Run:  node scripts/fetch-jobs.mjs
 *
 * Only uses careers systems whose robots.txt allows automated access (or that
 * publish an official job feed). Companies that opt out of bots — e.g. ASB,
 * Mercury, Contact — are deliberately NOT included here.
 *
 * "Open roles" = jobs located in New Zealand, excluding placeholder ads such as
 * "Expressions of Interest".
 *
 * Keys in SOURCES must match the `name` field in data/companies.js exactly.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const UA = "AucklandCompanyMap/1.0 (personal portfolio project; weekly job count)";

// Ads that aren't real openings.
const PLACEHOLDER = /expressions? of interest|share your details|register your interest|talent (pool|community)|general application/i;

// ---------- helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, opts = {}, tries = 3) {
  const res = await fetch(url, {
    ...opts,
    headers: { "User-Agent": UA, Accept: "application/json, text/html", ...(opts.headers || {}) }
  });
  // 429 = "too many requests": wait and try again a couple of times.
  if (res.status === 429 && tries > 1) {
    await sleep(10000);
    return get(url, opts, tries - 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res;
}
const getText = async (url, opts) => (await get(url, opts)).text();
const getJson = async (url, opts) => (await get(url, opts)).json();

function firstNumber(html, regexes) {
  for (const re of regexes) {
    const m = html.match(re);
    if (m) return parseInt(m[1].replace(/,/g, ""), 10);
  }
  throw new Error("count not found on page");
}

// ---------- one reader per careers system ----------
const readers = {
  // Workday (public careers site JSON). `facets` = the filters from the careers URL,
  // e.g. ?locations=abc123  ->  { locations: ["abc123"] }
  async workday({ host, tenant, site, facets = {} }) {
    const d = await getJson(`https://${host}/wday/cxs/${tenant}/${site}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 1, offset: 0, searchText: "", appliedFacets: facets })
    });
    return d.total;
  },

  // Eightfold (robots.txt explicitly allows /api/pcsx). `params` = location filters.
  async eightfold({ host, domain, microsite, params = "" }) {
    const d = await getJson(
      `https://${host}/api/pcsx/search?domain=${domain}&microsite=${microsite}&query=&start=0${params}`
    );
    return d.data.count;
  },

  // Plain HTML careers pages that show "N results" / "of N".
  async htmlCount({ url, patterns }) {
    return firstNumber(await getText(url), patterns);
  },

  // Workable public job board API.
  async workable({ account, country }) {
    const d = await getJson(`https://apply.workable.com/api/v3/accounts/${account}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    return d.results.filter(
      (j) => (j.location?.countryCode || j.location?.country || "").match(country) && !PLACEHOLDER.test(j.title)
    ).length;
  },

  // Lever public postings API.
  async lever({ account }) {
    const d = await getJson(`https://api.lever.co/v0/postings/${account}?mode=json`);
    return d.filter((j) => /new zealand|auckland|wellington|christchurch/i.test(j.categories?.location || "") && !PLACEHOLDER.test(j.text)).length;
  },

  // Breezy HR public JSON feed.
  async breezy({ account }) {
    const d = await getJson(`https://${account}.breezy.hr/json`);
    return d.filter((j) => /NZ|New Zealand/i.test(j.location?.name || j.location?.country?.name || "") && !PLACEHOLDER.test(j.name)).length;
  },

  // HiBob careers site (the same /api/job-ad list the public careers page loads).
  // Each job has a `site` (office), e.g. "Auckland - Victoria Street".
  async hibob({ host, site, careers }) {
    // The API identifies the company from the careers page it's requested from.
    const d = await getJson(`https://${host}/api/job-ad`, { headers: { Referer: careers } });
    return (d.jobAdDetails || []).filter((j) => site.test(j.site || "") && !PLACEHOLDER.test(j.title)).length;
  }
};

// ---------- companies ----------
// area: what the count covers — "Auckland" where the careers system can filter
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
    reader: "htmlCount", area: "Auckland",
    careers: "https://careers.one.nz/search/?createNewAlert=false&q=&locationsearch=auckland",
    url: "https://careers.one.nz/search/?createNewAlert=false&q=&locationsearch=auckland",
    patterns: [/of\s+<b>([\d,]+)<\/b>/i, /of\s+([\d,]+)\s+Jobs/i]
  },
  "ANZ": {
    reader: "htmlCount", area: "Auckland",
    careers: "https://careers.anz.com/search/?createNewAlert=false&q=&locationsearch=auckland",
    url: "https://careers.anz.com/search/?createNewAlert=false&q=&locationsearch=auckland",
    patterns: [/of\s+<b>([\d,]+)<\/b>/i, /of\s+([\d,]+)\s+Jobs/i]
  },
  "Kordia": {
    reader: "hibob", area: "Auckland",
    careers: "https://kordia.careers.hibob.com/jobs?site=2551121",
    host: "kordia.careers.hibob.com", site: /auckland/i
  },
  "Spark": {
    reader: "htmlCount", area: "NZ",
    careers: "https://careers.sparknz.co.nz/careers/SearchJobs",
    url: "https://careers.sparknz.co.nz/careers/SearchJobs",
    patterns: [/([\d,]+)\s+results/i, /of\s+([\d,]+)/i]
  },
  "Air New Zealand": {
    reader: "htmlCount", area: "NZ",
    careers: "https://careers.airnewzealand.co.nz/jobs",
    url: "https://careers.airnewzealand.co.nz/jobs", // robots.txt allows /jobs (only /jobs?… is disallowed)
    patterns: [/([\d,]+)\s+results/i]
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
    careers: "https://serato-limited.breezy.hr/",
    account: "serato-limited"
  }
};

// ---------- run ----------
const here = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(here, "..", "data", "jobs.js");
const today = new Date().toISOString().slice(0, 10);

// Load last run's results so a temporary failure keeps the previous number.
let previous = {};
try {
  const sandbox = {};
  new Function("window", await readFile(outFile, "utf8"))(sandbox);
  previous = sandbox.JOBS || {};
} catch { /* first run */ }

const results = {};
let failed = 0;
for (const [name, src] of Object.entries(SOURCES)) {
  try {
    const count = await readers[src.reader](src);
    if (!Number.isFinite(count)) throw new Error("not a number: " + count);
    results[name] = { count, area: src.area, careers: src.careers, updated: today };
    console.log(`✔ ${name.padEnd(18)} ${count}`);
  } catch (e) {
    failed++;
    if (previous[name]) {
      results[name] = previous[name]; // keep last good value (with its old date)
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
