const Core = require('../geojson_core');
const { init, fileRow } = require('../geojson_editor');

const SQUARE = [[11, 46], [11.001, 46], [11.001, 46.001], [11, 46.001]];
const MOVED = SQUARE.map(p => [p[0] + 0.01, p[1]]);
const polygon = ring => ({type: "Polygon", coordinates: [ring.concat([ring[0]])]});
const stored = ring => Core.featureCollection(ring);
const flush = () => new Promise(r => setTimeout(r, 0));

// The plugin's API, in memory: what boundaries/ and boundaries/<id> answer
function fakeServer(initial) {
    const server = {files: initial.map(f => Object.assign({}, f)), requests: [], fail: null, nextId: 100};
    const answer = (status, body) => Promise.resolve({status, ok: status < 400, json: () => Promise.resolve(body)});
    server.fetch = (url, init) => {
        const body = init.body ? JSON.parse(init.body) : null;
        server.requests.push([init.method, url.replace("/api/plugins/geojson/", ""), body]);
        if (server.fail) { const f = server.fail; server.fail = null; return f === "down" ? Promise.reject(new TypeError()) : answer(400, f); }
        const m = url.match(/boundaries(?:\/(\d+))?$/), id = m[1] && parseInt(m[1], 10);
        const taken = name => server.files.some(f => f.id !== id && f.name.toLowerCase() === name.toLowerCase());
        const save = f => Object.assign(f, {area: Core.normalize(f.geojson).area, updated_at: "2026-10-27T10:00:00Z"});
        if (init.method === "GET") return answer(200, server.files);
        if (init.method === "POST") {
            if (taken(body.name)) return answer(400, {name: ['A file named "' + body.name + '" is already in the library']});
            const f = save({id: server.nextId++, name: body.name, geojson: body.geojson, owner: "me", can_edit: true});
            server.files.unshift(f);
            return answer(201, f);
        }
        const f = server.files.find(x => x.id === id);
        if (init.method === "PATCH") return answer(200, save(Object.assign(f, body)));
        server.files = server.files.filter(x => x.id !== id);
        return answer(204);
    };
    return server;
}

const FILES = [
    {id: 1, name: "North field", owner: "me", can_edit: true, area: 8600, updated_at: "2026-10-26T09:30:00Z", geojson: stored(SQUARE)},
    {id: 2, name: "Their roof", owner: "anna", can_edit: false, area: 8600, updated_at: "2026-10-20T16:00:00Z", geojson: stored(MOVED)}
];

let host, server, map, win, confirms, editor, saved;
function make(over = {}) {
    host = document.createElement("div");
    document.body.appendChild(host);
    server = fakeServer(over.files || FILES);
    confirms = {asked: [], answer: true};
    saved = [];
    win = {
        location: {pathname: "/plugins/geojson/", search: "", hash: over.hash || ""},
        history: {replaceState: (s, t, url) => { win.location.hash = url.indexOf("#") === -1 ? "" : url.slice(url.indexOf("#")); }},
        listeners: {}, addEventListener: (type, fn) => { win.listeners[type] = fn; },
        removeEventListener: (type, fn) => { if (win.listeners[type] === fn) delete win.listeners[type]; },
        FileReader: window.FileReader, Blob: window.Blob, setTimeout: fn => fn(),
        URL: {created: [], revoked: [], createObjectURL: b => { win.URL.created.push(b); return "blob:1"; }, revokeObjectURL: u => win.URL.revoked.push(u)}
    };
    editor = init(Object.assign({
        doc: document, win, root: host, fetchFn: server.fetch, api: "/api/plugins/geojson/", csrf: "tok", hash: true,
        barStyle: "background-color: #eee;", basemaps: [],
        confirmFn: text => { confirms.asked.push(text); return confirms.answer; },
        onSaved: f => saved.push(f.id),
        createMapView: (ctx, container, opts) => {
            map = {container, opts, rings: [], tools: [], tool: "polygon",
                   setRing: (ring, fit) => map.rings.push([ring, fit]),
                   setTool: name => { map.tool = name; map.tools.push(name); opts.onTool(name); },
                   resize: () => {}, remove: () => { map.removed = true; }};
            return map;
        }
    }, over.ctx));
    return editor.loaded;
}
afterEach(() => { if (host && host.parentNode) host.parentNode.removeChild(host); host = null; });

const $ = name => host.querySelector('[data-gj="' + name + '"]');
const tool = name => host.querySelector('[data-tool="' + name + '"]');
const rows = () => Array.from(host.querySelectorAll(".gj-row"));
const click = el => el.dispatchEvent(new MouseEvent("click", {bubbles: true}));
const type = (el, value) => { el.value = value; el.dispatchEvent(new Event("input")); };
const inLibrary = () => !$("library-view").hidden && $("file-view").hidden;
const draw = ring => map.opts.onShape(polygon(ring));

describe("the library", () => {
    it("lists every file with its owner, area and date, and puts the editor's layout in the page", async () => {
        await make();
        expect(inLibrary()).toBe(true);
        expect(rows().map(r => r.querySelector(".gj-row-name").textContent)).toEqual(["North field", "Their roof"]);
        expect(rows()[1].querySelector(".gj-row-meta").textContent).toMatch(/^anna · 8600 m² · 2026-10-20 \d\d:\d\d$/);
        expect(host.querySelector(".gj-top-bar").getAttribute("style")).toBe("background-color: #eee;");
        expect(map.container).toBe($("map"));
        expect(server.requests).toEqual([["GET", "boundaries", null]]);
    });

    it("searches by name or owner, and says when nothing matches or the library is empty", async () => {
        await make();
        type($("search"), "ANNA");
        expect(rows().map(r => r.getAttribute("data-id"))).toEqual(["2"]);
        type($("search"), " barn ");
        expect($("list").textContent).toBe("No file matches “barn”.");
        await make({files: []});
        expect($("list").textContent).toBe("The library is empty.");
    });

    it("writes names as text: a name cannot inject markup", () => {
        const row = fileRow({id: 3, name: '<img src=x onerror="alert(1)">', owner: null, area: 5, updated_at: ""});
        expect(row).not.toContain("<img");
        expect(row).toContain("<em>deleted user</em>");
    });

    it("says when the library cannot be loaded", async () => {
        host = document.createElement("div");
        document.body.appendChild(host);
        await init({doc: document, win: {addEventListener: () => {}, location: {hash: ""}}, root: host, api: "/a/", csrf: "t",
                    fetchFn: () => Promise.reject(new TypeError()),
                    createMapView: () => ({setRing: () => {}, setTool: () => {}})}).loaded;
        expect($("library-error").hidden).toBe(false);
        expect($("library-error").textContent).toBe("Could not load the library: Could not reach the server");
    });
});

describe("opening a file", () => {
    it("shows its polygon on the map, fitted, with its text, and keeps it in the URL", async () => {
        await make();
        click(rows()[0].querySelector(".gj-row-name"));
        expect(inLibrary()).toBe(false);
        expect($("name").value).toBe("North field");
        expect(map.rings[map.rings.length - 1]).toEqual([SQUARE, true]);
        expect(map.tool).toBe("select");
        expect(tool("select").classList.contains("active")).toBe(true);
        expect(JSON.parse($("text").value)).toEqual(stored(SQUARE));
        expect($("meta").textContent).toBe("By me · 8600 m²");
        expect($("status").textContent).toBe("Saved");
        expect($("save").disabled).toBe(true);
        expect($("delete").hidden).toBe(false);
        expect($("owner-note").hidden).toBe(true);
        expect(win.location.hash).toBe("#1");
    });

    it("opens the file named in the URL", async () => {
        await make({hash: "#2"});
        expect(editor.file().id).toBe(2);
        expect($("name").value).toBe("Their roof");
    });

    it("lets others look at and copy a file, but not change or delete it", async () => {
        await make();
        editor.openFile(FILES[1]);
        draw(SQUARE);
        expect($("owner-note").textContent).toBe("Only anna or an admin can change this file: save a copy to keep your changes.");
        expect($("save").disabled).toBe(true);
        expect($("delete").disabled).toBe(true);
        expect($("copy").disabled).toBe(false);
    });

    it("goes back to the library, asking first when there are unsaved changes", async () => {
        await make();
        editor.openFile(FILES[0]);
        click($("back"));
        expect(confirms.asked).toEqual([]);
        expect(inLibrary()).toBe(true);
        expect(win.location.hash).toBe("");
        expect(map.rings[map.rings.length - 1]).toEqual([null, false]);

        editor.openFile(FILES[0]);
        type($("name"), "North field 2");
        confirms.answer = false;
        click($("back"));
        expect(confirms.asked).toEqual(["Discard the unsaved changes to “North field 2”?"]);
        expect(inLibrary()).toBe(false);
        confirms.answer = true;
        click($("back"));
        expect(inLibrary()).toBe(true);
    });

    it("warns before the page is closed with unsaved changes", async () => {
        await make();
        const leaving = () => { const e = {preventDefault: jest.fn()}; win.listeners.beforeunload(e); return e.preventDefault.mock.calls.length > 0; };
        editor.openFile(FILES[0]);
        expect(leaving()).toBe(false);
        draw(MOVED);
        expect(leaving()).toBe(true);
    });
});

describe("drawing and the text", () => {
    it("starts a new file, numbered when the name is taken, with nothing drawn yet", async () => {
        await make({files: FILES.concat([Object.assign({}, FILES[0], {id: 3, name: "New boundary"})])});
        click($("new"));
        expect($("name").value).toBe("New boundary 2");
        expect($("meta").textContent).toBe("Not saved yet");
        expect($("status").textContent).toBe("Unsaved changes");
        expect($("save").disabled).toBe(true);
        expect($("delete").hidden).toBe(true);
        expect($("shape-message").textContent).toContain("Draw the boundary on the map");
        expect(map.tool).toBe("polygon");
    });

    it("drawing in the library starts a new file with the polygon", async () => {
        await make();
        draw(SQUARE);
        expect(inLibrary()).toBe(false);
        expect(editor.file()).toEqual({id: null, name: "New boundary"});
        expect(editor.ring()).toEqual(SQUARE);
        expect(JSON.parse($("text").value)).toEqual(stored(SQUARE));
        expect($("shape-message").textContent).toContain("The polygon has 4 corners");
        expect($("save").disabled).toBe(false);
    });

    it("follows the map: an edited polygon changes the text and the area", async () => {
        await make();
        editor.openFile(FILES[0]);
        const bigger = [[11, 46], [11.002, 46], [11.002, 46.001], [11, 46.001]];
        draw(bigger);
        expect(JSON.parse($("text").value)).toEqual(stored(bigger));
        expect($("meta").textContent).toBe("By me · 1.72 ha");
        expect($("status").textContent).toBe("Unsaved changes");
        expect($("save").disabled).toBe(false);
        draw(SQUARE);
        expect($("status").textContent).toBe("Saved");
    });

    it("says what is wrong with a polygon drawn over itself, and does not save it", async () => {
        await make();
        editor.newFile();
        map.opts.onShape(polygon([[0, 0], [1, 1], [2, 2]]));
        expect($("shape-message").textContent).toBe("The polygon has no area: its corners are on one line");
        expect($("shape-message").classList.contains("gj-error")).toBe(true);
        expect($("save").disabled).toBe(true);
    });

    it("follows the text: valid GeoJSON moves the polygon, a mistake is shown and kept until corrected", async () => {
        await make();
        editor.openFile(FILES[0]);
        type($("text"), JSON.stringify(polygon(MOVED)));
        expect(map.rings[map.rings.length - 1]).toEqual([MOVED, false]);
        expect(editor.ring()).toEqual(MOVED);

        type($("text"), '{"type": "Point", "coordinates": [0, 0]}');
        expect($("text-error").textContent).toBe("A boundary must be a polygon, not Point");
        expect($("save").disabled).toBe(true);
        $("text").dispatchEvent(new Event("blur"));
        expect($("text").value).toBe('{"type": "Point", "coordinates": [0, 0]}');

        type($("text"), JSON.stringify(polygon(SQUARE)));
        expect($("text-error").hidden).toBe(true);
        $("text").dispatchEvent(new Event("blur"));
        expect($("text").value).toBe(Core.formatGeoJson(SQUARE));
    });

    it("empty text, or the clear button, removes the polygon", async () => {
        await make();
        editor.openFile(FILES[0]);
        type($("text"), " ");
        expect(editor.ring()).toBeNull();
        expect(map.rings[map.rings.length - 1]).toEqual([null, false]);
        editor.openFile(FILES[0]);
        click(tool("clear"));
        expect(editor.ring()).toBeNull();
        expect($("text").value).toBe("");
        expect(map.tool).toBe("polygon");
    });

    it("the tool buttons choose the map's tool", async () => {
        await make();
        editor.newFile();
        click(tool("rectangle"));
        expect(map.tool).toBe("rectangle");
        expect(Array.from(host.querySelectorAll("[data-tool].active")).map(b => b.getAttribute("data-tool"))).toEqual(["rectangle"]);
    });
});

describe("importing", () => {
    it("opens an imported file as a new one, named after it", async () => {
        await make();
        editor.importText("North field.geojson", JSON.stringify(stored(MOVED)));
        expect(editor.file()).toEqual({id: null, name: "North field 2"});
        expect(map.rings[map.rings.length - 1]).toEqual([MOVED, true]);
    });

    it("says what is wrong with a file it cannot use, and stays in the library", async () => {
        await make();
        editor.importText("fields.geojson", JSON.stringify({type: "FeatureCollection", features: [{}, {}]}));
        expect(inLibrary()).toBe(true);
        expect($("library-error").textContent).toBe("fields.geojson: A boundary is a single polygon: this file has 2 features");
    });

    it("reads the picked file", async () => {
        await make();
        const picked = new File([JSON.stringify(polygon(SQUARE))], "roof.json");
        Object.defineProperty($("import-file"), "files", {value: [picked]});
        $("import-file").dispatchEvent(new Event("change"));
        await new Promise(r => setTimeout(r, 20));
        expect(editor.file().name).toBe("roof");
        expect(editor.ring()).toEqual(SQUARE);
    });
});

describe("saving", () => {
    it("saves a new file and keeps it open, saved, in the library and the URL", async () => {
        await make();
        draw(SQUARE);
        type($("name"), "  Barn  ");
        click($("save"));
        expect($("status").textContent).toBe("Saving…");
        expect($("save").disabled).toBe(true);
        await flush();
        expect(server.requests[1]).toEqual(["POST", "boundaries", {name: "Barn", geojson: stored(SQUARE)}]);
        expect(editor.file().id).toBe(100);
        expect($("status").textContent).toBe("Saved");
        expect($("name").value).toBe("Barn");
        expect(win.location.hash).toBe("#100");
        expect(saved).toEqual([100]);
        expect(editor.files().map(f => f.name)).toEqual(["Barn", "North field", "Their roof"]);
        expect(editor.isDirty()).toBe(false);
    });

    it("saves changes to a file with PATCH", async () => {
        await make();
        editor.openFile(FILES[0]);
        draw(MOVED);
        type($("name"), "North field moved");
        await editor.save();
        expect(server.requests[1]).toEqual(["PATCH", "boundaries/1", {name: "North field moved", geojson: stored(MOVED)}]);
        editor.showLibrary();
        expect(rows()[0].querySelector(".gj-row-name").textContent).toBe("North field moved");
    });

    it("shows the server's refusal and keeps the changes", async () => {
        await make();
        draw(SQUARE);
        type($("name"), "their ROOF");
        await editor.save();
        expect($("file-error").textContent).toBe('A file named "their ROOF" is already in the library');
        expect(editor.file().id).toBeNull();
        expect($("save").disabled).toBe(false);
        expect($("status").textContent).toBe("Unsaved changes");
    });
});

describe("save copy, download and delete", () => {
    it("saves a copy under a new name and opens it", async () => {
        await make();
        editor.openFile(FILES[1]);
        click($("copy"));
        expect($("copy-dialog").hidden).toBe(false);
        expect($("copy-name").value).toBe("Their roof copy");
        $("copy-form").dispatchEvent(new Event("submit", {cancelable: true}));
        expect($("copy-submit").disabled).toBe(true);
        await flush();
        expect(server.requests[1]).toEqual(["POST", "boundaries", {name: "Their roof copy", geojson: stored(MOVED)}]);
        expect($("copy-dialog").hidden).toBe(true);
        expect(editor.file()).toMatchObject({id: 100, name: "Their roof copy", can_edit: true});
        expect($("owner-note").hidden).toBe(true);
    });

    it("keeps the dialog open with the reason when the copy is refused, and closes on Cancel", async () => {
        await make();
        editor.openFile(FILES[0]);
        click($("copy"));
        type($("copy-name"), "Their roof");
        $("copy-form").dispatchEvent(new Event("submit", {cancelable: true}));
        await flush();
        expect($("copy-error").textContent).toBe('A file named "Their roof" is already in the library');
        expect($("copy-dialog").hidden).toBe(false);
        expect($("copy-submit").disabled).toBe(false);
        click($("copy-cancel"));
        expect($("copy-dialog").hidden).toBe(true);
        expect(editor.file().id).toBe(1);
    });

    it("downloads the polygon as a .geojson file named after the file", async () => {
        await make();
        editor.openFile(FILES[0]);
        let downloaded = null;
        const clicked = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () { downloaded = this.download; });
        click($("download"));
        clicked.mockRestore();
        expect(downloaded).toBe("North_field.geojson");
        expect(win.URL.created[0].type).toBe("application/geo+json");
        expect(win.URL.revoked).toEqual(["blob:1"]);
    });

    it("deletes a file after asking, and goes back to the library", async () => {
        await make();
        editor.openFile(FILES[0]);
        confirms.answer = false;
        click($("delete"));
        expect(confirms.asked).toEqual(["Delete “North field” from the library? This cannot be undone."]);
        expect(server.requests.length).toBe(1);
        confirms.answer = true;
        click($("delete"));
        await flush();
        expect(server.requests[1]).toEqual(["DELETE", "boundaries/1", null]);
        expect(inLibrary()).toBe(true);
        expect(rows().map(r => r.getAttribute("data-id"))).toEqual(["2"]);
    });

    it("says when the server cannot be reached, and keeps the file", async () => {
        await make();
        editor.openFile(FILES[0]);
        server.fail = "down";
        click($("delete"));
        await flush();
        expect($("file-error").textContent).toBe("Could not reach the server");
        expect(editor.file().id).toBe(1);
    });
});

describe("in a task's dialog", () => {
    let used;
    const dialog = (start, extra) => make({hash: "#1", ctx: Object.assign({
        hash: false, start, points: [[11, 46]], overlay: {url: "/tiles/{z}/{x}/{y}.png"},
        use: {label: "Use for this task", onUse: fc => used.push(fc)}
    }, extra)});
    beforeEach(() => { used = []; });

    it("opens a new file named after the task's boundary when it has one, without touching the URL", async () => {
        await dialog({view: "new", ring: SQUARE});
        expect(editor.file()).toEqual({id: null, name: "Task boundary"});
        expect(editor.ring()).toEqual(SQUARE);
        expect(map.rings.pop()).toEqual([SQUARE, true]);
        expect(win.location.hash).toBe("#1");
        expect(map.opts.points).toEqual([[11, 46]]);
        expect(map.opts.overlay).toEqual({url: "/tiles/{z}/{x}/{y}.png"});
    });

    it("opens an empty new file, or the library, when asked", async () => {
        await dialog({view: "new"});
        expect(editor.file().name).toBe("New boundary");
        expect(editor.ring()).toBe(null);
        await dialog({view: "library"});
        expect(inLibrary()).toBe(true);
    });

    it("hands the polygon to the task, saved or not, once there is a valid one", async () => {
        await dialog({view: "new"});
        expect($("use").disabled).toBe(true);
        draw(SQUARE);
        expect($("use").disabled).toBe(false);
        click($("use"));
        expect(used).toEqual([stored(SQUARE)]);

        await dialog({view: "library"});
        click(rows()[1]);
        click($("use"));
        expect(used.pop()).toEqual(stored(MOVED));
    });

    it("has no use button on the plugin's page", async () => {
        await make();
        expect($("use")).toBe(null);
    });

    it("asks before closing over a polygon not saved, and not over a saved one or an empty file", async () => {
        await dialog({view: "new"});
        expect(editor.mayClose()).toBe(true);
        draw(SQUARE);
        confirms.answer = false;
        expect(editor.mayClose()).toBe(false);
        expect(confirms.asked).toEqual(["Discard the unsaved changes to “New boundary”?"]);

        await dialog({view: "library"});
        click(rows()[0]);
        expect(editor.mayClose()).toBe(true);
    });

    it("removes its map, layout and page listener when destroyed", async () => {
        await dialog({view: "new"});
        expect(win.listeners.beforeunload).toBeDefined();
        editor.destroy();
        expect(map.removed).toBe(true);
        expect(win.listeners.beforeunload).toBeUndefined();
        expect(host.querySelector(".gj-layout")).toBe(null);
    });
});
