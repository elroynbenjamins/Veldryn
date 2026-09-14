# VELDRYN visual polish v9 — Profile wardrobe

Implemented on 13 September 2026.

- Profile backgrounds, event borders, and companions now use a shared softer preview tile.
- Each tile places Available, Event reward, Preview only, or Previewing directly over its artwork.
- Selected tiles use the crystal-blue surface and outline used elsewhere in VELDRYN.
- Border tiles render the transparent frame over a muted Asterfall scene so the ornament can be judged in context.
- Wardrobe tabs use a quiet segmented surface and gold selected underline.
- Tiles are 160dp wide with an 88dp artwork area, longer two-line names, and a lighter hairline border.
- The full profile composition retains its background, event frame, character, companion, title, class, and level.

An isolated Android review entry was used because concurrent companion work currently imports backend runtime code outside Metro's mobile project root. The normal `index.js` app entry was restored immediately after review. The isolated bundle passed with 868 modules and rendered on Android 35 at 360dp. Syntax transpilation passed for all five touched/profile review files.

The workspace-wide TypeScript and normal production export remain blocked by unrelated concurrent companion files: first a missing `companion-save`, then an external backend combat-engine import that Metro cannot resolve from the mobile root. This pass leaves those files untouched. Earlier cumulative production export verification is retained in the versioned reports.

Three native screenshots cover the composed profile, contextual border gallery, and companion gallery. No account or saved profile was changed. Physical devices, iOS, enlarged text, and spoken screen-reader output remain unverified.
