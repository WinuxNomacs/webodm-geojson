# CLAUDE.md

What Claude needs to know to work on the GeoJSON plugin for WebODM, ported from LuxODM's
`coreplugins/geojson`. General working rules (branches, phases, testing) live in the user's own CLAUDE.md; this
file holds what is specific to this repository. It is committed and public: nothing private, nothing true only
on one machine. Keep it short; edit in place.

## Rules for this repository

- **The plugin is `geojson/`**: the released zip has that folder as its single root. Dev tools (`dev/`,
  `package.json`, `eslint.config.mjs`, `ruff.toml`, `requirements-dev.txt`) stay outside it.
- **Official plugin rules only** (https://docs.webodm.org/plugin-development-guide): no Django models or
  migrations (data goes in the plugin's data stores), only the `PluginsAPI` hooks WebODM has, no changes to
  WebODM itself. `upcoming-changes.md` lists what the port changes for this.
- **Python 3.9 and Django 2.2** (WebODM 3.3.2): Ruff targets py39.
- **Never push and never tag.** Nothing is published by a push yet (no CI); a release is a zip at a public URL
  plus an entry in WebODM-Plugins' `directory.json`, both done by the user.
- **`README.md` is the plugin's public page** (the repo is public from the 1.0.0 release): every feature change
  updates it on the same branch (what the plugin does, installing, using it, the outside services it calls).
- Planned in `upcoming-changes.md`; new requests arrive in `new.md` (untracked).

## Dev environment

- `ignored/WebODM` is a checkout of https://github.com/WebODM/WebODM (ignored by git), at the commit the pinned
  image was built from (3.3.2).
- `dev/webodm.sh up | down | logs [service] | ps` runs it in dev mode with `geojson/` mounted as
  `/webodm/coreplugins/geojson`, on http://localhost:8001, containers `gj-webapp`, `gj-worker`, `gj-db`,
  `gj-broker`, `gj-node-odx-1`, project and volumes `webodm-geojson`, so it runs beside another WebODM. Images
  are pinned by digest in `dev/compose.yml` (a local `webodm/webodm_webapp:latest` tag may be a fork's build).
- The first start runs WebODM's dev setup (npm install, webpack) for several minutes before the server answers.
- Host tools: `uv venv --python 3.9 .venv && uv pip install -r requirements-dev.txt` (Django, DRF and pyproj
  for the IDE, Ruff); `npm install` (Jest, ESLint, Playwright). VSCode: interpreter `.venv`, `ignored/WebODM` on
  Pylance's extra paths (local `.vscode/settings.json`).

## Tests and checks

The `test` and `live-check` skills in `.claude/skills` have the steps.

- Django: `docker exec -w /webodm gj-webapp python manage.py test --noinput coreplugins.geojson.tests.test_geojson`. One run
  at a time: every run uses the same test database.
- Jest: `npm test` at the repo root (jsdom). ESLint: `npm run lint -- geojson` (the scripts in `public/` are ES5).
- Ruff: `.venv/bin/ruff check .`
- Live checks: headless Playwright (Node) against http://localhost:8001 with a dev account from the user.
