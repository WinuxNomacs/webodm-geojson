# Changelog

## 1.0.0 — 2026-10-27

The first release on official WebODM (3.3.2 or later): LuxODM's GeoJSON plugin 0.3.0, ported to the official
plugin API.

- The GeoJSON tab: the instance-wide library of boundaries and the editor (draw, import, edit the text, search
  with suggestions, download, save a copy, delete), with owners and admins.
- The library is stored in the plugin's data store instead of a database table of its own.
- Left out until WebODM has a hook for them: the "Create GeoJSON" and "Use existing" buttons beside a task's
  `boundary` option. Boundaries are downloaded from the library and loaded with the option's import button.
