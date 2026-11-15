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

  // How far people can pan: the area covered by all the pins, plus a small margin.
  // Change PIN_MARGIN to allow more (0.3) or less (0.05) room around the pins.
  var PIN_MARGIN = 0.15;
  var PAN_LIMIT = L.latLngBounds(companies.map(function (c) { return [c.lat, c.lng]; }))
    .extend(CBD_BOUNDS)
    .pad(PIN_MARGIN);

  // ---------- Map ----------
  var map = L.map("map", {
    zoomControl: false,
    maxZoom: MAX_ZOOM,
    maxBounds: PAN_LIMIT,
    maxBoundsViscosity: 1.0 // 1.0 = hard edge, can't drag past it
  });

  // Don't allow zooming out further than the pan area (recalculated if the window resizes).
  function updateMinZoom() {
    map.setMinZoom(map.getBoundsZoom(PAN_LIMIT));
  }
  updateMinZoom();
  map.on("resize", updateMinZoom);
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

  function popupHtml(c) {
    return (
      '<div class="pop">' +
        '<img src="' + esc(c.logo) + '" alt="">' +
        "<div>" +
          "<h3>" + esc(c.name) + "</h3>" +
          '<span class="cat">' + esc(c.category) + "</span>" +
          (c.description ? "<p>" + esc(c.description) + "</p>" : "") +
          (c.address ? '<p class="addr">' + esc(c.address) + "</p>" : "") +
          (c.website
            ? '<a href="' + esc(c.website) + '" target="_blank" rel="noopener">Visit website &rarr;</a>'
            : "") +
        "</div>" +
      "</div>"
    );
  }

  // ---------- Markers ----------
  var selected = null;

  companies.forEach(function (c) {
    var icon = L.divIcon({
      className: "logo-marker",
      html:
        '<div class="logo-wrap"><div class="logo-pin">' +
        '<img src="' + esc(c.logo) + '" alt="' + esc(c.name) + '">' +
        "</div></div>",
      iconSize: [40, 48],
      iconAnchor: [20, 48],
      popupAnchor: [0, -46]
    });

    c.marker = L.marker([c.lat, c.lng], { icon: icon, title: c.name, riseOnHover: true })
      .bindPopup(popupHtml(c), { maxWidth: 300 })
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
    if (!c) return;
    var el = c.marker.getElement();
    if (el) el.classList.add("selected");
    c.marker.setZIndexOffset(1000);
    if (c.li) {
      c.li.classList.add("active");
      c.li.scrollIntoView({ block: "nearest" });
    }
  }

  // ---------- Side panel ----------
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

  companies.forEach(function (c) {
    var li = document.createElement("li");
    li.className = "item";
    li.innerHTML =
      '<img src="' + esc(c.logo) + '" alt="">' +
      '<div><div class="name">' + esc(c.name) + "</div>" +
      '<div class="meta">' + esc(c.category) + (c.address ? " · " + esc(c.address) : "") + "</div></div>";
    li.addEventListener("click", function () {
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

  function render() {
    var q = searchEl.value.trim().toLowerCase();
    var shown = 0;
    companies.forEach(function (c) {
      var hay = (c.name + " " + c.category + " " + (c.address || "")).toLowerCase();
      var visible = (activeCat === "All" || c.category === activeCat) && (!q || hay.indexOf(q) !== -1);
      c.li.style.display = visible ? "" : "none";
      if (visible) {
        shown++;
        if (!map.hasLayer(c.marker)) c.marker.addTo(map);
      } else if (map.hasLayer(c.marker)) {
        map.removeLayer(c.marker);
      }
    });
    emptyEl.style.display = shown ? "none" : "";
    countEl.textContent = shown;
  }
  searchEl.addEventListener("input", render);
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
