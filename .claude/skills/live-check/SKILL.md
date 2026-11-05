---
name: live-check
description: Check a UI change in a real headless browser against the plugin's dev servers (WebODM 4.0.0 on http://localhost:8001, 3.3.2 on http://localhost:8004), then remove whatever the check created. Use after building or fixing anything visible.
---

# Live browser check

## Login

The change is checked on 4.0.0 (http://localhost:8001); before a merge of anything visible, also on 3.3.2
(http://localhost:8004, `GJ_WEBODM=3.3.2 dev/webodm.sh up`; stop it again if you started it).

Log in at `/login/` with the dev account the user has given for this machine (kept in the
project memory, never in the repo). Without one, ask the user. Never look for credentials or cookies in files,
transcripts, the database or the environment.

## Driving the browser

Prefer the Playwright MCP tools (`mcp__playwright__*`) when they are loaded. Otherwise, write a Node script in
the scratchpad that loads Playwright from this repo (`require('<repo>/node_modules/playwright')`), launches
Chromium with `headless: true`, logs in, and saves screenshots to the scratchpad. Read the screenshots back to
look at them, and read the page's console messages.

## What to check

- The change itself, on the user's real data where it applies (the GeoJSON menu tab, the editor, the library).
- The browser console has no new errors.

## Before

Note what is there already (the library's files: `GET /api/plugins/geojson/boundaries`): the user works on this
server too. Give everything the check creates a name of its own (e.g. starting "Live check").

## Afterwards

Delete only what the check created (saved boundaries, users, tasks, projects, a "(Custom)" preset saved from
Task Options), by those names, through the UI or the API (the plugin's API takes changes only with a logged-in
session's CSRF token, so delete boundaries from the browser); never "everything in the library". Compare with what was there before, and say what was checked and
what was removed.
