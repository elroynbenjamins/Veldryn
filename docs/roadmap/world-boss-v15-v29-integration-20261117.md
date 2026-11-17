# World Boss V15–V29 hidden integration (17 November 2026)

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
2. **Reconcile current roster limits:** the prototype's 1–5 owned-character support is a draft ceiling, while Veldryn 1.0.10 currently restricts accounts to three characters (Tank/Damage/Support). Verify the trusted account roster reader and the class-calibration source against the deployed three-character policy.
3. **Source and replay trust:** establish real authenticated ownership, verified class/CP and snapshot revisions, replay provenance and RNG integrity with a trusted server join. Client-provided account, roster, damage or replay proof is insufficient.
4. **Database/economy safety:** replay exactly-once attempt reservation, worker fencing, transaction rollback, global HP settlement, War Camp debit, Sigil eligibility, duplicate receipts and concurrent claims using the real staging schemas. SQL files in `docs/roadmap/` are experiments, **not migrations**.
5. **Gameplay balance:** test all nine classes, all three bosses and real player power brackets with representative independent accounts. V29's synthetic fixture suite is not real population validation and specifies no live Sigil payouts.
6. **Server and client integration:** review authenticated routes, permissions, generated Edge bundle parity, feature flags, reliable mobile battle playback/recovery, localizations, accessibility and Android smoke testing on staging.
7. **Release authorization:** keep World Boss feature flags off and do not create production migrations, wallets, jobs, rewards or events until reviewed CI, security and economy gates are explicitly satisfied.

## Supersession notes
- V20/V21 consented Echo prototypes remain historical hidden test code; they do not authorize borrowing other players' loadouts under the approved V22 owned-account raid design.
- Older V14 fairness prototypes have already landed on main; do not re-merge their original branches.
- Existing stacked PRs (#1069 through #1302) remain reference drafts until this integration is validated. Do not merge old stack heads wholesale.
- No changes to Party Events, Player Market, guild PvE, rankings, Frostfall or the 1.0.10 release candidate are intended.

**Next stage:** fix any exact-head CI failures, reconcile the current three-character policy and verify real staging transactions before promotion from draft.
