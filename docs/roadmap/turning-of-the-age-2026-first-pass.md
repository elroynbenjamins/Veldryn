# Turning of the Age — New Year 2026/27 · implementation pass 1

Status: **preview/calendar implementation committed; the approved exact UTC dates are now published to staging and production; both events remain disabled and Turning gameplay is not released.**

## 1. Theme and identity

- **Turning of the Age** is the recurring New Year celebration, distinct from Frostfall.
- Fantasy: preserve the closing year's stories, gather fragments of time, and face **The Last Hour** as the First Dawn begins.
- Festival currencies: **Age Tokens** (ordinary) and **First Dawn Seals** (prestige).
- Signature: **Chronicle Rite**. Each player chooses a focus — **combat**, **gathering**, **crafting**, or **bosses** — that increases Age Token earnings in that activity by **20%**. It is a personal choice, not a paid perk.
- Chronicle Vault is the existing authored expedition concept, with chapters **Chronicle the Closing Age → Recover the Broken Hours → Guard the First Dawn**.
- Keep the festival accessible to new players; do not impose a level gate on ordinary event activity. Boss/expedition eligibility may have progression requirements.

## 2. Existing authored progression and rewards (not yet released)

| Source | Reward |
| --- | --- |
| 400 reputation | Witness of the Turning title |
| 1,000 reputation | First Dawn emote |
| 4,000 reputation | Chronicle Wisp pet |
| 6,500 reputation | Agebound title |
| 10,000 reputation | Keeper of First Dawn combat companion |
| 900 Age Tokens | Turning Wave emote |
| 1,800 Age Tokens | Child of the New Age title |
| 10 First Dawn Seals | Gilded Hourling pet |

Daily gifts run on a repeating seven-day sequence. There are daily and weekly event objectives and four rare discoveries. Existing definitions are in `apps/mobile/src/content/annual-events-v3.ts`; the Year-Turning collectibles and their current art live under `apps/mobile/assets/event_collectibles/turning_of_the_age/`.

The milestone numbers are **existing authored values**, not validated final earnings calibration. Simulate a low-playtime and a high-playtime account before activating; make sure the last companion is achievable through a mix of supported activity types without requiring 24/7 play.

## 3. Implemented in this pass

1. **Read-only teaser**, visible exactly **14 days before the server-published start**; reveal Chronicle Wisp and the Chronicle Vault at **7 days before start**. The boss remains a launch reveal.
2. Dedicated compact artwork, first-dawn copy, UTC countdown, responsive cards, and localized strings in **EN, NL, DE, ES, FR, IT, RU, TR**. Existing Chronicle badge and Wisp artwork are reused.
3. Calendar integration for disabled-but-scheduled events through `public_event_calendar`; in-game upcoming preview only uses an enabled server runtime. The same shared Event screen clock drives both.
4. January annual collection and December event start are presented as one **cross-year season**, fixing the upcoming-event ordering and missing Turning festival hero artwork.
5. Prepared **source-only** visual bundle in `live-event-visuals-future.ts` for badge, both currencies, two pets and the companion. It is deliberately not imported by `live-event-visuals-active.ts`.
6. Preview clock boundary and UI-contract tests.

No currency, collectible, server activation, migrations, reward command or player entitlement is changed in this pass.

## 4. Approved Frostfall → Turning handover (UTC)

This replaces the earlier overlapping windows. The player's approved schedule is:

| Phase | First included day | Last included day | Exclusive database end |
| --- | --- | --- | --- |
| Frostfall active | Dec 3, 2026 | Dec 26, 2026 | Dec 27, 2026 00:00Z |
| Frostfall claim-only | Dec 27, 2026 | Dec 28, 2026 | Dec 29, 2026 00:00Z |
| Turning active | Dec 29, 2026 | Jan 4, 2027 | Jan 5, 2027 00:00Z |
| Turning claim-only | Jan 5, 2027 | Jan 11, 2027 | Jan 12, 2027 00:00Z |

The exact handover is **Dec 29, 2026 at 00:00:00 UTC**: Frostfall's claim grace ends at the same instant Turning opens. Since the server's single-visible-event trigger treats windows as half-open, equality is safe and no claim window overlaps the next event.

The source-of-truth data migration is `backend/supabase/migrations/20261113043200_frostfall_turning_of_the_age_2026_handover.sql`. It updates both festival records, sets Frostfall `claimGraceDays=2`, Turning `claimGraceDays=7`, and **does not change `enabled`**. The DML was executed and the values verified in staging and production on Nov 13, 2026. Both rows remained disabled. The Git migration is idempotent for pre-launch re-application, and may be reconciled with deployment migration history; do not run it against activated events without checking preflight.

The public calendar now exposes the exact Turning date and Frostfall's shortened window even while disabled. The separate client release must include the Turning live catalog definition and all required art before Live-Ops enables it.

## 5. Next implementation passes

- Verify the published 14-day Turning teaser begins Dec 15 and the second reveal Dec 22 at 00:00 UTC, without any rewards being claimable early.
- Release the existing `TURNING_OF_THE_AGE_EVENT` into `LIVE_EVENT_CATALOG` and its dedicated visual bundle **together**; never add one without the other. Check all reward IDs, server-owned currency receipts, pre-existing account ownership, and event-series inheritance.
- Connect Chronicle Vault stages, encounter balance, and The Last Hour boss to the actual event runtime; verify chapter progression, rewards, and anti-replay/cap rules.
- Add polished discovery art, event enemies, and a unique First Dawn transition moment; keep them cosmetic until server settlement and economy checks are complete.
- Run economy simulations for 7-day drop rates, daily/weekly contract completion, 10k reputation, 10 prestige, companion/pet acquisition, and relative reward values.
- Run test and mobile build checks on the branch, validate on Android at small widths/high font scaling, deploy staging migrations, and only then approve a production launch.

## 6. Rollback and safety

The branch contains only presentation and tests, plus a parked visual bundle. The approved schedule is now published, so the read-only Turning teaser becomes eligible from Dec 15, 2026. Gameplay remains disabled until separately approved. Revert the client commits to remove the preview without affecting published dates. If rescheduling again, amend staging and production event records using an explicit, tested data migration. Do not enable either event as a side effect of merging this branch.
