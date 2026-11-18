# Hidden multiplayer release fences — consolidation QA (18 Nov 2026)

## Why this exists
World Bosses, Party Events, Guild PvE, Rankings and the Player Market now have hidden foundations or developer previews on main. **Merged code is not the same as an approved release.** This tiny, package-free CI job checks the launch boundary whenever relevant routes, flags, migrations, or the preview host are edited. It runs without waiting for the expensive mobile/SQL suites.

## Protected launch boundaries
- Rankings and Player Market remain explicitly off. Market authenticated service readiness remains off.
- World Boss authenticated status route V52 and account-erasure runtime V56 remain unmounted/disabled. The erasure function must throw before work begins.
- Party Event status route V39 remains unmounted. The V11–V30 rollback-only migration drafts must not appear in executable Supabase migrations.
- Guild PvE V14 is nonpaying (`canClaim:false`, `proposedTokenAmount:null`).
- All three immersive feature hubs render only behind the developer-only QA gate and do **not** receive a live World Boss/Party Event provider, account ID or status from the app. A separate reviewed integration is required before data binding.
- Newly authored World Boss SQL drafts stay outside executable migrations.

## How to use
- Run `node tools/validate-hidden-feature-release-fences.mjs` locally.
- Run `node tools/validate-hidden-feature-release-fences.mjs --self-test` to verify that deliberately changing launch flags, connecting a provider, permitting a Guild PvE reward, or promoting draft SQL produces a failure.
- GitHub Actions: **Hidden feature activation fences** runs on pull requests and main pushes touching protected files; it uses Node 22 and needs no package installation.

## Release change control
When a feature truly is ready, **do not bypass the fence**. Make an explicit launch PR which revises its scoped assertion and includes: authenticated/owned endpoints, reviewed database migrations and RLS, transaction/replay/duplicate protection, verified rewards, staging smoke, Android accessibility/restore tests, latest-head CI, old-client compatibility and rollback instructions. A release should never be hidden inside a routine branch consolidation.

## Not a substitute for feature QA
This is a cheap static tripwire, not a proof that all runtime paths are inaccessible. Server-auth, migration tests, authoritative combat/economy, native device QA and signed release validation remain mandatory.
