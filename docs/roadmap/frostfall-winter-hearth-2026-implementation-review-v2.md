# Frostfall 2026 Winter Hearth — Implementation & Security Review V2
**2026-11-23 | Hidden draft PR #1705. No production release or UI approval.**

## Confirmed scope
- One guild-owned Christmas Market, separate from weekly guild construction, guild PvE, the Frostfall dungeon and the earlier global community track.
- 25,000 logs (allowlisted six actual woodcutting item IDs) + 2,500 seasonal Smithing Christmas Lights.
- Account-wide caps across all characters and guilds: 2,500 logs + 250 finished lights per Monday 00:00 UTC week.
- Event donation window: 3 Dec 2026 00:00 UTC inclusive to 27 Dec 2026 00:00 UTC exclusive; latter days claim-only.
- Both tracks must reach each milestone: 25% grants 10,000 Guild Gold and +4% gathering speed; 50% grants 20,000 Gold, +6% Skill XP; 75% grants 30,000 Gold, +6% regional Combat XP; 100% grants 50,000 Gold, all three bonuses +10% and guild-owned **permanent** `name_frostfall_aurora_2026`. Gold total 110,000; bonuses replace prior thresholds and stop exactly at the event cutoff.
- Do not change these percentages into literal 2× XP/time multipliers: the approved draft doubles the *earlier* proposed percentage ladder, not a 100% boost.

## Backend situation verified read-only
A separate backend donation migration and a follow-up patch are already present on this hidden branch:
`backend/supabase/migrations/20261123221000_winter_hearth_2026_guild_market_v1.sql`
and `20261123221200_winter_hearth_2026_snapshot_lock_fix_v1.sql`.

On the Veldryn **staging** database, the four `public.guild_winter_hearth_2026_*` tables and the authenticated donation and snapshot routines exist. Their tables use RLS; table ACLs only include owner and service role (no anonymous/authenticated table write grants). Read-only checks found **zero** donation, milestone and project rows. An event row for the exact 2026 event ID was absent at audit time, meaning the donor RPC cannot satisfy its current event-release predicate. This is **not** a successful live donation test.

Production read-only check: both the progress table and donor function are absent. **No production launch or SQL deployment occurred as part of this V2 review.** This report did not toggle any flags in staging or production, create gameplay items or spend Guild Gold.

## New passing isolated tests
- **Pure domain rules**: existing `tools/frostfall-winter-hearth-2026-rules.test.mjs`, plus new `tools/winter-hearth-review/v2/wisp-craft-supply-review.test.mjs`. Event dates, caps, joint milestones, season expiry, 500 Smithing batches, 4 ore + 2 wood + 1 Wisp Glow per 5 lights, 30 Gold/40 seconds/+35 XP per batch. Wisp rate *candidates* fishing 5%, woodcutting 2%. All preview outputs are strictly `mayGrant:false` or `mayCraft:false` with no live rewards.
- **Disposable PostgreSQL 17 transaction model**: `tools/winter-hearth-review/v2/00_disposable_pg17_guild_donation_model.sql`, plus `01_disposable_pg17_guild_donation_tests.sql`, under `winter_hearth_review_2026` database guard. Validates 20 real-looking synthetic donations by three synthetic guild members across four weeks, both-track target completion, 110k treasury Gold once, one permanent color receipt, cross-guild account cap, non-member and invalid-item rejection, exact-nonce idempotency, event cutoff, immutable receipts and resource consumption. **It only uses mock inventory/guild records, not the actual staged donation RPC.**
- **Real two-session SQL race harness**: `02_pg17_parallel_guild_donations.sh`. A same-account double donation is serialized so only one succeeds within the weekly cap; two different members contribute the missing halves of a 25% milestone concurrently and trigger **exactly one** 10k Guild Gold payout.
- All jobs in [isolated GitHub Actions run 45269957376](https://github.com/elroynbenjamins/Veldryn/actions/runs/45269957376) **PASSED** on review SHA `63e84f32f41d7711cbf13bf3fe31afe5c1431d75`. These tests do not prove full mobile/staging app integration.

## 2026 material supply sensitivity (NOT calibrated live drop rates)
Read-only `guild_quest_action_daily` aggregates 1–23 Nov 2026 show 2 guild groupings with 22,941 woodcutting/21,508 fishing action counts in the more active guild and 2,636/993 in another. If *every* count represented an eligible successful source receipt and 2%/5% independently applied, expected Wisp Glow would be **1,534.2** versus **102.4**. That assumption is not verified: these are guild quest actions, not unique fishing/woodcutting settlement receipts. A guild needs **500 Wisps** to craft its 2,500 lights, plus 2,000 Copper Ore, 1,000 extra Greenwood Logs and 15,000 Gold in craft costs. Do not infer steady guaranteed supply from a small November sample. Under the strict weekly donation caps, 100% also requires at least three adequately participating accounts over the four donation weeks; no small-guild scaling was authorised.

## Actual game integration gaps
1. **Craft source**: registered seasonal Level-4 Smithing recipe, signed Wisp Glow fishing/woodcutting receipts and source-lock/anti-duplication grants, required item IDs in real inventory and event reward catalogues. These have *not* been connected to the runtime. The reviewed JS quote and Monte Carlo-free expectation are not authoritative.
2. **Inventory reachability**: staged donation routine currently consumes `public.online_game_states.state.inventory.stacks`, matching the existing guild project pattern, but not `public.account_bank_items` directly. Before UI design, decide whether the new project supports Bank withdrawals or direct Bank donations. Do not claim both work today.
3. **Buff settlement**: gathering speed, noncombat Skill XP, regional Combat XP must be applied once through actual verified server calculation and split across milestone unlocks, guild join/leave and the 27 Dec cutoff; not applied to dungeon, boss, PvP or retrospectively to claimed actions without separate approval. No integrated runtime multiplier exists yet.
4. **Guild cosmetic release**: owner UI/theme approval is required. Current production DB `guilds.name_color_id_v52_check` and `guild_event_color_releases_v1_color_id_check` allow only already approved color IDs (the event color release constraint is Halloween-only). A guild unlock receipt is not sufficient to equip or display `name_frostfall_aurora_2026`. Do not add placeholder hex values or bypass the color guard.
5. **Authority and QA**: authenticated staging donation test using a dedicated non-player test account, multi-character and guild-switch checks, concurrent real `online_game_states` inventory updates, preview snapshot ACL/RLS, crafting/drop capacity, World/Skills multiplier integration, localizations and Android UI review.
6. **Separate launch gate**: hold all live event modules and guild rewards off until the exact UI/themes are reviewed and the coordinated Frostfall 2026 and Veldryn release checks are signed off. No automatic Dec 3 activation.

## Review artwork assets
Four transparent 512px PNG *concepts* have been created in this conversation: `winter_timber.png`, `christmas_lights.png`, `wisp_glow.png` and `guild_aurora_market.png`. Their files are **not** committed to this PR; no runtime rarity frame or name color palette has been assigned. Treat them as art direction references pending owner approval and production-resolution validation.
