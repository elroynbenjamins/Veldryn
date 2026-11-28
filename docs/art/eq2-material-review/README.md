# EQ2 material artwork handoff — 28 November 2026

29 owner-approved painterly T1–T4 candidates were locally normalized and checked. Exact canonical identities come from #1598, #1635 and #1653. The manifest records the byte lengths and SHA-256 of the approved exports, not a claim that the image bytes are already checked in.

## Handoff
- Obtain the conversation's verified veldryn-eq2-materials.zip package. With Pillow installed, run `python tools/import-eq2-material-art.py /path/to/veldryn-eq2-materials.zip` for read-only validation, then rerun with `--stage` to place the 29 WebPs in this non-runtime review directory. Commit those files only after checking the diff; keep PNG masters outside the mobile bundle.
- No static require or item-discovery changes before coordinated 2.0 release; flags alone do not keep static assets out of the bundle. At final release, verify canonical registration, copy to a single approved runtime resource directory and wire one shared lookup for Inventory, Forge, Bank, Codex and Market. Device check 32/40/48/64px on light and dark surfaces. Confirm raw/processed distinction (especially Wolf Leather versus pelt) and glow edge cleanup (especially Glassbound Shard and Soul Fibre). Do not overwrite legacy assets; reuse only if identity and art parity explicitly verified.
- 489804 bytes total; all 29 under 32 KiB. 192x192; 26px transparent inset. Local source cleanup discarded alpha below 8/255 before normalization; WebP compression retained normalized alpha exactly and passed local RGB error checks. Original masters total 39880239 bytes. These are asset bytes, not measured AAB savings.

## Follow-on artwork audit (source-level shortlist; not verified missing files)
- #1932: one proposed EQ2_T1_COMMON_BINDER, pending recipe approval; new icon if accepted.
- #1717: six rare blueprint candidates, 125 T5 review equipment entries; verify existing art mappings and finalized material registry before additional generation.
- #1872 / #1891: 11 retained stat and 20 effect gem families; audit actual current art/grade reuse. Do not generate per-grade art automatically.
- #1723 / #1947: scouting, exploration and journal rewards; finalize exact reward IDs, then audit coverage.
- #1429 / #1416 / #1915: shared chest architecture, Party Event sets and World Boss chest-only gathering gear; check shared chest art and exact reward equipment mappings rather than inventing additional rewards.
- Guild PvE excluded from 2.0 art scope unless release direction changes.

No live feature, recipe, reward, source registration, database, asset import, or main merge authorized by this document.
