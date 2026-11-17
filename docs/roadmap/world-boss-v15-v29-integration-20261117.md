# World Boss V15–V36 hidden integration (17 November 2026)

**Status:** DRAFT / hidden engineering consolidation only. Not approved for deployment or public activation.

## Provenance and scope
- Source: latest V29 draft `feature/world-boss-v29-impact-fairness-audit` (PR #1302), incorporating stacked V15–V28; based on current `main` commit `2f3bcc7a87396c10b559874552743e5de9fca459` rather than merging its 870-commit-behind ancestry.
- V14's read-only cohort audit is already integrated into main and is not duplicated.
- Port only the new, self-contained `world-boss-*` TypeScript modules, tests and roadmap-only SQL/markdown files. Reconcile the V25 authored-round helper in `world-boss-round-prototype.ts`, extend dedicated TypeScript fixture coverage and add a separate hidden-only validation workflow.
- Preserve current main's Android/mobile app, Supabase migrations, public routes, gameplay, event scheduling, generated Edge bundles, item economy, and settings.
- Existing V7–V14 World Boss tests and live-disabled flags must remain intact. In particular, the existing four-role Echo simulation path must continue functioning; V22 account raids are a separate, hidden path.

## Approved design to preserve in future live integration
- 14-day event cadence: Monday–Friday (five days) War Camp preparation, one uninterrupted 48-hour UTC Saturday/Sunday battle, then cooldown.
- Three World Boss battle attempts **per account per event**, not three per character. Two War Camp donations per account; no paid advantage or account-size reward multiplication.
- One owned-character roster contributes once per attempt; no borrowed Echoes for the approved V22-onward raid direction. Multi-character participation is part of a single account battle, not extra attack tickets.
- Bosses: Hollowroot, Sunscar and Frostmarch; source-authored 14-round encounters and locally protected Guard/role contribution must be calibrated before launch.

## Mandatory release blockers
1. **Run CI on the final exact branch head.** V33's dedicated TypeScript, World Boss and disposable PostgreSQL jobs passed; V34 changes have an independently queued exact-head check. Current Mobile Core baseline fails the separate Expo patch check. Do not infer future passing status from previous green heads.
2. **Roster policy verified at source (V30 and V33 regressions previously passed):** new characters are capped at three with one Tank, one Damage and one Support, but already-existing fourth/fifth characters remain playable by design. World Bosses may include up to five **server-verified owned** fighters in one account-wide battle; this does not create slots or add attack tickets. Never truncate a grandfathered roster to three or silently skip a sixth. Test against the current creation and legacy save/switching contracts.
3. **Source and replay trust:** establish real authenticated ownership, verified class/CP and snapshot revisions, replay provenance and RNG integrity with a trusted server join. Client-provided account, roster, damage or replay proof is insufficient.
4. **Database/economy safety:** replay exactly-once attempt reservation, worker fencing, transaction rollback, global HP settlement, War Camp debit, Sigil eligibility, duplicate receipts and concurrent claims using the real staging schemas. SQL files in `docs/roadmap/` are experiments, **not migrations**.
5. **Gameplay balance:** the actual nine-class catalog is **3 Tank / 4 Damage / 2 Support** (not the synthetic 3/3/3 assumption from V29); V30 now tests these exact mobile class IDs and rejects a symmetric fake catalog. Verify all nine classes across three bosses and real power brackets using independent accounts. V29's 2,700 synthetic fixtures are not real population validation and specify no live Sigil payouts.
6. **Server and client integration:** review authenticated routes, permissions, generated Edge bundle parity, feature flags, reliable mobile battle playback/recovery, localizations, accessibility and Android smoke testing on staging.
7. **Release authorization:** keep World Boss feature flags off and do not create production migrations, wallets, jobs, rewards or events until reviewed CI, security and economy gates are explicitly satisfied.

## Supersession notes
- V20/V21 consented Echo prototypes remain historical hidden test code; they do not authorize borrowing other players' loadouts under the approved V22 owned-account raid design.
- Older V14 fairness prototypes have already landed on main; do not re-merge their original branches.
- Existing stacked PRs (#1069 through #1302) remain reference drafts until this integration is validated. Do not merge old stack heads wholesale.
- No changes to Party Events, Player Market, guild PvE, rankings, Frostfall or the 1.0.10 release candidate are intended.

**Validation progress:** On the first exact-head run, both dedicated World Boss jobs passed (V7–V29 TypeScript and private PostgreSQL transaction smoke/concurrency tests); Mobile Core failed before gameplay tests because current `main` uses `expo@58.0.25`, while Expo's compatibility check now expects `~58.0.26`. This is tracked in [issue #1345](https://github.com/elroynbenjamins/Veldryn/issues/1345) and is unrelated to World Boss file changes. V33 World Boss and disposable PostgreSQL tests have since passed at their exact head; V34 adds a new character lifecycle gate. **Do not suppress the Expo failure or merge until the baseline/mobile gate and newest World Boss checks pass.**

## Staging read-only inventory — 17 November 2026
- Inspected only **schema metadata and aggregate counts** in the active `Veldryn Staging 20260924` project; did not query or expose account/character IDs, player saves or profiles.
- Staging currently has `public.characters` and `public.online_game_states`. There are 9 character rows and 9 online game-state rows; all 9 state rows match a character owned by the same account, and none has a null `character_id`. This only establishes storage shape/fixture coverage; it is **not evidence** that any World Boss reservation/replay works against live staging.
- The private `world_boss_*` tables and functions are **absent** in staging, although the `private` schema exists. Therefore V17–V28 PostgreSQL proofs are still **disposable CI database** tests, not real staging deployment tests.
- **No SQL was applied**, no World Boss data or wallets were created, and no staging/production edge routes or feature flags were changed.
- Release gate: review private migrations, service-role-only permissions, rollback and multi-worker fixtures; apply only to staging through the approved migration process after code/security review, then validate trusted authenticated account reads and exactly-once settlement without granting access to clients.

## V31 read-side reward hardening
- The internal V28 reward view now rejects duplicate battle ordinals, invalid nested role evidence, and negative/unbounded role metrics before returning them as account-visible data; tests exercise both malicious and valid cases.
- Receipt validation rejects a positive award without a wallet revision and an award larger than the resulting spendable balance. Crucially, **cumulative earned Sigils are not required to be ≤ current wallet balance** because a future shop may legitimately spend currency.
- These are defensive checks on an unmounted private prototype; exact-head CI is required, and they do not activate any payout.

## V32–V34 account safety and lifecycle
- V32 private-surface SQL inspection runs in disposable PostgreSQL after all draft World Boss schemas: verify RLS and no anonymous/authenticated table or function privileges.
- V33 corrected the source-of-truth adapter to read one `online_game_states` row per account (actual staging schema has primary key `account_id`), projecting the active and inactive fighters and verifying all owned character IDs/classes against `public.characters` in the same database snapshot. This passed dedicated CI; no live server route exists.
- V34 identified a pre-launch character-deletion regression: `ON DELETE RESTRICT` foreign keys on attempts and War Camp donations would indefinitely block deleting participating characters. Draft receipt tables now retain historical `character_id` UUIDs without those restrictive FKs; a server-only INSERT trigger verifies account ownership with `FOR KEY SHARE`, preventing concurrent character deletion from racing receipt creation.
- V34 disposable PostgreSQL fixtures must prove: valid owned character can reserve/donate; later character deletion succeeds and both immutable historical receipts remain; subsequent attempts/donations for deleted IDs fail; private RLS/permissions remain intact. **Exact-head V34 CI is pending.**
- **Unresolved account-erasure policy:** other draft World Boss tables still retain restrictive `auth.users` links. Decide the privacy retention and account deletion procedure before stage/live migration; do not remove account FKs without a reviewed ledger/reward retention strategy.
- No SQL was applied to Veldryn staging or production, and the flags and service routes remain off.

## V35 retired-Echo data lifecycle
- V34 exact-head GitHub CI passed both dedicated World Boss jobs, including V34 character-deletion PostgreSQL smoke, V33 account-save compatibility and the V32 private permission audit. The unrelated Mobile Core Expo check remains red (#1345).
- Retired borrowing-Echo V20/V21 tables previously contained restrictive character FKs despite the approved V22 account-only design. In the draft schema they now `ON DELETE CASCADE` when the opted-in character **or its Auth account** is deleted; the obsolete consent / command records are not game rewards and do not warrant immutable retention.
- The disposable V17 fixture's `public.characters.account_id` now uses `ON DELETE CASCADE`, matching the actual staging DB constraint. Added V35 PostgreSQL regression for character deletion, retired consent removal and direct account deletion **without manual character cleanup**, using synthetic fixture IDs only.
- **Unresolved active-account erasure issue:** V17/V27/V28 rewards and attempts still contain account-related restrictive FKs, so do not claim general Auth-account deletion is fixed. [Issue #1348](https://github.com/elroynbenjamins/Veldryn/issues/1348) requires policy, an idempotent erasure transaction, external replay retention, worker/claim fencing and staging tests before any migration.
- Latest V35 exact-head CI is pending. None of these changes is staged, merged into `main`, or activated.

## V36 read-only account-erasure preflight
- A new service-role-only **read-only** private function (`world_boss_v36_erasure_preflight(uuid)`) reports aggregate counts for nine reviewed account-linked World Boss tables: battle attempts, milestone attribution, old Echo consents/commands, War Camp donations, replay proofs, Sigil wallet, reward ledger and claim receipts. It emits no player IDs or raw replay/loadout data.
- If any account-linked World Boss record remains, the status is `blocked_pending_reconciliation`. If no World Boss records exist, the status is only `no_world_boss_rows`: **not permission to delete the account**, which may have obligations outside World Boss.
- It **fails closed** when the catalog contains a new or missing account-identity column in any private `world_boss_*` table, instead of silently neglecting the new data. No public/anonymous/authenticated function grants.
- Disposable PostgreSQL tests cover empty state, populated immutable battle/donation/replay/reward evidence, absence of account IDs in result, client-role access denial, a new account table and a new identity column on an existing table.
- This function is deliberately **not connected** to any account deletion flow; it does not choose a privacy retention policy, purge external replays, transfer currencies or mutate the database. [Issue #1348](https://github.com/elroynbenjamins/Veldryn/issues/1348) remains the launch gate.
- Dedicated exact-head V36 CI is pending. No World Boss schema has been migrated to staging or production.

**Next stage:** verify exact-head V36 and V35 PostgreSQL CI; fix independent Expo baseline (#1345); get approved account erasure and external replay retention design (#1348); then plan staged migrations, real concurrent worker tests and economy approval.
