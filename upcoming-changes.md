# Upcoming changes

## Phases (current and upcoming)

**Up next**
(nothing to build: 1.1.1 is published (Done: "Release 1.1.1"). Still the user's: what
becomes of Docs#11, whose guide describes #2041's `addTaskOptionControl`, not #2043's hook.)

(waiting, as of 2026-10-29, on
- WebODM-Plugins#2 (the directory entry to 1.1.1, branch `geojson-1.1.1` from upstream `main`): open. #1 was
  merged 2026-10-29 at 1.1.0 (675d9a8), so WebODM's plugin directory lists 1.1.0 until #2 merges;
- WebODM/Docs#11 (the plugin guide's how-to): open, no review; describes #2041's hook, not #2043's.)

**Later**
(nothing planned)

**Done**
- **Release 1.1.1 (MapLibre 6)** — 2026-10-29, `maplibre-6` (46231a7) and `release/1.1.1` (11c1568) from `main`.
  Dependabot alert #1 (GHSA-jrc7-96c5-q579, XSS through attribution HTML in maplibre-gl <= 6.4.0): maplibre-gl
  6.16.0. `geojson/public/maplibre.mjs` imports the ES module and sets `window.maplibregl`; `editor.html` loads it as
  a module with the other scripts `defer`red; `boundary_buttons.js`'s loader gives `.mjs` files `type="module"`.
  ESLint has an entry for `*.mjs`. README: WebGL2 and ES2022 browsers. npm in `geojson/public` has to run in the
  container (`docker exec -w /webodm/coreplugins/geojson/public gj-webapp npm install`): `node_modules` is root's;
  on the host only `--package-lock-only`. Proof: the advisory's `<details open onload ontoggle>` runs on 5.24.0 and
  not on 6.16.0 (standalone page), and not in the plugin through a temporary WebODM basemap (removed). Tests:
  Jest 124, Django 35, Ruff, ESLint. Live: the library (draw, import, save, search, attribution), the Task Options
  buttons for a new and an existing task; not checked: a processed task's orthophoto layer (none on :8001).
  Release check: zip sha256 4af0ee8604a2af60e1661a50719200233c02df012e6e15c074a94097a27ffd4d, wrong sha256
  refused, npm installed maplibre-gl 6.16.0 in the installed copy, `.mjs` served as `text/javascript`; live: the
  library, a second user who can only copy, the buttons. Everything made was removed; library "Home", "Fremd".
  Published 2026-10-29 by Claude, on the user's word ("push the tag, release and pr"): tag `v1.1.1` (annotated, on
  11c1568), GitHub release with the zip (the download's sha256 checked), WebODM-Plugins#2.
- **WebODM 3.3.2 released with the hook** — 2026-10-29. #2043 merged (5a0ec41e, the same code as c4d1e292, which
  1.1.0 was checked on) and tagged `v3.3.2`; the `3.3.2` images are new builds (the old pin was a pre-release
  build also called 3.3.2, without the hook). `dev/compose.yml` pins the new webapp and NodeODX images,
  `ignored/WebODM` is at `v3.3.2`; README and CHANGELOG say the hook is in 3.3.2. 1.1.0 needs no new release.
  WebODM's developer, on #2041: "no unit tests from AI please": none in anything for WebODM itself.
- **Release 1.1.0** — 2026-10-28, `release/1.1.0` (f68edad) from `main`: the boundary buttons on #2043's hook.
  The user, 2026-10-28: "publish the latest version of the plugin so it's available before the webodm
  release" (on 2026-10-27 they had chosen to wait for it). `webodmMinVersion` stays 3.3.2: the buttons appear
  only on a WebODM with the hook, and if #2043 renames it before merging, they stay hidden until a 1.1.1.
  Manifest and `CHANGELOG.md` (1.1.0, naming #2043); the README already did. Tests: Jest 124, Django 35 (with
  WebODM's plugin tests), Ruff, ESLint. The zip installed through Administration > Plugins on :8001 running
  #2043 (a wrong sha256 refused, npm ran in the installed copy); live: the library, drawing, import, save,
  search suggestions, a second user who can only copy, and the buttons on a new task. What the check made was
  removed, the installed copy uninstalled and `geojson/` mounted again. (Release)
- **The buttons on #2043's hook** — 2026-10-28. WebODM's developer closed #2041 and opened #2043 from it: one
  `Dashboard.presetDialogOptionsReady` trigger when the options dialog opens (again on a switch between grouped
  and flat view), with `{task, getExifData, options}` (`options`: each option's component, with `getValue()`
  and `setValue()`), answered with `{controls: {optionName: element}}`. `boundary_buttons.js`: `controlsFor`
  adapts those args to the buttons' own, `exifPositions` turns EXIF data into the photos' positions; the
  plugin no longer registers on `addTaskOptionControl`. README and changelog name the new hook. Tests: Jest
  124, Django, Ruff, ESLint. Checked live on :8001 running #2043: a new task (buttons only beside `boundary`,
  kept on switching to flat view and back, the photos on the map, Escape, "Use existing" set the value, saved
  with the task) and an existing one (the buttons, its value in the editor, `task` given, no EXIF data). The
  two tasks were removed. (Task Options hook)
- **One Task Options hook (review of #2041)** — 2026-10-27, as WebODM's developer asked. WebODM: a commit on
  `task-options-extensions` (32d8e18c): `addTaskOptionControl` alone, asked by each `ProcessingNodeOption` with
  `{option, getValue, setValue, task, getPhotoPositions}` and showing the elements returned, like
  `addNewTaskButton`; `TaskOptionsPluginItems`, the two other hooks, `taskOptions` and the other context fields
  removed; the PR is +213 −16 in 9 files (65 lines of code outside the tests). No error boundary any more: none
  of WebODM's other hooks has one. WebODM's Jest: 54 suites, 69 tests. Then (2026-10-28, the user: "ensure the
  unit tests included are actually necessary and purposeful"), each test was run against the bug it covers
  (the old `ApiFactory`, the code removed): a test of several triggers passed on the old `ApiFactory` and a
  no-plugin test compared the new markup with itself, both removed; the dialog's test checks what a plugin can
  do there, not the props passed down; a test added for a control that comes after the option is gone
  (2b0d7a95). The plugin's hook tests check behaviour, not markup (element types, icons). Docs: a commit on `task-options-hooks`
  (42d0558), the section cut to the one hook (the PR +58). Plugin: `boundary_buttons.js` builds its buttons
  from the args; Jest 121, Django and Ruff pass. Checked live on :8001: a new task (the buttons only beside
  `boundary`, the photos on the editor's map, Escape, "Use existing" set the value, saved with the task) and
  that task edited (the buttons, its value in the editor, `task` given to plugins); the guide's two examples
  ran as written. The task and the temporary example module were removed. (Task Options hook, "Review: one
  hook")
- **Release 1.0.2** — 2026-10-27, `release/1.0.2` from the 1.0.1 release (69eaadc) with `theme-colors`: the
  editor in WebODM's theme colors (the user, 2026-10-27: "fix it first to support theme colors", before the
  WebODM-Plugins PR, whose guidance asks plugins not to hard-code colors). `geojson.css` names no colors; the
  markup has WebODM's theme classes; the map's zoom, layers and search buttons are the plugin's own control
  group. Tests: Jest 95, Django 34. Checked live on the Default theme and a temporary dark theme (removed
  afterwards), then the zip installed through WebODM's plugin upload and the live check passed on it. 1.0.1
  is not published: replaced by 1.0.2. (Release)
- **Release 1.0.1** — 2026-10-27, `release/1.0.1` from the 1.0.0 release (da665a4): 1.0.0 with the http
  basemap fix, not published: replaced by 1.0.2 (the user, 2026-10-27: "I don't want to release 1.0.0"; the boundary
  buttons stay for 1.1.0). `CHANGELOG.md`, `README.md` (the buttons described as coming in 1.1.0), the manifest.
  Tests: Jest 95, Django 34 (with WebODM's plugin tests). The zip was installed through WebODM's plugin upload
  with its sha256 (a wrong one is refused), npm ran in the installed copy, and the live check passed on it
  (library, copy and rights with a second user, search, OpenStreetMap tiles on http). (Release)
- **The plugin guide's how-to for the Task Options hooks** — 2026-10-27, `task-options-hooks` in
  `ignored/WebODM-Docs` (a4f1986): a first plugin, JSX as the hook's dependency, the props and `taskOptions`
  functions with their return values, an example per hook, existing tasks, older WebODM versions, own dialogs.
  Every example ran as written in a throwaway plugin on :8001 (new and existing task), removed afterwards. The
  user is reviewing the branch with WebODM's lead developer, who recommended client-side hooks: the PR is
  kept as is (three `Dashboard` hooks; nothing server-side).
- **The GeoJSON controls on the Task Options hook (phase B)** — 2026-10-27, built, released later (1.1.0).
  `geojson/public/boundary_buttons.js` (on `addTaskOptionControl`), `plugin.py` (the script and
  `geojson.css` on every page, the `basemaps` endpoint), `api.py` (`BasemapsView`). Tests: Jest 120 (was 94,
  `public/__tests__/boundary_buttons.test.js`), Django 30 (was 29). Checked live on :8001 on the PR branch (a new
  task: Create GeoJSON, Escape, "(Custom)" preset, the review; an existing task: Use existing, saved) and on
  upstream master without the hook (no buttons, no errors). (Task Options hook, "Built (phase B)")
- **The WebODM pull request, Task Options extensions (phase A)** — 2026-10-27, built, not yet opened (the user
  reviews, pushes from a fork and opens both PRs). Branch `task-options-extensions` in `ignored/WebODM` (2
  commits on upstream master 88bd0034) and `task-options-hooks` in `ignored/WebODM-Docs` (the plugin guide).
  WebODM's Jest: 55 suites, 81 tests (was 53, 61). Checked live on :8001 for a new and an existing task, with
  no plugin and with an example plugin using each hook. (Task Options hook, "Built")
- **Release 1.0.0** — 2026-10-27. `README.md`, `CHANGELOG.md`, `experimental: false`, `dev/package.sh` (the zip
  and its sha256), the `release-check` skill. The zip was installed through WebODM's plugin upload with its
  sha256 (a wrong one is refused), npm ran in the installed copy, and the live check passed on it. Not
  published: replaced by 1.0.1.
  (Release)
- **Phase 1: the plugin and its library on official WebODM** — 2026-10-27. `geojson/` (`library.py` keeps
  the library in the global data store under a lock; `api.py`, `boundary.py`, `plugin.py`, `public/`,
  `templates/`), version 1.0.0. Tests: `geojson/tests/test_geojson.py` (29), `public/__tests__/` (94 Jest).
  Checked live on :8001 as an admin and a second user. (First version)
- **Autocomplete in the address search** — 2026-10-27, with phase 1: Photon suggestions in `geojson_core.js`,
  the list in `search_panel.js`, Jest in `public/__tests__/`. Checked live on :8001. (First version)
- **Dev environment** — 2026-10-27. Upstream WebODM in dev mode beside another WebODM (`dev/webodm.sh`,
  `dev/compose.yml`), a Python 3.9 `.venv`, Ruff for 3.9, Jest, ESLint and Playwright (`package.json`,
  `eslint.config.mjs`). The skeleton plugin in `geojson/` registers in WebODM.

## Release

- **Release 1.0.0 as it is**: requested 2026-10-27 in chat ("plan to prepare for release as is").
  - **Builds on:** the plugin as merged (Done: phase 1, autocomplete), version 1.0.0 in the manifest.
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
    - `CHANGELOG.md`: 1.0.0, the first release, and what is left out (the Task Options buttons).
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

## Publishing 1.1.0 (the user's steps)

Built and checked 2026-10-28 (Done: Release 1.1.0). **All done 2026-10-29:** `v1.1.0` tagged, the GitHub
release https://github.com/WinuxNomacs/webodm-geojson/releases/tag/v1.1.0 with the zip, WebODM-Plugins#1
pushed at 172df21 (the 1.1.0 entry).
1. Push `main`; tag `v1.1.0` on f68edad (the last commit of `release/1.1.0`) and push the tag.
2. Create the GitHub release v1.1.0 with `CHANGELOG.md`'s 1.1.0 entry, and attach `dist/geojson-1.1.0.zip`
   exactly as built: sha256 `e03624a7a2bb66d669da2f963b0c8fe6818ccfacc0a91c0690418c0fd17c4737`. If `dist/` is
   lost, rebuild it at f68edad (`git worktree add`, `dev/package.sh`): the sha256 changes, so use the new one.
3. Check the download: `curl -sL <url> | sha256sum` gives the sha256 above.
4. WebODM-Plugins#1 is not merged yet: its entry moves to 1.1.0 (**prepared 2026-10-28:** commit 172df21 on
   `add-geojson` in `ignored/WebODM-Plugins`), pushed to the fork after step 3:
   `git -C ignored/WebODM-Plugins push fork add-geojson`.

## Publishing 1.0.2 (the user's steps, when ready)

Built and checked 2026-10-27 (Done: Release 1.0.2). 1.0.0 and 1.0.1 are not published: no tags, no GitHub
releases.
**Steps 2–4 done 2026-10-27:** `main` pushed, `v1.0.2` tagged on d2178cf, the GitHub release
https://github.com/WinuxNomacs/webodm-geojson/releases/tag/v1.0.2 with the zip (its download gives the sha256
below). **Step 5 done 2026-10-27:** https://github.com/WebODM/WebODM-Plugins/pull/1 (`add-geojson`, f27ab39,
from the user's fork), open and mergeable; the plugin is listed once WebODM merges it.
1. Make the repo public. **Done 2026-10-27.**
2. Push `main`; tag `v1.0.2` on the last commit of `release/1.0.2` (not its merge into `main`, which also has
   the boundary buttons for 1.1.0), and push the tag.
3. Create the GitHub release v1.0.2 with `CHANGELOG.md`'s 1.0.2 entry, and attach `dist/geojson-1.0.2.zip`
   exactly as built: sha256 `f7f0198eacb5967904b5f9bb3b1ce6414aebdc9ce529999134108d9c106092ca`. The zip
   carries the commit's timestamps, so a rebuild after another commit has another sha256; if `dist/` is lost,
   rebuild it at 9c69ef9, the commit it was built from (`git worktree add`, `dev/package.sh`) and use the new
   sha256 below.
4. Check the download: `curl -sL <url> | sha256sum` gives the sha256 above.
5. Open a pull request to https://github.com/WebODM/WebODM-Plugins adding to `directory.json`'s `plugins`
   (**prepared 2026-10-27:** branch `add-geojson` in `ignored/WebODM-Plugins`):
   ```json
   {
       "url": "https://github.com/WinuxNomacs/webodm-geojson/releases/download/v1.0.2/geojson-1.0.2.zip",
       "sha256": "f7f0198eacb5967904b5f9bb3b1ce6414aebdc9ce529999134108d9c106092ca"
   }
   ```
   (their rules: a single root folder with `manifest.json`, an OSI license; a download that fails or does not
   match is skipped.)

## Opening the WebODM pull requests (the user's steps, when ready)

Built 2026-10-27 (Done: phase A, phase B and the docs how-to). **Steps 1–4 done 2026-10-27:** upstream had not
moved; the user forked both repos and pushed the branches, public for review: `task-options-extensions` at
bf5f9502 on https://github.com/WinuxNomacs/WebODM (remote `fork`) and `task-options-hooks` at a4f1986 on
https://github.com/WinuxNomacs/Docs (remote `fork`). The user is reviewing them with WebODM's lead developer
(who recommended client-side hooks, which these are). **Step 5 done 2026-10-27:** the user opened
https://github.com/WebODM/WebODM/pull/2041 (its "Test Docker" check waits for a maintainer's approval).
**Step 6 done 2026-10-27:** the user opened https://github.com/WebODM/Docs/pull/11 (`task-options-hooks` at
a4f1986, on Docs main e8ea85a); next, a link to it from #2041, then step 7. Review changes: new commits on the
same branches; a rebase would need `git push --force-with-lease`.
1. **Ask Claude to bring the branches up to date** if upstream moved: fetch `origin`, rebase
   `task-options-extensions` (and `task-options-hooks`) on the new master, rerun WebODM's Jest and the live check.
2. **Review the changes** (you must be able to explain them, per WebODM's `CONTRIBUTING.md`):
   `git -C ignored/WebODM log -p master..task-options-extensions` (2 commits: the `ApiFactory` fix, then the
   hooks) and `git -C ignored/WebODM-Docs log -p main..task-options-hooks` (2 commits: the hooks, then the how-to).
3. **Fork** https://github.com/WebODM/WebODM and https://github.com/WebODM/Docs on GitHub.
4. **Push the branches to the forks:**
   ```sh
   git -C ignored/WebODM remote add fork git@github.com:<your account>/WebODM.git
   git -C ignored/WebODM push fork task-options-extensions
   git -C ignored/WebODM-Docs remote add fork git@github.com:<your account>/Docs.git
   git -C ignored/WebODM-Docs push fork task-options-hooks
   ```
5. **Open the WebODM PR by hand** (to `WebODM/WebODM` `master`), with a description in your own words:
   - what it adds: three `Dashboard` hooks so any plugin can extend the Task Options of new and existing tasks
     (a form row, an item at the top of the dialog, a control beside one option), with the task's context and
     `taskOptions` to read and set options as the user would;
   - that nothing changes without a plugin using them (no trigger, no markup), and each plugin component is
     kept in an error boundary;
   - the separate `ApiFactory` fix (replies lost when several triggers wait or a plugin's dependencies load
     later; a listener left per trigger with no plugin), which they can take on its own;
   - how it was tested: WebODM's Jest (55 suites, 81 tests), a live check of new and existing tasks with no
     plugin and with an example plugin using every hook, and the GeoJSON plugin 1.1.0 built on it;
   - **the AI disclosure** WebODM asks of new contributors: Claude Opus 5.5 (Claude Code) wrote the code, tests
     and docs under your direction; you reviewed and tested them; and how long it took you.
6. **Open the docs PR** (to `WebODM/Docs` `main`), linking the WebODM PR; it should merge after it.
7. **Reach out** to WebODM's developers (#devtalk on Discord, https://webodm.org/community), with the PR link.
8. **Afterwards:** give Claude the PR links; changes asked in review are made on the same branches, tested, and
   pushed by you.

## MapLibre 6

The request (2026-10-29, the user, on Dependabot's alerts: plan the upgrade): Dependabot alert #1 (critical):
maplibre-gl <= 6.4.0 sanitizes attribution HTML with a loop that skips the attribute after each one it removes, so
`<details open onload=.. ontoggle=..>` keeps its handler and runs when the attribution control renders it. The
plugin passes each basemap's `attribution` to MapLibre (`geojson_core.js` `basemapSource`); those come from
WebODM's admin-configured basemaps and the built-in OpenStreetMap entry, so only an admin (or whoever can change
the basemaps) could plant one. No 5.x has the fix (5.24.0 is the last).

Alerts #2-#23 are Django 2.2.27 and DRF 3.13.1 in `requirements-dev.txt`: host-only, for the IDE, pinned to
WebODM's own versions on purpose; not in the zip, nothing serves from them. Not upgraded (the IDE would then
show APIs WebODM lacks); to be dismissed as "vulnerable code is not actually used".

Design:
- `maplibre-gl` 5.24.0 -> 6.16.0 (exact pin, lock file). terra-draw 1.35.0 and the adapter 1.4.1 stay: the
  adapter does not load MapLibre (only `terra-draw` is its UMD dependency) and uses only public map methods
  (`addSource`, `addLayer`, `moveLayer`, `project`, `unproject`, `getCanvas`, `dragPan`, one-argument `setData`),
  none removed in 6. Its peer range is `maplibre-gl >= 4`.
- 6 is ESM only: `dist/maplibre-gl.js` is gone, replaced by `maplibre-gl.mjs` (+ `-shared.mjs`, and
  `-worker.mjs` loaded by URL next to it). A small module `geojson/public/maplibre.mjs` imports it and sets
  `window.maplibregl`, so the ES5 scripts keep using the global:
  - `templates/editor.html`: `<script type="module" src="maplibre.mjs">`, and the other scripts get `defer`
    (deferred and module scripts run in document order, after parsing), so `geojson_editor.js` still finds
    `maplibregl` when it starts;
  - `boundary_buttons.js`'s loader (Task Options): the same file as a `type="module"` script; a module script's
    `load` fires after it has run, so the chain continues as now.
  - ESLint: an entry for `*.mjs` as a module (the ES5 rules stay for the rest).
- Served as `text/javascript`: WebODM's Python maps `.mjs` through `/etc/mime.types` (checked in the 3.3.2
  container), and its nginx includes the same `mime.types`. Checked live, not assumed.
- 6 needs WebGL2 and an ES2022 browser: README's Requirements says so.
- Release 1.1.1 (patch: a security fix, no feature change; `webodmMinVersion` stays 3.3.2), with the
  `release-check` skill.

Tests: Jest and Django as they are (the map is faked in Jest); the change is in loading, so the proof is live:
the library page and the Task Options buttons on :8001, both opening the editor with basemaps, the attribution,
the orthophoto and photo layers, drawing, import, search, save, no console errors (other than the dev
livereload). And one check that a basemap attribution like the advisory's `<details open onload ontoggle>`
does not run (a temporary basemap in WebODM's admin, removed after).

Decided (the user, 2026-10-29): Claude dismisses #2-#23 with `gh`. Done the same day, as "not_used" with that
reason; only #1 is open.

## Task Options hook

- **A pull request to WebODM so the Task Options load extensions from installed plugins**: requested 2026-10-27
  in chat ("evaluate the lift needed for a pull request to WebODM's main repo so the Task Options can load
  controls from installed plugins without impacting the Task Options at all when no plugin with Task Option
  extensions is installed"). The user's direction the same day: "the hook should be general as an open approach
  for all developers to be able to use going forward when registering plugins with Task Option modifiers. The
  design should take into account that any plugin may need to add or interact with the Task Options panel in
  order to provide additional functionality during task setup, not just for our geojson plugin; but all
  plugins." And: "The same hooks need to be available for new and existing tasks if the plugin is installed that
  uses both. The purpose of this change is to allow webodm to safely allow ui extensions to the new/edit task
  options [panel], but [it] should remain completely unaffected if no installed plugin registers extensions.
  Example: while the geojson plugin may only need to add 2 buttons to function, it does need to be able to add
  web controls, text/labels, scripts and interact with the new/edit Task Options [panel]/control."
  - **Builds on:** a first sketch of a hook (`addTaskOptionButton`: buttons beside one option), too
    GeoJSON-shaped for all plugins (buttons only, per option). Upstream (`ignored/WebODM`, 3.3.2):
    - The options are edited in `EditPresetDialog`, one `ProcessingNodeOption` each; `EditTaskForm` holds the
      task's context (`task` when editing, `getCropPolygon`, `getGcpFile`, `getFiles`, `filesCount`, the node
      and preset) and is used both by `NewTaskPanel` and when a task is edited.
    - Upstream's hooks hand back React components that WebODM renders with props (`addNewTaskPanelItem` gets
      `taskInfo`, `getFiles`, `filesCount`; `addTaskActionButton` gets the task); none lets a plugin change a
      task's options: the panel item is read-only.
    - `ApiFactory`'s `trigger…` adds a response listener per call that is removed only when a plugin answers:
      with no plugin listening, every call leaves one behind for the page's life.
  - **Design (Claude's, 2026-10-27, revised the same day): one extension API for the Task Options of new and
    existing tasks; nothing changes without a plugin that registers.**
    - **New and existing tasks alike:** `NewTaskPanel` and `EditTaskPanel` both render `EditTaskForm`, which
      shows the "Options" row and opens `EditPresetDialog` (one `ProcessingNodeOption` per option). Every
      extension point is in those three components, so a plugin's extensions appear in both flows with no
      extra work; the context says which flow it is in.
    - **Three places a plugin can extend** (each a `Dashboard` hook in upstream's style: the plugin answers
      with a React component, or a list, or nothing; any markup: controls, buttons, text and labels, links):
      - `addTaskOptionsFormItem`: a row in the task form under "Options", visible without opening the dialog
        (e.g. "Boundary: Field 3 · Change").
      - `addTaskOptionsPanelItem`: a section at the top of the options dialog, for extensions across options.
      - `addTaskOptionControl`: after one option's input in the dialog; asked with `{option, context}` so a
        plugin answers only for the options it extends (GeoJSON: `boundary`).
    - **What every extension component receives** (the same props in all three places):
      - `context`: `mode` (`"new"` or `"edit"`), `task` (when editing), `node` (the processing node and its
        available options), `preset`, and what the flow has: `getFiles()`, `filesCount`, `getCropPolygon()`,
        `getGcpFile()`, `getPhotoPositions()` (new: the photos the map preview read) for a new task; for an
        existing one, a plugin reads the task's own data through WebODM's API.
      - `taskOptions`, to interact with the options: `getOptions()` (name → value as now set), `getOption(name)`,
        `setOption(name, value)`, `setOptions({...})`, `resetOption(name)`, `availableOptions`. The components
        are re-rendered when the options change, so they need no change event of their own.
      - `option`, `value` and `setValue(value)` too, in `addTaskOptionControl`.
    - **Where a value set by a plugin goes:** in the dialog, exactly as if the user typed it (the option counts
      as changed; a system preset becomes the user's "Custom" one, as today). From the form row, with the dialog
      closed, as a task-level override applied on top of the preset when the task's options are gathered
      (`getAvailableOptionsOnly`), which is what WebODM already does with the map preview's crop polygon; it
      shows in the review summary. (A question for WebODM's developers: they may prefer the form row to edit
      the preset too.)
    - **Scripts:** plugins already load their scripts on every page (`include_js_files`); the hooks are their
      entry points. A component may render nothing and still act (watch the options, fill one in), so no
      separate script hook is needed.
    - **Safely:** each plugin component is rendered inside an error boundary, so a plugin that throws shows
      nothing (and logs its error) instead of breaking the task form; a plugin sets values only through
      `taskOptions`, so WebODM keeps owning them; components are unmounted with the form or dialog.
    - **No plugin, no change:** before triggering a hook, each place checks that a plugin registered for it
      (`PluginsAPI.events.listeners("Dashboard::<hook>").length`; `events` is already exported); otherwise it
      triggers nothing, sets no state, adds no wrapper and renders the same markup as today. This also avoids
      the leak of that sketch (a response listener left per option when no plugin answers). Plugin
      scripts register when the page loads, before a form can open, so the check misses none.
    - **Documented** as three entries in the plugin guide's hook list (docs.webodm.org, its own repo), with the
      props and a short example each.
  - **Lift:** about 350–450 lines in 7 files (`Dashboard.js`, a small extension helper for the listener check,
    the error boundary and the props, `EditTaskForm.jsx`, `EditPresetDialog.jsx`, `ProcessingNodeOption.jsx`,
    `NewTaskPanel.jsx`, `EditTaskPanel.jsx`) plus Jest tests (each place shows a plugin's component, in both
    flows; `taskOptions` reads and sets values; a throwing plugin leaves the form working; without a plugin,
    nothing is triggered, no listener is left and the render is unchanged) and the docs PR: two to three days
    of work with the live checks. Built on upstream's files.
  - **WebODM's contribution rules** (`CONTRIBUTING.md`, the PR template): minimal and focused, no linter
    changes; AI use allowed but disclosed (which AI, how much, and for new contributors how long it took); the
    pull request opened by hand with a description in the contributor's own words; the contributor must be
    able to explain the logic and its impact. Claude prepares the branch, tests and notes; the user reviews,
    writes the description and opens the PR from their fork.
  - **This plugin afterwards:** "Create GeoJSON" and "Use existing" come back as an `addTaskOptionControl` for the
    `boundary` option, feature-detected so the plugin still works (without them) on WebODM without the hook;
    the `basemaps` endpoint returns. A minor version (1.1.0).
  - **Proposed phases:**
    - **A: the WebODM branch**, in `ignored/WebODM` on a branch from upstream master: the context, the three
      hooks, the guard and error boundary, WebODM's Jest tests, and a live check on the dev server (which runs
      that checkout) for a new and an existing task, with no plugin, and with a small example plugin using each
      hook (kept out of the PR: it shows the docs' examples work). Then the docs change. Nothing pushed: the user forks, pushes and opens the PRs.
    - **B: the controls in this plugin** (1.1.0), built and checked against the phase A branch, released once
      the hook is in a WebODM release (the feature detection keeps 1.1.0 working without it).
  - **Built (phase A, 2026-10-27):**
    - **Commit 1, `ApiFactory`:** a trigger's reply listener used to remove itself after the first reply to *any*
      trigger of the hook, so replies from a plugin whose dependencies load later, or to other triggers waiting at
      once (one per option), could be lost; and with no plugin it was never removed. It now counts the listening
      plugins, takes only its own replies and stops after the last; no plugin, no listener. Its test shows a slow
      plugin's reply lost on the old code. This fixes the leak for every hook, not only the new ones.
    - **Commit 2, the hooks:** `Dashboard.js` (3 endpoints), `TaskOptionsPluginItems.jsx` (new: triggers a hook,
      renders what plugins return, each in an error boundary; `hasListeners(hook)` for the no-plugin guard),
      `EditTaskForm.jsx` (`getPluginContext`, form `taskOptions`, the form row), `EditPresetDialog.jsx` (dialog
      `taskOptions`, the panel item, props for the option controls), `ProcessingNodeOption.jsx` (`setValue`, the
      inline controls), `NewTaskPanel.jsx` (`getPhotoPositions`, `getFiles`, `filesCount` to the form). About 280
      lines of code and 300 of tests. `EditTaskPanel.jsx` needed no change: `mode` comes from `task`.
    - **Changed from the design:** a value a plugin sets from the form row goes in the "(Custom)" preset, as if the
      user had edited the options, instead of a hidden override: it shows in the selector and in Edit, and the
      question for WebODM's developers is gone. `context` also has `inReview`. A component may also be an
      element or a list; option controls render inline beside the option's input.
    - **Live check:** without the example plugin, the forms show no plugin markup, nothing waits for replies, and
      the console has no errors. With it, every hook rendered in both flows, its values reached the review and the
      saved task (`crop`, `dsm`, `boundary`), and a control made to throw was left out with the dialog working.
      The example plugin, the check's task and the plugin row were removed afterwards.
    - **For the user:** the steps are in "Opening the WebODM pull requests" below.
  - **Decided (the user, 2026-10-27):** build the pull request to a ready-to-publish state first, with this
    plugin's controls working on it (phase B on the PR branch, feature-detected); the user then opens the PR on
    GitHub and reaches out to WebODM's developers soon after.

  - **Phase B, planned with the user (2026-10-27):**
    - **Decided:** build and check it now against the phase A branch; release 1.1.0 only once a WebODM release
      has the hook. Scope: the two buttons only; a form row ("Boundary: Field 3 · Change") is left for
      later.
    - **Design:** `public/boundary_buttons.js`, on
      `addTaskOptionControl`: for the `boundary` option it answers with a component (built with `window.React`,
      no build step) rendering "Create GeoJSON" and "Use existing" inline after the option's import button. Each
      opens the editor in a dialog over the options, with a new task's photo positions (`getPhotoPositions`) or
      an existing task's shots and orthophoto; "Use for this task" calls the control's `setValue`, so the value
      counts as typed by the user. The script registers only when `PluginsAPI.Dashboard.addTaskOptionControl`
      exists: on WebODM without the hook the plugin is 1.0.0's. `plugin.py` loads the script and `geojson.css`
      on every page and mounts the `basemaps` endpoint again (the dialog has no page to carry them).
    - **Tests:** Jest tests for the buttons, with the hook's props; Django tests for the
      `basemaps` endpoint and the script on the dashboard; a live check on :8001 for a new and an existing
      task. The manifest stays at 1.0.0 until the release branch; `CHANGELOG.md` gets an "Unreleased" entry.

  - **Built (phase B, 2026-10-27):** as designed. Fixed on the way: the editor's dialog did not take the focus,
    so Escape reached the button under it and closed the options' modal instead; it
    now focuses the dialog and gives the focus back to its button. The two buttons wrap together in the narrow
    options dialog.
  - **Review: one hook** (2026-10-27). WebODM's developer on #2041: "I think this can be much, much simpler?
    Like, a single hook for task options to add extra buttons? I'm not sure about sending context (or the choice
    of context sent), why is it needed?" The user disagrees that one hook is better in the long run, and asked
    to address the concerns. Claude's assessment, which the user accepted ("do it"):
    - Right on scope: only `addTaskOptionControl` has a user (this plugin). The two other hooks and the
      `taskOptions` functions (with the "(Custom)" preset code) are API without a user, kept forever.
    - Context is needed, but only two pieces of it: the task being edited (null for a new one: this plugin shows
      its orthophoto and boundary) and, for a new task, the photos' positions (only the browser has them before
      upload). The other eight fields go.
    - What avoids the smells the user expects from one hook is its shape, not the count: a component (not button
      descriptions), one object for args and one for props (new fields later break nothing), a name for one place.
      Another place gets its own hook when a plugin needs it: one line in `Dashboard.js`.
  - **Design:**
    - `Dashboard.addTaskOptionControl` only. Args `{option}`; props `{option, value, setValue, task,
      getPhotoPositions}` (`task` null for a new task; `getPhotoPositions()` `[]` for an existing one). Rendered
      beside each option's input in the Edit Task Options dialog, in an error boundary, and only when a plugin
      listens (no trigger, no markup otherwise).
    - Removed: `addTaskOptionsFormItem`, `addTaskOptionsPanelItem`, `taskOptions`, `setCustomPresetOptions`, the
      other context fields and the props carrying them (`getFiles`, `filesCount`).
    - The `ApiFactory` fix stays as the first commit (still needed: one trigger per option), offered as its own
      PR if the developer prefers.
    - New commits on `task-options-extensions` and `task-options-hooks` (no rebase, no force-push). The docs
      how-to cut to the one hook. This plugin's `boundary_buttons.js` reads `task` and `getPhotoPositions`
      from the props (was `context`); the "Unreleased" entry in `CHANGELOG.md` unchanged in substance.
    - Tests: WebODM's Jest (the removed hooks' tests go), this plugin's Jest and Django, the docs examples run as
      written, a live check of a new and an existing task with the plugin and with no plugin.
    - Changed while building: the hook answers with an element built from `args` (`getValue`/`setValue` in
      them), as `addNewTaskButton` does, instead of a component given props; so no helper component and no
      listener check (with the `ApiFactory` fix, a trigger nobody listens to adds nothing). The error boundary
      went with the helper; it can come back if the developer wants it. The no-plugin case is covered by
      WebODM's Jest (same markup, no listener left), not checked live.

## First version (1.0.0)

- **Request, 2026-10-27:** an official WebODM GeoJSON plugin, within the plugin guide's rules
  (https://docs.webodm.org/plugin-development-guide, https://github.com/WebODM/WebODM-Plugins), for WebODM 3.3.2
  (`ignored/WebODM`, image pinned in `dev/compose.yml`): Python 3.9, Django 2.2.27, DRF 3.13.1, pyproj 3.6.1.
- **Design decisions the code keeps:**
  1. **No model of its own.** Plugins are not Django apps in WebODM (no `INSTALLED_APPS` entry, no migrations),
     so the library is in the plugin's `GlobalDataStore` (the `PluginDatum` table). Names' uniqueness, ids, the
     owner and the dates are kept by the plugin's code, not the database. A deleted user's files keep a dangling
     owner id (shown as no owner; admins still change them). The files are visible in Administration > Plugin
     Datum, as the guide states for all data stores. Layout (the user's decision, 2026-10-27): the whole library
     is one JSON value under the key `library` (`{"next_id": n, "files": [{id, name, geojson, area, owner_id,
     created_at, updated_at}]}`), read and written only through the store's documented API; each change runs in
     `transaction.atomic()` under a Postgres advisory lock (`pg_advisory_xact_lock`), so two saves at once cannot
     drop an edit. Ids come from `next_id` and are never reused, so the URLs stay `boundaries/<id>`. Rejected: one
     key per boundary, since the store cannot list its keys.
  2. **The Task Options buttons wait for a hook.** WebODM 3.3.2 has no hook to add controls beside a task
     option, so 1.0.0 leaves out "Create GeoJSON" and "Use existing": users download a file from the library and
     load it with the option's import button. The hook is proposed in WebODM#2041 ("Task Options hook" above);
     the editor's dialog mode (`geojson_editor.js`, `map_view.js`) is kept for the buttons.
  3. **The API** (`api.py`): a plain `Serializer` over the stored JSON (name required and unique whatever the
     case, the polygon normalized by `boundary.py`, the area computed) and `APIView`s: anyone logged in reads,
     the owner or an admin changes.
  4. **Tests in the plugin** (`geojson/tests/`, run with `manage.py test coreplugins.geojson.tests.test_geojson`
     in the dev container) and Jest in `public/__tests__/`.
  5. **Packaging:** the plugin is the `geojson/` folder (the zip's single root folder, as the directory
     requires); the repo's dev tools stay outside it. MapLibre and terra-draw come from `public/package.json`,
     which WebODM installs with npm (pinned by its lock file). The repo's AGPLv3 license satisfies the
     directory's OSI-license rule.
- **Decided (the user, 2026-10-27):** the library starts empty; the plugin starts at version 1.0.0.
