# Veldryn 1.0.6 — Supabase backend reconciliation (2026-11-04)

This is a deployment ledger, not a migration file. GitHub `main` contains the original SQL sources while the Supabase connector's `apply_migration` wrote new timestamps to the hosted schema history. **Do not blindly run `supabase db push --remote`** until migration history is reconciled with the exact function definitions.

## Projects

| Environment | Project |
| --- | --- |
| Staging | `iqfmmpvwanvvmxcftfxw` |
| Production | `nyjwigipamnvpdvpauuv` |

## Changes applied and verified

| GitHub source migration | Staging recorded migration | Production recorded migration |
| --- | --- | --- |
| `20261104091107_online_qmode_merchant_purchase_v1.sql` | Already recorded as `20261104091107_online_qmode_merchant_purchase_v1` | `20261104154145_online_qmode_merchant_purchase_v106` |
| `20261104100500_online_coop_alchemy_healing_potions.sql` | `20261104154054_online_coop_alchemy_healing_potions_v106` | `20261104154155_online_coop_alchemy_healing_potions_v106` |
| `20261104121600_party_language_preferences_eight_locales.sql` | `20261104154114_party_language_preferences_eight_locales_v106` | `20261104154207_party_language_preferences_eight_locales_v106` |

Files are in `backend/supabase/migrations/`. The migration containing `BEGIN;` / `COMMIT;` was applied without its outer transaction statements, because the connector handles the migration transaction.

### Verified directly in each database

- `purchase_online_qmode_merchant_server_v1(uuid,uuid,bigint,text,text,text,text,jsonb,jsonb)` exists in both environments; only `service_role` has EXECUTE (not `anon` or `authenticated`).
- `consume_online_coop_healing_potion_server_v1(uuid,uuid,text,text)` and `consume_online_coop_preparation_tonic_server_v1(uuid,uuid,text,text,text)` exist in both environments with the same service-only privilege restriction.
- The `parties_language_valid_v1` CHECK constraint permits `any,en,nl,de,fr,es,it,ru,tr` in both environments.
- `guild_skill_catalogue_v1` has 9 released of 9 skills in both environments. No guild release migration was reapplied.
- Tests were catalog/privilege/constraint checks, **not** end-to-end authenticated run, inventory-spend, dungeon-vote or mobile UI integration tests.
- Edge function inventory reports `gameplay` and `coop` ACTIVE in both environments, but the connector could not fetch their deployed source (internal error). Do not assume live route wiring is verified from database checks.

## Follow-up required before migration push

1. Verify `supabase migration list --remote` against `backend/supabase/migrations` in both environments. Supabase CLI v3 defaults to local; explicitly pass `--remote`.
2. For the three GitHub migrations above, verify exact live definition and then reconcile **their original source timestamps** using supported `supabase migration repair --status applied <version> --remote`; this adjusts migration history only. Review newly generated connector versions before repair and do **not** blindly delete their records.
3. Handle older staging/production history divergences individually: production has historical `reconciled_remote_history` filenames and some migrations with different timestamps, and staging has many equivalent migrations recorded at earlier versions. These are not a blanket list of SQL scripts to replay.
4. Validate one Q-mode merchant purchase and one healing/tonic use in staging against disposable QA characters, including retry idempotency, resource consumption, vote/concurrency guards, and service-role-only access. Only then repeat production smoke tests in a safe way.
5. Re-check the active Edge runtime route references before declaring the mobile features end-to-end complete.

This record was added after deploying the three verified gaps identified in the 2026-11-04 Veldryn branch/migration audit.