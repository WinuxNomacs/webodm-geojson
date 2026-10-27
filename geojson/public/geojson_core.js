// The GeoJSON editor's logic without the map: the checks a boundary passes (the same as boundary.py on the server,
// which is what ODM reads), the text of a file, the library's requests, and the basemaps and coordinate search (copied
// from the mission planner's planner_core.js, since a plugin's files are served only while it is enabled).
(function (root) {
    var DECIMALS = 9;          // terra-draw refuses corners with more decimals
    var WGS84_CRS_NAMES = ["urn:ogc:def:crs:OGC:1.3:CRS84", "urn:ogc:def:crs:OGC::CRS84", "EPSG:4326", "urn:ogc:def:crs:EPSG::4326"];
    var EARTH_RADIUS = 6378137;

    function BoundaryError(message) { this.message = message; }
    BoundaryError.prototype = Object.create(Error.prototype);
    BoundaryError.prototype.name = "BoundaryError";

    function isObject(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
    function round(v, digits) { var m = Math.pow(10, digits); return Math.round(v * m) / m; }

    // -- checks -------------------------------------------------------------------------------------------------------

    // The Polygon geometry in a GeoJSON object: a bare geometry, a Feature or a FeatureCollection of one
    function polygonGeometry(data) {
        if (!isObject(data)) throw new BoundaryError("This is not GeoJSON: expected an object with a \"type\"");
        var crs = isObject(data.crs) && isObject(data.crs.properties) ? data.crs.properties.name : null;
        if (crs && WGS84_CRS_NAMES.indexOf(crs) === -1) throw new BoundaryError("The coordinates must be longitude and latitude (WGS 84), not " + crs);

        var kind = data.type;
        if (kind === "FeatureCollection") {
            var features = data.features;
            if (!Array.isArray(features) || features.length !== 1) {
                throw new BoundaryError("A boundary is a single polygon: this file has " + (Array.isArray(features) ? features.length : "no") + " features");
            }
            data = features[0];
            kind = isObject(data) ? data.type : null;
        }
        if (kind === "Feature") {
            data = data.geometry;
            kind = isObject(data) ? data.type : null;
        }

        if (kind === "MultiPolygon") {
            var parts = data.coordinates;
            if (Array.isArray(parts) && parts.length === 1) return {type: "Polygon", coordinates: parts[0]};
            throw new BoundaryError("A boundary is a single polygon: this MultiPolygon has " + (Array.isArray(parts) ? parts.length : "no") + " parts");
        }
        if (kind !== "Polygon") throw new BoundaryError("A boundary must be a polygon, not " + (kind || "an empty geometry"));
        return data;
    }

    // The polygon's corners as [[lon, lat], ...], rounded, without the closing corner or repeated corners
    function outerRing(geometry) {
        var rings = geometry.coordinates;
        if (!Array.isArray(rings) || !rings.length) throw new BoundaryError("The polygon has no corners");
        if (rings.length > 1) throw new BoundaryError("The polygon has holes: ODM uses only its outline, so draw it without them");

        var ring = [];
        (Array.isArray(rings[0]) ? rings[0] : []).forEach(function (p) {
            if (!Array.isArray(p) || p.length < 2) throw new BoundaryError("A corner is not a [longitude, latitude] pair");
            var lon = typeof p[0] === "number" ? p[0] : NaN, lat = typeof p[1] === "number" ? p[1] : NaN;
            if (isNaN(lon) || isNaN(lat)) throw new BoundaryError("A corner is not a [longitude, latitude] pair");
            if (!isFinite(lon) || !isFinite(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) {
                throw new BoundaryError("A corner is outside longitude -180..180, latitude -90..90: [" + p[0] + ", " + p[1] + "]");
            }
            var corner = [round(lon, DECIMALS), round(lat, DECIMALS)];
            var last = ring[ring.length - 1];
            if (!last || last[0] !== corner[0] || last[1] !== corner[1]) ring.push(corner);
        });
        if (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring.pop();
        if (ring.length < 3) throw new BoundaryError("A polygon needs at least 3 different corners");
        return ring;
    }

    // The area inside the ring in square meters, on a sphere (the server computes it on the WGS 84 ellipsoid when saving)
    function ringArea(ring) {
        var total = 0, rad = Math.PI / 180;
        for (var i = 0; i < ring.length; i++) {
            var a = ring[i], b = ring[(i + 1) % ring.length];
            total += (b[0] - a[0]) * rad * (2 + Math.sin(a[1] * rad) + Math.sin(b[1] * rad));
        }
        return Math.abs(total * EARTH_RADIUS * EARTH_RADIUS / 2);
    }

    // The ring's area in square degrees: zero when its corners are on one line on the map
    function flatArea(ring) {
        var total = 0;
        for (var i = 0; i < ring.length; i++) {
            var a = ring[i], b = ring[(i + 1) % ring.length];
            total += a[0] * b[1] - b[0] * a[1];
        }
        return Math.abs(total) / 2;
    }

    function featureCollection(ring) {
        return {type: "FeatureCollection", features: [{type: "Feature", properties: {},
                geometry: {type: "Polygon", coordinates: [ring.concat([ring[0]])]}}]};
    }

    // {ring, geojson (as stored), area} for a GeoJSON object, or a BoundaryError saying what is wrong with it
    function normalize(data) {
        var ring = outerRing(polygonGeometry(data));
        if (flatArea(ring) < 1e-14) throw new BoundaryError("The polygon has no area: its corners are on one line");
        return {ring: ring, geojson: featureCollection(ring), area: ringArea(ring)};
    }

    // normalize() for the text of a file: {ring, geojson, area} or {error}
    function parseText(text) {
        var data;
        try { data = JSON.parse(text); } catch (e) { return {error: "This is not JSON: " + e.message}; }
        try { return normalize(data); } catch (e) {
            if (e instanceof BoundaryError) return {error: e.message};
            throw e;
        }
    }

    // A boundary's text: one corner per line, so that it can be read and edited by hand
    function formatGeoJson(ring) {
        var corners = ring.concat([ring[0]]).map(function (p) { return "      [" + p[0] + ", " + p[1] + "]"; });
        return '{\n  "type": "FeatureCollection",\n  "features": [{\n    "type": "Feature",\n    "properties": {},\n' +
               '    "geometry": {"type": "Polygon", "coordinates": [[\n' + corners.join(",\n") + "\n    ]]}\n  }]\n}\n";
    }

    function sameRing(a, b) {
        if (!a || !b) return a === b;
        if (a.length !== b.length) return false;
        for (var i = 0; i < a.length; i++) if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
        return true;
    }

    // [[west, south], [east, north]]
    function ringBounds(ring) {
        var b = [[Infinity, Infinity], [-Infinity, -Infinity]];
        ring.forEach(function (p) {
            b[0][0] = Math.min(b[0][0], p[0]); b[0][1] = Math.min(b[0][1], p[1]);
            b[1][0] = Math.max(b[1][0], p[0]); b[1][1] = Math.max(b[1][1], p[1]);
        });
        return b;
    }

    // The saved file's corners (it is stored normalized)
    function fileRing(file) {
        try { return normalize(file.geojson).ring; } catch (e) { return null; }
    }

    // -- the library --------------------------------------------------------------------------------------------------

    function filterFiles(files, query) {
        var q = String(query || "").trim().toLowerCase();
        if (!q) return files;
        return files.filter(function (f) {
            return f.name.toLowerCase().indexOf(q) !== -1 || (f.owner || "").toLowerCase().indexOf(q) !== -1;
        });
    }

    // `base`, or "base 2", "base 3"... when the library has a file of that name (names are unique, ignoring case)
    function uniqueName(base, names) {
        var taken = {};
        (names || []).forEach(function (n) { taken[String(n).toLowerCase()] = true; });
        if (!taken[base.toLowerCase()]) return base;
        for (var i = 2; ; i++) if (!taken[(base + " " + i).toLowerCase()]) return base + " " + i;
    }

    // The name of an imported file, from its file name
    function nameFromFileName(fileName) {
        return String(fileName || "").replace(/\.(geo)?json$/i, "").trim() || "Imported boundary";
    }

    // The name of a downloaded file: spaces turned into _, and no characters a file name cannot have
    function downloadName(name) {
        return (String(name || "").trim().replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_") || "boundary") + ".geojson";
    }

    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function formatDate(iso) {
        var d = new Date(iso);
        if (isNaN(d.getTime())) return "";
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }

    // m² below a hectare, ha below 100 km², km² above (a field in ha, a region in km²)
    function formatArea(m2) {
        if (m2 < 1e4) return Math.round(m2 * 100) / 100 + " m²";
        if (m2 < 1e8) return Math.round(m2 / 100) / 100 + " ha";
        return Math.round(m2 / 1e4) / 100 + " km²";
    }

    // What the server says is wrong, in one line: DRF answers {detail} or {field: [messages]}
    function errorMessage(body, status) {
        if (isObject(body)) {
            if (body.detail) return String(body.detail);
            var messages = [];
            Object.keys(body).forEach(function (k) { [].concat(body[k]).forEach(function (m) { messages.push(String(m)); }); });
            if (messages.length) return messages.join(" ");
        }
        return "The server answered " + status;
    }

    // The library's requests: each returns a promise of the answer's JSON, rejected with an Error saying what went wrong
    function createClient(fetchFn, api, csrf) {
        function send(method, path, body) {
            var init = {method: method, credentials: "same-origin", headers: {"X-CSRFToken": csrf}};
            if (body !== undefined) { init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(body); }
            return fetchFn(api + path, init).then(function (res) {
                if (res.status === 204) return null;
                return res.json().catch(function () { return null; }).then(function (data) {
                    if (!res.ok) throw new Error(errorMessage(data, res.status));
                    return data;
                });
            }, function () { throw new Error("Could not reach the server"); });
        }
        return {
            list: function () { return send("GET", "boundaries"); },
            create: function (name, geojson) { return send("POST", "boundaries", {name: name, geojson: geojson}); },
            update: function (id, changes) { return send("PATCH", "boundaries/" + id, changes); },
            remove: function (id) { return send("DELETE", "boundaries/" + id); }
        };
    }

    // -- map layers (copied from the mission planner) -------------------------------------------------------------------

    var OSM = {type: "tms", label: "OpenStreetMap", url: "//tile.openstreetmap.org/{z}/{x}/{y}.png", minzoom: 0, maxzoom: 19,
               attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'};

    function withProtocol(url, protocol) {
        return url.indexOf("//") === 0 ? (protocol || "https:") + url : url;
    }

    function wmsUrl(bm, url) {
        var format = bm.format || "image/png";
        var query = ["service=WMS", "request=GetMap", "version=1.1.1", "layers=" + encodeURIComponent(bm.layers || "0"),
                     "styles=" + encodeURIComponent(bm.styles || "default"), "format=" + encodeURIComponent(format),
                     "transparent=" + (format === "image/png"), "srs=EPSG:3857", "width=256", "height=256", "bbox={bbox-epsg-3857}"].join("&");
        return url + (url.indexOf("?") === -1 ? "?" : "&") + query;
    }

    // A MapLibre raster source for a basemap ({type: "tms" | "wms", url, subdomains, minzoom, maxzoom, attribution, ...}).
    // `protocol` is the page's ("http:" or "https:"), for URLs that start with //.
    function basemapSource(bm, protocol) {
        var url = withProtocol(bm.url || "", protocol);
        if (bm.type === "wms") url = wmsUrl(bm, url);

        // Leaflet's {-y}: tile rows counted from the south
        var scheme = "xyz";
        if (url.indexOf("{-y}") !== -1) { url = url.replace(/\{-y\}/g, "{y}"); scheme = "tms"; }

        var tiles;
        if (url.indexOf("{s}") !== -1) {
            var subdomains = bm.subdomains && bm.subdomains.length ? bm.subdomains : ["a", "b", "c"];
            tiles = subdomains.map(function (sub) { return url.replace(/\{s\}/g, sub); });
        } else {
            tiles = [url];
        }

        var source = {type: "raster", tiles: tiles, tileSize: 256, scheme: scheme, minzoom: bm.minzoom || 0, maxzoom: bm.maxzoom || 21};
        if (bm.attribution) source.attribution = bm.attribution;
        return source;
    }

    // The basemap to show: the one the user chose last, else the project's default, else the first, else OpenStreetMap
    function chooseBasemap(basemaps, savedLabel) {
        var list = Array.isArray(basemaps) ? basemaps.filter(function (b) { return b && b.url; }) : [];
        if (!list.length) return OSM;
        for (var i = 0; i < list.length; i++) if (savedLabel && list[i].label === savedLabel) return list[i];
        for (var j = 0; j < list.length; j++) if (list[j].default) return list[j];
        return list[0];
    }

    // "40.7128, -74.0060", "40.7128 -74.0060", "40.7128,-74.0060": two numbers, comma and/or whitespace between them.
    // Returns [lat, lng] or null - the search panel tries this before geocoding the text as an address.
    var COORDS_RE = /^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/;
    function parseCoordinates(text) {
        var m = String(text).match(COORDS_RE);
        if (!m) return null;
        var lat = parseFloat(m[1]), lng = parseFloat(m[2]);
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
        return [lat, lng];
    }

    // -- address suggestions (Photon, komoot's geocoder of OpenStreetMap) ---------------------------------------------

    var PHOTON = "https://photon.komoot.io/api/", PHOTON_LANGUAGES = ["en", "de", "fr"];

    // "de-CH" -> "de"; null for a language Photon does not have (it then answers in the places' own)
    function photonLanguage(browserLanguage) {
        var lang = String(browserLanguage || "").toLowerCase().split("-")[0];
        return PHOTON_LANGUAGES.indexOf(lang) !== -1 ? lang : null;
    }

    // center: [lon, lat], which the answers are biased towards
    function photonUrl(query, center, lang) {
        var url = PHOTON + "?q=" + encodeURIComponent(query) + "&limit=5";
        if (center && isFinite(center[0]) && isFinite(center[1])) url += "&lat=" + (+center[1]).toFixed(4) + "&lon=" + (+center[0]).toFixed(4);
        if (lang) url += "&lang=" + lang;
        return url;
    }

    // Photon's GeoJSON answer -> [{label, detail, center: [lon, lat], bbox: [minLon, minLat, maxLon, maxLat] or null}]:
    // the place's name (or its street and number) and the places it is in. Places that would read the same (a square
    // mapped as a node and as an area) are listed once
    function photonSuggestions(json) {
        var seen = {};
        return ((json && json.features) || []).map(function (f) {
            var p = f.properties || {}, c = f.geometry && f.geometry.coordinates;
            if (!c || !isFinite(c[0]) || !isFinite(c[1])) return null;
            var street = [p.street, p.housenumber].filter(Boolean).join(" ");
            var label = p.name || street || p.city || p.state || p.country;
            if (!label) return null;
            var detail = [];
            [p.name ? street : "", p.city || p.county, p.state, p.country].forEach(function (part) {
                if (part && part !== label && detail.indexOf(part) === -1) detail.push(part);
            });
            var e = p.extent;            // [minLon, maxLat, maxLon, minLat]
            var bbox = e && e.length === 4 && e[0] !== e[2] && e[1] !== e[3] ? [e[0], e[3], e[2], e[1]] : null;
            var key = label + "\n" + detail.join(", ");
            if (seen[key]) return null;
            seen[key] = true;
            return {label: label, detail: detail.join(", "), center: [c[0], c[1]], bbox: bbox};
        }).filter(Boolean).slice(0, 5);
    }

    // The suggestions for a query, near center; none for "latitude, longitude", which needs no geocoding.
    // An unreachable service rejects, and the search panel then shows no list
    function suggestPlaces(fetchFn, query, center, lang) {
        if (parseCoordinates(query)) return Promise.resolve([]);
        return fetchFn(photonUrl(query, center, lang))
            .then(function (res) { if (!res.ok) throw new Error("Photon answered " + res.status); return res.json(); })
            .then(photonSuggestions);
    }

    // Moves a MapLibre map to a picked suggestion: its extent when it has one, else its point at zoom 15 or closer
    function showSuggestion(map, s) {
        if (s.bbox) map.fitBounds([[s.bbox[0], s.bbox[1]], [s.bbox[2], s.bbox[3]]], {padding: 40, maxZoom: 18});
        else map.flyTo({center: s.center, zoom: Math.max(map.getZoom(), 15)});
    }

    var api = {DECIMALS: DECIMALS, BoundaryError: BoundaryError, normalize: normalize, parseText: parseText, ringArea: ringArea,
               featureCollection: featureCollection, formatGeoJson: formatGeoJson, sameRing: sameRing, ringBounds: ringBounds,
               fileRing: fileRing, filterFiles: filterFiles, uniqueName: uniqueName, nameFromFileName: nameFromFileName,
               downloadName: downloadName, formatDate: formatDate, formatArea: formatArea, errorMessage: errorMessage,
               createClient: createClient, OSM: OSM, basemapSource: basemapSource, chooseBasemap: chooseBasemap,
               parseCoordinates: parseCoordinates, photonLanguage: photonLanguage, photonUrl: photonUrl,
               photonSuggestions: photonSuggestions, suggestPlaces: suggestPlaces, showSuggestion: showSuggestion};
    root.GeoJsonCore = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : {});
