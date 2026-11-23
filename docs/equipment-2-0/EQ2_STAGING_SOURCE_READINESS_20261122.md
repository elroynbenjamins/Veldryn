# Equipment/Crafting 2.0 — staging readiness inspection (read-only)

**2026-11-22 · Veldryn Staging · PostgreSQL 17.6 · NO DATABASE WRITES**

## Observed staging database evidence
Read-only `information_schema` inspection located existing v1-era server tables:
`public.equipment_v26_processing_definitions`, `public.equipment_resource_bindings`,
`public.craft_receipts`, `public.crafting_jobs` and `public.equipment_v24_item_instances`.

A read-only COUNT check on the same staging database reported:

| Read-only count | Observed |
| --- | ---: |
| `equipment_v26_processing_definitions` records (all) | 0 |
| Equipment 2.0-prefixed processed definitions | 0 |
| `equipment_resource_bindings` records (all) | 0 |
| Equipment 2.0-prefixed resource bindings | 0 |
| Equipment 2.0-prefixed craft receipts | 0 |
| Equipment 2.0-prefixed crafting jobs | 0 |
| `EQ2_LAUNCH_%` item instances | 0 |

This confirms those *queried surfaces* hold no currently configured or minted draft Equipment 2.0 data in staging, **not** that every possible equipment/item table is empty or that production behaves identically. No personal/player row contents were read. No migrations, crafting actions, new items, drops, Edge deploys, flags or SQL writes were executed.

## What that means for testing
The 746-route v3 and 204-template authoring draft can currently be exercised through isolated source/CI validation, but **cannot have authenticated real 2.0 crafting or drop-rate outcomes measured on staging**. Even a successful static recipe test is not evidence of effective monster chance, loot receipts, inventory/bank custody, queue jobs, market trade, crafting Gold/XPs, or new item minting. Staging lacks the validated 2.0 source, mapping and transaction fixtures required for that test.

## Controlled staging validation prerequisites, in order
1. Finalize and approve the 130 draft templates and 74 old-source compatibility decisions; preserve protected set membership; material IDs, source proofs and approved rare/drop normalization.
2. Resolve T3 Sunscar Hide animal-source decision, T4 Dust gatherable supply, T3 Sunstone 1-route policy and XP economy; preserve no combat requirement for crafting.
3. Construct isolated, reviewed, reversible migration/API changes behind disabled production flags, including real item and processing definitions and source-owned material grants.
4. In staging only, verify player-authorized inventory/bank/market/commissions and per-character character/skill ownership; validate one Smithing and one Tailoring route in each tier using actual tracked resources.
5. In staging only, test concurrent two-session reservation, crafting cancellation/refund, replay/idempotency, authenticated grant receipts, material source legality, raw-to-refined XP parity, tier-entry sourcing and actual eligible-kill drop aggregates by source.
6. Only then tune final rates against observed activity and get owner UI/theme/art review before considering a 2.0 release.

**Release decision: HOLD.** The source-only workflows passing on their exact commit does not supersede missing staging source/receipt implementations. The stacked review branch's broader mobile-core checks currently fail on Expo SDK 58.0.25 vs expected 58.0.26 and legacy full-suite failures; keep those separate from narrow equipment review green checks.
