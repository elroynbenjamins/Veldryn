# Final request-efficiency review — 27 November 2026

Integration of #1840, #1930, #1931, #1933 on main 9baba4e2. Retain the current main package/lockfiles: Expo compatibility versions already match the older roster branch (Expo 58.1.0, crypto 58.0.9, splash 58.0.15). No 2.0 activation, production deployment, or release publication.

## Actual rollback-only staging checks

- Online count: installed candidate only inside one transaction, added three recent presence rows and reciprocal-direction block fixtures, switched to authenticated role, verified count=1 matches existing roster, confirmed authenticated execute grant and anonymous denial, rolled back. Follow-up confirmed function absent and 0 residual presence/block rows.
- Reward inbox: installed replacement only inside one transaction, inserted two completed party instances and four entitlements covering duplicate claimed/pending scopes. Repeated actual sync twice: exactly two inbox scopes, claimed timestamp and 50-gold attachment preserved, pending 10-gold attachment preserved, private sync not executable by anonymous/authenticated roles. Rolled back; 0 residual parties, entitlements, or inbox rows. Claim execution itself was not tested in this pass.
- Guild shop: installed candidate only inside one transaction, created temporary guild and membership, verified all eight batch values against their existing functions under service_role, denied nonmember and confirmed service-only execute ACL. Rolled back; new function absent and 0 residual guilds/memberships.
- Production remains unchanged. Existing staging project was used for temporary test transactions only; no new project, persistent staging writes or deploy.

## Release gate

Canonical generated bundles must be regenerated from this exact integration; exact-head CI must pass. Promote only verified SQL using the pinned Supabase CLI and review migration ordering and deployed schema before release. DB first for count and guild batch; default-off guild gate must stay off until verification and deployment. Maintain existing release enforcement (no stale completed-result cache). Measure end-to-end effects after release; query timing was a single warm production sample, not a broad performance result.
