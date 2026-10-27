global.GeoJsonCore = require('../geojson_core');
const Core = global.GeoJsonCore;
const { buttonsFor, controlFor, taskLayers, shotPositions, csrfToken } = require('../boundary_buttons');

const SQUARE = [[11, 46], [11.001, 46], [11.001, 46.001], [11, 46.001]];
const flush = () => new Promise(r => setTimeout(r, 0));
const answer = (status, body) => Promise.resolve({status, ok: status < 400, json: () => Promise.resolve(body)});

// A fake editor: what GeoJsonEditor.init was given, and whether it may close
function fakeEditor() {
    const fake = {inits: [], mayClose: true, destroyed: 0};
    fake.init = ctx => { fake.ctx = ctx; fake.inits.push(ctx); return {mayClose: () => fake.mayClose, destroy: () => { fake.destroyed++; }}; };
    return fake;
}

let modal, element, value, requests, editor;
function open(label, over = {}) {
    document.body.innerHTML = "";
    modal = document.createElement("div");
    modal.className = "modal";
    element = document.createElement("button");
    modal.appendChild(element);
    document.body.appendChild(modal);
    value = over.value === undefined ? "" : over.value;
    requests = [];
    editor = fakeEditor();
    const fetchFn = url => {
        requests.push(url);
        if (url.endsWith("basemaps")) return answer(200, [{label: "Satellite", url: "https://tiles/{z}/{x}/{y}"}]);
        if (url.endsWith("shots.geojson")) return answer(200, {features: [{geometry: {type: "Point", coordinates: [11, 46, 300]}}]});
        return answer(404, null);
    };
    const buttons = buttonsFor("boundary", {doc: document, win: over.win || window, fetchFn, editor, load: over.load || (() => Promise.resolve())});
    const dialog = buttons.find(b => b.label === label).onClick({
        element, option: "boundary", getValue: () => value, setValue: v => { value = v; },
        taskContext: over.taskContext || {task: null, getPhotoPositions: () => [[11, 46], [11.001, 46.001]]}
    });
    return dialog.opened.then(() => dialog);
}

// A fake React.createElement: the elements as {type, props, children}
const React = {createElement: (type, props, ...children) => ({type, props, children})};

describe("the control the Task Options hook renders", () => {
    const env = {React, doc: document};
    // The buttons a boundary control renders with the hook's props
    function render(props) {
        const Control = controlFor({option: {name: "boundary", type: "string", domain: "json"}, context: props.context}, env);
        return Control(props).children[0];
    }

    test("only the boundary option gets a control", () => {
        expect(controlFor({option: {name: "crop"}, context: {}}, env)).toBeNull();
        expect(controlFor({}, env)).toBeNull();
        expect(typeof controlFor({option: {name: "boundary"}, context: {}}, env)).toBe("function");
    });

    test("it renders the two buttons, each with its icon and label", () => {
        const buttons = render({value: undefined, setValue: () => {}, context: {mode: "new"}});
        expect(buttons.map(b => b.type)).toEqual(["button", "button"]);
        expect(buttons.map(b => b.children[1])).toEqual([" Create GeoJSON", " Use existing"]);
        expect(buttons.map(b => b.children[0].props.className)).toEqual(["fa fa-draw-polygon", "fa fa-folder-open"]);
        expect(buttons.every(b => b.props.type === "button")).toBe(true);
    });

    test("a button opens the editor on the option's value, and using a boundary sets it with the control's setValue", async () => {
        document.body.innerHTML = '<div class="modal"><button id="b"></button></div>';
        const setValue = jest.fn(), editor = fakeEditor(), context = {mode: "new", getPhotoPositions: () => [[11, 46]]};
        const Control = controlFor({option: {name: "boundary"}, context},
            {...env, win: window, editor, load: () => Promise.resolve(), fetchFn: () => answer(200, [])});
        const create = Control({value: JSON.stringify(Core.featureCollection(SQUARE)), setValue, context}).children[0][0];
        const click = {preventDefault: jest.fn(), currentTarget: document.getElementById("b")};
        create.props.onClick(click);
        await flush();
        expect(click.preventDefault).toHaveBeenCalled();
        expect(document.querySelector(".modal .gj-task-dialog h4").textContent).toBe("Create a GeoJSON boundary");
        expect(editor.ctx.start).toEqual({view: "new", ring: SQUARE});
        expect(editor.ctx.points).toEqual([[11, 46]]);
        editor.ctx.use.onUse(Core.featureCollection(SQUARE));
        expect(JSON.parse(setValue.mock.calls[0][0])).toEqual(Core.featureCollection(SQUARE));
        expect(document.querySelector(".gj-task-dialog")).toBeNull();
    });
});

describe("the buttons beside a task's options", () => {
    test("only the boundary gets buttons: Create GeoJSON and Use existing", () => {
        expect(buttonsFor("crop", {})).toBeNull();
        expect(buttonsFor("boundary", {}).map(b => b.label)).toEqual(["Create GeoJSON", "Use existing"]);
    });

    test("Create GeoJSON opens the editor in a dialog inside the options' modal, on a new file", async () => {
        const dialog = await open("Create GeoJSON");
        expect(dialog.frame.parentNode).toBe(modal);
        expect(dialog.frame.querySelector("h4").textContent).toBe("Create a GeoJSON boundary");
        expect(editor.ctx.start).toEqual({view: "new", ring: null});
        expect(editor.ctx.use.label).toBe("Use for this task");
        expect(editor.ctx.root).toBe(dialog.frame.querySelector(".gj-task-dialog-body"));
        expect(editor.ctx.basemaps.map(b => b.label)).toEqual(["Satellite"]);
    });

    test("Create GeoJSON starts from the boundary the task already has", async () => {
        await open("Create GeoJSON", {value: JSON.stringify(Core.featureCollection(SQUARE))});
        expect(editor.ctx.start.view).toBe("new");
        expect(editor.ctx.start.ring).toEqual(SQUARE);
    });

    test("a boundary the editor cannot read is not given to it", async () => {
        await open("Create GeoJSON", {value: "not geojson"});
        expect(editor.ctx.start.ring).toBeNull();
    });

    test("the editor's bars take the dialog's themed background", async () => {
        const win = {getComputedStyle: el => ({backgroundColor: el.classList.contains("theme-secondary") ? "rgb(27, 31, 35)" : ""})};
        await open("Create GeoJSON", {win});
        expect(editor.ctx.barStyle).toBe("background-color: rgb(27, 31, 35);");
    });

    test("Use existing opens the editor on the library", async () => {
        const dialog = await open("Use existing");
        expect(dialog.frame.querySelector("h4").textContent).toBe("Use a GeoJSON boundary");
        expect(editor.ctx.start.view).toBe("library");
    });

    test("a new task's photos are shown on the map", async () => {
        await open("Create GeoJSON");
        expect(editor.ctx.points).toEqual([[11, 46], [11.001, 46.001]]);
        expect(editor.ctx.overlay).toBeNull();
    });

    test("using a boundary fills the option with its feature collection and closes the dialog", async () => {
        const dialog = await open("Create GeoJSON");
        editor.ctx.use.onUse(Core.featureCollection(SQUARE));
        expect(JSON.parse(value)).toEqual(Core.featureCollection(SQUARE));
        expect(dialog.frame.parentNode).toBeNull();
        expect(editor.destroyed).toBe(1);
    });

    test("Close asks the editor first, and keeps the dialog open when the changes are kept", async () => {
        const dialog = await open("Create GeoJSON");
        editor.mayClose = false;
        dialog.frame.querySelector('[data-gj="close"]').click();
        expect(dialog.frame.parentNode).toBe(modal);
        editor.mayClose = true;
        dialog.frame.querySelector('[data-gj="close"]').click();
        expect(dialog.frame.parentNode).toBeNull();
        expect(editor.destroyed).toBe(1);
        expect(value).toBe("");
    });

    test("Escape closes the dialog without reaching the options' modal", async () => {
        const dialog = await open("Create GeoJSON");
        const reached = [];
        modal.addEventListener("keydown", e => reached.push(e.key));
        dialog.frame.querySelector(".gj-task-dialog-body").dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true}));
        expect(dialog.frame.parentNode).toBeNull();
        expect(reached).toEqual([]);
    });

    test("the focus moves into the dialog, so that Escape reaches it, and back to the button when it closes", async () => {
        const dialog = await open("Create GeoJSON");
        expect(dialog.frame.contains(document.activeElement)).toBe(true);
        dialog.frame.querySelector('[data-gj="close"]').click();
        expect(document.activeElement).toBe(element);
    });

    test("a dialog closed while the editor loads does not start the editor", async () => {
        let loaded;
        const pending = open("Create GeoJSON", {load: () => new Promise(r => { loaded = r; })});
        await flush();
        const frame = modal.querySelector(".gj-task-dialog");
        frame.querySelector('[data-gj="close"]').click();
        loaded();
        await pending;
        expect(editor.inits).toEqual([]);
    });

    test("an editor that cannot be loaded says so in the dialog, in the theme's danger color", async () => {
        const dialog = await open("Create GeoJSON", {load: () => Promise.reject(new Error("Could not load map_view.js"))});
        expect(dialog.frame.querySelector(".gj-error").textContent).toBe("Could not load map_view.js");
        expect(dialog.frame.querySelector(".gj-error").classList.contains("theme-color-button-danger")).toBe(true);
    });
});

describe("a task's photos and orthophoto", () => {
    const task = assets => ({task: {id: "abc", project: 3, available_assets: assets}});
    const SHOTS = {features: [{geometry: {type: "Point", coordinates: [11, 46, 300]}}]};
    const TILES = "/api/projects/3/tasks/abc/orthophoto/tiles/{z}/{x}/{y}.png";

    const metadata = statistics => ({bounds: {value: [11, 46, 11.01, 46.01], crs: "EPSG:32632"}, minzoom: 15, maxzoom: 24, statistics});
    const RGB = {1: {min: 0, max: 255, percentiles: [10, 200]}, 2: {min: 0, max: 250, percentiles: [12, 190]}, 3: {min: 2, max: 255, percentiles: [9, 210]}};

    test("a processed task shows its shots and its orthophoto's tiles, within the orthophoto's bounds and zooms", async () => {
        const layers = await taskLayers(task(["orthophoto.tif", "shots.geojson"]), url =>
            url.endsWith("shots.geojson") ? answer(200, SHOTS) :
            url.endsWith("orthophoto/metadata") ? answer(200, metadata(RGB)) : answer(404, null));
        expect(layers).toEqual({points: [[11, 46]], overlay: {url: TILES + "?rescale=0%2C255", bounds: [11, 46, 11.01, 46.01], minzoom: 15, maxzoom: 24}});
    });

    test("a single-band (thermal) orthophoto is rescaled to its percentiles, not to a few outlying pixels", async () => {
        const layers = await taskLayers(task(["orthophoto.tif"]), () =>
            answer(200, metadata({1: {min: -29.3, max: 205.8, percentiles: [13.3, 22.7]}})));
        expect(layers.overlay.url).toBe(TILES + "?rescale=13.3%2C22.7");
    });

    test("an orthophoto whose metadata cannot be had is shown at every zoom, as the tiler scales it", async () => {
        const layers = await taskLayers(task(["orthophoto.tif"]), () => answer(404, null));
        expect(layers).toEqual({points: [], overlay: {url: TILES}});
    });

    test("a task without shots or an orthophoto shows neither, without asking the server", async () => {
        const asked = [];
        const layers = await taskLayers(task([]), url => { asked.push(url); return answer(200, {}); });
        expect(layers).toEqual({points: [], overlay: null});
        expect(asked).toEqual([]);
    });

    test("shots that cannot be fetched leave the photos out", async () => {
        const layers = await taskLayers(task(["shots.geojson"]), () => Promise.reject(new TypeError()));
        expect(layers).toEqual({points: [], overlay: null});
    });

    test("a new task whose photos have no positions shows none", async () => {
        const layers = await taskLayers({task: null, getPhotoPositions: () => { throw new Error("no exif"); }});
        expect(layers).toEqual({points: [], overlay: null});
    });

    test("a shot that is not a point is placed at its first corner", () => {
        expect(shotPositions({features: [
            {geometry: {type: "Polygon", coordinates: [[[11, 46], [12, 46], [12, 47], [11, 46]]]}},
            {geometry: null}
        ]})).toEqual([[11, 46]]);
    });
});

test("the CSRF token is read from its cookie", () => {
    expect(csrfToken({cookie: "a=1; csrftoken=x%2By; b=2"})).toBe("x+y");
    expect(csrfToken({cookie: ""})).toBe("");
});

describe("registering with WebODM", () => {
    afterEach(() => { delete window.PluginsAPI; delete window.React; delete window.fetch; });
    const load = () => jest.isolateModules(() => require('../boundary_buttons'));

    test("on a WebODM with the Task Options hook, the boundary option gets the buttons", () => {
        const addTaskOptionControl = jest.fn();
        window.PluginsAPI = {Dashboard: {addTaskOptionControl}};
        window.React = React;
        window.fetch = jest.fn();
        load();
        expect(addTaskOptionControl).toHaveBeenCalledTimes(1);
        const answer = addTaskOptionControl.mock.calls[0][0];
        expect(answer({option: {name: "crop"}, context: {}})).toBeNull();
        expect(answer({option: {name: "boundary"}, context: {}})({value: undefined, setValue: () => {}, context: {}}).children[0]
            .map(b => b.children[1])).toEqual([" Create GeoJSON", " Use existing"]);
    });

    test("on a WebODM without it, the script adds nothing and does not fail", () => {
        window.PluginsAPI = {Dashboard: {addNewTaskPanelItem: jest.fn()}};
        expect(load).not.toThrow();
        expect(window.PluginsAPI.Dashboard.addNewTaskPanelItem).not.toHaveBeenCalled();
    });
});
