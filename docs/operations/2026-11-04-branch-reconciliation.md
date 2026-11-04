# Veldryn branch reconciliation — 2026-11-04

**Scope:** Read-only inventory, verification and candidate cleanup. This document does not delete refs or represent a blanket merge authorization.

- Current inventory during check: **55 branches** (54 besides `main`).
- `main` includes [PR #848](https://github.com/elroynbenjamins/Veldryn/pull/848) (Russian/Turkish dungeon, Guild/tutorial and equipment metadata translations); all four final PR workflows passed.
- [PR #849](https://github.com/elroynbenjamins/Veldryn/pull/849) was opened and then **closed unmerged as redundant** after exact file SHA comparisons. Its `localization/companion-dynamic-polish-20261104` branch has exactly matching blobs on `main` for `companion-dynamic.ts`, `companions.ts`, and `companions-localization.cjs`. Branch status/docs differ because `main` has newer work; do not force-merge stale gap metadata.
- `localization/companion-objectives-seven-languages-20261104` has matching file blob SHAs on `main` for the substantive `companion-guidance.ts` and `companion-objectives.ts` modules. The combined `companions.ts` and accompanying tests/docs diverged with later integrations on `main`. Candidate to retire only after checking there are no useful unmerged test changes.
- `feat/asterfall-mineral-essence-icon-106`: compare against `main` returned **ahead by 0, behind by 60, changed files 0**. Safe stale ref deletion candidate.
- [PR #850](https://github.com/elroynbenjamins/Veldryn/pull/850) (Social/Live Dungeon RU/TR) is **open, not mergeable at check time, CI queued**. Keep the branch; reconcile conflicts and await green CI.
- Keep the other diverged feature, bug-fix, archive and backup refs until their resulting file contents and unique changes are individually compared to `main`. Do not treat nonzero ahead-by as proof of an unfinished feature after squash/merge.

**No branches were deleted.** The installed GitHub connector supports reading branches and PR operations but does not expose a delete-branch-ref operation. Delete only verified obsolete refs through GitHub's Branches UI after confirming no remaining PRs or unique work.

For migration deployment and Edge rollout instructions, see [the Supabase 1.0.6 reconciliation ledger](2026-11-04-1-0-6-supabase-backend-reconciliation.md).
