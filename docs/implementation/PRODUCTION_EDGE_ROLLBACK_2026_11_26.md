# Production Edge rollback capture — 2026-11-26

Current observed production versions: gameplay 74 and coop 42, both ACTIVE, existing verify_jwt=false (application-level authentication remains required). The Supabase connector could list metadata but failed to retrieve both deployed source files. Never equate a repository candidate with the actual rollback source without verifying provenance.

## Before deployment
- **Repository visibility:** Veldryn is public at the time of review. Do not upload deployed production source as a GitHub Actions artifact in this repository. The workflow rejects public repositories before accessing production. The practical current route is local dashboard/CLI download and secure private storage; a private repository is another option only if separately authorized.
- In an authorized private repository with the protected environment configured, run the separate **Capture production Edge rollback source (manual)** workflow from an approved ref. It performs no deployments, migrations, or player writes.
- Verify both downloaded source trees are complete, inspect their entrypoints/dependencies, and retain the private artifact, metadata and SHA256SUMS. The CLI may expose different metadata/paths or fail to download; fail closed rather than deploy anyway. If the CLI fails, download both from the Supabase dashboard and record versions and hashes manually.
- Confirm staging compatibility with dedicated test accounts, current exact-main canonical bundles and CI, and the existing authentication configuration. Do not use production player accounts for synthetic tests.
- The existing manual deploy workflow remains unchanged. Select functions-only; migration histories diverge and verified Forge/Endurance corrections already exist live. Do not bulk push migrations.
- Before production approval, recheck active versions against the rollback artifact, retain both functions together, and coordinate the deploy order and monitoring. If either deployment or smoke check fails, stop promotion and restore both previously verified sources and configuration as needed. A redeploy creates new version numbers; verify functionality, not old version numbers.
- Verify read-only operational latency/error rates, real-client Android smoke, and existing-client compatibility before publishing the next AAB.

No backup has been captured merely by adding this workflow. The capture must succeed and be reviewed before any live deploy.
