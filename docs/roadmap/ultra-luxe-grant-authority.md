# Ultra Luxe manual grant authority — draft contract
Both sets are complete account collections (background, border, pet, title, badge, icon and name preset). Collection-level grants are the default; no auto-equip and no gameplay benefits. No store, public catalog, client grant endpoint or automatic reward.

The pure shared projection strips the reserved ascendant namespace from saved unlock arrays and restores only the pieces in a trusted collection grant list. It removes revoked equipped selections from every hero while preserving ordinary cosmetic IDs, membership entitlements and gameplay state. The public title verification helper requires canonical title text and the same server grant.

Do not enable this projection with an untrusted client list. Next wire a service-only grant relation to the authoritative load/commit and receipt paths; revalidate grants at commit so concurrent revoke cannot write stale equipment. Public profile and social identity projections must independently filter current grants, including badge and name-style IDs. Keep the ordinary profile privacy/block rules. Verify ownership for badge/name-style selection on the server, and retain the one worn/three featured badge distinction. No deployment or manual grants until the binary import and native QA gates are satisfied.

The SQL design is not a deployed migration. A staging transaction test and generated migration are still required.

The accompanying `ultra-luxe-grant-schema-candidate.sql` prepares a service-only collection relation, idempotent grant/revoke, and an append-only audit record. It has not been executed or migration-tested. The existing profile command now rejects reserved private title text without the matching owned ID; ordinary custom text is unchanged. This is a deliberate reservation of the two exclusive title names, including case/whitespace variants.

## Staging verification — rollback only
The candidate grant schema and service-only versioned gameplay load/receipt/commit adapters were exercised on Veldryn staging, not production. The service role lacks auth.users SELECT; a narrowly scoped private account-existence helper replaced that dependency. Grant/revoke/regrant, duplicate no-ops, audit counts, privilege isolation, ownership projection, roster cleanup, grant-aware load and stale-grant commit rejection passed. Both fixture transactions rolled back; grant tables remain absent.

The gateway supports an explicit server-only ultraLuxeGrantAuthority option (default false); grant-aware RPCs must be installed before enabling it. Missing grant projections fail closed on that route. Receipt replay uses the current grant set, and the commit adapter locks against grant/revoke and rejects changed grants. No live configuration or deployment was changed. Public profile and badge/name-style read/write integration still requires separate work; do not activate any collection before those contracts are verified.
