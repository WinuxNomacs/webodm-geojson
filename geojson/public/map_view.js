// The GeoJSON editor's map: MapLibre with the project's basemaps, the layers and search buttons, and terra-draw to draw
// and edit one polygon. geojson_editor.js uses it through {setRing, setTool, tool, resize}, so that the editor can be
// tested with a fake map. Needs maplibregl, terra-draw and its MapLibre adapter (loaded from node_modules).
(function (root) {
    var VIEW_KEY = "geojson:view", BASEMAP_KEY = "geojson:basemap";

    function load(storage, key) { try { return storage.getItem(key); } catch (e) { return null; } }
    function store(storage, key, value) { try { storage.setItem(key, value); } catch (e) { /* not remembered */ } }

    // ctx: {doc, win, maplibregl, terraDraw, adapter, basemaps, fetchFn}
    // opts: {onShape(geometry | null), onTool(name), points, overlay} - onShape gets the drawn polygon each time it is
    // drawn or changed; points ([[lon, lat]], a task's photos) and overlay ({url, bounds, minzoom, maxzoom}, its orthophoto's tiles) are shown under it
    function createMapView(ctx, container, opts) {
        var Core = root.GeoJsonCore, maplibregl = ctx.maplibregl, win = ctx.win, storage = win.localStorage;
        var basemaps = (ctx.basemaps || []).filter(function (b) { return b && b.url; });
        if (!basemaps.length) basemaps = [Core.OSM];

        var lastView;
        try { lastView = JSON.parse(load(storage, VIEW_KEY) || "null"); } catch (e) { lastView = null; }
        var map = new maplibregl.Map({
            container: container,
            style: {version: 8, sources: {}, layers: []},          // the basemap is added below, from the project's list
            center: (lastView && lastView.center) || [0, 20], zoom: (lastView && lastView.zoom) || 2
        });
        map.addControl(new maplibregl.ScaleControl({unit: "metric"}), "bottom-left");
        map.on("moveend", function () {
            store(storage, VIEW_KEY, JSON.stringify({center: map.getCenter().toArray(), zoom: map.getZoom()}));
        });

        // -- layers and search ----------------------------------------------------------------------------------------

        function applyBasemap(bm) {
            if (map.getLayer("gj-basemap")) map.removeLayer("gj-basemap");
            if (map.getSource("gj-basemap")) map.removeSource("gj-basemap");
            map.addSource("gj-basemap", Core.basemapSource(bm));
            // Under the drawing, whose layers terra-draw adds on top
            var layers = map.getStyle().layers;
            map.addLayer({id: "gj-basemap", type: "raster", source: "gj-basemap"}, layers.length ? layers[0].id : undefined);
            layersPanel.setSelected(bm.label);
            store(storage, BASEMAP_KEY, bm.label);
        }

        var layersPanel = root.GeoJsonLayers.createLayersPanel(ctx.doc, {
            basemaps: basemaps, selected: null,
            onBasemap: function (label) {
                var chosen = basemaps.filter(function (b) { return b.label === label; })[0];
                if (chosen) applyBasemap(chosen);
            }
        });
        function zoomButtons() {
            var element = ctx.doc.createElement("div");
            element.className = "gj-ctrl-group theme-secondary theme-color-primary maplibregl-ctrl";
            [["Zoom in", "fa-plus", function () { map.zoomIn(); }], ["Zoom out", "fa-minus", function () { map.zoomOut(); }]].forEach(function (b) {
                var button = ctx.doc.createElement("button");
                button.type = "button";
                button.className = "theme-border";
                button.title = b[0];
                button.setAttribute("aria-label", b[0]);
                button.innerHTML = '<i class="fa ' + b[1] + '"></i>';
                button.addEventListener("click", b[2]);
                element.appendChild(button);
            });
            return element;
        }
        function control(element) {
            return {onAdd: function () { return element; }, onRemove: function () { if (element.parentNode) element.parentNode.removeChild(element); }};
        }
        // Zoom buttons of our own rather than MapLibre's, whose icons are images that cannot take the theme's colors
        map.addControl(control(zoomButtons()), "top-right");
        map.addControl(control(layersPanel.element), "top-right");

        // An address (suggested by Photon as one types, or geocoded via Nominatim on Enter) or "latitude, longitude"
        var searchPanel = root.GeoJsonSearch.createSearchPanel(ctx.doc, {
            suggest: function (query) {
                var c = map.getCenter();
                return Core.suggestPlaces(ctx.fetchFn, query, [c.lng, c.lat], Core.photonLanguage(win.navigator && win.navigator.language));
            },
            onPick: function (suggestion) { Core.showSuggestion(map, suggestion); },
            onSearch: function (query) {
                var coords = Core.parseCoordinates(query);
                if (coords) {
                    map.flyTo({center: [coords[1], coords[0]], zoom: Math.max(map.getZoom(), 15)});
                    return;
                }
                searchPanel.setLoading(true);
                ctx.fetchFn("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=" + encodeURIComponent(query))
                    .then(function (res) { return res.json(); })
                    .then(function (results) {
                        searchPanel.setLoading(false);
                        if (!results || !results.length) { searchPanel.setError("No results found for that address."); return; }
                        map.flyTo({center: [parseFloat(results[0].lon), parseFloat(results[0].lat)], zoom: Math.max(map.getZoom(), 15)});
                    })
                    .catch(function () { searchPanel.setLoading(false); searchPanel.setError("Could not reach the address search service."); });
            }
        });
        map.addControl(control(searchPanel.element), "top-right");

        // -- drawing ----------------------------------------------------------------------------------------------------

        var draw = null, tool = "polygon", pending = null;      // pending: a ring given before the map was ready

        function setTool(name) {
            tool = name;
            if (draw) draw.setMode(name);
            if (opts.onTool) opts.onTool(name);
        }

        // The last polygon drawn: drawing another replaces it
        function drawnShape() {
            var features = draw.getSnapshot().filter(function (f) { return f.geometry.type === "Polygon"; });
            return features.length ? features[features.length - 1].geometry : null;
        }

        function showRing(ring, fit) {
            draw.clear();
            if (!ring) return;
            draw.addFeatures([{type: "Feature", properties: {mode: "polygon"}, geometry: {type: "Polygon", coordinates: [ring.concat([ring[0]])]}}]);
            if (fit) map.fitBounds(Core.ringBounds(ring), {padding: 60, maxZoom: 19, duration: 0});
        }

        var points = opts.points || [];

        // Above the basemap and under the drawing
        function addTaskLayers() {
            if (opts.overlay) {
                var ortho = {type: "raster", tiles: [opts.overlay.url], tileSize: 256, maxzoom: opts.overlay.maxzoom || 22};
                if (opts.overlay.bounds) ortho.bounds = opts.overlay.bounds;
                if (opts.overlay.minzoom) ortho.minzoom = opts.overlay.minzoom;
                map.addSource("gj-ortho", ortho);
                map.addLayer({id: "gj-ortho", type: "raster", source: "gj-ortho"});
            }
            if (points.length) {
                map.addSource("gj-photos", {type: "geojson", data: {type: "FeatureCollection", features: points.map(function (p) {
                    return {type: "Feature", properties: {}, geometry: {type: "Point", coordinates: p}};
                })}});
                map.addLayer({id: "gj-photos", type: "circle", source: "gj-photos",
                              paint: {"circle-radius": 4, "circle-color": "#2a7fd4", "circle-stroke-color": "#fff", "circle-stroke-width": 1}});
            }
        }

        map.on("load", function () {
            applyBasemap(Core.chooseBasemap(basemaps, load(storage, BASEMAP_KEY)));
            addTaskLayers();
            // With no polygon to show, the photos
            if (points.length && !(pending && pending.ring)) map.fitBounds(Core.ringBounds(points), {padding: 60, maxZoom: 18, duration: 0});

            var TD = ctx.terraDraw;
            var editable = {feature: {draggable: true, rotateable: true, coordinates: {midpoints: true, draggable: true, deletable: true}}};
            draw = new TD.TerraDraw({
                adapter: new ctx.adapter.TerraDrawMapLibreGLAdapter({map: map, lib: maplibregl}),
                modes: [new TD.TerraDrawPolygonMode(), new TD.TerraDrawRectangleMode(),
                        new TD.TerraDrawSelectMode({flags: {polygon: editable, rectangle: editable}})]
            });
            draw.start();
            draw.on("finish", function (id, context) {
                if (context.action === "draw") {
                    draw.getSnapshot().forEach(function (f) { if (f.id !== id) draw.removeFeatures([f.id]); });
                    opts.onShape(drawnShape());
                    setTool("select");
                } else {
                    opts.onShape(drawnShape());
                }
            });
            draw.on("change", function (ids, type) { if (type === "update" && tool === "select") opts.onShape(drawnShape()); });

            if (pending) { showRing(pending.ring, pending.fit); pending = null; }
            setTool(tool);
        });

        return {
            // Shows a polygon (or none) without telling onShape: the editor already has it
            setRing: function (ring, fit) {
                if (draw) showRing(ring, fit); else pending = {ring: ring, fit: fit};
            },
            // "polygon", "rectangle" or "select"
            setTool: setTool,
            tool: function () { return tool; },
            resize: function () { map.resize(); },
            // terra-draw first: a drawing it has queued for the next frame would otherwise reach a removed map
            remove: function () {
                if (draw) draw.stop();
                map.remove();
            }
        };
    }

    var api = {createMapView: createMapView};
    root.GeoJsonMap = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : {});
