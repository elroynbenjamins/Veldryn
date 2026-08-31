# VELDRYN Project Sources

This folder contains canonical project source documents used to guide implementation.

## Canonical design workbook

- `VELDRYN_Master_Design_Database_v4.5.xlsx`
  - Master game design/content/balance database.
  - Includes classes, progression, world content, equipment, Expeditions, server calculation contracts, UI/settings/accessibility, chat configuration, implementation exports, and other implementation-facing design data.
  - Treat the newest master workbook in this folder as design authority when code/content differs, unless a newer explicit implementation decision supersedes it.

## Source-of-truth convention

- Runtime/security/economy authority: backend code and database migrations.
- Game content/balance/design authority: latest VELDRYN master workbook.
- Prototype UX authority: current mobile implementation plus explicit decisions recorded in project docs.
- Never silently overwrite stable content IDs. If workbook and code disagree, document the reconciliation in the next version/commit.
