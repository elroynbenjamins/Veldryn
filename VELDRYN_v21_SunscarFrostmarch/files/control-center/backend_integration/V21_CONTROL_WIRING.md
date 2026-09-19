# v21 Control Center wiring

Register/handle:
- `region_content.activate_version` -> validate published manifest/region, call `activate_region_content_v21_server`.
- `region_content.rollback_active_version` -> same authoritative activation path targeting a previous published version.

Do not let the browser insert/update `region_content_*` tables directly.
Do not expose a generic payload editor for published region versions.
Display active version, published alternatives, hash, publish time and minimum client build before confirmation.
