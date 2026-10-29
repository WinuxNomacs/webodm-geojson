// The Create GeoJSON and Use existing buttons beside a task's boundary option (Bounds & Cropping, in a new task's
// options and in Edit Task Options). Each opens the editor in a dialog over the options, with the task's photos (and
// its orthophoto, once processed) on the map; "Use for this task" fills the option with the polygon. The editor's
// scripts are loaded the first time a dialog opens. Loaded on every page (plugin.py's include_js_files); it adds the
// buttons only on a WebODM with the Task Options hook (PluginsAPI.Dashboard.presetDialogOptionsReady).
(function (root) {
    var PUBLIC = "/plugins/geojson/", API = "/api/plugins/geojson/";
    var STYLES = ["node_modules/maplibre-gl/dist/maplibre-gl.css"];
    var SCRIPTS = ["maplibre.mjs", "node_modules/terra-draw/dist/terra-draw.umd.js",
                   "node_modules/terra-draw-maplibre-gl-adapter/dist/terra-draw-maplibre-gl-adapter.umd.js",
                   "geojson_core.js", "layers_panel.js", "search_panel.js", "map_view.js", "geojson_editor.js"];

    function isPosition(p) { return p && isFinite(p[0]) && isFinite(p[1]) && p[0] !== null && p[1] !== null; }

    // The photos' positions in shots.geojson (ODM's camera shots): points, or the first corner of anything else
    function shotPositions(geojson) {
        return ((geojson && geojson.features) || []).map(function (f) {
            var c = f && f.geometry && f.geometry.coordinates;
            while (c && Array.isArray(c[0])) c = c[0];
            return c ? [c[0], c[1]] : null;
        }).filter(isPosition);
    }

    // {points, overlay} for the map: a new task's photos (as read from their EXIF), or a processed task's shots and
    // orthophoto ({url, bounds, minzoom, maxzoom}, from its metadata, so that no tile outside it is asked for).
    // Whatever cannot be had is left out: the map then starts where it was last left
    // The orthophoto's tiles, rescaled as the task's map does: an RGB one from its bands' range, a single band
    // (thermal) from its 2nd to 98th percentiles, which a few hot or cold pixels would otherwise turn all black
    function orthophotoLayer(base, meta) {
        var layer = {url: base + "orthophoto/tiles/{z}/{x}/{y}.png"};
        if (!meta) return layer;
        var stats = meta.statistics || {}, bands = Object.keys(stats), lo = Infinity, hi = -Infinity;
        bands.forEach(function (b) {
            var range = bands.length === 1 ? stats[b].percentiles || [] : [stats[b].min, stats[b].max];
            lo = Math.min(lo, range[0]);
            hi = Math.max(hi, range[1]);
        });
        if (isFinite(lo) && isFinite(hi) && lo < hi) layer.url += "?rescale=" + encodeURIComponent(lo + "," + hi);
        var bounds = meta.bounds && meta.bounds.value;
        if (bounds && bounds.length === 4) layer.bounds = bounds;
        if (isFinite(meta.minzoom) && meta.minzoom !== null) layer.minzoom = meta.minzoom;
        if (isFinite(meta.maxzoom) && meta.maxzoom !== null) layer.maxzoom = meta.maxzoom;
        return layer;
    }

    function taskLayers(taskContext, fetchFn) {
        var task = taskContext && taskContext.task, assets = (task && task.available_assets) || [];
        if (!task || task.id === undefined) {
            var positions;
            try { positions = (taskContext && taskContext.getPhotoPositions ? taskContext.getPhotoPositions() : []) || []; } catch (e) { positions = []; }
            return Promise.resolve({points: positions.filter(isPosition), overlay: null});
        }
        var base = "/api/projects/" + task.project + "/tasks/" + task.id + "/";
        function getJson(url) {
            return fetchFn(url, {credentials: "same-origin"})
                .then(function (res) { return res.ok ? res.json() : null; })
                .then(null, function () { return null; });
        }
        var overlay = assets.indexOf("orthophoto.tif") === -1 ? Promise.resolve(null) :
            getJson(base + "orthophoto/metadata").then(function (meta) { return orthophotoLayer(base, meta); });
        var shots = assets.indexOf("shots.geojson") === -1 ? Promise.resolve(null) : getJson(base + "download/shots.geojson");
        return Promise.all([shots, overlay]).then(function (r) { return {points: shotPositions(r[0]), overlay: r[1]}; });
    }

    function csrfToken(doc) {
        var m = (doc.cookie || "").match(/(?:^|;\s*)csrftoken=([^;]+)/);
        return m ? decodeURIComponent(m[1]) : "";
    }

    // The editor's styles and scripts, one after the other (each needs the ones before it); once per page. A module
    // script's load comes after it has run, as a classic one's does
    var assetsLoaded = null;
    function loadAssets(doc) {
        if (assetsLoaded) return assetsLoaded;
        STYLES.forEach(function (href) {
            var link = doc.createElement("link");
            link.rel = "stylesheet";
            link.href = PUBLIC + href;
            doc.head.appendChild(link);
        });
        assetsLoaded = SCRIPTS.reduce(function (previous, src) {
            return previous.then(function () {
                return new Promise(function (resolve, reject) {
                    var script = doc.createElement("script");
                    if (/\.mjs$/.test(src)) script.type = "module";
                    script.src = PUBLIC + src;
                    script.onload = resolve;
                    script.onerror = function () { reject(new Error("Could not load " + src)); };
                    doc.head.appendChild(script);
                });
            });
        }, Promise.resolve());
        assetsLoaded.catch(function () { assetsLoaded = null; });       // the next click tries again
        return assetsLoaded;
    }

    // The dialog: over the whole window, inside the options' modal (Bootstrap keeps the focus in the modal, and
    // Escape would close it)
    function dialogFrame(doc, element, title) {
        var host = (element && element.closest && element.closest(".modal")) || doc.body;
        var frame = doc.createElement("div");
        frame.className = "gj-task-dialog";
        frame.tabIndex = -1;
        frame.innerHTML = '<div class="gj-task-dialog-inner theme-secondary">' +
            '<div class="gj-task-dialog-header"><h4></h4>' +
              '<button type="button" class="btn btn-default btn-sm" data-gj="close"><i class="fa fa-times"></i> Close</button></div>' +
            '<div class="gj-task-dialog-body"><p class="gj-task-dialog-loading text-muted"><i class="fa fa-circle-notch fa-spin"></i> Loading the editor…</p></div>' +
          "</div>";
        frame.querySelector("h4").textContent = title;
        host.appendChild(frame);
        return {frame: frame, inner: frame.firstChild, body: frame.querySelector(".gj-task-dialog-body"), close: frame.querySelector('[data-gj="close"]')};
    }

    // ctx: {doc, win, fetchFn, view ("new" or "library"), args (the button's onClick args), load (the assets), editor}
    function openDialog(ctx) {
        var doc = ctx.doc, args = ctx.args;
        var parts = dialogFrame(doc, args.element, ctx.view === "library" ? "Use a GeoJSON boundary" : "Create a GeoJSON boundary");
        var editor = null, closed = false;

        function remove() {
            closed = true;
            if (editor) editor.destroy();
            if (parts.frame.parentNode) parts.frame.parentNode.removeChild(parts.frame);
            if (args.element && args.element.focus) args.element.focus();
        }
        // Asks first when a drawn boundary is not saved
        function close() {
            if (editor && !editor.mayClose()) return;
            remove();
        }
        parts.close.addEventListener("click", close);
        // Keys stay in the dialog: Escape closes it, not the options' modal under it. The focus moves into the
        // dialog, or the keys would go to the button that opened it, in the modal
        parts.frame.addEventListener("keydown", function (e) {
            e.stopPropagation();
            if (e.key === "Escape" && !e.defaultPrevented) close();
        });
        parts.frame.focus();

        var opened = Promise.all([ctx.load(doc), taskLayers(args.taskContext, ctx.fetchFn),
                                  ctx.fetchFn(API + "basemaps", {credentials: "same-origin"}).then(function (res) { return res.ok ? res.json() : []; },
                                                                                                  function () { return []; })])
            .then(function (results) {
                if (closed) return;
                var Core = root.GeoJsonCore, layers = results[1], value = args.getValue();
                var current = value ? Core.parseText(String(value)) : null;
                parts.body.innerHTML = "";
                // The editor's sticky top bars cover the list as it scrolls: they take the dialog's background
                var background = ctx.win && ctx.win.getComputedStyle ? ctx.win.getComputedStyle(parts.inner).backgroundColor : "";
                editor = (ctx.editor || root.GeoJsonEditor).init({
                    doc: doc, win: ctx.win, root: parts.body, fetchFn: ctx.fetchFn, api: API, csrf: csrfToken(doc),
                    basemaps: results[2] || [], barStyle: background ? "background-color: " + background + ";" : "", points: layers.points, overlay: layers.overlay,
                    maplibregl: root.maplibregl, terraDraw: root.terraDraw, adapter: root.terraDrawMaplibreGlAdapter,
                    start: {view: ctx.view, ring: current && !current.error ? current.ring : null},
                    use: {label: "Use for this task", onUse: function (featureCollection) {
                        args.setValue(JSON.stringify(featureCollection));
                        remove();
                    }}
                });
            }, function (err) {
                parts.body.innerHTML = '<p class="gj-error theme-color-button-danger"></p>';
                parts.body.firstChild.textContent = err.message;
            });
        return {frame: parts.frame, close: close, opened: opened, editor: function () { return editor; }};
    }

    // Two buttons for the boundary option, none for the others
    function buttonsFor(option, env) {
        if (option !== "boundary") return null;
        function open(view) {
            return function (clickArgs) {
                return openDialog({doc: env.doc, win: env.win, fetchFn: env.fetchFn, load: env.load || loadAssets, editor: env.editor,
                                   view: view, args: clickArgs});
            };
        }
        return [{label: "Create GeoJSON", icon: "fa fa-draw-polygon", title: "Draw the boundary on a map of the photos", onClick: open("new")},
                {label: "Use existing", icon: "fa fa-folder-open", title: "Choose a boundary from the GeoJSON library", onClick: open("library")}];
    }

    // The boundary's buttons, given {option, getValue, setValue, task, getPhotoPositions}
    function controlFor(args, env) {
        var buttons = buttonsFor(args && args.option && args.option.name, env);
        if (!buttons) return null;
        var h = env.React.createElement;
        return h("span", {className: "gj-option-buttons"}, buttons.map(function (button) {
            return h("button", {key: button.label, type: "button", className: "btn btn-default", title: button.title,
                                onClick: function (e) {
                                    e.preventDefault();
                                    button.onClick({element: e.currentTarget, getValue: args.getValue, setValue: args.setValue,
                                                    taskContext: args});
                                }},
                     h("i", {className: button.icon}), " " + button.label);
        }));
    }

    // [longitude, latitude] of each photo with a position, from WebODM's EXIF data of a new task's photos
    function exifPositions(exifData) {
        return (exifData || []).filter(function (exif) { return exif && exif.gps; })
            .map(function (exif) { return [exif.gps.longitude, exif.gps.latitude]; });
    }

    // The answer to the Task Options hook, asked when the options dialog opens with {task, getExifData, options}
    // (options: each option's component, by name): the buttons to show after the boundary's input
    function controlsFor(args, env) {
        var option = args && args.options && args.options.boundary;
        if (!option) return null;
        var control = controlFor({option: {name: "boundary"}, task: args.task || null,
                                  getValue: function () { return option.getValue(); },
                                  setValue: function (value) { option.setValue(value); },
                                  getPhotoPositions: function () { return exifPositions(args.getExifData ? args.getExifData() : []); }}, env);
        return {controls: {boundary: control}};
    }

    var api = {buttonsFor: buttonsFor, controlFor: controlFor, controlsFor: controlsFor, exifPositions: exifPositions,
               openDialog: openDialog, taskLayers: taskLayers, shotPositions: shotPositions, csrfToken: csrfToken};
    root.GeoJsonBoundaryButtons = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;

    if (root.PluginsAPI && root.PluginsAPI.Dashboard && root.PluginsAPI.Dashboard.presetDialogOptionsReady) {
        root.PluginsAPI.Dashboard.presetDialogOptionsReady(function (args) {
            return controlsFor(args, {doc: root.document, win: root, fetchFn: root.fetch.bind(root), React: root.React});
        });
    }
})(typeof window !== "undefined" ? window : {});
