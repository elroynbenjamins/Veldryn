# Veldryn 1.0.11 — combined release-readiness log

**Candidate PR:** #1508; **target:** main; **not released**.
**Feature scope:** Dungeon Endurance, Dungeon weekly quests and eligible Friend/Guild Echoes, cumulative gathering tools, class-neutral T1–T9 forged weapon/nonweapon bonuses, and accepted mainline fixes / UI polish.

## Verified source preparation
- [x] Up-to-date merged mainline ancestry from the smaller 1.0.11 candidate without a force push.
- [x] Expo, package, Android versionName = 1.0.11; no arbitrary Play versionCode increase.
- [x] New weapon rolls v7, nonweapon rolls v6, with old versioned receipts still recognized; no new 2.0-only stat channels.
- [x] Gameplay and Co-op Edge bundles re-generated and committed by guarded candidate-only CI at `e3b40c58a63948014c5d0069f4de700b8cd20546`.
- [x] Four Dungeon migrations recorded in staging, absent from production. Staging weekly-claim RLS, protected service-role RPCs, and both relevant triggers were inspected read-only.
- [x] Unique forged equipment validation passed on pre-generated-source commit `5614a83e7b6df73eb422c5c1818b15bc70e59f87`.
- [x] Correct async loading feedback on Gear Storage → Bank/Inventory actions after identifying older mobile-core test failure.

## Mandatory release gates (NOT YET cleared)
- [ ] Latest exact-head CI after generated Edge files: mobile core, UX, localization, dungeon simulation, economy, hidden release fences, actual full server/Edge bundle parity and Android native build.
- [ ] Staging authenticated end-to-end, concurrent weekly claim/idempotency, social Echo privacy/role eligibility, dungeon disconnect/rejoin, frozen combat snapshot roll parity and real equipment Forge grants.
- [ ] Economy and balance approval: early T1/T2 bonuses, nine-slot bonus stacking, cumulative tool speed, deep Endurance rewards and boss damage.
- [ ] Review *actual visuals* of new Forge bonus-pool, comparison screens and all supported themes before UI/design merge to main.
- [ ] Signed staging EAS build installed over a genuine 1.0.10 save, narrow Android viewport/TalkBack/locale tests, remote EAS versionCode above last accepted Play version.
- [ ] Production-safe migration, canonical Edge deployment order and clear GO/NO-GO plus rollback before publication.

## Hard exclusions
No full Equipment/Combat/Classes/Enemies 2.0 rollout, World Boss, Party Events, Market, Guild PvE, unlicensed sample-based music, or account-deletion activation. No production database changes, Edge deployments, release-policy minimum increases, Play uploads or publication performed by source reconciliation.
