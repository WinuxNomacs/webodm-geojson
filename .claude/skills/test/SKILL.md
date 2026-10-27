---
name: test
description: Run the GeoJSON plugin's checks (Ruff, ESLint, Jest, Django tests in the dev container) before committing or merging.
---

# Tests and checks

From the repo root, with the dev stack up (`dev/webodm.sh ps`; start it with `dev/webodm.sh up`):

1. **Ruff** (Python 3.9 syntax and lint): `.venv/bin/ruff check .`
2. **ESLint** (the ES5 scripts in `geojson/public`): `npm run lint -- geojson`
3. **Jest**: `npm test` (add a path or `-t "<name>"` to run fewer).
4. **Django**: `docker exec -w /webodm gj-webapp python manage.py test --noinput coreplugins.geojson.tests.test_geojson`.
   Before a merge, also WebODM's plugin tests: `app.tests.test_plugins`. Never two Django runs at once: they
   share the test database.

A failure is reported with its output. Before calling one pre-existing, check whether it also fails on `main`.
