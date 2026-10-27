# Upcoming changes

## Phases (current and upcoming)

**Up next**
(2026-10-27: the port requested in `new.md`, planned the same day)
1. **Port phase 1: the plugin and its library on official WebODM** (to plan). (Port)

**Then**
(nothing yet)

**Later**
- **The Task Options buttons ("Create GeoJSON", "Use existing")**: on hold until WebODM's developers say which
  UI extensions plugins may use. (Port)
- **Autocomplete in the address search** (in LuxODM's "Up next", not built there yet). (Port)

**Done**
- **Dev environment** — 2026-10-27. Upstream WebODM in dev mode beside LuxODM (`dev/webodm.sh`,
  `dev/compose.yml`), a Python 3.9 `.venv`, Ruff for 3.9, Jest, ESLint and Playwright (`package.json`,
  `eslint.config.mjs`). The skeleton plugin in `geojson/` registers in WebODM.

## Port

- **Port of LuxODM's GeoJSON plugin**: requested 2026-10-27 (`new.md`). In the user's words: "Create official
  GEOJson webodm plugin ported from our luxodm fork located in ~/gitrepos/web/luxodm. Code will be ported to
  maintain feature parity while remaining in accordance with official webodm plugin guidelines in the
  documentation below. Discover any functionality that must change or be removed because it's not in
  accordance with plugin development guidelines so we can plan accordingly. Prefer code compatibility changes
  to rewrites as the brunt of this is expected to be python version compatibility changes." Guidelines:
  https://docs.webodm.org/plugin-development-guide and https://github.com/WebODM/WebODM-Plugins.
  - **Builds on:** LuxODM's `coreplugins/geojson` (plugin 0.2.0: `api.py`, `boundary.py`, `plugin.py`,
    `public/`, `templates/editor.html`), its model `app/models/geojson_boundary.py` (migration 0076), its
    tests `app/tests/test_geojson_plugin.py` (24) and `public/__tests__/` (94 Jest), and the core hook it added,
    `PluginsAPI.Dashboard.addTaskOptionButton`.
  - **Target:** WebODM 3.3.2 (`ignored/WebODM`, image pinned in `dev/compose.yml`): Python 3.9, Django 2.2.27,
    DRF 3.13.1, pyproj 3.6.1. LuxODM runs Python 3.12 and Django 5.2.
  - **What has to change** (found 2026-10-27):
    1. **No model of its own.** Plugins are not Django apps in WebODM: they are not in `INSTALLED_APPS` and
       have no migrations, so `GeoJsonBoundary` and migration 0076 cannot come along. `models.JSONField` is also
       Django 3.1+. The library moves to the plugin's `GlobalDataStore` (the `PluginDatum` table, JSON values),
       the storage the guide offers. Consequences: uniqueness of names, ids, the owner and the dates are kept by
       the plugin's code, not the database. A deleted user's files keep a dangling owner id (shown as a deleted
       user; admins still change them) where the model had `SET_NULL`. The files are visible and editable in
       Administration > Plugin Datum, which the guide states for all data stores. Layout (the user's decision,
       2026-10-27): the whole library is one JSON value under one key, read and written only through the
       store's documented API; each save (read, change, write) holds a lock in a transaction so two saves at
       once cannot drop an edit. Rejected: one key per boundary, since the store cannot list its keys (it would
       need an index key with the same lock, or queries on `PluginDatum` beyond the guide's API).
    2. **No Task Options buttons.** `Dashboard.addTaskOptionButton` does not exist upstream (its hooks are
       `addTaskActionButton`, `addNewTaskPanelItem`, `addNewTaskButton`, `addImportTaskItem`), and neither does
       the task context that LuxODM's `EditTaskForm`/`NewTaskPanel` pass to it. The user's decision
       (2026-10-27): drop "Create GeoJSON" and "Use existing" for now (`boundary_buttons.js`, the `basemaps`
       endpoint it needs), listed under Later, until WebODM's developers say which UI extensions are acceptable.
       Users download a file from the library and load it with the boundary option's own import button.
    3. **Python 3.9 / Django 2.2 / DRF 3.13 compatibility** in `api.py`, `boundary.py`, `plugin.py` and the
       tests. A first read finds no syntax newer than 3.9; Ruff (`target-version = "py39"`) checks it. The
       serializer moves from a `ModelSerializer` to a plain `Serializer` over the stored JSON.
    4. **Tests move into the plugin** (`geojson/tests/`), run by `manage.py test coreplugins.geojson.tests` in
       the dev container, instead of `app/tests/`.
    5. **Packaging:** the plugin is the `geojson/` folder (a zip with it as its single root folder, as the
       directory requires); the repo's dev tools stay outside it. MapLibre and terra-draw come from the
       plugin's `public/package.json`, which WebODM installs with npm when it builds plugins (pinned by its
       lock file). The manifest gets `webodmMinVersion` 3.3.2, `repository` and the author; the repo's AGPLv3
       license satisfies the directory's OSI-license rule.
  - **Kept as is:** the menu tab and editor page (`main_menu`, `app_mount_points`, `template_path`, base
    template, `{% theme %}`), the API under `api_mount_points`, `Basemap.get_cached_basemaps()`, the ES5 UMD
    front end and its Jest tests, the address search on Nominatim (the browser calls it, as in LuxODM).
  - **Proposed phases:**
    - **Phase 1: the plugin and its library** (LuxODM's phase 1): the back end on the data store, the editor
      page, Django and Jest tests, a live check on the dev server (port 8001).
    - **Later: the Task Options buttons**, when WebODM's developers answer (a hook upstream, or another way).
  - **Open decisions:**
    - Keep the editor's dialog mode (`geojson_editor.js`, `map_view.js`, tested) dormant for the buttons'
      return, or remove it until then? Proposed: keep it, since the port prefers compatibility to rewrites.
    - Bring LuxODM's saved boundaries over (a one-off import of its library), or start empty? Proposed: start
      empty; files can be downloaded from LuxODM and imported one by one.
    - Plugin version: start at 1.0.0 for the first release on WebODM, or continue from 0.2.0? Proposed: 1.0.0.
