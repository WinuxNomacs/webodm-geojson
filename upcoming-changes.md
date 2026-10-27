# Upcoming changes

## Phases (current and upcoming)

**Up next**
(2026-10-27: the user's order: the WebODM pull request ready to publish, then the plugin's controls on it; the
user opens the PR on GitHub and contacts WebODM's developers once it is ready)
(nothing: the user opens the WebODM pull requests, "Opening the WebODM pull requests" below)

**Later**
1. **Release 1.1.0** once a WebODM release has the Task Options hook: `release/1.1.0` (manifest version,
   `webodmMinVersion` left at 3.3.2 since the buttons are feature-detected, `CHANGELOG.md`'s "Unreleased" entry
   dated, the README naming the WebODM version with the hook), then the release check. (Task Options hook,
   phase B)

**Done**
- **The plugin guide's how-to for the Task Options hooks** — 2026-10-27, `task-options-hooks` in
  `ignored/WebODM-Docs` (a4f1986): a first plugin, JSX as the hook's dependency, the props and `taskOptions`
  functions with their return values, an example per hook, existing tasks, older WebODM versions, own dialogs.
  Every example ran as written in a throwaway plugin on :8001 (new and existing task), removed afterwards. The
  user is reviewing the branch with WebODM's lead developer, who recommended client-side hooks: the PR is
  kept as is (three `Dashboard` hooks; nothing server-side).
- **The GeoJSON controls on the Task Options hook (phase B)** — 2026-10-27, built, released later (1.1.0).
  `geojson/public/boundary_buttons.js` (LuxODM's, on `addTaskOptionControl`), `plugin.py` (the script and
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
  sha256 (a wrong one is refused), npm ran in the installed copy, and the live check passed on it. To publish
  (the user): the repo made public, tag v1.0.0, the zip on its GitHub release, the `directory.json` entry.
  (Release)
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

## Publishing 1.0.0 (the user's steps, when ready)

Built and checked 2026-10-27 (Done: Release 1.0.0). **Step 1 done 2026-10-27:** the repo is public; LuxODM
stays private, so the README names it without a link (branch `readme-links`, to push with `main`).
1. Make the repo public (`CLAUDE.md` and this plan are written to be public). The README links to LuxODM's repo:
   if that one stays private, remove the link first.
2. Push `main`; tag `v1.0.0` on the merge of `release/1.0.0` (da665a4) and push the tag.
3. Create the GitHub release v1.0.0 with `CHANGELOG.md`'s 1.0.0 entry, and attach `dist/geojson-1.0.0.zip`
   exactly as built: sha256 `a71c42c30329e1a63b266cd2d61dc3f30298c6906bf5b4b689e1b504b0731f7a`. The zip
   carries the commit's timestamps, so a rebuild after another commit has another sha256; if `dist/` is lost,
   rebuild it at da665a4 (`git worktree add`, `dev/package.sh`) and use the new sha256 below.
4. Check the download: `curl -sL <url> | sha256sum` gives the sha256 above.
5. Open a pull request to https://github.com/WebODM/WebODM-Plugins adding to `directory.json`'s `plugins`:
   ```json
   {
       "url": "https://github.com/WinuxNomacs/webodm-geojson/releases/download/v1.0.0/geojson-1.0.0.zip",
       "sha256": "a71c42c30329e1a63b266cd2d61dc3f30298c6906bf5b4b689e1b504b0731f7a"
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
https://github.com/WebODM/WebODM/pull/2041 (its "Test Docker" check waits for a maintainer's approval); next,
the docs PR (step 6), linked from #2041. Review
changes before then: new commits on the same branches; a rebase would need `git push --force-with-lease`.
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
      the leak of LuxODM's version (a response listener left per option when no plugin answers). Plugin
      scripts register when the page loads, before a form can open, so the check misses none.
    - **Documented** as three entries in the plugin guide's hook list (docs.webodm.org, its own repo), with the
      props and a short example each.
  - **Lift:** about 350–450 lines in 7 files (`Dashboard.js`, a small extension helper for the listener check,
    the error boundary and the props, `EditTaskForm.jsx`, `EditPresetDialog.jsx`, `ProcessingNodeOption.jsx`,
    `NewTaskPanel.jsx`, `EditTaskPanel.jsx`) plus Jest tests (each place shows a plugin's component, in both
    flows; `taskOptions` reads and sets values; a throwing plugin leaves the form working; without a plugin,
    nothing is triggered, no listener is left and the render is unchanged) and the docs PR: two to three days
    of work with the live checks. Not a cherry-pick: LuxODM's `ProcessingNodeOption.jsx` already differs from
    upstream's (its recommendations feature), so it is built on upstream's files.
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
      has the hook. Scope: LuxODM's two buttons only; a form row ("Boundary: Field 3 · Change") is left for
      later.
    - **Design:** LuxODM's `public/boundary_buttons.js`, moved from `addTaskOptionButton` to
      `addTaskOptionControl`: for the `boundary` option it answers with a component (built with `window.React`,
      no build step) rendering "Create GeoJSON" and "Use existing" inline after the option's import button. Each
      opens the editor in a dialog over the options, with a new task's photo positions (`getPhotoPositions`) or
      an existing task's shots and orthophoto; "Use for this task" calls the control's `setValue`, so the value
      counts as typed by the user. The script registers only when `PluginsAPI.Dashboard.addTaskOptionControl`
      exists: on WebODM without the hook the plugin is 1.0.0's. `plugin.py` loads the script and `geojson.css`
      on every page and mounts the `basemaps` endpoint again (the dialog has no page to carry them).
    - **Tests:** LuxODM's Jest test for the buttons, adapted to the hook's props; Django tests for the
      `basemaps` endpoint and the script on the dashboard; a live check on :8001 for a new and an existing
      task. The manifest stays at 1.0.0 until the release branch; `CHANGELOG.md` gets an "Unreleased" entry.

  - **Built (phase B, 2026-10-27):** as designed. Fixed on the way: the editor's dialog did not take the focus,
    so Escape reached the button under it and closed the options' modal instead (LuxODM has the same bug); it
    now focuses the dialog and gives the focus back to its button. The two buttons wrap together in the narrow
    options dialog. Left as they were: LuxODM's later changes to the ported editor files (`geojson_core.js`,
    `map_view.js`, `search_panel.js`, `geojson.css`'s search spinner), which are not part of this phase.

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
