# Veldryn — Rankings, event results and archives (draft v1, 15 November 2026)

> **Hidden feature specification only.** Do not enable `RANKINGS_RELEASED`, merge this draft as a release decision, deploy proposed scoring SQL, open a public route or distribute ranking rewards from this document.

## Existing baseline (do not regress)
- The 19 standard read-only boards in `leaderboards-v1-foundation.md` remain the foundation: Profession Total, earned Achievement Score, twelve individual professions, Arena Rating/Wins, Dungeon Highest Tier/Clears and Guild Prestige.
- Scores must come from trusted server-side saves or finalized settlement receipts, not app-submitted counters. The account is the unit of player ranking; a profession board uses the account's best owned character.
- No Combat Level/class-specific skill rankings, permanent power, exclusive gear or paid ranking advantage. Cosmetic titles, badges, profile records and event appearances are acceptable rank recognition.
- Public profile visibility, mutual blocks and deletion/ban enforcement are applied at read time. The client never receives account UUIDs. Private profiles do not appear in public rows; own standing may show an unlisted state and a clear privacy explanation.
- Equal primary and secondary metrics yield shared rank numbers. A deterministic internal tie order prevents pagination jitter but does **not** secretly break a tied rank. Names/renames do not determine rank.

## Scopes and archive rules
| Scope | Board families | Ranking lifecycle |
| --- | --- | --- |
| All-time/live | Account professions, Achievement Score, Dungeon lifetime clears/highest tier, Guild Prestige | Update from trusted gameplay state; display as current totals, not immutable historical accomplishments |
| Current Arena season | Arena Rating and Arena Wins | Display season identifier and end time from server calendar. Provisional until a server-settled season closes |
| Previous Arena seasons | Arena Rating and Arena Wins | Immutable server-finalized season snapshots; do not replay client-side historical scores |
| Individual World Boss event | Raid Impact and applied global damage | Only finalized event snapshot; display event name/date; independent history gate |
| Party Events | Most Damage, Deepest Run, Best Support, Best Defense, Best Mechanics | Final Day 8 snapshot, partitioned by event + difficulty (and by party size only when that competition explicitly uses it); independent gate |
| Guild PvE campaign | Guild campaign progression/contribution | Finalized 6-week campaign snapshots only; separate gate and scoring contract still to be implemented |

Current/Previous/All-time are **scope labels**, not a promise that a board supports all three. A category with no compatible history must not render an empty faux archive. Keep event history separate from general global boards.

## World Boss account-level competitive rules
- **Timezone-fair scheduling:** five preparation days followed by the weekend attack phase. Draft weekend availability: three 30-minute windows each day, at eight-hour intervals; six windows across the weekend. The event scheduler owns authoritative UTC window boundaries and publishes localized countdowns. Recheck the exact weekend/window schedule with the World Boss game-mode implementation before release.
- **Three scored attempts maximum per account per event**, not per character or per window. Attacks are initiated by individual accounts; no live matchmaking requirement. Server rejects attempts started outside an attack window or after the cap. Starting an attempt reserves one account-wide attempt idempotently so retries/reconnects cannot multiply it.
- **Simultaneous characters:** a player's eligible unlocked, owned characters may participate together using server-snapshotted equipment, companions and role rules for that attempt. No separate character leaderboard positions and no extra account attempts for owning more characters. The World Boss backend decides the per-account score and global damage once for each completed legitimate attempt; do not calculate by summing separately submitted client scores.
- **Fairness constraint before launch:** because accounts can unlock up to five characters, normalize or otherwise explicitly balance multi-character raid output against account age/progression. Model single-character vs multi-character success and ensure support/tank contributions count without uncapped healing/shielding farming.
- The event leaderboard ranks **accounts**, based on backend-finalized cumulative `raid_impact` across eligible scored attempts, with `applied_global_damage` for explanatory detail/ties where the authority defines it. The settled `final_rank` is immutable. Exclude echoes, zero-impact, failed/unverified and duplicate attempts; display scored-attempt count.
- A private or mutually blocked account can disappear from a viewer's historical page, but survivors keep their original finalized rank numbers, including gaps. Names are resolved using current public profile data to honor renames and privacy.

## Party Events and Guild PvE
- Party Events use an immutable party-name snapshot (fallback to leader-party label), distinct performance leaderboards and six existing shared performance-reward bands. Rewards require personal contribution eligibility and a one-time claim; no payout from provisional scores.
- Guild PvE ranking must use campaign snapshots and validated guild-level achievements, not guild member count alone. Freeze guild identity/tag safely at campaign settlement while respecting disbanded guild and member privacy; no permanent power rewards.
- A mode's own event gate, finalized-data gate and general Rankings gate must all pass. Opening global Rankings never implicitly exposes hidden Party Event or Guild PvE boards.

## Mobile presentation
- Retain the compact Rankings screen: top three, full list below, own standing, board picker, 50-row pagination and a clear refresh button. Re-selecting the active group/board must preserve the already loaded snapshot.
- Add a compact scope selector only when the chosen board has verified season/event scopes. Show 'Current', 'Previous' and 'All-time' as applicable, and event pickers for World Boss/Party/Guild events with explicit finalized date.
- Label provisional/live results separately from settled snapshots, show the viewer's own standing even when outside the displayed page, and show privacy/unranked reasons without revealing hidden account positions.
- Past event snapshots show original official rank, not a renumbered visible rank. Use server-provided totals, localized numbers and readable small-screen layout; no fabricated countdown or unearned reward toast.

## Server paging, integrity and acceptance checks
1. Keep existing v3 / v2 code and gates untouched during design. For scale, introduce a future server-authoritative, point-in-time snapshot id with an **opaque, expiring cursor** rather than offset against an actively changing board. Never expose sort keys that reveal account ids.
2. The snapshot freezes scoring/order while serving later pages. **Reapply current privacy, blocks and deletion restrictions to every page**, even when the score snapshot is old. Page gaps are acceptable; fetching more rows to fill a page must not bypass privacy.
3. Check equal-rank ties spanning pages, score changes between requests, page 51+, 10,000-offset bounds, server timeouts/retries, duplicate attempts, private-to-public switches, mutual blocks, deleted accounts, renamed players and disbanded guilds.
4. Check World Boss with 1–5 unlocked characters, two accounts attacking in the same 30-minute window, reconnect/resume, multiple devices, six possible weekend windows and the three-attempt account cap.
5. Verify all 19 standard board fixture populations, authenticated service-only RPCs, earned Journal catalog integrity and performance before release. Android large-text/accessibility review is mandatory.
6. Finalized rankings and reward claims use idempotent server transactions and stable event-version identifiers. No paid features or direct client writes can increment competitive scores.

## Release dependencies
- Keep `RANKINGS_RELEASED=false`, World Boss history default disabled and Party Event/Guild PvE gates disabled pending independent approval.
- Reconcile v2 migration history; convert v3 proposal SQL to numbered reviewed migrations; stage performance/fixtures; finish historical endpoint, event archive UI and privacy audits; perform device regression; only then plan rollout.
- This document **does not** assert that current World Boss multi-character combat, Arena seasonal history, Party Event rewards or Guild PvE competitive history are implemented.
