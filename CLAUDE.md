# CLAUDE.md

What Claude needs to know to work on the GeoJSON plugin for WebODM. General working rules (branches, phases, testing) live in the user's own CLAUDE.md; this
file holds what is specific to this repository. It is committed and public: nothing private, nothing true only
on one machine. Keep it short; edit in place.

## Rules for this repository

- **The plugin is `geojson/`**: the released zip has that folder as its single root. Dev tools (`dev/`,
  `package.json`, `eslint.config.mjs`, `ruff.toml`, `requirements-dev.txt`) stay outside it.
- **Official plugin rules only** (https://docs.webodm.org/plugin-development-guide): no Django models or
  migrations (data goes in the plugin's data stores), only the `PluginsAPI` hooks WebODM has, no changes to
  WebODM itself.
- **Python 3.9 and Django 2.2** (WebODM 3.3.2): Ruff targets py39.
- **Never push and never tag.** Nothing is published by a push yet (no CI). A release: Claude prepares a
  `release/X.Y.Z` branch (manifest version, `CHANGELOG.md`, `README.md`), builds the zip with `dev/package.sh`
  (`dist/geojson-X.Y.Z.zip` and its sha256), runs the `release-check` skill and merges; the user tags `vX.Y.Z`,
  attaches the zip to the GitHub release and adds `{url, sha256}` to WebODM-Plugins' `directory.json`.
- **`README.md` is the plugin's public page** (the repo is public from the 1.0.0 release): every feature change
  updates it on the same branch (what the plugin does, installing, using it, the outside services it calls).
- Planned in `upcoming-changes.md`; new requests arrive in `new.md` (untracked).

## Dev environment

- `ignored/WebODM` is a checkout of https://github.com/WebODM/WebODM (ignored by git), at the commit the pinned
  image was built from (3.3.2). The dev server runs that checkout, so a branch there (the Task Options PR,
  `task-options-extensions`) is live on :8001; `ignored/WebODM-Docs` is https://github.com/WebODM/Docs (the
  plugin guide).
- `dev/webodm.sh up | down | logs [service] | ps` runs it in dev mode with `geojson/` mounted as
  `/webodm/coreplugins/geojson`, on http://localhost:8001, containers `gj-webapp`, `gj-worker`, `gj-db`,
  `gj-broker`, `gj-node-odx-1`, project and volumes `webodm-geojson`, so it runs beside another WebODM. Images
  are pinned by digest in `dev/compose.yml` (a local `webodm/webodm_webapp:latest` tag may be a fork's build).
- The first start runs WebODM's dev setup (npm install, webpack) for several minutes before the server answers.
- Host tools: `uv venv --python 3.9 .venv && uv pip install -r requirements-dev.txt` (Django, DRF and pyproj
  for the IDE, Ruff); `npm install` (Jest, ESLint, Playwright). VSCode: interpreter `.venv`, `ignored/WebODM` on
  Pylance's extra paths (local `.vscode/settings.json`).

## Tests and checks

The `test`, `live-check` and `release-check` skills in `.claude/skills` have the steps.

- Django: `docker exec -w /webodm gj-webapp python manage.py test --noinput coreplugins.geojson.tests.test_geojson`. One run
  at a time: every run uses the same test database.
- Jest: `npm test` at the repo root (jsdom). ESLint: `npm run lint -- geojson` (the scripts in `public/` are ES5).
- Ruff: `.venv/bin/ruff check .`
- Live checks: headless Playwright (Node) against http://localhost:8001 with a dev account from the user.
