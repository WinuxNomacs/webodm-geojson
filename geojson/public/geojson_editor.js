// The GeoJSON editor: the library of boundaries (everyone's, searchable by name or owner) and a file's editor, with
// the polygon on the map and its GeoJSON beside it, each following the other. init(ctx) builds it inside ctx.root,
// so that it can be put on its own page (the plugin's) or in a dialog. The map comes from map_view.js, or from
// ctx.createMapView under Jest.
(function (root) {
    var Core = root.GeoJsonCore || (typeof require === "function" ? require("./geojson_core") : null);

    function escapeHtml(t) { return String(t).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }

    function layout(barStyle, useLabel) {
        var bar = '<div class="gj-top-bar"' + (barStyle ? ' style="' + escapeHtml(barStyle) + '"' : "") + ">";
        return '<div class="gj-layout">' +
            '<aside class="gj-panel">' +
              '<section data-gj="library-view">' +
                bar + '<h3>GeoJSON boundaries</h3>' +
                  '<div class="gj-actions">' +
                    '<button type="button" class="btn btn-primary btn-sm" data-gj="new"><i class="fa fa-plus"></i> New</button> ' +
                    '<button type="button" class="btn btn-default btn-sm" data-gj="import" title="A .geojson file with one polygon"><i class="fa fa-file-import"></i> Import</button>' +
                    '<input type="file" data-gj="import-file" accept=".geojson,.json,application/geo+json,application/json" hidden>' +
                  "</div>" +
                "</div>" +
                '<p class="gj-note text-muted">Areas to process: in Bounds &amp; Cropping, ODM crops the results to a polygon\'s outline. ' +
                  "Start a file with New, by importing one, or by drawing on the map.</p>" +
                '<input type="search" class="form-control input-sm" data-gj="search" placeholder="Search by name or owner" aria-label="Search the library">' +
                '<div class="gj-error theme-color-button-danger" data-gj="library-error" hidden></div>' +
                '<div class="gj-list" data-gj="list"></div>' +
              "</section>" +
              '<section data-gj="file-view" hidden>' +
                bar + '<a href="javascript:void(0);" class="gj-back" data-gj="back"><i class="fa fa-arrow-left"></i> Library</a>' +
                  '<div class="gj-save-group"><span class="gj-save-status text-muted" data-gj="status"></span>' +
                    '<button type="button" class="btn btn-primary btn-sm" data-gj="save" disabled><i class="fa fa-save"></i> Save</button></div>' +
                "</div>" +
                '<div class="form-group"><label>Name<input type="text" class="form-control input-sm" data-gj="name" autocomplete="off"></label></div>' +
                '<div class="gj-meta text-muted" data-gj="meta"></div>' +
                '<div class="gj-note text-muted" data-gj="owner-note" hidden></div>' +
                '<div class="gj-error theme-color-button-danger" data-gj="file-error" hidden></div>' +
                '<div class="gj-tools btn-group btn-group-sm">' +
                  '<button type="button" class="btn btn-default" data-tool="polygon" title="Click the corners. Double-click to finish"><i class="fa fa-draw-polygon"></i> Polygon</button>' +
                  '<button type="button" class="btn btn-default" data-tool="rectangle" title="Drag over the area"><i class="fa fa-vector-square"></i> Rectangle</button>' +
                  '<button type="button" class="btn btn-default" data-tool="select" title="Move the polygon or its corners"><i class="fa fa-arrows-alt"></i> Edit</button>' +
                  '<button type="button" class="btn btn-default" data-tool="clear" title="Remove the polygon"><i class="fa fa-trash"></i></button>' +
                "</div>" +
                '<div class="gj-message" data-gj="shape-message"></div>' +
                (useLabel ? '<button type="button" class="btn btn-primary btn-block gj-use" data-gj="use" disabled><i class="fa fa-check"></i> ' +
                            escapeHtml(useLabel) + "</button>" : "") +
                '<div class="gj-file-actions">' +
                  '<button type="button" class="btn btn-default btn-sm" data-gj="copy"><i class="fa fa-copy"></i> Save copy</button> ' +
                  '<button type="button" class="btn btn-default btn-sm" data-gj="download"><i class="fa fa-download"></i> Download</button> ' +
                  '<button type="button" class="btn btn-default btn-sm" data-gj="delete"><i class="fa fa-trash"></i> Delete</button>' +
                "</div>" +
                '<label class="gj-text-label">GeoJSON<textarea class="form-control gj-text" data-gj="text" rows="14" spellcheck="false"></textarea></label>' +
                '<div class="gj-error theme-color-button-danger" data-gj="text-error" hidden></div>' +
                '<p class="help-block">One polygon without holes, in longitude and latitude. Change it here or on the map: each follows the other.</p>' +
              "</section>" +
            "</aside>" +
            '<div class="gj-map theme-border" data-gj="map"></div>' +
            '<div class="gj-dialog" data-gj="copy-dialog" hidden>' +
              '<form class="gj-dialog-inner theme-secondary" data-gj="copy-form">' +
                "<h4>Save a copy</h4>" +
                '<div class="form-group"><label>Name of the copy<input type="text" class="form-control" data-gj="copy-name" autocomplete="off"></label></div>' +
                '<div class="gj-error theme-color-button-danger" data-gj="copy-error" hidden></div>' +
                '<div class="text-right"><button type="button" class="btn btn-default" data-gj="copy-cancel">Cancel</button> ' +
                  '<button type="submit" class="btn btn-primary" data-gj="copy-submit">Save copy</button></div>' +
              "</form>" +
            "</div>" +
          "</div>";
    }

    // A row of the library: name, then owner, area and when it was last changed
    function fileRow(f) {
        var meta = [f.owner ? escapeHtml(f.owner) : "<em>deleted user</em>", Core.formatArea(f.area), escapeHtml(Core.formatDate(f.updated_at))];
        return '<a href="javascript:void(0);" class="gj-row theme-border theme-background-highlight-hover" data-id="' + f.id + '">' +
               '<div class="gj-row-name">' + escapeHtml(f.name) + "</div>" +
               '<div class="gj-row-meta text-muted">' + meta.join(" &middot; ") + "</div></a>";
    }

    // ctx: {doc, win, root, fetchFn, api, csrf, basemaps, barStyle, hash (keep the open file in the URL), confirmFn,
    //       createMapView(ctx, container, opts), onSaved(file)}
    // In a task's dialog also: use {label, onUse(featureCollection)} for a button that hands the polygon to the task,
    // start {view: "new" | "library", ring (the task's boundary, if it has one)}, points and overlay (see map_view.js)
    function init(ctx) {
        var doc = ctx.doc, win = ctx.win;
        var confirmFn = ctx.confirmFn || function (text) { return win.confirm(text); };
        var client = Core.createClient(ctx.fetchFn, ctx.api, ctx.csrf);
        ctx.root.insertAdjacentHTML("beforeend", layout(ctx.barStyle, ctx.use && ctx.use.label));
        var container = ctx.root.lastElementChild;
        function el(name) { return container.querySelector('[data-gj="' + name + '"]'); }
        function show(element, text) { element.textContent = text || ""; element.hidden = !text; }

        var els = {};
        ["library-view", "file-view", "new", "import", "import-file", "search", "library-error", "list", "back", "status", "save",
         "name", "meta", "owner-note", "file-error", "shape-message", "copy", "download", "delete", "text", "text-error", "map",
         "copy-dialog", "copy-form", "copy-name", "copy-error", "copy-cancel", "copy-submit", "use"].forEach(function (n) { els[n] = el(n); });

        var files = [];            // the library, as the server last gave it
        var file = null;           // the open file ({id: null} until it is saved), or null in the library
        var saved = null;          // {name, ring} of the open file as saved, to tell its unsaved changes
        var ring = null;           // the polygon being edited
        var shapeError = null;     // what is wrong with the polygon drawn on the map
        var textError = null;      // what is wrong with the text typed in the GeoJSON pane
        var busy = false;          // a request is under way

        // -- state ----------------------------------------------------------------------------------------------------

        function isDirty() {
            return !!file && (els.name.value.trim() !== saved.name || !Core.sameRing(ring, saved.ring));
        }
        function canEdit() { return !file.id || file.can_edit; }
        function hasShape() { return !!ring && !shapeError && !textError; }

        function area() {
            return file.id && Core.sameRing(ring, saved.ring) ? file.area : Core.ringArea(ring);
        }

        function refresh() {
            if (!file) return;
            var dirty = isDirty();
            els.save.disabled = busy || !hasShape() || !canEdit() || !(dirty || !file.id);
            els.copy.disabled = busy || !hasShape();
            els.download.disabled = !hasShape();
            els.delete.hidden = !file.id;
            els.delete.disabled = busy || !canEdit();
            if (els.use) els.use.disabled = busy || !hasShape();
            els.status.textContent = busy ? "Saving…" : (dirty || !file.id ? "Unsaved changes" : "Saved");

            var meta = file.id ? (file.owner ? "By " + file.owner : "By a deleted user") : "Not saved yet";
            if (ring) meta += " · " + Core.formatArea(area());
            els.meta.textContent = meta;
            show(els["owner-note"], canEdit() ? "" : "Only " + (file.owner || "an admin") + (file.owner ? " or an admin" : "") +
                 " can change this file: save a copy to keep your changes.");
            els["shape-message"].textContent = shapeError ||
                (ring ? "The polygon has " + ring.length + " corners. Use Edit to move them, or to drag the polygon."
                      : "Draw the boundary on the map with Polygon or Rectangle, or paste its GeoJSON below.");
            els["shape-message"].classList.toggle("gj-error", !!shapeError);
            els["shape-message"].classList.toggle("theme-color-button-danger", !!shapeError);
        }

        function writeText() {
            els.text.value = ring ? Core.formatGeoJson(ring) : "";
            textError = null;
            show(els["text-error"], "");
        }

        function setHash(id) {
            if (!ctx.hash || !win.history || !win.history.replaceState) return;
            win.history.replaceState(null, "", win.location.pathname + win.location.search + (id ? "#" + id : ""));
        }

        // -- the map ----------------------------------------------------------------------------------------------------

        var createMapView = ctx.createMapView || function (c, mapEl, opts) { return root.GeoJsonMap.createMapView(c, mapEl, opts); };
        var mapView = createMapView(ctx, els.map, {
            points: ctx.points, overlay: ctx.overlay,
            onShape: function (geometry) {
                var drawn = null, error = null;
                if (geometry) {
                    try { drawn = Core.normalize(geometry).ring; } catch (e) {
                        if (!(e instanceof Core.BoundaryError)) throw e;
                        error = e.message;
                    }
                }
                // Drawing in the library starts a new file with the polygon
                if (!file) startFile({id: null, name: Core.uniqueName("New boundary", names())}, drawn, false);
                ring = drawn;
                shapeError = error;
                if (doc.activeElement !== els.text) writeText();
                refresh();
            },
            onTool: function (name) {
                [].forEach.call(container.querySelectorAll("[data-tool]"), function (b) {
                    // The theme's colors: the active tool is a primary button
                    var active = b.getAttribute("data-tool") === name;
                    b.classList.toggle("active", active);
                    b.classList.toggle("btn-primary", active);
                    b.classList.toggle("btn-default", !active);
                });
            }
        });

        [].forEach.call(container.querySelectorAll("[data-tool]"), function (b) {
            b.addEventListener("click", function () {
                var tool = b.getAttribute("data-tool");
                if (tool !== "clear") { mapView.setTool(tool); return; }
                ring = null; shapeError = null;
                mapView.setRing(null, false);
                mapView.setTool("polygon");
                writeText();
                refresh();
            });
        });

        // -- the library ------------------------------------------------------------------------------------------------

        function names() { return files.map(function (f) { return f.name; }); }

        function renderList() {
            var query = els.search.value, shown = Core.filterFiles(files, query);
            if (shown.length) els.list.innerHTML = shown.map(fileRow).join("");
            else if (files.length) els.list.innerHTML = '<p class="gj-empty text-muted">No file matches “' + escapeHtml(query.trim()) + "”.</p>";
            else els.list.innerHTML = '<p class="gj-empty text-muted">The library is empty.</p>';
        }

        function showLibrary() {
            file = null; saved = null; ring = null; shapeError = null;
            els["file-view"].hidden = true;
            els["library-view"].hidden = false;
            mapView.setRing(null, false);
            mapView.setTool("polygon");
            setHash(null);
            renderList();
        }

        // Opens a file in the editor: a saved one, or a new one ({id: null}) with the corners it starts with
        function startFile(f, startRing, fit) {
            file = f;
            ring = startRing;
            shapeError = null;
            saved = {name: f.id ? f.name : null, ring: f.id ? startRing : null};      // a new file is unsaved whatever its name
            els.name.value = f.name;
            show(els["file-error"], "");
            show(els["library-error"], "");
            els["library-view"].hidden = true;
            els["file-view"].hidden = false;
            mapView.setRing(ring, fit);
            mapView.setTool(ring ? "select" : "polygon");
            setHash(f.id);
            writeText();
            refresh();
        }

        function openFile(f) { startFile(f, Core.fileRing(f), true); }

        function newFile() { startFile({id: null, name: Core.uniqueName("New boundary", names())}, null, false); }

        // Asks before dropping unsaved changes; true when it is fine to go on
        function mayLeave() {
            return !isDirty() || confirmFn("Discard the unsaved changes to “" + (els.name.value.trim() || "this file") + "”?");
        }

        function importText(fileName, text) {
            var result = Core.parseText(text);
            if (result.error) { show(els["library-error"], fileName + ": " + result.error); return; }
            startFile({id: null, name: Core.uniqueName(Core.nameFromFileName(fileName), names())}, result.ring, true);
        }

        // The dialog's first view, once the library's names are known (new files get a name not taken)
        function start() {
            if (!ctx.start || ctx.start.view !== "new" || file) return;
            if (ctx.start.ring) startFile({id: null, name: Core.uniqueName("Task boundary", names())}, ctx.start.ring, true);
            else newFile();
        }

        function load() {
            return client.list().then(function (data) {
                files = data || [];
                renderList();
                var id = ctx.hash && win.location.hash ? parseInt(win.location.hash.slice(1), 10) : null;
                var wanted = id && files.filter(function (f) { return f.id === id; })[0];
                if (wanted && !file) openFile(wanted);
                start();
            }, function (err) {
                show(els["library-error"], "Could not load the library: " + err.message);
            });
        }

        els.search.addEventListener("input", renderList);
        els.list.addEventListener("click", function (e) {
            var row = e.target.closest(".gj-row");
            if (!row) return;
            var id = parseInt(row.getAttribute("data-id"), 10);
            var f = files.filter(function (x) { return x.id === id; })[0];
            if (f) openFile(f);
        });
        els.new.addEventListener("click", newFile);
        els.import.addEventListener("click", function () { els["import-file"].click(); });
        els["import-file"].addEventListener("change", function () {
            var picked = els["import-file"].files[0];
            if (!picked) return;
            var reader = new win.FileReader();
            reader.onload = function () { importText(picked.name, String(reader.result)); };
            reader.onerror = function () { show(els["library-error"], picked.name + ": could not read the file"); };
            reader.readAsText(picked);
            els["import-file"].value = "";
        });

        // -- a file -----------------------------------------------------------------------------------------------------

        // Puts the server's answer for a saved file in the library and the editor
        function applySaved(data) {
            files = [data].concat(files.filter(function (f) { return f.id !== data.id; }));
            file = data;
            ring = Core.fileRing(data);
            saved = {name: data.name, ring: ring};
            els.name.value = data.name;
            setHash(data.id);
            writeText();
            if (ctx.onSaved) ctx.onSaved(data);
        }

        function request(promise, errorEl) {
            busy = true;
            show(errorEl, "");
            refresh();
            return promise.then(function (data) { busy = false; return data; },
                                function (err) { busy = false; show(errorEl, err.message); refresh(); throw err; });
        }

        function save() {
            var name = els.name.value.trim(), geojson = Core.featureCollection(ring);
            return request(file.id ? client.update(file.id, {name: name, geojson: geojson}) : client.create(name, geojson), els["file-error"])
                .then(function (data) { applySaved(data); refresh(); }, function () { /* shown */ });
        }

        els.save.addEventListener("click", save);
        els.name.addEventListener("input", refresh);
        els.back.addEventListener("click", function () { if (mayLeave()) showLibrary(); });

        els.text.addEventListener("input", function () {
            if (!els.text.value.trim()) {
                ring = null; shapeError = null; textError = null;
                mapView.setRing(null, false);
            } else {
                var result = Core.parseText(els.text.value);
                textError = result.error || null;
                if (!textError) {
                    ring = result.ring; shapeError = null;
                    mapView.setRing(ring, false);
                }
            }
            show(els["text-error"], textError);
            refresh();
        });
        // Leaving the pane puts its text back in shape, unless it has a mistake to correct
        els.text.addEventListener("blur", function () { if (!textError) writeText(); });

        function closeCopyDialog() { els["copy-dialog"].hidden = true; }
        els.copy.addEventListener("click", function () {
            els["copy-name"].value = Core.uniqueName((els.name.value.trim() || "Boundary") + " copy", names());
            show(els["copy-error"], "");
            els["copy-submit"].disabled = false;
            els["copy-dialog"].hidden = false;
            els["copy-name"].focus();
            els["copy-name"].select();
        });
        els["copy-cancel"].addEventListener("click", closeCopyDialog);
        els["copy-dialog"].addEventListener("click", function (e) { if (e.target === els["copy-dialog"]) closeCopyDialog(); });
        els["copy-form"].addEventListener("submit", function (e) {
            e.preventDefault();
            els["copy-submit"].disabled = true;
            request(client.create(els["copy-name"].value.trim(), Core.featureCollection(ring)), els["copy-error"]).then(function (data) {
                closeCopyDialog();
                applySaved(data);
                mapView.setTool("select");
                refresh();
            }, function () { els["copy-submit"].disabled = false; });
        });

        els.download.addEventListener("click", function () {
            var blob = new win.Blob([Core.formatGeoJson(ring)], {type: "application/geo+json"});
            var a = doc.createElement("a");
            a.href = win.URL.createObjectURL(blob);
            a.download = Core.downloadName(els.name.value);
            doc.body.appendChild(a);
            a.click();
            doc.body.removeChild(a);
            win.setTimeout(function () { win.URL.revokeObjectURL(a.href); }, 0);
        });

        els.delete.addEventListener("click", function () {
            if (!confirmFn("Delete “" + file.name + "” from the library? This cannot be undone.")) return;
            var id = file.id;
            request(client.remove(id), els["file-error"]).then(function () {
                files = files.filter(function (f) { return f.id !== id; });
                showLibrary();
            }, function () { /* shown */ });
        });

        if (els.use) els.use.addEventListener("click", function () { ctx.use.onUse(Core.featureCollection(ring)); });

        // No autosave: closing the tab or following a link with unsaved changes asks first
        function beforeUnload(e) {
            if (!isDirty()) return;
            e.preventDefault();
            e.returnValue = "";
        }
        win.addEventListener("beforeunload", beforeUnload);

        renderList();
        var loaded = load();

        return {
            loaded: loaded,
            files: function () { return files; },
            file: function () { return file; },
            ring: function () { return ring; },
            isDirty: isDirty,
            openFile: openFile,
            newFile: newFile,
            importText: importText,
            save: save,
            showLibrary: function () { if (mayLeave()) showLibrary(); },
            // Closing the dialog: asks before dropping a polygon not saved (a name alone is not worth asking for)
            mayClose: function () { return !ring || mayLeave(); },
            destroy: function () {
                win.removeEventListener("beforeunload", beforeUnload);
                if (mapView.remove) mapView.remove();
                if (container.parentNode) container.parentNode.removeChild(container);
            }
        };
    }

    var api = {init: init, fileRow: fileRow};
    root.GeoJsonEditor = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;

    // The plugin's page
    if (typeof document !== "undefined" && root.maplibregl && document.getElementById("gj-editor")) {
        var page = document.getElementById("gj-editor"), basemaps;
        try { basemaps = JSON.parse(document.getElementById("gj-basemaps").textContent) || []; } catch (e) { basemaps = []; }
        init({doc: document, win: window, root: page, fetchFn: window.fetch.bind(window), api: page.getAttribute("data-api"),
              csrf: (page.querySelector("input[name=csrfmiddlewaretoken]") || {}).value, basemaps: basemaps,
              barStyle: page.getAttribute("data-bar-style"), hash: true,
              maplibregl: root.maplibregl, terraDraw: root.terraDraw, adapter: root.terraDrawMaplibreGlAdapter});
    }
})(typeof window !== "undefined" ? window : {});
