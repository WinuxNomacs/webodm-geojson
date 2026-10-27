# Upcoming changes

## Phases (current and upcoming)

**Up next**
(2026-10-27: the release and the upstream hook, requested in chat, planned the same day)
1. **Release 1.0.0 as it is** (planned 2026-10-27, decisions under Release). (Release)

**Then**
2. **A pull request to WebODM: Task Options extensions for any plugin** (a general design, 2026-10-27; to plan
   after the release, and best after asking WebODM's developers). (Task Options hook)

**Later**
- **The Task Options buttons ("Create GeoJSON", "Use existing")** in this plugin: once WebODM has the hook (Then,
  2). (Port, Task Options hook)

**Done**
- **Port phase 1: the plugin and its library on official WebODM** — 2026-10-27. `geojson/` (`library.py` keeps
  the library in the global data store under a lock; `api.py`, `boundary.py`, `plugin.py`, `public/`,
  `templates/` from LuxODM), version 1.0.0. Tests: `geojson/tests/test_geojson.py` (29), `public/__tests__/` (94
  Jest). Checked live on :8001 as an admin and a second user. (Port)
- **Autocomplete in the address search** — 2026-10-27, came with phase 1: LuxODM built it (6847acfb, 5e6a0236)
  before the port copied `public/`, so the ported files are LuxODM's current ones (Photon suggestions in
  `geojson_core.js`, the list in `search_panel.js`, Jest in `public/__tests__/`). Checked live on :8001. (Port)
- **Dev environment** — 2026-10-27. Upstream WebODM in dev mode beside LuxODM (`dev/webodm.sh`,
  `dev/compose.yml`), a Python 3.9 `.venv`, Ruff for 3.9, Jest, ESLint and Playwright (`package.json`,
  `eslint.config.mjs`). The skeleton plugin in `geojson/` registers in WebODM.

## Release

- **Release 1.0.0 as it is**: requested 2026-10-27 in chat ("plan to prepare for release as is").
  - **Builds on:** the plugin as merged (Done: port phase 1, autocomplete), version 1.0.0 in the manifest.
  - **What the directory needs** (https://github.com/WebODM/WebODM-Plugins, read 2026-10-27): a zip with a single
    root folder holding `manifest.json` (and `plugin.py`), at a public URL, under an OSI license; an entry
    `{"url", "sha256"}` in `directory.json`, by a pull request to that repo. WebODM installs it by downloading
    the zip, checking the sha256, unpacking it into its plugins folder (the folder name, `geojson`, is the
    plugin's name and its URLs) and running `npm install --ignore-scripts` in `public/`.
  - **Design** (one phase, on a `release/1.0.0` branch):
    - `dev/package.sh`: builds `dist/geojson-1.0.0.zip` (version from the manifest) from the committed files of
      `geojson/` (`git archive`, so no `node_modules` or `__pycache__`), with `LICENSE` added and without the
      tests (`tests/`, `public/__tests__/`: `public/` is served to browsers); prints its sha256. `dist/` ignored.
    - `README.md`: what the plugin does, installing it (the directory, or Administration > Plugins > upload),
      using it, the outside services the browser calls (map tiles from the instance's basemaps, Photon for
      suggestions, Nominatim for a search), development (pointing to `CLAUDE.md`), the license.
    - `CHANGELOG.md`: 1.0.0, the port of LuxODM's plugin 0.3.0, and what is left out (the Task Options buttons).
    - Manifest: `experimental` set to `false` (it is `true` since the skeleton; WebODM only shows it as a badge in
      its plugin browser).
    - **Release check** (a skill, `release-check`): the tests; then on the dev server, unmount `geojson/`
      (an empty folder in its place), upload the zip with its sha256 in Administration > Plugins, check that
      npm installed the libraries, run the live check on the installed copy, remove the plugin and remount.
    - Merge into `main`. The user then makes the zip public (a release of v1.0.0, tagged by the user) and opens
      the pull request to WebODM-Plugins with the `url` and `sha256` the script printed.
  - **Decisions** (the user's, 2026-10-27):
    - This repo is made public at release; the zip is attached to its v1.0.0 GitHub release (as the directory's
      other entries do). The README is kept current with every feature change from now on (`CLAUDE.md`).
    - `experimental`: `false`.

## Task Options hook

- **A pull request to WebODM so the Task Options load extensions from installed plugins**: requested 2026-10-27
  in chat ("evaluate the lift needed for a pull request to WebODM's main repo so the Task Options can load
  controls from installed plugins without impacting the Task Options at all when no plugin with Task Option
  extensions is installed"). The user's direction the same day: "the hook should be general as an open approach
  for all developers to be able to use going forward when registering plugins with Task Option modifiers. The
  design should take into account that any plugin may need to add or interact with the Task Options panel in
  order to provide additional functionality during task setup, not just for our geojson plugin; but all
  plugins."
  - **Builds on:** LuxODM's commit 1be35e8b (`Dashboard.addTaskOptionButton`: buttons beside one option, 6
    files, +92/-4), which is GeoJSON-shaped (buttons only, per option). Upstream (`ignored/WebODM`, 3.3.2):
    - The options are edited in `EditPresetDialog`, one `ProcessingNodeOption` each; `EditTaskForm` holds the
      task's context (`task` when editing, `getCropPolygon`, `getGcpFile`, `getFiles`, `filesCount`, the node
      and preset) and is used both by `NewTaskPanel` and when a task is edited.
    - Upstream's hooks hand back React components that WebODM renders with props (`addNewTaskPanelItem` gets
      `taskInfo`, `getFiles`, `filesCount`; `addTaskActionButton` gets the task); none lets a plugin change a
      task's options: the panel item is read-only.
    - `ApiFactory`'s `trigger…` adds a response listener per call that is removed only when a plugin answers:
      with no plugin listening, every call leaves one behind for the page's life.
  - **Design (Claude's, 2026-10-27): one context, two hooks, nothing without a listener.**
    - **The task-options context**, built once in `EditTaskForm` and passed down to the dialog, the same for
      every hook: `{task}` (null for a new task), `node` (the processing node and its available options),
      `getFiles()`, `filesCount`, `getCropPolygon()`, `getGcpFile()`, `getPhotoPositions()` (new in
      `NewTaskPanel`: `[lon, lat]` of the photos the map preview read). Read-only: what a plugin changes, it
      changes through the hooks' setters, so WebODM keeps owning the values.
    - **`Dashboard.addTaskOptionControl(callback)`**: for each option shown, WebODM asks with `{option: {name,
      type, domain, help, defaultValue}, context}`; a plugin answers with a React component (or a list, or
      nothing), rendered after that option's input with the props `{option, value, setValue(value), context}`.
      A button (as LuxODM's GeoJSON ones), a picker, a check, a hint: whatever the plugin renders.
    - **`Dashboard.addTaskOptionsPanelItem(callback)`**: a plugin answers with a React component rendered at the
      top of the options dialog, with `{options (name → value, as edited now), availableOptions, getOption(name),
      setOption(name, value), setOptions({name: value}), context}`. For extensions that work across options:
      recommendations for the photos, a helper that fills several options, a summary or a warning.
      It is re-rendered as the options change, so a plugin needs no change event of its own.
    - **A value a plugin sets is as if the user typed it**: the option counts as changed, a system preset turns
      into the user's "Custom" one as it does today, and resetting to the default works as for any option.
    - **No plugin, no change:** before triggering, each place checks that a plugin registered for that hook
      (`PluginsAPI.events.listeners("Dashboard::<hook>").length`; `events` is already exported); otherwise it
      triggers nothing, sets no state and renders the same markup as today. Plugin scripts register when the
      page loads, before the dialog can open, so the check misses none.
    - **Documented** as two new entries in the plugin guide's hook list (docs.webodm.org, its own repo), with
      a short example each.
  - **Lift:** about 200–250 lines in 6 files (`Dashboard.js`, `ProcessingNodeOption.jsx`, `EditPresetDialog.jsx`,
    `EditTaskForm.jsx`, `NewTaskPanel.jsx`, a small helper for the listener check) plus Jest tests (a control
    shown and setting its value; a panel item reading and setting several options; nothing triggered, no
    listener left and the same render without a plugin) and the docs PR: one to two days of work with the live
    checks. Not a cherry-pick: LuxODM's `ProcessingNodeOption.jsx` already differs from upstream's (its
    recommendations feature), so it is built on upstream's files.
  - **WebODM's contribution rules** (`CONTRIBUTING.md`, the PR template): minimal and focused, no linter
    changes; AI use allowed but disclosed (which AI, how much, and for new contributors how long it took); the
    pull request opened by hand with a description in the contributor's own words; the contributor must be
    able to explain the logic and its impact. Claude prepares the branch, tests and notes; the user reviews,
    writes the description and opens the PR from their fork.
  - **This plugin afterwards:** "Create GeoJSON" and "Use existing" come back as an `addTaskOptionControl` for the
    `boundary` option, feature-detected so the plugin still works (without them) on WebODM without the hook;
    the `basemaps` endpoint returns. A minor version (1.1.0).
  - **Proposed phases:**
    - **A: the WebODM branch**, in `ignored/WebODM` on a branch from upstream master: the context, both hooks,
      the guard, WebODM's Jest tests, and a live check on the dev server (which runs that checkout) with no
      plugin, and with a small example plugin using each hook (kept out of the PR: it shows the docs' examples
      work). Then the docs change. Nothing pushed: the user forks, pushes and opens the PRs.
    - **B: the buttons in this plugin** (1.1.0), on the hook as merged upstream.
  - **Open decisions** (when it is planned): ask WebODM's developers first (Discord #devtalk or an issue, with
    this design), or open the PR and let it be the question? Proposed: ask first: a general API is theirs to
    shape, and they may want other names or places (e.g. the New Task panel as well as the dialog).

## Port

- **Port of LuxODM's GeoJSON plugin**: requested 2026-10-27 (`new.md`). In the user's words: "Create official
  GEOJson webodm plugin ported from our luxodm fork located in ~/gitrepos/web/luxodm. Code will be ported to
  maintain feature parity while remaining in accordance with official webodm plugin guidelines in the
  documentation below. Discover any functionality that must change or be removed because it's not in
  accordance with plugin development guidelines so we can plan accordingly. Prefer code compatibility changes
  to rewrites as the brunt of this is expected to be python version compatibility changes." Guidelines:
  https://docs.webodm.org/plugin-development-guide and https://github.com/WebODM/WebODM-Plugins.
  - **Builds on:** LuxODM's `coreplugins/geojson` (plugin 0.3.0: `api.py`, `boundary.py`, `plugin.py`,
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
    4. **Tests move into the plugin** (`geojson/tests/`), run by `manage.py test coreplugins.geojson.tests.test_geojson` in
       the dev container, instead of `app/tests/`.
    5. **Packaging:** the plugin is the `geojson/` folder (a zip with it as its single root folder, as the
       directory requires); the repo's dev tools stay outside it. MapLibre and terra-draw come from the
       plugin's `public/package.json`, which WebODM installs with npm when it builds plugins (pinned by its
       lock file). The manifest gets `webodmMinVersion` 3.3.2, `repository` and the author; the repo's AGPLv3
       license satisfies the directory's OSI-license rule.
  - **Kept as is:** the menu tab and editor page (`main_menu`, `app_mount_points`, `template_path`, base
    template, `{% theme %}`), the API under `api_mount_points`, `Basemap.get_cached_basemaps()`, the ES5 UMD
    front end and its Jest tests, the address search on Nominatim (the browser calls it, as in LuxODM).
  - **Request, 2026-10-27** (`new.md`): "ensure the new autocomplete functionality recently added to luxodm's
    geojson plugin is ported here as well." Found already ported with phase 1 (see Done): LuxODM's address
    suggestions from Photon (photon.komoot.io; Enter without a suggestion still searches Nominatim).
  - **Proposed phases:**
    - **Phase 1: the plugin and its library** (LuxODM's phase 1): the back end on the data store, the editor
      page, Django and Jest tests, a live check on the dev server (port 8001).
    - **Later: the Task Options buttons**, when WebODM's developers answer (a hook upstream, or another way).
  - **Decisions** (the user's, 2026-10-27, as proposed):
    - The editor's dialog mode (`geojson_editor.js`, `map_view.js`, tested) stays, dormant, for the buttons' return.
    - The library starts empty: LuxODM's files can be downloaded there and imported one by one.
    - The plugin starts at version 1.0.0.
  - **Phase 1 design:**
    - **Back end** (`geojson/`):
      - `boundary.py`: LuxODM's, unchanged (it is Python 3.9 already).
      - `library.py` (new, in place of the model): the library is the JSON value under the key `library` of
        `GlobalDataStore('geojson')`: `{"next_id": n, "files": [{id, name, geojson, area, owner_id, created_at,
        updated_at}]}`, dates as ISO strings. Functions to list (most recently changed first), get, create,
        update and delete a file. Every change runs in `transaction.atomic()` under a Postgres advisory lock
        (`pg_advisory_xact_lock`), then reads, changes and writes the value: only the store's documented API
        touches the data. Ids are integers from `next_id`, never reused, so the URLs stay `boundaries/<id>`.
      - `api.py`: the serializer becomes a plain `Serializer` with LuxODM's fields and checks (name required and
        unique whatever the case, the polygon normalized by `boundary.py`, the area computed); the views become
        `APIView`s with the same URLs, methods, permissions (anyone reads, the owner or an admin changes) and
        JSON, so the front end is unchanged. The owner's username comes from the ids in one query; a deleted
        user's files show no owner. The `basemaps` endpoint goes (only the buttons used it).
      - `plugin.py`: LuxODM's menu tab, editor page and API, without `include_js_files`/`include_css_files`
        (they served the buttons on every page; the editor page links its CSS itself).
      - `manifest.json`: version 1.0.0, LuxODM's description and tags.
    - **Front end** (`geojson/public/`): LuxODM's scripts, CSS, `package.json` and lock file and
      `templates/editor.html` as they are, without `boundary_buttons.js` and its tests. WebODM runs `npm install`
      there when it builds plugins.
    - **Tests:** LuxODM's Django tests in `geojson/tests/`, without the two on the buttons and the basemaps
      endpoint, plus: the library is stored as one value in the data store, ids are not reused after a delete,
      two saves in a row both survive. The Jest tests in `public/__tests__/` (without `boundary_buttons`).
    - **Live check** (with a dev account from the user): open the tab, draw, import, save, rename, copy,
      download and delete a file, with a second user who can only copy; then remove what the check made.
