# Character refinement batch 1

Ten implemented refinements:

1. Guided class → identity → review creation flow; Back preserves choices.
2. Three-stage progress indicator and scroll reset on stage changes.
3. Shared name validation in UI and core: 2–20 characters; Unicode letters, combining marks, spaces, apostrophes and hyphens. Blank core names retain the legacy Adventurer fallback; existing saves are unchanged.
4. Eight tappable name suggestions.
5. All/Tank/Support/Damage class filters with filtered thumbnails and counts.
6. Horizontal swipe class browsing with arrow alternatives; vertical scrolling remains available.
7. A dedicated primary-weapon loadout card, explicitly distinguishing class emblems from actual starting equipment.
8. A visual final review showing name, role, presentation, front/back art and empty armor/offhand slots.
9. In-game character sheet uses the saved presentation with front/back portrait controls. This is clearly labeled a starting appearance reference, not live equipment rendering.
10. Save-before-enter creation with duplicate-submit protection and an inline retry error that preserves choices.

No replacement art or unsupported hair/skin layers were created. No existing save is reset. Progression and equipment balance are unchanged.

Verification: full TypeScript checks, core regression suites, name/carousel boundary tests and Android Expo export. Physical-device gesture, keyboard and screen-reader QA remain necessary; the export verifies bundling, not visual behavior.
