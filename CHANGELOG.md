# Changelog

## 1.1.0 — 2026-10-28

For WebODM 3.3.2 or later. The new buttons use the Task Options hook that WebODM 3.3.2 added
([WebODM#2043](https://github.com/WebODM/WebODM/pull/2043)).

- The "Create GeoJSON" and "Use existing" buttons beside a task's `boundary` option, for new and existing tasks,
  on WebODM's Task Options hook (`presetDialogOptionsReady`). On a WebODM without the hook, nothing changes.
- The editor's dialog over the options takes the focus, so that Escape closes it and not the options.

## 1.0.2 — 2026-10-27

The first published release, for WebODM 3.3.2 or later (1.0.0 and 1.0.1 were not published).

- The editor takes WebODM's theme colors (Administration > Theme) instead of colors of its own: notes, errors,
  borders, the active tool, the map's buttons and panels, the copy dialog.

## 1.0.1 — 2026-10-27 (not published)

1.0.0 with one fix.

- Fixed: on a WebODM served over http, the editor's OpenStreetMap basemap stayed blank. Basemap URLs without a
  scheme (`//…`) now load over https.

## 1.0.0 — 2026-10-27 (not published)

The first version, on the official plugin API.

- The GeoJSON tab: the instance-wide library of boundaries and the editor (draw, import, edit the text, search
  with suggestions, download, save a copy, delete), with owners and admins.
- The library is stored in the plugin's data store instead of a database table of its own.
- Left out until WebODM has a hook for them: the "Create GeoJSON" and "Use existing" buttons beside a task's
  `boundary` option. Boundaries are downloaded from the library and loaded with the option's import button.
