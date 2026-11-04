# Veldryn 1.0.6 — Supabase backend reconciliation (2026-11-04)

This is the verified deployment and migration-history reconciliation ledger. The specific 1.0.6 migrations below are now aligned to their original GitHub timestamps in both hosted environments. **Do not run a blanket database push**: older migration-history divergences remain.

## Projects

| Environment | Project |
| --- | --- |
| Staging | `iqfmmpvwanvvmxcftfxw` |
| Production | `nyjwigipamnvpdvpauuv` |

## Changes applied and verified

| GitHub source migration | Staging canonical history | Production canonical history |
| --- | --- | --- |
| `20261104091107_online_qmode_merchant_purchase_v1.sql` | `20261104091107` | `20261104091107` |
| `20261104100500_online_coop_alchemy_healing_potions.sql` | `20261104100500` | `20261104100500` |
| `20261104121600_party_language_preferences_eight_locales.sql` | `20261104121600` | `20261104121600` |

Files are in `backend/supabase/migrations/`. The migration containing `BEGIN;` / `COMMIT;` was applied without its outer transaction statements, because the connector handles the migration transaction.

### Verified directly in each database

- `purchase_online_qmode_merchant_server_v1(uuid,uuid,bigint,text,text,text,text,jsonb,jsonb)` exists in both environments; only `service_role` has EXECUTE (not `anon` or `authenticated`).
- `consume_online_coop_healing_potion_server_v1(uuid,uuid,text,text)` and `consume_online_coop_preparation_tonic_server_v1(uuid,uuid,text,text,text)` exist in both environments with the same service-only privilege restriction.
- The `parties_language_valid_v1` CHECK constraint permits `any,en,nl,de,fr,es,it,ru,tr` in both environments.
- `guild_skill_catalogue_v1` has 9 released of 9 skills in both environments. No guild release migration was reapplied.
- Tests were catalog/privilege/constraint checks, **not** end-to-end authenticated run, inventory-spend, dungeon-vote or mobile UI integration tests.
- Edge function inventory reports `gameplay` and `coop` ACTIVE in both environments, but the connector could not fetch their deployed source (internal error). Do not assume live route wiring is verified from database checks.

## Migration-history repair completed

On 2026-11-04, guarded, atomic **history-only** corrections were made in `supabase_migrations.schema_migrations`; they did not rerun SQL migrations or update gameplay/player tables. Each change was preconditioned on exact verified `pg_get_functiondef` MD5 values, specific source/target history versions, and original recorded migration names. The original history rows retained their SQL statements, creator and metadata while only the version/name were corrected.

| Environment | Old recorded version | Canonical version |
| --- | --- | --- |
| Staging | `20261104154054` | `20261104100500` |
| Staging | `20261104154114` | `20261104121600` |
| Production | `20261104154145` | `20261104091107` |
| Production | `20261104154155` | `20261104100500` |
| Production | `20261104154207` | `20261104121600` |

The Supabase `list_migrations` readback confirms all three canonical versions are present in **both environments** and none of the five temporary aliases remain.

This does **not** resolve all history differences: on this readback GitHub `main` contains 342 migration files; **staging has 89 locally listed versions absent from its history and 27 remote-only versions**; **production has 8 and 2**, respectively. Many are historical migrations with different timestamps, staging-specific files or reconciled remote-history placeholders. Do not treat those numbers as executable pending migrations.

## Remaining release and migration checks

1. Compare `supabase migration list --linked` against the GitHub migration directory for **each linked environment separately**. Supabase CLI supports `--linked` (not a blanket `--remote` flag). For future discrepancies, use the documented `supabase migration repair --status applied|reverted --linked` process only after confirming the actual schema/state.
2. Review older divergent timestamps individually; do not apply all currently missing files to staging or production, and do not erase historical records by name matching alone.
3. Validate one merchant purchase and one healing/tonic use against disposable staging QA characters, including retry idempotency, resource consumption, vote/concurrency guards and no cross-account spending. Non-mutating invalid-input calls already passed in both environments.
4. Verify the deployed Edge runtime routes before declaring end-to-end gameplay functional. Both `gameplay` and `coop` were ACTIVE, but Edge source retrieval failed in the connector.
5. GitHub localization PR #848 merged to `main` after all its PR CI checks passed; PR #849 was closed as redundant because the dynamic Companion localization code/tests already exist on `main`. Existing branch refs have not been deleted. Latest main workflow checks may still be pending.

This record was updated after verifying the three production fixes and their canonical migration-history readbacks.