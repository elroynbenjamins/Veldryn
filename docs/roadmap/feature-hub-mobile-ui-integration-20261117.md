# World Boss, Party Events and Player Market — mobile feature hub integration

**17 November 2026 · UI engineering draft · no public activation**

## Scope

This branch implements *native*, developer-only preview routes for World Bosses, Party Events and Player Market. The previews demonstrate real in-app navigation and the approved game interactions without claiming to operate private economy services.

- Account → Feature Hub QA appears only in `__DEV__`.
- The parent top bar and bottom navigation remain available.
- The activity strip and global World chat dock disappear on all three preview routes.
- Party Events replaces the global dock with a compact Party dock. This opens the **existing authenticated Party channel** in a party-only modal. It does not show World, Guild or System tabs, fetch the World chat feed or reveal the online-player roster in this context.
- Back navigation, manual `?` guides, selected tabs, family/region selection and the Market calculator work locally.
- Existing seasonal Events, guild PvE and Party Contracts remain unchanged.

## UI quality decisions

| Screen | Design details | Authoritative work still needed |
| --- | --- | --- |
| World Boss | Three preview boss areas backed by Veldryn's regional pixel panoramas; 5-day War Camp, continuous 48-hour battle, 3 shared attempts, 14-round mechanics, reward and rankings states | Server-owned War Camp snapshot, validated roster, idempotent attempts, HP settlement, contribution ledger, wallet and claims |
| Party Events | Four distinct themed landscapes and story families, three preparation stages, separate Stage 2 and Stage 3 route ballots, connected real Party roster and Party-only chat | Verified event week, supplies, votes, receipts, stages, finale, Day 8 settlement and player-facing original art |
| Player Market | Search/filterable mock catalog with illustrative equipment level gate, sample price history, 5% seller tax calculator, listings and Inbox empty states | Authenticated browse, ownership/provenance, min/max prices, equipment rules, escrow, purchase/return/relist, real historical sales |

All market items, numbers, progress bars, dates and sale history are **examples**, not a service response. No purchases, listings, donations, event points, world-boss attacks, wallet mutations or reward claims are available.

## QA / manual review

1. Open Account → Feature Hub QA on a developer build, visit all three routes and verify bottom navigation and Back.
2. Confirm **no activity bar** and **no global chat dock** on all three screens.
3. On Party Events, with a signed-in Party, tap the dock: only Party chat can render and send messages; unread badges stay scoped to the current Party. Leave/disband the Party while a modal is open and verify it closes cleanly.
4. Repeat with global World chat disabled: Party chat should still work.
5. Change boss and event families, confirm regional art and accent colors change; inspect all tabs without real action availability.
6. In Market, search, filter, inspect the sample equipment requirement and example history, try the price calculator, and verify buttons cannot move gold or items.
7. Check small Android widths, font scaling, text truncation, TalkBack labels, keyboard overlap and reduced-motion setting.
8. Confirm release-build source and flags: no QA navigation, Market trading flags false, World Boss and Party Event route/wallet endpoints still unmounted.

## Integration plan (not release authorization)

- Hold this PR as draft until exact-head Mobile UX TypeScript and native Android validation pass.
- Merge or port **only** reviewed UI code to its eventual gated client branch, after current main is reconciled.
- Implement server snapshot adapters and typed loading/error/retry views first; add writes only after dedicated staging migration/security/idempotency and reward/market custody tests are green.
- Replace the temporary landscape illustrations with approved boss/market/event key art before player-facing activation, and localize all UI copy for supported languages.
- Never treat a graphical button, local simulated vote, sample ranking or preview item as authoritative player progression.

**Existing hidden backend work remains separate:** World Boss PR #1346, Party Events PR #1347, Player Market PR #1055. UI development here does not approve those services to launch.
