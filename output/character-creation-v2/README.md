# VELDRYN character creation and class carousel v2

Implemented in `apps/mobile/src/screens/ClassSelectScreen.tsx` with reusable `CreationChrome` and `ClassHeroCarousel` components.

The selection screen uses large male/female class figures, softly arched portrait stages, the upgraded class emblems, previous/next controls, horizontal swipe, selectable crest thumbnails, role filters, class traits, and canonical starting attributes. The header is compact, the action remains outside the scroll area, and hero height responds to available screen height. Class changes have a short opacity transition that respects reduced-motion settings. Identity uses a softly shaped portrait stage and a vertically centered live name input. Naming, confirmation, save-error handling and the existing starting-equipment policy remain in the original flow.

## Artwork

Reused 18 approved class equipment illustrations already present in the game. No new hero generation was needed. They are selection illustrations, not free equipment or skin grants. Identity and review still show the true neutral starting appearance. `class-creation-art.ts` records each class's illustration mapping. The existing class emblem pack supplies the crests; the approved Pixel UI Kit remains included for reuse. The current creation flow uses quiet, rounded controls and unboxed content. Text remains live React Native text.

The selected mappings are Aster Iron, Lastwall Panoply, Mournchain Harness, Thread of Dawn, Regretwalker, Lanternsteel Array, Runespark Adept, Gloamstep Regalia and Resonant Tempest. Existing character/skin registries and gameplay definitions remain the authority.

## Review

Open `output/character-creation-v2/preview.html` from the repository or extracted handoff. It is an interactive browser **visual review**, built from canonical class data and installed artwork. It is not the native app. Role, crest, arrow and body controls demonstrate the layout; the final creation action is intentionally a preview notice. `phone-preview.png` shows the compact 390×844 viewport. Other captures review 320/390 widths and different classes. The mobile implementation includes the real identity/review/save flow.

## Handoff

The ZIP mirrors repository paths. Apply the included source files and asset folders to the existing VELDRYN project after reviewing local edits. This is an upgrade for that project, not a standalone app. Preserve existing game, item, skin, localization and account modules. Source files in the archive are snapshots of the implemented change, not a command to overwrite unrelated local work.

The included art uses the existing paths under `apps/mobile/assets`. The approved hero registry remains an existing-project dependency. `creation-ui-assets.ts` and `class-emblem-assets.ts` use static Metro imports; retain the density siblings. Preview scripts require the repository's TypeScript package. Package integrity is verified by CRC and per-member SHA-256.

See `QA.md` for the checks performed and their limits.

## Softer presentation revision

Removed the enclosing gold hero frame, boxed crest tiles, filled nameplate, rectangular role filters and stat cards. Filters use a subtle selected underline; crests have a quiet selection halo. Serif headings and lighter weights soften the typography. Actions, input, identity and review surfaces use restrained rounding, with centered text and 44–52 dp touch targets retained. Keep the pixel character art and emblems; avoid turning every piece of content into a framed card.
