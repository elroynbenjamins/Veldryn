# Native Android review — v5

Reviewed on Android 35 in Expo Go 2.33.22, using the MonsterExchange_Pixel7 emulator. Display was temporarily set to 720×1280 at density 320 (360dp width), font scale 1.0. The review used actual IngredientList and ItemCard components with isolated in-memory fixture counts and harmless action callbacks.

Seven screenshots in native-v5 cover all twenty new ingredient illustrations and the complete Astral Script inventory card. Ingredient icons were reviewed at 32dp, inventory artwork at 58dp. Names, ready/missing counts, bag/bank counts, card quantity and sale action remained readable. No visible white halo or opaque image background was observed. Scroll boundaries in intermediate captures are normal viewport clipping. The development QA selector and extra top spacing are part of the fixture harness.

The Metro log showed successful Android bundles without app errors during capture. A system Messages ANR dialog during emulator startup was dismissed with Wait before the clean review captures; it was not an application error.

The harness uses EXPO_PUBLIC_VISUAL_QA=1 and EXPO_PUBLIC_VISUAL_QA_SCREEN=ingredients. Release export was separately verified with QA disabled. Backend access was disabled and dummy local credentials used. No real account or save was loaded.

Only the task-owned Metro server, port reverse and emulator were used. Display overrides are reset during cleanup. Physical devices, iOS and enlarged-font rendering were not re-tested in this pass; previous v4 checks are documented separately.
