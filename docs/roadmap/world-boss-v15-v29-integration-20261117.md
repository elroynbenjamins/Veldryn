# World Boss V15–V30 hidden integration (17 November 2026)

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
1. **Run CI on this exact branch.** Confirm Node TypeScript, legacy V7–V14 World Boss regressions, V15–V29 tests and disposable PostgreSQL contention/receipt tests. A PR draft is not a passing test.
2. **Roster policy verified at source (V30 regression added, exact-head CI pending):** new characters are capped at three with one Tank, one Damage and one Support, but already-existing fourth/fifth characters remain playable by design. World Bosses may include up to five **server-verified owned** fighters in one account-wide battle; this does not create slots or add attack tickets. Never truncate a grandfathered roster to three or silently skip a sixth. Test against the current creation and legacy save/switching contracts.
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

**Validation progress:** On the first exact-head run, both dedicated World Boss jobs passed (V7–V29 TypeScript and private PostgreSQL transaction smoke/concurrency tests); Mobile Core failed before gameplay tests because current `main` uses `expo@58.0.25`, while Expo's compatibility check now expects `~58.0.26`. This is tracked in [issue #1345](https://github.com/elroynbenjamins/Veldryn/issues/1345) and is unrelated to World Boss file changes. Newly added V30 roster and catalog tests require their own exact-head green run. **Do not suppress the Expo failure or merge until the baseline/mobile gate and World Boss V30 gates pass.**

**Next stage:** finish V30 CI, verify real staging ownership and transactions, calibrate the nine-class roster using authenticated player data in privacy-safe aggregates, and obtain release approval before promotion from draft.
