# World Boss V63 / V67 — private claim PostgreSQL and Equipment 2.0 custody

**19 November 2026 — HIDDEN DRAFT ONLY / NOT MERGED / NOT DEPLOYED.**
Continues V58–V62 in PR #1407. V63 and V67 are deliberately not mounted.
No migration or gameplay route exists. The existing three event chest sources,
**1% gathering gear chance on each earned chest**, distinct ten-piece sets,
original rarity/quality/affixes and separate V28 World Sigils are unchanged.

## Pass V63 — transaction-bound PostgreSQL integration

`backend/src/server/combat/world-boss-chest-private-pg-v63.ts`
implements the V61 transaction store on **real table/column names from the
review-only V17/V27/V28/V57 designs**. The adapter requires a single pinned
PostgreSQL client throughout one READ COMMITTED transaction. The private
pool driver provides BEGIN, COMMIT/ROLLBACK and guaranteed release. A
separate test-fixture-only opt-in is required even to instantiate it.
No app/user-facing claim route is added.

Lock order follows existing V18/V27/V28 event-first writes:
1. `private.world_boss_events_v17 FOR UPDATE`: freeze boss identity,
   authoritative max/remaining HP and deny draft events
2. `private.world_boss_v57_assert_write_open(account)`: acquire account
   erasure-fence advisory lock and fail closed for deleted accounts
3. account/event advisory lock: serialize two simultaneous chest claims
4. read V27 immutable donation receipts and War Camp tier thresholds,
   and V26 committed attempts LEFT JOIN V28 replay proofs using exact
   replay-digest equality
5. read existing V61 source receipt (and verify all resource/Inbox grant
   component rows plus exact stored item) **before new RNG**
6. use server-owned Account 2.0 tier + owned gathering slots,
   V60 server-secret HMAC roll, V62 exact item request
7. insert durable V67 item, V61 unique source receipt and same-source
   existing resource and Inbox grant effects; commit all or roll back all

All SQL identifiers are fixed, with values bound as parameters. A receipt
is rejected if the stored source component ledger or immutable issued
equipment is missing/corrupt. Frozen JSONB rolls compare canonically by
sorted object keys (array order retained) because PostgreSQL may rewrite
key order.

**Critical limitation:** `WorldBossChestPgPortsV63` is still an explicit
integration port for the game's actual resource and Inbox ledgers, plus
the highest committed account character level. These ports MUST operate on
the same pinned transaction; unreviewed public resource APIs are forbidden.
The V63 adapter does not imply these existing ledgers are already connected.

## Pass V67 — Equipment 2.0 tier and account-bound item custody

`world-boss-tier-policy-v67.ts` derives T1–T9 unlock levels from
`EQUIPMENT_SETS_V33`, the actual Equipment 2.0 item set catalog, instead
of copying or guessing a new level progression. It rejects missing,
non-monotonic or class-divergent tier unlock definitions and invalid
character level. For a valid event account, the highest verified owned
character level determines the **highest unlocked Equipment 2.0 tier**.
This is account-wide, not based on which hero clicked the chest. All
three supported heroes must be verified by the final progress port.

`docs/operations/sql-drafts/20261119_world_boss_gathering_items_v67_review_only.sql`
proposes a durable private `world_boss_gathering_items_v67` table with
unique instance UUID and source, authenticated account/event/boss identity,
ten-slot V33 mapping, tier, six-grade rarity, Q0–100 quality, exact V65
JSONB stat/affix roll and account-bound inventory/equipped custody.
Only the owning account may ever see or equip the item; a future
equip/unequip bridge must separately validate owner character and set
thresholds. Source-key and account-level grants must remain unique even
after switching heroes. SQL denies public/anon/authenticated/service_role
access and has no production write grants.

The original V65 Gathering Speed only stat and affix limits are preserved.
**Tier-adjusted gathering speed and the final server gathering calculation
are not yet operational**; final Equipment 2.0 balance must approve
stat scaling rather than quietly inventing an event-only multiplier.
No item is made tradable by this pass.

## Refinement / polish

- Added pinned PostgreSQL BEGIN/COMMIT/ROLLBACK/release implementation;
  V61 inventory and tier reads are sequential on the same connection.
- Read-back of an already-committed chest verifies the full component
  source set, owner and exact item; never rerolls after secret rotation.
- Fixes stable gear-roll comparison when PostgreSQL JSONB changes key order.
- Isolated V63 fixtures check lock order, trusted tier thresholds, level
  boundaries, three existing proofs, one successful 1% hit, two concurrent
  claim requests, source-key replay, missing item/component rejection,
  failure rollback and recovery, invalid/draft events and no live gating.
- Register V63/V67 in hidden CI and block accidental feature activation.
- **Review-only SQL**, never `backend/supabase/migrations`, until
  security/privacy review and two-connection PG16 race tests are passed.

## Remaining mandatory release work

- Bind real account resources, Inbox and verified level-reading ports to
  one transaction, with actual idempotent economy writes.
- Extend V57 identity-column audit, write fence and V55/V56 erasure cleanup
  for new V61/V67 account records. Confirm external replay and GDPR
  retention/erase requirements.
- Finalize Equipment 2.0 gathering stat scaling, exact tier and equipment
  catalog parity, equipped/custody and ability to use collected set bonuses.
- Run disposable PG16 schema/SQL dry-run and two-client concurrency tests,
  deadlock/fence/deletion races, crash/commit-ACK recovery, privilege probes,
  staging parity, exact-head CI, Android access/claim/receipt/accessibility
  and economy sign-off. No rehearsal raid per product direction.
- The World Boss feature flag, chest claims and new gear issuance remain
  disabled. Do **not** merge these changes into an enabled main build.

**Current verification:** static source/contract checks and tests added;
exact-head GitHub Actions presently queued; no PostgreSQL transaction,
Supabase staging, device or production test has been reported passing.
