const Core = require('../geojson_core');

const SQUARE = [[11, 46], [11.001, 46], [11.001, 46.001], [11, 46.001], [11, 46]];
const polygon = (coords = SQUARE) => ({type: "Polygon", coordinates: [coords]});
const feature = geometry => ({type: "Feature", properties: {}, geometry});
const collection = (...features) => ({type: "FeatureCollection", features});
const error = data => { try { Core.normalize(data); } catch (e) { expect(e).toBeInstanceOf(Core.BoundaryError); return e.message; } throw new Error("accepted"); };

describe("checks, the same as the server's", () => {
    it("gives the same stored file for a bare polygon, a feature and a collection of one", () => {
        const stored = Core.normalize(polygon()).geojson;
        expect(stored).toEqual({type: "FeatureCollection", features: [{type: "Feature", properties: {}, geometry: polygon()}]});
        expect(Core.normalize(feature(polygon())).geojson).toEqual(stored);
        expect(Core.normalize(collection(feature(polygon()))).geojson).toEqual(stored);
    });

    it("rounds corners to 9 decimals, drops heights and repeats, and gives the ring without its closing corner", () => {
        const result = Core.normalize(polygon([[11.0000000001, 46, 300], [11.001, 46], [11.001, 46], [11.001, 46.001], [11, 46]]));
        expect(result.ring).toEqual([[11, 46], [11.001, 46], [11.001, 46.001]]);
        expect(result.geojson.features[0].geometry.coordinates[0]).toEqual([[11, 46], [11.001, 46], [11.001, 46.001], [11, 46]]);
    });

    it("computes the area in square meters", () => {
        // 0.001° x 0.001° at 46° north: about 111 m by 77 m
        expect(Core.normalize(polygon()).area).toBeGreaterThan(8500);
        expect(Core.normalize(polygon()).area).toBeLessThan(8700);
    });

    it("takes a MultiPolygon of one part as its polygon and refuses several parts", () => {
        expect(Core.normalize({type: "MultiPolygon", coordinates: [[SQUARE]]}).geojson).toEqual(Core.normalize(polygon()).geojson);
        const moved = SQUARE.map(p => [p[0] + 1, p[1]]);
        expect(error({type: "MultiPolygon", coordinates: [[SQUARE], [moved]]})).toContain("this MultiPolygon has 2 parts");
    });

    it("refuses several features, since ODM takes a single polygon", () => {
        expect(error(collection(feature(polygon()), feature(polygon())))).toContain("this file has 2 features");
        expect(error(collection())).toContain("this file has 0 features");
    });

    it("refuses lines, points, empty geometries and what is not GeoJSON", () => {
        expect(error({type: "LineString", coordinates: SQUARE})).toContain("not LineString");
        expect(error(feature({type: "Point", coordinates: [0, 0]}))).toContain("not Point");
        expect(error(feature(null))).toContain("not an empty geometry");
        expect(error([1, 2])).toContain("This is not GeoJSON");
    });

    it("refuses holes, too few corners, corners on a line and bad corners", () => {
        const hole = [[11.0002, 46.0002], [11.0004, 46.0002], [11.0004, 46.0004], [11.0002, 46.0002]];
        expect(error({type: "Polygon", coordinates: [SQUARE, hole]})).toContain("has holes");
        expect(error(polygon([[0, 0], [1, 1], [1, 1], [0, 0]]))).toContain("at least 3 different corners");
        expect(error(polygon([[0, 0], [1, 1], [2, 2], [0, 0]]))).toContain("no area");
        expect(error(polygon([[0, 0], [181, 0], [1, 1], [0, 0]]))).toContain("outside longitude");
        expect(error(polygon([[0, 0], ["a", 0], [1, 1], [0, 0]]))).toContain("not a [longitude, latitude] pair");
        expect(error({type: "Polygon", coordinates: []})).toContain("no corners");
    });

    it("refuses a projected CRS and accepts WGS 84", () => {
        const data = Object.assign(polygon(), {crs: {type: "name", properties: {name: "EPSG:32632"}}});
        expect(error(data)).toContain("not EPSG:32632");
        data.crs.properties.name = "urn:ogc:def:crs:OGC:1.3:CRS84";
        expect(Core.normalize(data).ring.length).toBe(4);
    });
});

describe("the text of a file", () => {
    it("reads text into a ring, or says what is wrong with it", () => {
        expect(Core.parseText(JSON.stringify(polygon())).ring.length).toBe(4);
        expect(Core.parseText("{oops").error).toMatch(/^This is not JSON: /);
        expect(Core.parseText('{"type": "Point", "coordinates": [0, 0]}').error).toContain("not Point");
    });

    it("writes one corner per line, and reads back the same ring", () => {
        const ring = Core.normalize(polygon()).ring;
        const text = Core.formatGeoJson(ring);
        expect(text).toContain("\n      [11.001, 46.001],\n");
        expect(Core.parseText(text).ring).toEqual(ring);
        expect(JSON.parse(text)).toEqual(Core.featureCollection(ring));
    });

    it("compares rings corner by corner", () => {
        const ring = [[0, 0], [1, 0], [1, 1]];
        expect(Core.sameRing(ring, [[0, 0], [1, 0], [1, 1]])).toBe(true);
        expect(Core.sameRing(ring, [[0, 0], [1, 0], [1, 2]])).toBe(false);
        expect(Core.sameRing(ring, ring.slice(0, 2))).toBe(false);
        expect(Core.sameRing(null, null)).toBe(true);
        expect(Core.sameRing(ring, null)).toBe(false);
    });

    it("gives the bounds of a ring, and the ring of a saved file", () => {
        expect(Core.ringBounds([[1, 5], [3, 2], [2, 8]])).toEqual([[1, 2], [3, 8]]);
        expect(Core.fileRing({geojson: collection(feature(polygon()))}).length).toBe(4);
        expect(Core.fileRing({geojson: null})).toBeNull();
    });
});

describe("the library", () => {
    const FILES = [{name: "North field", owner: "anna"}, {name: "South field", owner: "ben"}, {name: "Roof", owner: null}];

    it("filters by name or owner, ignoring case and spaces", () => {
        expect(Core.filterFiles(FILES, " FIELD ").map(f => f.name)).toEqual(["North field", "South field"]);
        expect(Core.filterFiles(FILES, "ben").map(f => f.name)).toEqual(["South field"]);
        expect(Core.filterFiles(FILES, "")).toBe(FILES);
    });

    it("numbers a name the library already has, ignoring case", () => {
        expect(Core.uniqueName("Roof", ["North field"])).toBe("Roof");
        expect(Core.uniqueName("Roof", ["roof", "Roof 2"])).toBe("Roof 3");
    });

    it("names imported and downloaded files", () => {
        expect(Core.nameFromFileName("north field.geojson")).toBe("north field");
        expect(Core.nameFromFileName("roof.JSON")).toBe("roof");
        expect(Core.nameFromFileName(".geojson")).toBe("Imported boundary");
        expect(Core.downloadName("North field: 2/3")).toBe("North_field_23.geojson");
        expect(Core.downloadName("  ")).toBe("boundary.geojson");
    });

    it("writes areas in m² below a hectare, in ha below 100 km² and in km² above", () => {
        expect(Core.formatArea(1234.567)).toBe("1234.57 m²");
        expect(Core.formatArea(123456)).toBe("12.35 ha");
        expect(Core.formatArea(1.4974365e13)).toBe("14974365 km²");
    });

    it("writes dates as year-month-day hour:minute, and nothing for a bad date", () => {
        expect(Core.formatDate(new Date(2026, 9, 7, 8, 5).toISOString())).toBe("2026-10-07 08:05");
        expect(Core.formatDate("not a date")).toBe("");
    });

    it("puts the server's errors in one line", () => {
        expect(Core.errorMessage({detail: "Not found."}, 404)).toBe("Not found.");
        expect(Core.errorMessage({name: ["Taken"], geojson: ["Not a polygon"]}, 400)).toBe("Taken Not a polygon");
        expect(Core.errorMessage(null, 500)).toBe("The server answered 500");
    });
});

describe("the library's requests", () => {
    const answer = (status, body) => Promise.resolve({status, ok: status < 400, json: () => body === undefined ? Promise.reject(new Error("no body")) : Promise.resolve(body)});

    it("sends JSON with the CSRF token to the plugin's API", () => {
        const calls = [];
        const client = Core.createClient((url, init) => { calls.push([url, init]); return answer(200, {id: 3}); }, "/api/plugins/geojson/", "tok");
        return client.update(3, {name: "Roof"}).then(data => {
            expect(data).toEqual({id: 3});
            expect(calls[0][0]).toBe("/api/plugins/geojson/boundaries/3");
            expect(calls[0][1]).toEqual({method: "PATCH", credentials: "same-origin", body: '{"name":"Roof"}',
                                         headers: {"X-CSRFToken": "tok", "Content-Type": "application/json"}});
        });
    });

    it("lists, creates and deletes", () => {
        const calls = [];
        const client = Core.createClient((url, init) => { calls.push(init.method + " " + url); return answer(init.method === "DELETE" ? 204 : 200, []); }, "/a/", "t");
        return Promise.all([client.list(), client.create("Roof", {}), client.remove(4)]).then(results => {
            expect(calls).toEqual(["GET /a/boundaries", "POST /a/boundaries", "DELETE /a/boundaries/4"]);
            expect(results[2]).toBeNull();
        });
    });

    it("rejects with the server's error, or when the server cannot be reached", () => {
        const refused = Core.createClient(() => answer(400, {name: ['A file named "Roof" is already in the library']}), "/a/", "t");
        const down = Core.createClient(() => Promise.reject(new TypeError("Failed to fetch")), "/a/", "t");
        const broken = Core.createClient(() => answer(502), "/a/", "t");
        return Promise.all([
            expect(refused.create("Roof", {})).rejects.toThrow('A file named "Roof" is already in the library'),
            expect(down.list()).rejects.toThrow("Could not reach the server"),
            expect(broken.list()).rejects.toThrow("The server answered 502")
        ]);
    });
});

describe("basemaps and coordinates (as in the mission planner)", () => {
    it("turns a basemap into a MapLibre raster source", () => {
        const source = Core.basemapSource({type: "tms", url: "//{s}.tile.example/{z}/{x}/{-y}.png", maxzoom: 18, attribution: "Ex"}, "http:");
        expect(source.tiles).toEqual(["http://a.tile.example/{z}/{x}/{y}.png", "http://b.tile.example/{z}/{x}/{y}.png", "http://c.tile.example/{z}/{x}/{y}.png"]);
        expect(source.scheme).toBe("tms");
        expect(source.maxzoom).toBe(18);
        expect(source.attribution).toBe("Ex");
        expect(Core.basemapSource({type: "wms", url: "https://wms.example/ows", layers: "ortho"}).tiles[0])
            .toContain("https://wms.example/ows?service=WMS&request=GetMap&version=1.1.1&layers=ortho");
    });

    it("chooses the remembered basemap, else the default, else the first, else OpenStreetMap", () => {
        const list = [{label: "A", url: "a"}, {label: "B", url: "b", default: true}, {label: "C", url: "c"}];
        expect(Core.chooseBasemap(list, "C").label).toBe("C");
        expect(Core.chooseBasemap(list, "gone").label).toBe("B");
        expect(Core.chooseBasemap([list[0], list[2]], null).label).toBe("A");
        expect(Core.chooseBasemap([], null)).toBe(Core.OSM);
    });

    it("reads latitude, longitude", () => {
        expect(Core.parseCoordinates("40.7128, -74.0060")).toEqual([40.7128, -74.006]);
        expect(Core.parseCoordinates("40.7128 -74.0060")).toEqual([40.7128, -74.006]);
        expect(Core.parseCoordinates("91, 0")).toBeNull();
        expect(Core.parseCoordinates("Paris")).toBeNull();
    });
});

describe("address suggestions", () => {
    const EIFFEL = {type: "Feature", geometry: {type: "Point", coordinates: [2.2945, 48.8584]},
                    properties: {name: "Eiffel Tower", street: "Avenue Gustave Eiffel", housenumber: "5", city: "Paris", state: "Île-de-France",
                                 country: "France", extent: [2.2933, 48.8592, 2.2957, 48.8575]}};
    const ADDRESS = {type: "Feature", geometry: {type: "Point", coordinates: [11.1, 46.1]},
                     properties: {street: "Via Roma", housenumber: "12", city: "Trento", country: "Italy"}};
    const answer = (status, body) => Promise.resolve({status, ok: status < 400, json: () => Promise.resolve(body)});

    test("Photon is asked for five places near the map's centre, in the browser's language when it has it", () => {
        expect(Core.photonUrl("rue de rivoli", [2.35222, 48.85661], "fr"))
            .toBe("https://photon.komoot.io/api/?q=rue%20de%20rivoli&limit=5&lat=48.8566&lon=2.3522&lang=fr");
        expect(Core.photonUrl("Paris", null, null)).toBe("https://photon.komoot.io/api/?q=Paris&limit=5");
        expect(Core.photonLanguage("de-CH")).toBe("de");
        expect(Core.photonLanguage("EN")).toBe("en");
        expect(Core.photonLanguage("it-IT")).toBeNull();
        expect(Core.photonLanguage(undefined)).toBeNull();
    });

    test("a suggestion is the place's name with the street and places it is in, its point and its extent", () => {
        expect(Core.photonSuggestions({features: [EIFFEL]})).toEqual([{
            label: "Eiffel Tower", detail: "Avenue Gustave Eiffel 5, Paris, Île-de-France, France",
            center: [2.2945, 48.8584], bbox: [2.2933, 48.8575, 2.2957, 48.8592]
        }]);
    });

    test("an address without a name is labelled by its street and number, and has no extent", () => {
        expect(Core.photonSuggestions({features: [ADDRESS]})).toEqual([
            {label: "Via Roma 12", detail: "Trento, Italy", center: [11.1, 46.1], bbox: null}
        ]);
    });

    test("a city is not repeated in its own detail, and places without a position or a name are left out", () => {
        const paris = {geometry: {coordinates: [2.35, 48.85]}, properties: {name: "Paris", city: "Paris", country: "France"}};
        expect(Core.photonSuggestions({features: [paris, {geometry: null, properties: {name: "x"}}, {geometry: {coordinates: [1, 2]}, properties: {}}]}))
            .toEqual([{label: "Paris", detail: "France", center: [2.35, 48.85], bbox: null}]);
        expect(Core.photonSuggestions(null)).toEqual([]);
    });

    test("at most five suggestions are kept", () => {
        const addresses = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({...ADDRESS, properties: {...ADDRESS.properties, housenumber: String(n)}}));
        expect(Core.photonSuggestions({features: addresses}).length).toBe(5);
    });

    test("places that would read the same are suggested once, the first of them", () => {
        const area = {...ADDRESS, geometry: {type: "Point", coordinates: [11.2, 46.2]}};
        expect(Core.photonSuggestions({features: [ADDRESS, area, EIFFEL]}).map(s => s.center)).toEqual([[11.1, 46.1], [2.2945, 48.8584]]);
    });

    test("places are suggested from Photon's answer, and coordinates are not sent to it", async () => {
        const asked = [];
        const fetchFn = url => { asked.push(url); return answer(200, {features: [ADDRESS]}); };
        expect(await Core.suggestPlaces(fetchFn, "via roma", [11, 46], "en")).toEqual([
            {label: "Via Roma 12", detail: "Trento, Italy", center: [11.1, 46.1], bbox: null}
        ]);
        expect(asked).toEqual(["https://photon.komoot.io/api/?q=via%20roma&limit=5&lat=46.0000&lon=11.0000&lang=en"]);
        expect(await Core.suggestPlaces(fetchFn, "46.1, 11.1", [11, 46], "en")).toEqual([]);
        expect(asked.length).toBe(1);
    });

    test("a failed answer from Photon rejects, so that no list is shown", async () => {
        await expect(Core.suggestPlaces(() => answer(503, null), "via roma", null, null)).rejects.toThrow("Photon answered 503");
        await expect(Core.suggestPlaces(() => Promise.reject(new TypeError("offline")), "via roma", null, null)).rejects.toThrow("offline");
    });

    test("a picked place with an extent is fitted on the map, one without is flown to at zoom 15 or closer", () => {
        const calls = [];
        const map = {getZoom: () => 12, fitBounds: (b, o) => calls.push(["fit", b, o]), flyTo: o => calls.push(["fly", o])};
        Core.showSuggestion(map, {center: [2.29, 48.86], bbox: [2.2933, 48.8575, 2.2957, 48.8592]});
        Core.showSuggestion(map, {center: [11.1, 46.1], bbox: null});
        map.getZoom = () => 17;
        Core.showSuggestion(map, {center: [11.1, 46.1], bbox: null});
        expect(calls).toEqual([
            ["fit", [[2.2933, 48.8575], [2.2957, 48.8592]], {padding: 40, maxZoom: 18}],
            ["fly", {center: [11.1, 46.1], zoom: 15}],
            ["fly", {center: [11.1, 46.1], zoom: 17}]
        ]);
    });
});
