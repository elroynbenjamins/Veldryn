# Party Events V49 — source-time human co-op attestation (18 November 2026)

**Status: HIDDEN, UNPROMOTED draft in PR #1388.** No staging or production migration, backend worker registration, player feature activation, Event Points, Gold, XP, Renown, Inbox or other reward. This pass addresses the actual previously identified trust gap: late retry after the live dungeon has closed and revoked participant access.

## Verified source pipeline

The existing server-only `public.finalize_online_live_node_server_v1` inserts a canonical `public.coop_node_results` row **inside the same transaction** as the live co-op state finalization and reward entitlement write. The earlier hidden V14 Party Event credit checked `public.coop_run_access_memberships.active` at the later EP-worker execution time. Closing/reconnecting or completing the run may change that boolean. A legitimate human could therefore lose eligible node credit merely because the server worker ran late.

## V49 draft

1. `docs/roadmap/party-events/hidden-migrations/20261118212000_party_event_coop_node_attestation_v49.sql` creates a private append-only **source-time** witness table keyed by canonical `(run_id,node_id,account_id)`. A server trigger on committed `public.coop_node_results` inserts rows only for a successful node in **live co-op**, a unique positive-weighted combat-content route node, and 2–4 currently active **human** run actors. Echoes, missing character/account, offline Q-mode substitutes and inactive access are excluded. Source time, fencing generation, start-state hash and content ID are copied from committed server rows.
2. The source-time witness is not a Party Event roster declaration, reward claim or autonomous EP grant. It remains solely source evidence. The account/character foreign keys cascade on erasure. Client/anon/authenticated roles cannot read or insert the private witness.
3. `docs/roadmap/party-events/hidden-migrations/20261118213000_party_event_v14_coop_attestation_patch_v49.sql` is an **unpromoted** override of the existing V14 private credit function, preserving its week lock, stage opening, 40-EP cap, account/character frozen-roster matching and globally unique source identity. It substitutes the durable human witness and original successful node for the former `access.active` and live run-member lookups. At least two witnessed humans must belong to **this same Party Event's frozen roster**, enrolled before the actual node was committed.
4. V43 trusted worker source-to-week query now uses witness + original successful node. No caller can choose a party or event week, and ambiguous overlapping enrollment still yields no match. V43's deterministic source identity and V14 replay protection are unchanged.
5. `backend/tests/party-event-coop-attestation-v49.mjs` runs the **actual V49 DDL and full patched V14 credit function** in disposable PGlite, with real-world-shaped canonical source fixtures. It tests first and second account credit, duplicate replay, post-node disconnect, late join, Echo exclusion, Q-mode/solo/failed/unknown node rejection, DB role permissions, and account erasure. This test is included in both isolated and full Party Events CI jobs.
6. Updated V43 selection/typing fixtures and the static hidden migration/activation guard; V49 remains outside the executable `backend/supabase/migrations` path.

## Important limitations

- **Do not enable co-op EP delivery yet.** V46/V47 durable outbox and dispatcher currently support only craft and idle; an equally immutable, server-owned and crash-safe co-op actor source queue/dispatcher is not connected. This is a future V50 integration gate, not a reason to post-credit directly from a client.
- The V49 witness exists only for **newly committed** node results *after a future approved V49 staging install*. Do not infer or backfill missing historical human participation from mutable current membership.
- Deleting a canonical source before the first credit can make it ineligible, even when a witness survives; stage a reviewed retention/erasure policy before runtime enablement.
- V14 deliberately requires **active stage 2 at credit time**. If the stage closes before a delayed worker processes a legitimate node, it will reject the first grant rather than credit across stage changes. A future safe stage-specific grace/locked-ledger policy must be explicit and tested. Never silently bypass stage or week locks.
- The attestation trigger is a transaction-local, source-only append and does not change live dungeon combat, odds, drops, currencies or rewards. It is uninstalled and invisible to players.

## Go/no-go

No merge or deploy until exact-head isolated SQL + V49 PGlite + complete backend CI is green, this migration is checked against staging, and multi-member, read/write privilege, erasure and concurrency tests pass. After that, add the authoritative co-op actor outbox and one-time stage claims/Day 8 payout, reconcile with latest main, then stage Android UX and live event balance.

**Production state: unchanged. Feature state: HIDDEN / NOT ENABLED.**
