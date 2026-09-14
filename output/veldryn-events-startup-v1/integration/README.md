# Integration

The files are already installed in this VELDRYN workspace. For another checkout:

1. Copy the pack's `assets` contents into `apps/mobile/assets/events-startup-v1`.
2. Copy `integration/src/components/StartupScreen.tsx` and the two files in `integration/src/theme` into the matching app source directories.
3. In the app component, import `StartupScreen` and `pickStartupScene`; add `const [startupScene]=useState(pickStartupScene)` before conditional returns. Return `<StartupScreen scene={startupScene} language={recoveryLanguage}/>` from existing loading branches. Keep existing loading, authentication and recovery conditions.
4. Import `EVENT_DECORATIONS` into the existing profile-border registry and append `...EVENT_DECORATIONS.map(({borderId,border}):[string,ImageSourcePropType]=>[borderId,border])` to its entries. Retain Amber Vine and Wheat Crown.
5. Connect future reward definitions to the supplied border IDs only according to the event design. The catalog makes art available without granting cosmetics.

No dependencies or native configuration changes are required. The logo stays a separate image; the loading label uses the app's existing translation catalog. No new event definitions or profile backgrounds are installed.
