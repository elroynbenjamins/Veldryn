# Echo Bat Wing retirement — release sequence (review only)

Status: **NOT APPROVED FOR PRODUCTION EXECUTION YET**

This file packages the already-reviewed source, database and verification steps. It does not contain a deployable migration or production command.

## Preconditions

1. Current material-purpose audit still reports exactly one unresolved ordinary-drop candidate: `ECHO_BAT_WING`.
2. Hidden Equipment/Crafting 2.0 manifests contain no direct Echo Bat Wing / ITEM_0077 / Echo Membrane dependency; legacy V25 source-map references are archival-only and not reachable from inspected live gameplay routes.
3. Production environment readiness query returns `retirement_schema_ready=true`.
4. Production preflight returns `blocked_accounts=0` and no relational/guild/overflow/inactive custody.
5. The reusable grant-surface audit returns no current references except the single expected pre-closure admin gift-catalog row.
6. Retirement-specific CI is green, including two-session PG17 compensation, offline saved hunt settlement, source closure and rebuilt Edge bundle parity.
7. Standard release CI must be green or every unrelated failure explicitly identified and resolved outside this change.


## Deployment topology constraint

The repository's manual Supabase deployment workflow applies database migrations **before** deploying the gameplay and co-op Edge Functions whenever `functions_only=false`. Therefore this source-closure PR must not contain the executable stock-retirement migration.

Required production cutover is two-phase:

1. Merge this source-closure/review PR.
2. Wait for `Rebuild shared gameplay Edge bundles` on main to regenerate and commit both canonical Edge bundles.
3. Require bundle parity CI to pass on that exact main head.
4. Manually run `Deploy Supabase (manual)` for **production** with `functions_only=true`.
5. Verify gameplay/co-op deployment succeeded and the deployed function versions advanced.
6. Re-run environment readiness, grant-surface audit and live stock preflight.
7. Only then create/approve a separate executable compensation migration release.
8. Run the migration-enabled deployment; the already-closed functions may be redeployed afterward by the workflow.

The retirement CI now rejects an executable material-retirement migration if one is added to this source-first PR.

## Required release order

### A. Close code issuance first
- The draft branch already removes only `{itemId:'ECHO_BAT_WING',chance:.28,min:1,max:2}` from the Echo Bat drop list; verify that exact change survives merge.
- Do **not** alter Echo Bat availability, ordinary Gold, XP or unrelated drops.
- Rebuild both canonical generated Edge bundles.
- Verify no exact `ECHO_BAT_WING` monster-drop entry exists in mobile/shared runtime or either generated Edge bundle.
- Deploy the gameplay bundle and verify the deployed version before proceeding.

### B. Close administrative issuance
- Run the reviewed gift-closure transaction only after code deployment.
- Block if any unsent campaign or unclaimed inbox gift contains `ECHO_BAT_WING` or `ITEM_0077`.
- Delete only the matching gift-catalogue entries.
- Preserve historical campaigns, inbox history and migration history.

### C. Re-run production preflight
- Recompute affected accounts, quantities and compensation at release time.
- Do not rely on the earlier 850-item snapshot.
- Abort if any unsupported custody path, wallet mismatch, alias, invalid stack or unexpected state reference exists.

### D. Execute atomic stock retirement
For every affected account under the existing account advisory lock:
- remove active inventory and shared-bank Echo Bat Wing stacks;
- credit active-inventory value to carried character Gold;
- credit shared-bank value to Bank Gold;
- use the authored sell value of 80 Gold per item;
- preserve inactive characters, overflow and unrelated resources;
- remove only obsolete lock/favourite references;
- preserve `seenItemIds` history;
- increment state revision;
- write one durable `material_retirement_v1` receipt;
- write one already-credited claimed-history notice with empty attachments.

Any failure aborts the whole transaction.

### E. Postflight
The read-only postflight must report:
- `remaining_quantity=0`
- `open_gift_catalog_rows=0`
- `pending_inbox_rewards=0`
- `claimable_notice_count=0`
- `wallet_mismatches=0`
- receipt count equals notice count
- credited Gold equals the live preflight liability
- `database_reconciliation_ready=true`

Keep the item catalogue identity, localization and icon available for historical save/history rendering unless a later separate compatibility migration proves they can be removed.

## Rollback boundary

Before step D, source/gift closure can be reverted normally. After a successful compensation transaction, do **not** restore the old drop without a new migration because the durable receipt intentionally treats later issuance as an error. Historical compensation must never be reversed by deleting receipts.
