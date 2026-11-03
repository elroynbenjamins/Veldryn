# Veldryn production/staging migration and branch consolidation check — 2026-11-03

Scope: GitHub `main`, staging `iqfmmpvwanvvmxcftfxw`, production `nyjwigipamnvpdvpauuv`. This is a read-only migration-state audit; it does not mark absent migrations as applied.

## Migration inventory

- GitHub main: **338** source-controlled `.sql` migration files with unique 14-digit versions.
- Staging: **274** recorded migration versions. This environment has long-standing historical/version drift relative to production, including earlier standalone deployments.
- Production: **333** recorded migration versions.
- Latest named main migration `20261104000630_party_social_preferences_v1` is **already recorded on both environments**.
- There are **seven** repository migration versions not literally recorded in production; **none was safely eligible to replay as a new production change**:

| GitHub file/version | Why not replay |
| --- | --- |
| `20261103123457_pin_staging_legacy_helpers_search_paths_v1` | Staging-only remediation; source comment says production search paths already verified. |
| `20261103124211_restrict_staging_legacy_anon_definers_v1` | Explicitly staging-only; production already denies anonymous execution on the audited functions. |
| `20261104000014_echo_sharing_seven_days` | Same effective functionality already deployed and recorded under per-environment `20261030213039` (staging) / `20261030213402` (production). Verified live publish and eligible-echo functions use seven-day intervals. |
| `20261104000019_release_notes_1_0_3` | Historical notes; production already holds the published 1.0.3 record, and 1.0.4 is current. |
| `20261104000020_release_notes_1_0_3_refresh` | Historical scheduling refresh; reapplying would re-time old notes. |
| `20261104000021_android_1_0_3_required` | Obsolete policy; production minimum and latest are **1.0.4**. Do not downgrade. |
| `20261104000033_guild_skill_verified_release_and_purchase_contract` | Equivalent live migration recorded as `20261103031411` in production and `20261103031333` in staging. Verified five released Guild Skills and four intentionally gated. |

Current live checks:
- Production: Android latest/minimum 1.0.4, maintenance disabled; 1.0.3 and 1.0.4 notes published; five guild skills released/four held; both Echo functions enforce seven days.
- Staging: Android latest/minimum 0.1.0 (test policy), maintenance disabled; guild release five/four and both Echo seven-day checks pass.
- Do not use migration-name mismatch alone to decide an operation is absent. For future schema changes, add an additive versioned migration with explicit environment preconditions and deploy on staging first.
- No outdated release SQL, staged-only security changes, or duplicate function replacements were replayed in production.

## GitHub branch reconciliation

- **Zero open PRs** at audit time.
- 29 non-`main` refs remained following an earlier cleanup which deleted most exact-head merged PRs but was interrupted by one transient GitHub API error.
- Merged PRs already include: journal skills (#769), account-wide collections and combat balance (#768), guild feature gates (#791/#793), companion ascension (#790/#794), party/recruitment (#741/#796/#797), economy (#795), and other 1.0.5 refinements.
- Several old PRs were **closed unmerged and superseded** (e.g. #754/#757 by #768; #764 by #769; #707 by #763; #747 by #762); do **not** merge stale branch snapshots over main.
- Explicitly closed/dismissed work such as #709 and historical release policy branches should remain untouched without new review.
- `backup/` and `release/` refs are retained by policy. Never discard a unique or moving branch tip.
- The GitHub Actions workflow `one-time-merged-branch-cleanup.yml` verifies exact PR head SHA, merge commit ancestry, branch protection and current tip before deleting a merged ref. Its rerun includes bounded retries for transient server errors.

Release safety: the **staging-only** Gold-economy gameplay bundle must not be deployed to production until the matching Android client is available and required.
