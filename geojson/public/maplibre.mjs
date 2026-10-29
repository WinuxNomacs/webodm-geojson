// MapLibre 6 is an ES module only: this makes it the global the plugin's ES5 scripts use. Loaded as
// <script type="module"> before them (the editor page, boundary_buttons.js)
import * as maplibregl from "./node_modules/maplibre-gl/dist/maplibre-gl.mjs";

window.maplibregl = maplibregl;
