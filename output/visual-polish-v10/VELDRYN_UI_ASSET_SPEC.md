# VELDRYN UI asset specification — v10 activity status

`GameTopBar` owns the compact persistent player header. `ActiveActivityBar` is rendered immediately after it and returns `null` when `state.activity` is absent. Do not reserve blank height for idle state.

The activity strip is 64dp minimum height with a 42dp artwork well. Monster portraits render unframed at 38dp. Gathering artwork renders at 36dp using the existing density-aware transparent PNG families. Keep images inside their fixed wells with `contain`; never add a white stroke, opaque tile, baked text, or mismatched icon treatment.

Combat uses `#E15B66` for live progress and `#A74D58` for the bottom edge. Gathering uses `#55C8DB` and `#3D93A8`. These colors are semantic accents over the shared charcoal/navy surface `#101724`; they should remain sparse so the current action reads immediately.

Names, elapsed time, activity type, and cycle labels are native text. The name truncates before the timer. Timers use tabular numerals. Progress is based on time since the last claim within the current encounter or gathering cycle and updates from the app's one-second clock. Unknown target IDs still produce a readable fallback label.

The complete strip has one button role and a descriptive accessibility label. Keep its tap target unified. A combat tap opens Combat. A gathering tap opens Skills in gathering mode with the matching mining, woodcutting, or fishing skill selected.

The persistent header uses a 44dp environment control, flexible HP block, 72dp gold block, and preferred-size quick-navigation button. Health and activity progress tracks have rounded ends and native layout dimensions. No new nine-slice or three-slice artwork is required for this update.

The development fixture accepts `EXPO_PUBLIC_VISUAL_QA_SCREEN=topbar-idle` or `topbar-skill`; its default fixture is active combat. Normal and release builds keep `EXPO_PUBLIC_VISUAL_QA=0`.
