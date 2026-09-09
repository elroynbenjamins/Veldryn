# Native integration — preserve the current application

## Repository facts checked, 8 September 2026
Public `main` contains `apps/mobile/App.tsx`, offline `WorldChat`/`GuildChat` and optional online components including
`OnlineWorldChat`. It uses an Expo/React Native app with local repository abstractions. The public README/START_HERE
still scope the main milestone around the offline Asterfall vertical slice. Do not automatically deploy the historical
backend, overwrite the navigation, or switch the app to live social services while integrating this visual pilot.

`START_HERE_CODEX.md` points to a design workbook named v5.6, whereas this downloaded master has scoped baseline v5.0.
Do not copy the older baseline over a newer repository workbook. This handoff changes chat presentation, not gameplay
IDs/balance. Current user decisions (including no equipment-driven appearance changes) take priority over old art/code.

## Development-only mount
Copy the `Chat_Pilot` folder intact into your feature area. For a quick development route:

```tsx
import DemoApp from './src/features/chat-pilot/src/native/DemoApp';
import { asyncStorageSettings } from './src/features/chat-pilot/src/native/asyncStorageSettings';

// Inside an explicit development-only route or modal, not instead of the game:
<DemoApp accountId="local-preview-account" settingsStore={asyncStorageSettings} />
```

`DemoApp` supplies its own SafeAreaView because it is an isolated preview. Use `ChatScreen` directly inside your normal
safe-area/navigation shell to avoid double padding. Pass `keyboardVerticalOffset` from the actual parent header height.
Keep platform keyboard handling in `KeyboardAvoidingView` and verify it with the existing Android window mode.

## Production-facing seams
`ChatScreen` receives `controller`, `profiles`, `onSocialAction`, optional `onLoadEarlier`, and optional navigation
callbacks. The controller accepts a catalog, viewer, settings store, transport and owned-emote set. All initial/demo
messages and identities are samples. Replace them with the host's authenticated read model; do not persist sample players.

`Transport.send({channelId, clientRequestId, segments})` returns a message receipt. It does NOT take a claimed sender name.
A real service must derive sender identity from authenticated context, check membership/blocks/ownership, rate-limit,
apply moderation and reuse clientRequestId to make retries idempotent. When an echo arrives, call `controller.receive()`.
For paginated history, retain the backend cursor outside the screen and return earlier messages from `onLoadEarlier`.
The controller merges them; the native list uses `maintainVisibleContentPosition`. Verify anchoring on both OSes.

Whisper selection currently opens a local conversation key; online whisper privacy and participant authorization are
not supplied by the UI. `onSocialAction` must perform actual friend/invite/trade/report operations or report unavailability.
Trade acceptance must open the existing secure trade flow, never directly move items from this popup. Demo block merely
hides messages and prevents local whispers; wire the real account block service before release.

## Emote editor and messages
A native TextInput edits text including `:male_01:`-style shortcodes. A separate line previews those as images.
This is intentional: arbitrary image children inside a TextInput are not used. Submitted messages are arrays of text/emote
segments, and rendered messages use native Text with inline images. Unknown incoming IDs get an accessible fallback.
Use the catalog's stable ID, not its file path, in saved selections and messages. Preserve the 64 existing IDs.

Settings draft may have fewer than 20 entries. Save requires 20 unique available IDs; cancel preserves the previous saved
tray; Reset uses free defaults. Earlier/Later is the implemented accessible reordering route. Drag reorder is not implemented.
Connect the settings entry under **Settings > Chat > Emote Tray**; do not show a second independent emote preference store.

## Fonts and layout
No fonts are bundled. Branding is the approved image crop. Native headings use Georgia on iOS / serif on Android, and
body text uses the platform default. The host may use its existing licensed font. Labels remain localized native text.
The four channel tabs fit phone widths; the image icon can be omitted below 360dp rather than shrinking its touch area.
Action buttons/picker entries are at least 44dp high; input and principal buttons use 48dp. Maintain generous text wrapping.

No character-equipment renderer or stat-driven outfit selector is part of this module.

## Before merge
Run the current app's `typecheck:core`, `test:pre-codex`, native dependency typecheck and Android/iOS build. Review it on a
small Android phone, with the keyboard visible, with large text, TalkBack/VoiceOver, long names, offline/retry and missing
avatar/emote data. The supplied browser test suite is not evidence that these native checks already passed.
