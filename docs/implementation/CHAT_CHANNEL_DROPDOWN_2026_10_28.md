# Chat channel selector — boxed dropdown UX

**2026-10-28 — Implemented for review, NOT merged or deployed**

Stacked branch `refine/chat-channel-dropdown-20261028` based on `fix/mobile-guild-chat-typecheck-20261028` (draft PR #621). The selector code is in `apps/mobile/src/components/ChatOverlay.tsx`. No online chat, chat retention, server RPC, save, Guild role or message data structures were modified.

## Before

`ChatOverlay` used a permanent 52px vertical rail of four icon-only channel tabs alongside a header containing a second current-channel title and a separately opened World-language selector. The rail permanently reduced message width on narrow screens.

## After

- One primary **header control** shows the active channel's existing `ChatChannelIcon`, its translated name and a quiet down-chevron. The full-height chat message pane now takes the width previously used by the rail.
- The arrow is a **native React Native View built from two 2px borders** (`9×9`), with `45deg` closed / `225deg` open orientation; **no character glyph, emoji, font pack or downloaded asset**. It stays sharp under theme/font changes.
- Tapping opens a compact, dark-themed **four-row boxed popover** under the trigger, with subtle attached notch, icon, name and a short subtitle. Active row gets a restrained accent border + selected background and checkmark. Small badges show unread or @mentions. No duplicate channel tabs.
- **World**, **Guild**, **Party**, **System** map to the same `selectChannel`/existing chat components. Unverified Guild members see a disabled row, matching the old rail; Party stays hidden unless the real Party Chat membership gate passes. Existing World language selection remains a separate button to the right.
- The menu closes when a channel is selected, chat closes, chat channel changes or chat modal visibility changes; tapping outside dismisses it. Selecting channel and language menus is mutually exclusive.
- Header uses one row rather than a wrapping toolbar; **online badge is shown only at screen width 400+** to preserve compact 320/360dp touch layout. Close target remains 40×44dp. Both dropdown targets are at least 44dp tall, as is the close target.
- New strings `Change chat channel`, `Chat channels`, `Global chat`, `Guild members`, `Join a Guild to chat`, `Your party` and `Game notifications` translated into DE/ES/NL/IT/FR; English is the catalog key.
- `apps/mobile/tests/chat-channel-dropdown-ui-contract.cjs` has 20 source-level assertions; registered in `tools/mobile-core-tests.json`.

## Testing and release gate

- **11/11 source inspections passed** (navigation deduplication, four choices, chevron geometry, permission gating, language coexistence, badges, dismissal and localization).
- GitHub Actions must verify the final branch. These are structural checks, not native device tests. Core test runner may still be blocked by the independent `starter-companion-choice.ts` API/fixture mismatch; do not silence or delete tests.
- **Not completed:** native Android/touch screenshot, 320dp + 200% font, multiple languages, screen reader focus and large keyboard, World/Guild/Party connections against an authenticated server, live unread badge change.
- PR is deliberately stacked onto #621, which restores `ChatOverlay.initialChannel` handling. **Merge #621 first only after its CI and review**, then rebase/retarget this PR onto `main`; do not merge a stacked PR to main without reviewing the included diff. Companion UI PR #619 remains unrelated.

## Verification update — 28 October 2026

- Source structure checklist: **11/11** direct checks passed, including no duplicate rail, all four channels, gated Guild/Party access, language separation, fine-line rotating chevron and localization.
- Dedicated source contract now contains **24** assertions; registered in `tools/mobile-core-tests.json`. Android Back and accessibility Escape dismiss an open menu before the chat itself; when the menu opens, the message feed is hidden from accessibility navigation, and header buttons remain operable.
- **Guild Shop workflow #40690584221**: **mobile TypeScript passed** and **online backend/SQL integrity passed** on commit `7174a736`, before the last accessibility-focused edits. Later commit runs must be read independently before claiming a latest-SHA pass.
- **Mobile core #40690584438 and Mobile UX #40690584406**: failed during core TypeScript with **11 existing errors** in `starter-companion-choice.ts` caused by missing choice APIs/fields. None attributed to this selector; registered contract CJS cannot execute in those pipelines until starter-choice issue is reconciled.
- A **standalone interactive HTML preview** was generated outside the repository using actual Obsidian/Ember/Ivory theme color values and the same dropdown hierarchy and touch targets. Headless Chromium tests at 430px and 320px passed switching channels, toggling both menus, outside-tap dismiss and narrow close-target fit, with no JS errors. Sample messages and simple icons are illustrative; it is **not a native screenshot or live server QA**.
