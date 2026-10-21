# Online action loading feedback

Online actions now return their promises through buttons and nested callbacks. GameButton and SocialActionButton show an inline ActivityIndicator while the request is pending, expose accessible busy/disabled states, reject duplicate presses and recover after either completion or failure. Busy indicators retain readable colors rather than dimming with unavailable controls.

This covers account actions, guild management/customization/projects, social invitations, rewards, companions, profile saves, purchases/restores, gathering, travel, crafting and related online command paths. Explicit busy feedback remains available for actions launched from confirmation dialogs. Destructive confirmations and required account verification dialogs remain intact.

The app no longer disables pointer events over its entire content area during a server save. Users can scroll and navigate while the existing compact saving indicator remains visible. A synchronous in-flight guard preserves the active command's busy state when another action is attempted. Routine command failures appear inline and pending actions retain their retry path. Offline settlement uses an inline loading row instead of a blocking overlay.

Initial connection, social-account loading, guild management/customization, Guild PvE and the rewards inbox have explicit loading indicators. Guild management load failures retain inline error/retry feedback.

Account button loading resets when account or recovery ownership changes. The existing account-entry isolation tests caught this edge case and now pass with old requests unable to lock or release the replacement account's controls.

Validation: full mobile TypeScript checks passed; all 210 mobile core checks passed; Guild UI and account-entry/recovery race tests passed. `npm run test:online-loading` exercises both shared buttons, same-tick duplicate taps, promise rejection recovery, explicit busy state and overlapping command requests. It also guards against reintroducing discarded button promises or a whole-screen saving lock. Core/account receipts are in `output/online-loading-core-tests.txt` and `output/online-loading-account-tests.txt`.

These are mobile changes and require the next app build; no database migration or server deployment is needed.
