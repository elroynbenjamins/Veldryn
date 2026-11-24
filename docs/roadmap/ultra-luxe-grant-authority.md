# Ultra Luxe manual grant authority — draft contract
Both sets are complete account collections (background, border, pet, title, badge, icon and name preset). Collection-level grants are the default; no auto-equip and no gameplay benefits. No store, public catalog, client grant endpoint or automatic reward.

The pure shared projection strips the reserved ascendant namespace from saved unlock arrays and restores only the pieces in a trusted collection grant list. It removes revoked equipped selections from every hero while preserving ordinary cosmetic IDs, membership entitlements and gameplay state. The public title verification helper requires canonical title text and the same server grant.

Do not enable this projection with an untrusted client list. Next wire a service-only grant relation to the authoritative load/commit and receipt paths; revalidate grants at commit so concurrent revoke cannot write stale equipment. Public profile and social identity projections must independently filter current grants, including badge and name-style IDs. Keep the ordinary profile privacy/block rules. Verify ownership for badge/name-style selection on the server, and retain the one worn/three featured badge distinction. No deployment or manual grants until the binary import and native QA gates are satisfied.

The SQL design is not a deployed migration. A staging transaction test and generated migration are still required.
