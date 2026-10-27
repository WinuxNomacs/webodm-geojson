const { createLayersPanel } = require('../layers_panel');

const BASEMAPS = [{label: "Google Maps Hybrid"}, {label: "Google Maps"}, {label: "Google Terrain"}, {label: "OpenStreetMap"}];

let panel, calls, host;
const make = (over = {}) => {
    calls = {basemap: []};
    host = document.createElement("div");
    document.body.appendChild(host);
    panel = createLayersPanel(document, Object.assign({basemaps: BASEMAPS, selected: "Google Maps",
        onBasemap: l => calls.basemap.push(l)}, over));
    host.appendChild(panel.element);
    return panel;
};
afterEach(() => { document.body.removeChild(host); });

const button = () => panel.element.querySelector(".gj-layers-button");
const panelEl = () => panel.element.querySelector(".gj-layers-panel");
const radios = () => Array.from(panel.element.querySelectorAll("input[type=radio]"));
const click = el => el.dispatchEvent(new MouseEvent("click", {bubbles: true}));

describe("layers button", () => {
    it("is a button on the map, closed at first", () => {
        make();
        expect(panel.element.className).toContain("maplibregl-ctrl-group");
        expect(button().title).toBe("Map layers");
        expect(button().getAttribute("aria-expanded")).toBe("false");
        expect(panelEl().hidden).toBe(true);
        expect(panel.isOpen()).toBe(false);
    });

    it("opens and closes its panel with the button", () => {
        make();
        click(button());
        expect(panelEl().hidden).toBe(false);
        expect(button().getAttribute("aria-expanded")).toBe("true");
        expect(panel.element.classList.contains("open")).toBe(true);
        click(button());
        expect(panelEl().hidden).toBe(true);
    });

    it("closes when something else is clicked, or on Escape, but not when its own panel is clicked", () => {
        make();
        panel.open();
        click(panelEl());
        expect(panel.isOpen()).toBe(true);
        click(document.body);
        expect(panel.isOpen()).toBe(false);

        panel.open();
        document.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter"}));
        expect(panel.isOpen()).toBe(true);
        document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape"}));
        expect(panel.isOpen()).toBe(false);
    });
});

describe("map choice", () => {
    it("has no 2D/3D choice: the editor's map is flat", () => {
        make();
        expect(panel.element.querySelector(".gj-layers-view")).toBeNull();
    });

    it("lists every basemap, with the current one chosen", () => {
        make();
        expect(radios().map(r => r.value)).toEqual(BASEMAPS.map(b => b.label));
        expect(radios().filter(r => r.checked).map(r => r.value)).toEqual(["Google Maps"]);
        expect(Array.from(panel.element.querySelectorAll(".gj-layers-choice")).map(l => l.textContent.trim())).toEqual(BASEMAPS.map(b => b.label));
    });

    it("tells which basemap was chosen, once per choice", () => {
        make();
        const terrain = radios()[2];
        terrain.checked = true;
        terrain.dispatchEvent(new Event("change"));
        expect(calls.basemap).toEqual(["Google Terrain"]);
    });

    it("follows the choice made elsewhere, without announcing it", () => {
        make();
        panel.setSelected("OpenStreetMap");
        expect(radios().filter(r => r.checked).map(r => r.value)).toEqual(["OpenStreetMap"]);
        expect(calls.basemap).toEqual([]);
    });

    it("works with one basemap, and with none chosen", () => {
        make({basemaps: [{label: "OpenStreetMap"}], selected: null});
        expect(radios().length).toBe(1);
        expect(radios()[0].checked).toBe(false);
    });

    it("writes labels as text: a label cannot inject markup", () => {
        make({basemaps: [{label: '<img src=x onerror="alert(1)">'}]});
        expect(panel.element.querySelector("img")).toBeNull();
        expect(radios()[0].value).toBe('<img src=x onerror="alert(1)">');
    });
});

