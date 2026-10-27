# Changelog

## Unreleased (1.1.0, once a WebODM release has the Task Options hook)

- The "Create GeoJSON" and "Use existing" buttons beside a task's `boundary` option, for new and existing tasks,
  on WebODM's Task Options hook (`addTaskOptionControl`). On a WebODM without the hook, nothing changes.
- The editor's dialog over the options takes the focus, so that Escape closes it and not the options.

## 1.0.1 — 2026-10-27

The first published release, for WebODM 3.3.2 or later: 1.0.0 with one fix (1.0.0 itself was not published).

- Fixed: on a WebODM served over http, the editor's OpenStreetMap basemap stayed blank. Basemap URLs without a
  scheme (`//…`) now load over https.

## 1.0.0 — 2026-10-27 (not published)

The first version, on the official plugin API.

- The GeoJSON tab: the instance-wide library of boundaries and the editor (draw, import, edit the text, search
  with suggestions, download, save a copy, delete), with owners and admins.
- The library is stored in the plugin's data store instead of a database table of its own.
- Left out until WebODM has a hook for them: the "Create GeoJSON" and "Use existing" buttons beside a task's
  `boundary` option. Boundaries are downloaded from the library and loaded with the option's import button.
