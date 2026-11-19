(function () {
  "use strict";

  // Default framing when the page opens / "Reset view" is pressed: central Auckland CBD.
  var CBD_BOUNDS = L.latLngBounds([-36.8560, 174.7520], [-36.8405, 174.7720]);

  var companies = (window.COMPANIES || []).slice().sort(function (a, b) {
    return a.name.localeCompare(b.name);
  });

  // How far people can zoom IN. 16 = sharpest map; 17 = pins in busy spots separate more;
  // 18 = very close (map gets blurry and you may see no pins at all).
  var MAX_ZOOM = 17;

  // The area covered by all the pins (plus the CBD).
  var PIN_BOUNDS = L.latLngBounds(companies.map(function (c) { return [c.lat, c.lng]; }))
    .extend(CBD_BOUNDS);

  // Zooming out stops when all pins fit, plus this margin (0.15 = 15% extra each side).
  var PIN_MARGIN = 0.15;

  // Panning: any pin can be moved right across the screen (e.g. Wynyard Quarter
  // down to the bottom), but at least this many pixels of map past the outermost
  // pin always stay on screen, so you can't lose the pins entirely.
  var EDGE_PX = 700;

  // Sideways panning is capped at this many pixels past the outermost pins, so wide
  // screens don't show lots of empty suburbs to the west/east. 400 still lets the
  // western pins (e.g. Serato) slide out from behind the 300px roles panel.
  var SIDE_PX = 400;

  // ---------- Map ----------
  var map = L.map("map", {
    zoomControl: false,
    maxZoom: MAX_ZOOM,
    maxBoundsViscosity: 1.0 // 1.0 = hard edge, can't drag past it
  });

  // Pan limit is measured in screen pixels, so it differs for each zoom level.
  function limitsFor(z) {
    var size = map.getSize();
    var dx = Math.min(Math.max(size.x - EDGE_PX, 0), SIDE_PX);
    var dy = Math.max(size.y - EDGE_PX, 0);
    var sw = map.project(PIN_BOUNDS.getSouthWest(), z).add([-dx, dy]);
    var ne = map.project(PIN_BOUNDS.getNorthEast(), z).add([dx, -dy]);
    return L.latLngBounds(map.unproject(sw, z), map.unproject(ne, z));
  }
  function updateLimits() {
    map.setMinZoom(map.getBoundsZoom(PIN_BOUNDS.pad(PIN_MARGIN)));
    map.setMaxBounds(limitsFor(map.getZoom()));
  }
  map.on("zoomend resize", updateLimits);

  // When zooming, Leaflet keeps the view inside the limit — but it would use the
  // limit of the zoom level you're leaving, then snap back once the zoom ends.
  // Use the limit of the zoom level you're going TO instead, so there's no jump.
  var limitCenter = map._limitCenter;
  map._limitCenter = function (center, zoom, bounds) {
    return limitCenter.call(this, center, zoom, bounds && limitsFor(zoom));
  };
  L.control.zoom({ position: "bottomright" }).addTo(map);

  // Esri Light Gray Canvas: minimal basemap, free, no API key, works from file:// and GitHub Pages.
  // Real tiles only exist up to zoom 16; beyond that Leaflet enlarges them (maxNativeZoom).
  var ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/";
  L.tileLayer(ESRI + "World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: MAX_ZOOM,
    maxNativeZoom: 16,
    attribution:
      'Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Esri, HERE, Garmin, ' +
      '&copy; OpenStreetMap contributors, and the GIS User Community'
  }).addTo(map);
  // Street / place name labels drawn on top of the gray base.
  L.tileLayer(ESRI + "World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: MAX_ZOOM,
    maxNativeZoom: 16
  }).addTo(map);

  function resetView() {
    map.fitBounds(CBD_BOUNDS, { padding: [10, 10] });
  }
  resetView();
  updateLimits();
  document.getElementById("reset").addEventListener("click", function () {
    map.closePopup();
    resetView();
  });

  // ---------- Helpers ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Job counts from data/jobs.js (made by scripts/fetch-jobs.mjs). Companies
  // without a permitted data source simply have no count.
  var JOBS = window.JOBS || {};
  companies.forEach(function (c) { c.jobs = JOBS[c.name] || null; });

  function rolesText(n) { return n + (n === 1 ? " open role" : " open roles"); }

  function formatDate(iso) {
    var d = new Date(iso + "T00:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
  }

  function roleItem(r) {
    var meta = [r.location, r.posted ? "posted " + formatDate(r.posted) : ""].filter(Boolean).join(" · ");
    return (
      '<li><a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.title) + "</a>" +
      (meta ? '<span class="role-meta">' + esc(meta) + "</span>" : "") +
      "</li>"
    );
  }

  // Popup only shows the count; the full list of roles goes in the roles panel.
  function jobsHtml(c) {
    if (!c.jobs) {
      return (
        '<div class="jobs"><p class="na-note"><span class="na-dot' + (c.careers ? " link" : "") + '"></span>Open-role count not available</p>' +
        (c.careers ? '<a href="' + esc(c.careers) + '" target="_blank" rel="noopener">View jobs &rarr;</a>' : "") +
        "</div>"
      );
    }
    return (
      '<div class="jobs"><p><b>' + rolesText(c.jobs.count) + "</b> in " + esc(c.jobs.area || "NZ") +
      ' <span class="asof">(as of ' + esc(formatDate(c.jobs.updated)) + ")</span></p>" +
      '<a href="' + esc(c.jobs.careers) + '" target="_blank" rel="noopener">View jobs &rarr;</a></div>'
    );
  }

  // ---------- Roles panel ----------
  var rp = {
    el: document.getElementById("roles-panel"),
    logo: document.getElementById("rp-logo"),
    name: document.getElementById("rp-name"),
    sub: document.getElementById("rp-sub"),
    list: document.getElementById("rp-list"),
    careers: document.getElementById("rp-careers")
  };

  function openRoles(c) {
    if (!c.jobs) { closeRoles(); return; }
    var roles = c.jobs.roles;
    rp.logo.src = c.logo;
    rp.name.textContent = c.name;
    rp.sub.textContent =
      rolesText(c.jobs.count) + " in " + (c.jobs.area || "NZ") + " · as of " + formatDate(c.jobs.updated);
    rp.careers.href = c.jobs.careers;
    if (roles && roles.length) {
      rp.list.innerHTML = roles.map(roleItem).join("");
    } else {
      rp.list.innerHTML =
        '<li class="rp-empty">' +
        (roles ? "No open roles right now." : "The list of roles will appear after the next update.") +
        "</li>";
    }
    rp.list.scrollTop = 0;
    rp.el.hidden = false;
  }

  function closeRoles() { rp.el.hidden = true; }

  document.getElementById("rp-close").addEventListener("click", function () { map.closePopup(); closeRoles(); });

  function popupHtml(c) {
    return (
      '<div class="pop">' +
        '<img src="' + esc(c.logo) + '" alt="">' +
        "<div>" +
          "<h3>" + esc(c.name) + "</h3>" +
          '<span class="cat">' + esc(c.category) + "</span>" +
          (c.description ? "<p>" + esc(c.description) + "</p>" : "") +
          (c.address ? '<p class="addr">' + esc(c.address) + "</p>" : "") +
          jobsHtml(c) +
        "</div>" +
      "</div>"
    );
  }

  // Phone-sized screen? (matches the CSS breakpoint)
  function isNarrow() { return window.matchMedia("(max-width: 760px)").matches; }

  // ---------- Markers ----------
  var selected = null;

  companies.forEach(function (c) {
    var icon = L.divIcon({
      className: "logo-marker",
      html:
        '<div class="logo-wrap"><div class="logo-pin">' +
        '<img src="' + esc(c.logo) + '" alt="' + esc(c.name) + '">' +
        "</div>" +
        (c.jobs
          ? '<span class="job-badge' + (c.jobs.count ? "" : " zero") + '" title="' +
            esc(rolesText(c.jobs.count)) + '">' + c.jobs.count + "</span>"
          // No data for this company: a plain red dot (a number would be misleading).
          // Orange = careers link available, red = no link either.
          : '<span class="job-badge na' + (c.careers ? " link" : "") + '" title="Open-role count not available' +
            (c.careers ? " (careers link in popup)" : "") + '"></span>') +
        "</div>",
      iconSize: [40, 48],
      iconAnchor: [20, 48],
      popupAnchor: [0, -46]
    });

    c.marker = L.marker([c.lat, c.lng], { icon: icon, title: c.name, riseOnHover: true })
      // Left padding keeps the popup clear of the roles panel when the map auto-pans.
      .bindPopup(popupHtml(c), { maxWidth: 300, autoPanPaddingTopLeft: [isNarrow() ? 10 : 330, 10] })
      .addTo(map);

    c.marker.on("popupopen", function () { select(c); });
    c.marker.on("popupclose", function () { if (selected === c) select(null); });
  });

  function select(c) {
    if (selected && selected.marker.getElement()) {
      selected.marker.getElement().classList.remove("selected");
    }
    if (selected && selected.li) selected.li.classList.remove("active");
    selected = c;
    if (!c) { closeRoles(); return; }
    openRoles(c);
    var el = c.marker.getElement();
    if (el) el.classList.add("selected");
    c.marker.setZIndexOffset(1000);
    if (c.li) {
      c.li.classList.add("active");
      c.li.scrollIntoView({ block: "nearest" });
    }
  }

  // ---------- Side panel ----------
  if (window.JOBS_UPDATED) {
    var upd = document.getElementById("jobs-updated");
    upd.textContent = "Open roles last updated " + formatDate(window.JOBS_UPDATED);
    upd.hidden = false;
  }
  var listEl = document.getElementById("list");
  var searchEl = document.getElementById("search");
  var filtersEl = document.getElementById("filters");
  var countEl = document.getElementById("count");
  var panel = document.getElementById("panel");
  var isMobile = window.matchMedia("(max-width: 760px)");

  var categories = ["All"].concat(
    companies
      .map(function (c) { return c.category; })
      .filter(function (v, i, a) { return v && a.indexOf(v) === i; })
      .sort()
  );
  var activeCat = "All";

  categories.forEach(function (cat) {
    var b = document.createElement("button");
    b.className = "chip" + (cat === activeCat ? " active" : "");
    b.textContent = cat;
    b.addEventListener("click", function () {
      activeCat = cat;
      Array.prototype.forEach.call(filtersEl.children, function (x) {
        x.classList.toggle("active", x === b);
      });
      render();
    });
    filtersEl.appendChild(b);
  });

  // ---------- Show / hide individual companies ----------
  // Remembered per browser; if storage is unavailable it just isn't remembered.
  var HIDDEN_KEY = "acm-hidden-companies";
  var hidden = {};
  try { (JSON.parse(localStorage.getItem(HIDDEN_KEY)) || []).forEach(function (n) { hidden[n] = true; }); } catch (e) {}

  function saveHidden() {
    try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(Object.keys(hidden))); } catch (e) {}
  }
  function setHidden(c, value) {
    if (value) hidden[c.name] = true; else delete hidden[c.name];
    c.toggle.checked = !value;
  }

  companies.forEach(function (c) {
    var li = document.createElement("li");
    li.className = "item";

    var toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "show-toggle";
    toggle.checked = !hidden[c.name];
    toggle.title = "Show on map";
    toggle.setAttribute("aria-label", "Show " + c.name + " on map");
    // Ticking the box only shows/hides — it doesn't fly the map to the company.
    toggle.addEventListener("click", function (e) { e.stopPropagation(); });
    toggle.addEventListener("change", function () {
      setHidden(c, !toggle.checked);
      saveHidden();
      render();
    });
    c.toggle = toggle;
    li.appendChild(toggle);

    li.insertAdjacentHTML("beforeend",
      '<img src="' + esc(c.logo) + '" alt="">' +
      '<div><div class="name">' + esc(c.name) + "</div>" +
      '<div class="meta">' + esc(c.category) + (c.address ? " · " + esc(c.address) : "") +
      (c.jobs ? ' · <span class="roles">' + rolesText(c.jobs.count) + "</span>" : "") +
      "</div></div>");
    li.addEventListener("click", function () {
      // Clicking a hidden company's row turns it back on.
      if (hidden[c.name]) { setHidden(c, false); saveHidden(); render(); }
      if (isMobile.matches) setCollapsed(true);
      map.flyTo([c.lat, c.lng], MAX_ZOOM, { duration: 0.6 });
      map.once("moveend", function () { c.marker.openPopup(); });
    });
    c.li = li;
    listEl.appendChild(li);
  });

  var emptyEl = document.createElement("li");
  emptyEl.className = "empty";
  emptyEl.textContent = "No companies match your search.";
  listEl.appendChild(emptyEl);

  function matchesFilters(c) {
    var q = searchEl.value.trim().toLowerCase();
    var hay = (c.name + " " + c.category + " " + (c.address || "")).toLowerCase();
    return (activeCat === "All" || c.category === activeCat) && (!q || hay.indexOf(q) !== -1);
  }

  var onMapEl = document.getElementById("on-map");

  function render() {
    var listed = 0, onMap = 0;
    companies.forEach(function (c) {
      var inList = matchesFilters(c);
      var showPin = inList && !hidden[c.name];
      c.li.style.display = inList ? "" : "none";
      c.li.classList.toggle("off", !!hidden[c.name]);
      if (inList) listed++;
      if (showPin) {
        onMap++;
        if (!map.hasLayer(c.marker)) c.marker.addTo(map);
      } else if (map.hasLayer(c.marker)) {
        map.removeLayer(c.marker);
      }
    });
    emptyEl.style.display = listed ? "none" : "";
    countEl.textContent = listed;
    onMapEl.textContent = onMap + " of " + listed + " shown on map";
  }
  searchEl.addEventListener("input", render);

  // Show all / Hide all apply to the companies currently listed (respects search + category).
  function setAllListed(hide) {
    companies.forEach(function (c) { if (matchesFilters(c)) setHidden(c, hide); });
    saveHidden();
    render();
  }
  document.getElementById("show-all").addEventListener("click", function () { setAllListed(false); });
  document.getElementById("hide-all").addEventListener("click", function () { setAllListed(true); });

  render();

  // Mobile bottom-sheet toggle
  var toggle = document.getElementById("panel-toggle");
  function setCollapsed(v) {
    panel.classList.toggle("collapsed", v);
    toggle.setAttribute("aria-expanded", String(!v));
  }
  toggle.addEventListener("click", function () {
    setCollapsed(!panel.classList.contains("collapsed"));
  });
  if (isMobile.matches) setCollapsed(true);

  // ---------- Edit mode: add ?edit to the URL, click the map to get coordinates ----------
  if (/[?&]edit\b/.test(location.search)) {
    map.on("click", function (e) {
      var txt = "lat: " + e.latlng.lat.toFixed(5) + ", lng: " + e.latlng.lng.toFixed(5);
      if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(function () {});
      L.popup({ className: "coord-pop" })
        .setLatLng(e.latlng)
        .setContent("<code>" + txt + "</code><br><small>Copied to clipboard</small>")
        .openOn(map);
    });
  }
})();
