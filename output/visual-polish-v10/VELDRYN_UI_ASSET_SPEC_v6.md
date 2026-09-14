# VELDRYN Settings controls v6
SettingToggle uses native React Native primitives, with no additional PNG or font dependency. Import it from src/components/SettingToggle.tsx.

Props: label, optional description, boolean value, onValueChange, optional disabled. The entire row is one accessible switch. Keep the track decorative and avoid nesting another interactive switch. Minimum row height is 64dp; labels expand vertically. The track is 48×28dp with a 20dp thumb. Navy surfaces and crystal-blue active state match existing controls. On/Off text makes state understandable without color.

Settings choices use existing GameButton selected semantics. Their minimum basis is 120dp and they wrap. System fontScale above 1.2 selects full-width rows. Preserve native text scaling and do not assign fixed label heights.

This pass changes SettingsScreen and adds SettingToggle; NativeVisualReview accepts EXPO_PUBLIC_VISUAL_QA_SCREEN=settings with EXPO_PUBLIC_VISUAL_QA=1 for memory-only review. Production export keeps QA disabled. No App.tsx replacement is bundled.

See VELDRYN_UI_ASSET_SPEC_v5.md and VELDRYN_UI_ASSET_SPEC_v4.md for the included earlier artwork. Historical generation masters and prompts remain in the cumulative archive.
