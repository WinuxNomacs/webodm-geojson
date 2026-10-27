---
name: live-check
description: Check a UI change in a real headless browser against the plugin's dev server (http://localhost:8001), then remove whatever the check created. Use after building or fixing anything visible.
---

# Live browser check

## Login

Log in at `http://localhost:8001/login/` with the dev account the user has given for this machine (kept in the
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

## Afterwards

Delete everything the check created (saved boundaries, tasks, projects) through the UI or the API, and say
what was checked and what was removed.
