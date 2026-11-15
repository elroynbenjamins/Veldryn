# Veldryn Rankings — staging validation and release checklist

**Status: draft, hidden and NOT deployed.** Prepared 15 November 2026. This is an engineering acceptance record, not an approval to enable rankings, advertise availability, merge a broad branch or distribute leaderboard rewards.

## Prototypes and release gates

The 19 standard boards are sourced by `leaderboards-authoritative-scoring-v3-proposal.sql`; the frozen 10-minute server cursor prototype is `leaderboards-v4-frozen-snapshots-proposal.sql`; the three finalized history proposals are `leaderboards-world-boss-final-history-v1-proposal.sql`, `leaderboards-arena-final-history-v1-proposal.sql`, and `leaderboards-party-guild-final-archives-v1-proposal.sql`. **All five are SQL proposals under docs/roadmap, not numbered migrations.** Service-role access only, private RLS-controlled storage, no public client direct RPC.

Client settings `EXPO_PUBLIC_RANKINGS_V1` and `EXPO_PUBLIC_RANKINGS_SNAPSHOT_V1` are not enabled. Server Edge constants `RANKINGS_RELEASED`, `FROZEN_RANKINGS_RELEASED`, `ARENA_HISTORY_RELEASED`, `WORLD_BOSS_HISTORY_RELEASED`, `PARTY_EVENT_HISTORY_RELEASED`, and `GUILD_PVE_HISTORY_RELEASED` are all false. Arena, World Boss and Party/Guild also have **separate, default-disabled DB gates**; no single global switch can unlock all archives.

## Rollback-only staging matrix

Use **a single connection/transaction** in Staging. Do not deploy, import files into migrations, or commit synthetic profile/season/boss/party/guild changes. Strip only the enclosing top-level `BEGIN;` and `COMMIT;` from the **five proposals**, then execute in this order:

1. v3 global metrics, v4 frozen cursors, World Boss finalized history, Arena finalized history, Party/Guild sealed history proposals.
2. Each fixture in a **separate SAVEPOINT**: v3 scoring contract, earned Journal fixture, real profession level/XP fixture, v4 frozen privacy/cursor/50k-own-rank fixture, Arena finalized fixture, Party/Guild finalized fixture, World Boss finalized fixture, then v3 privacy/block fixture.
3. For each: `SAVEPOINT qa_N;` fixture SQL `ROLLBACK TO SAVEPOINT qa_N;` `RELEASE SAVEPOINT qa_N;`. Finish with `ROLLBACK;`.

Separate savepoints are essential. The privacy and World Boss fixtures both mutate profile visibility/block relationships; running them without isolation can produce false cross-test failures. The Party tie fixture must **not** depend on whether tied UUID A or B sorts first.

**Result recorded:** All five proposals and eight fixtures passed together on 15 November 2026 in a transaction with savepoint isolation. Immediately afterward, checks for the v3 scoring, frozen snapshot, Arena, World Boss and Party/Guild history public functions all returned **absent** on Staging.

Acceptance examples from the fixtures:
- All 19 standard board projections, score ordering, shared ties and privacy-sensitive rank gaps.
- Profession level/XP coherent pair and account total (mining 51/100XP, woodcutting 10/200XP, combined 61/300XP), earned Journal duplicates count once.
- Frozen pages, cursor replay, 10-minute expiry, requester binding, private-account removal, 10k visible offset cap, **personal rank beyond 10k**, six-snapshot/minute quota and service-only cleanup.
- Arena archive cannot be finalized before season closes; second settlement cannot mutate results. Privacy changes on read preserve original ties.
- World Boss history requires finalized event and excludes zero-valid-attempt records; rescans public privacy/reciprocal blocks without renumbering.
- Party/Guild historical archive refuses duplicate entities and overwrites, uses server-defined metrics and retains gates off. **Its seal RPC still needs a verified mode-specific final receipt source before migration.**

## Synthetic load observations — not a production SLA

Staging PostgreSQL EXPLAIN ANALYZE completed a 50,000-row synthetic ranking/window/materialization query with 10,051 returned-score rows in approximately **91 ms**, and a synthetic JSONB snapshot extraction/page filtering query in approximately **71 ms**. A separate **50,000-synthetic-account / 150,000-skill-row** JSONB profession parsing, duplicate level/XP pair deduplication, account sum and window-rank query completed in **815 ms** on staging (single run). These measure only narrow SQL operations without many concurrent players, real production row complexity, network transfer, profile badge rendering or auth overhead. The 50k own-standing SQL fixture also passed.

Before release, run production-shaped concurrent tests against **staging** across 19 boards, with current/guild joins and multi-character saves, taking p50/p95/p99, peak private snapshot storage, maintenance throughput, and 10-minute expiration behavior. Establish and enforce the resource budget; do not extrapolate from those two synthetic numbers.

## Follow-up hardening — snapshot expiry, guild identity, public projection

- **Mobile expiration behavior:** page one may re-create an expired snapshot; page two or later explicitly requests refresh rather than repeatedly querying an expired cursor. The message is localized in all eight supported languages.
- **Guild self standing:** the frozen server reader now determines the requester's guild membership at read time, highlights that guild as **YOU**, and exposes its frozen rank in the self-standing panel. A member who leaves loses the personal guild standing immediately; rejoining restores it without changing any public official ranks.
- **Defense-in-depth privacy:** the authenticated Edge reader now allowlists top-level fields, individual leaderboard entries, self standing and staff/supporter badges. Unrecognized internal account/entity/receipt metadata is stripped; malformed rank/value rows and oversized responses fail closed. The corresponding Edge tests were committed, but the GitHub-hosted job has **not run**.
- **Workflow permission hardening:** the generated Edge bundle repair no longer runs pull request code with repository write permission or auto-pushes artifacts. It runs read-only and uploads a short-lived build artifact for a reviewed commit.
- **Staging re-verification:** all five SQL proposals plus all eight independent rollback/savepoint fixtures passed after the guild change. No new SQL functions, indexes, tables or release flags were deployed.
- **GitHub Actions blocker:** current PR checks report `action_required` with zero jobs rather than a pass/fail. An authorized repository maintainer must approve the checks through GitHub before treating the combined TypeScript, mobile and Edge bundles as verified.

## Final settlement provenance hardening (15 November)

The Party Event / Guild PvE archive now refuses to seal any score array without a **private, pre-registered authoritative settlement receipt** with the exact event key, mode, metric, bracket, version, completion timestamps, and canonical JSONB score digest. A syntactically plausible UUID or an altered score array is insufficient. Receipt registration has **no public client RPC**; only the eventual trusted end-of-event finalizer may create the private receipt.

The archive has a foreign key to the receipt, and database triggers reject UPDATE/DELETE on finalized receipt and history rows, including accidental privileged writes. Repeated calls with the same certified receipt are idempotent; forged retries fail closed. Neither table has client write grants. **This is not a substitute for a real Party Day-8 or Guild six-week finalizer:** those modes still must produce server-verified final score records before the archive can be used.

Combined staging verification after these changes: the five SQL proposals and eight fixtures all passed inside a single transaction, with individual savepoint rollback for each fixture. The tests include refusal of unregistered receipts, altered scoring, duplicate participants, attempted sealed result mutation and receipt deletion. The proposed SQL remains absent on both staging (after rollback) and production.

Additional Edge hardening: upstream authentication outages return sanitized 503 errors, rather than unhandled promise rejections. The new Edge regression test still needs GitHub Actions authorization before its actual CI result is known.

## Current integration boundaries

The existing Edge gameplay entrypoint has a `view=rankings` read-only handler in the draft, with authenticated account ownership sourced from the session. It exposes gated **start/page** snapshot reads, Arena history, World Boss history and Party/Guild finalized history. There is **no client seal endpoint, reward payout endpoint, public finalizer or active release switch**.

The polished mobile Rankings screen supports narrow viewports/large text and an optional opaque-cursor transport; the legacy offset implementation remains behind the old feature flag. Mobile navigation still needs a hands-on Android device run covering an initial page, ties, >50 results, changing a score between pages, profile becoming private, blocked accounts, expired token, and large-font/screen-reader mode.

## Remaining hard blockers

- **Party Event settlement**: server-verified final Day 8 performance receipts, including difficulty/bracket, combat contribution and immutable event version, must call the seal RPC **only after authentic finalization**. Today's live/provisional event progress and `party_rankings_v16` are not equivalent to finalized Day 8 combat results.
- **Guild PvE settlement**: a finalized six-week campaign receipt/score must be produced by the campaign engine before any history is sealed. Weekly `guild_pve_receipts` are not six-week final competition proof.
- Validate Arena settlement/World Boss finalizer can legitimately invoke their archived writes exactly once, and perform a full event UI scope picker before exposing histories.
- Regenerate and compare gameplay and co-op Edge bundles from the canonical shared code; never disable CI parity checks. The branch-specific GitHub Action attempts this with a restricted commit of only the two generated artifacts.
- Fix all broad application CI failures; do not classify unrelated failures as a release pass. Run the Android 1.0.10 build/device regression for ranking navigation, deep links, keyboard, screen reader, and app version gate.
- Convert reviewed SQL to numbered migrations through the installed Supabase CLI, run security advisors and database permission checks, then independently approve each release gate. **None of these last release steps has been executed.**
