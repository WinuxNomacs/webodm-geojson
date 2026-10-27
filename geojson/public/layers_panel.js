// The layers button of the GeoJSON editor's map (copied from the mission planner, without its 2D/3D view): a button
// under the zoom buttons that opens a small panel to choose the map (the basemaps of the project). Plain DOM, no map
// library, so that it can be tested; geojson_editor.js puts it on the map as a control.
(function (root) {
    // opts: {basemaps: [{label}], selected: label, onBasemap(label)}
    // Returns {element, setSelected(label), open(), close(), isOpen()}
    function createLayersPanel(doc, opts) {
        var element = doc.createElement("div");
        element.className = "gj-layers-control gj-ctrl-group theme-secondary theme-color-primary maplibregl-ctrl";

        var button = doc.createElement("button");
        button.type = "button";
        button.className = "gj-layers-button";
        button.title = "Map layers";
        button.setAttribute("aria-label", "Map layers");
        button.setAttribute("aria-expanded", "false");
        button.innerHTML = '<i class="fa fa-layer-group"></i>';
        element.appendChild(button);

        var panel = doc.createElement("div");
        panel.className = "gj-layers-panel theme-secondary theme-color-primary";
        panel.hidden = true;
        element.appendChild(panel);

        var heading = doc.createElement("div");
        heading.className = "gj-layers-heading";
        heading.textContent = "Map";
        panel.appendChild(heading);

        var radios = [];
        (opts.basemaps || []).forEach(function (bm) {
            var label = doc.createElement("label");
            label.className = "gj-layers-choice";
            var input = doc.createElement("input");
            input.type = "radio";
            input.name = "gj-basemap";
            input.value = bm.label;
            input.checked = bm.label === opts.selected;
            input.addEventListener("change", function () { if (input.checked && opts.onBasemap) opts.onBasemap(bm.label); });
            label.appendChild(input);
            label.appendChild(doc.createTextNode(" " + bm.label));
            panel.appendChild(label);
            radios.push(input);
        });

        var open = false;
        function setOpen(value) {
            open = value;
            panel.hidden = !value;
            button.setAttribute("aria-expanded", String(value));
            element.classList.toggle("open", value);
        }
        button.addEventListener("click", function (e) { e.stopPropagation(); setOpen(!open); });
        // A click anywhere else, or Escape, closes it
        doc.addEventListener("click", function (e) { if (open && !element.contains(e.target)) setOpen(false); });
        doc.addEventListener("keydown", function (e) { if (open && e.key === "Escape") setOpen(false); });

        return {
            element: element,
            setSelected: function (label) { radios.forEach(function (r) { r.checked = r.value === label; }); },
            open: function () { setOpen(true); },
            close: function () { setOpen(false); },
            isOpen: function () { return open; }
        };
    }

    var api = {createLayersPanel: createLayersPanel};
    root.GeoJsonLayers = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : {});
