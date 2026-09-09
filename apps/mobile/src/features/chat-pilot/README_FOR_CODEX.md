# VELDRYN — Chat Pilot v1

**Delivered 8 September 2026. Scope: prepared chat assets + an interactive UI pilot.**

This is a self-contained implementation handoff, not a replacement game repository and not a deployed chat service.
Equipment appearance swapping remains removed. Portraits are fixed supplied images.

## Review immediately
Open **`demo/preview.html`** in a desktop browser. The file embeds all art and code; no hosting, API key, npm install,
image generation or internet connection is required to view it. Messages are local samples. A small banner identifies
preview mode. Click **Join World chat**, names/avatars, the smiley and Chat Settings. Use **Demo controls** to test
an offline connection, a failed send, Retry, incoming messages and sample guild/party membership.

Browser preferences use a separate localStorage key when the browser allows it. Saving problems are shown explicitly;
private browsing, restrictive file-origin storage or disabled storage may prevent persistence. No real account is accessed.

## Implement in React Native
The public repository files inspected for this handoff use **Expo ~53.0.0, React 19.0.0 and React Native 0.79.5**.
No SDK upgrade is required by this module. Keep the existing app dependencies/navigation and source workbooks.

1. Copy this folder intact to `apps/mobile/src/features/chat-pilot/` (or an equivalent feature folder).
2. For isolated visual review, mount `src/native/DemoApp.tsx` in a temporary development-only route. Do not replace
   the existing `App.tsx` with `App.example.tsx` in production.
3. For host integration, mount **`ChatScreen`** from `src/native/ChatScreen.tsx`. Pass a `ChatController`, fixed profile
   records and real action callbacks. The host owns safe area, account identity and navigation.
4. Use `asyncStorageSettings.ts` for the existing AsyncStorage dependency, or pass a host `SettingsStore`. Do not
   reuse the game's save key or store passwords/authentication tokens in these preferences.
5. Keep `showDemoNavigation={false}` inside the actual app, so its navigation is not duplicated. A full chat screen
   should be a route or modal, not appended below a tall World screen.
6. Connect production message subscriptions/history and authorized social services in a later integration step.
   `Transport.send()` is an explicit seam; the included adapter only simulates delivery in memory.

`docs/NATIVE_INTEGRATION.md` gives an example mount and integration guardrails.

## What exists now
- 133 prepared PNGs, including 64 re-cropped emotes with the same stable IDs.
- Text-free button states and physical nine-slice pieces cut from the approved ornate art.
- Separate emoji/send/control icons; no duplicate glyphs baked into a responsive composer.
- Transparent portrait borders, branded header, two sample fixed portraits and an optional small pet demonstration.
- Native channel tabs, virtualized message rows, composer, emote picker and mini-profile UI source.
- Shared TypeScript logic for permission prechecks, structured emotes, drafts, local delivery/retry/deduplication,
  read state and 20 unique ordered available emotes per account.
- Basic emote settings with mixed categories, remove, Earlier/Later reordering, reset, cancel and validated save.

## Non-negotiable rules
Use supplied PNGs; do not ask Codex to generate replacements. Render all message text, labels, counters and status
with actual UI components. Male/female/pet emotes can be mixed regardless of character gender. Saving needs exactly
20 unique available IDs. All 64 happen to be unlocked **in the demo only**; a real account must supply real ownership.
A known custom shortcode is edited as plain text in the native TextInput, with a rendered-image draft preview.
It becomes a structured emote segment on send. It does not auto-send when selected. Arbitrary HTML/URLs are not image inputs.

## Validation performed
- **44 shared-core tests passed** after strict TypeScript compilation.
- **49 browser interaction/layout checks passed**, including 320, 360, 430 and 768px viewports.
- Native TS/TSX **syntax transpilation** passed. This is not a full native dependency typecheck or device build.
- PNG dimensions, alpha, safe margins, hashes, manifest paths and static Metro references were checked.

The browser screenshots are captures of working HTML/CSS using the same controller and art, not AI-generated mockups.
The browser and native renderers are separate; browser success does not certify native layout/keyboard/accessibility.
This environment blocks browser navigation, so automated browser tests loaded the HTML with `set_content` and injected
an in-memory preference adapter. Actual browser localStorage permissions and native AsyncStorage still need app/device QA.

## Not implemented / not certified
Production realtime delivery, authorization/RLS, anti-spam, server moderation/filtering, real friend requests, party
invitations, secure trades, push notifications and cross-device settings synchronization. Buttons without host callbacks
say they are not connected; they never report a successful request that did not happen. Demo block is local only.
The 36 legacy pet evolution cutouts, other character states, event frame openings and hairstyle libraries are NOT repaired
by this chat-only pass. Native VoiceOver/TalkBack, OS keyboard, Android/iOS builds and full dependency typechecks remain pending.

## Developer commands
From this folder, with TypeScript installed in the development environment:

```sh
npm run typecheck:core
npm run test:core
python tools/validate_assets.py
python tools/build_preview.py
```

Within the existing mobile project, run its own typecheck/build and smoke tests as well. Native-only checking is provided
through `tsconfig.native.json`; it requires the real React/React Native/AsyncStorage types from the host project.
Do not replace missing types with permissive stubs to claim a successful native typecheck.
