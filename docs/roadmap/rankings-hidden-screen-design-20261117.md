# VELDRYN Rankings — hidden screen refinement (17 November 2026)

## Release boundary
- **Not released.** `RANKINGS_RELEASED=false` in `apps/mobile/src/core/release-flags.ts` stays unchanged; no Account navigation exposure, route changes, production environment changes, or Play rollout.
- Current read-only Rankings pagination and the 19 board definitions remain the source of truth.
- Server v3 scoring proposal and 10-minute frozen snapshot/event history work are separate, review-only integrations. This UI branch does not deploy SQL, change database privileges, activate scoring, or mint event rewards.

## Main Rankings screen — mobile-first layout

```text
┌─────────────────────────────────────┐
│ RANKINGS                       [?]  │
│ VELDRYN Rankings                    │
├─────────────────────────────────────┤
│ [Account] [Professions] [Competitive]│  → scrollable tabs
│ [Dungeons] [Guilds]                 │
├─────────────────────────────────────┤
│ BOARD                               │
│ Profession Total                 ⌄  │
│ Server-verified score description   │
│                          [Refresh]  │
├─────────────────────────────────────┤
│ YOUR STANDING                  #…   │
│ Score · eligibility note           │
├─────────────────────────────────────┤
│ TOP THREE                           │
│ #1  gold-highlight verified leader  │
│ #2  silver verified runner-up       │
│ #3  bronze verified runner-up       │
│ (only positions actually visible)   │
├─────────────────────────────────────┤
│ RANKINGS                            │
│ #4  avatar guild-tag name   score   │
│ #5  avatar guild-tag name   score   │
│ …                                   │
├─────────────────────────────────────┤
│ [Previous]   Page 1   [Next]       │
│                    Entries 1–50     │
│ Live rankings may change            │
└─────────────────────────────────────┘
```

### Visual and interaction rules
- Theme-semantic pixel-art styling, compact card spacing, clear typography, identity/badge reuse, no decorative gradients or hardcoded rank achievements.
- First place gets distinct warm metal treatment; second and third retain cooler/bronze rank badge treatments. All score data comes from the server.
- **Official rank, not visible index, controls podium styling.** A private/blocked #1 must not make an unblocked #4 appear as #1, #2 or #3. Maximum three visible entries in the podium; further ties remain ordinary rows with the exact same official rank.
- 44px minimum help touch target. The `?` guide opens a compact modal with currently selected board scoring rule, privacy/read-only policy and live-update explanation. The default view stays uncluttered.
- The group rail and board selector reset paging and invalidate stale requests. Paging preserves the server's absolute ranks. Do not enable profile inspection or score-edit actions.
- Preserve account `Your Standing` even if the player is omitted from public rows; show the verified server reason if provided.
- Loading, empty, failed refresh, partial page, and inaccessible server states use the existing shared feedback components. Failed refresh retains last valid standings.
- On narrow screens and text-scale accessibility, scores wrap below player identities without clipping.

## Planned history screens (not exposed or populated by this branch)

### Arena seasons
An immutable *Finished Seasons* index, season/date selector, final rating/win leaderboard, personal final standing, and a compact note explaining that this is a finalized archive. Do not substitute current Arena standings for completed season scores.

### World Boss
A past-boss selector with the encounter and battle-window labels, final ranks, verified per-character contributions and an account-aware personal row. Exclude echo-only/invalid attempts and do not infer ranks from provisional damage.

### Party Events and Guild PvE
Separate historical detail views. Present completed event/guild contest title, end date, verified party/guild identity, contribution, official rank and eligibility. **Read only finalized, receipt-backed results** from authoritative Day 8 Party Event and Guild PvE finalizers; never fabricate results or backfill from interim totals. Independently gate each history reader and backend RPC.

## Validation / activation checklist
- Keep all Rankings, snapshots, Arena history, World Boss history, Party Event history and Guild PvE history flags OFF until approved.
- Focused Rankings UI tests, TypeScript, seven-language localization, Mobile Core/UX CI and Android visual inspection across small, normal and enlarged-font layouts.
- Backend review: 19 board sources, anti-tampering, authenticated snapshot cursors, privacy/block rechecks, expiration, RLS and service-role controls.
- Performance proof beyond synthetic EXPLAIN tests, with real paging concurrency and backpressure.
- Finish authoritative Party Event/Guild PvE finalizers and provenance receipts before exposing these histories.
- Explicit release review; no database migrations or mobile navigation exposure in this draft.
