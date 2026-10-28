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
- Header uses one row rather than a wrapping toolbar; **online badge is shown only at screen width 400+** to preserve compact 320/360dp touch layout. Close target remains 40×44dp. Dropdown target min height 40dp.
- New strings `Change chat channel`, `Chat channels`, `Global chat`, `Guild members`, `Join a Guild to chat`, `Your party` and `Game notifications` translated into DE/ES/NL/IT/FR; English is the catalog key.
- `apps/mobile/tests/chat-channel-dropdown-ui-contract.cjs` has 20 source-level assertions; registered in `tools/mobile-core-tests.json`.

## Testing and release gate

- **11/11 source inspections passed** (navigation deduplication, four choices, chevron geometry, permission gating, language coexistence, badges, dismissal and localization).
- GitHub Actions must verify the final branch. These are structural checks, not native device tests. Core test runner may still be blocked by the independent `starter-companion-choice.ts` API/fixture mismatch; do not silence or delete tests.
- **Not completed:** native Android/touch screenshot, 320dp + 200% font, multiple languages, screen reader focus and large keyboard, World/Guild/Party connections against an authenticated server, live unread badge change.
- PR is deliberately stacked onto #621, which restores `ChatOverlay.initialChannel` handling. **Merge #621 first only after its CI and review**, then rebase/retarget this PR onto `main`; do not merge a stacked PR to main without reviewing the included diff. Companion UI PR #619 remains unrelated.
