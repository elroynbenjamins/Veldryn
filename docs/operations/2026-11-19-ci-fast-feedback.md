# GitHub Actions fast-feedback policy — 19 Nov 2026

## Goals

- Keep mandatory validation for Veldryn release changes and guard the `main` branch.
- Cancel outdated `pull_request` runs when a newer commit supersedes them. Do **not** cancel `push` to `main`, scheduled checks, or manual release validations.
- Save Android runners: PR and `main` pushes trigger native AAB/emulator validation only on release/native-sensitive paths, with an additional **weekly Monday 03:29 UTC** full smoke and `workflow_dispatch` available at any time.
- Fail fast: Android version/dependency/asset preflight runs before provisioning Java and Android SDK 36.
- Keep the general `mobile-core-validation.yml` suite authoritative for all mobile source, backend and test tooling changes. `mobile-ux-validation.yml` retains its dedicated UX contracts and TypeScript checks, without rerunning the entire core suite as a second copy.
- Trigger the historical v1.0.9 PGlite/full-core regression on badge, profile, gear, related dependency and regression-harness changes; leave general mobile regression to Mobile core.
- Run Guild Shop's full backend/mobile checks when guild-specific UI, backend, policies or package sources change, not on unrelated components.

## Safe PR behaviour

Pull requests share a concurrency group by workflow name and PR number; push, scheduled and manual runs use the **unique GitHub run ID**, so even their pending runs are never replaced by this throttle. `cancel-in-progress` is true only for PRs, where newer commits supersede obsolete checks. Older cancelled statuses should not be treated as failures of the newest head commit.

## Required before signing and shipping Android releases

- The source branch's `Mobile core validation`, `Mobile UX validation` and relevant targeted workflows pass on the **final** commit.
- A fresh **Android native validation** AAB and emulator smoke pass on the final release candidate. A change to app version, `app.json`, `eas.json`, package dependencies or a native-impact path automatically triggers this gate; for unusually broad feature changes outside the path set, manually dispatch it at that commit.
- Verify staging sign-in/feature smoke and production migrations/RPC compatibility separately. CI-only AAB output is **not** a signed Play release.
- Never broaden Android path exclusions to skip a required release test, and never treat a cancelled outdated run as a passing current run.

## Operations

If a PR has multiple rapid updates, allow GitHub Actions to cancel the older PR-specific workflows. If a release requires full validation regardless of path matching, use `workflow_dispatch` for Android native and targeted checks, or update the app release metadata on the candidate branch. Keep the final AAB/emulator evidence attached to the release decision.
