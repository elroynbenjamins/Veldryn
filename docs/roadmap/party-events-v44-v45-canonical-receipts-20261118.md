# Party Events V44–V45 — canonical source receipts (18 Nov 2026)

**State:** PRIVATE DRAFT in PR #1388, based on Party Events V42 merged main. Nothing mounted in the mobile app, production gameplay, Supabase staging or production. No event progress, Gold, inventory item, EP or Day 8 payout was granted.

## Live evidence gap

Read-only source inventory on **18 Nov 2026**:

| Source | Production rows | Staging rows |
|---|---:|---:|
| public.craft_receipts | 0 | 0 |
| public.idle_claim_receipts | 0 | 0 |
| public.coop_node_results | 1,202 | 0 |

Production and staging already have the canonical receipt tables, but the existing `public.commit_online_game_guild_pve_v1` uses `commit_online_game_server_v1/v2` and does not write craft/idle receipts. Hence V43 cannot award EP from real crafting/gathering until a trusted command-commit producer is integrated. Zero rows in these receipt tables do **not** mean zero actual player crafting or gathering.

## V44: verified packet built by the game server

`backend/online/party-event-canonical-source-packet-v44.ts` is a hidden pure function that accepts only the **server's** `executeGameCommand` result and trusted account/character/request/clock. It produces no DB writes:

- One crafting receipt plan per server-confirmed craft, with the original contribution index in the deterministic idempotency key.
- A single idle gather receipt plan only when a **non-queued**, fully settled gather interval has reliable elapsed seconds, base material quantity and XP. Main material is derived from the current gather-node catalogue, not player input. No rare byproduct substitution.
- Starter Stage 1 sources: GREENWOOD_TREE, GREENFIELDS_COPPER_OUTCROP, DEWLEAF_PATCH. All must remain real Greenfields Level 1 nodes with canonical material IDs.
- QA commands, missing/foreign character, malformed/fractional craft quantities, mismatched material, sub-60-second intervals and queued multi-activity windows do not generate reward-capable evidence.
- Output flags force `writesAuthorized:false`, `eventPointsGranted:0` and `rewardsGranted:false`.

The previously hidden V13 scouting migration was corrected to recognize the approved current Greenfields copper/herbalism sources while retaining its existing nine legacy mining/wood/fishing sources. This **remains under docs/roadmap**, not the executable migration path. The focused V11–V13 original SQL suite and three-source allowlist check passed on live staging inside an outer transaction with ROLLBACK (zero objects persisted).

## V45: transaction-atomic private draft writer

`docs/roadmap/party-events/hidden-migrations/20261118143000_party_event_canonical_source_writer_v45.sql` defines an **unpromoted** private server-only function:

1. Validate a V44 packet's owner, character and request ID against the server's committed result, disallow deleted-character transitions and ensure all writes/EP/reward permission flags are false.
2. Match the exact ordered crafting packet to the existing authoritative `p_contributions` argument, including original contribution indexes and quantities.
3. Match the one beginner idle gather packet against the server's reward item quantity, XP, duration and corresponding gathering contribution; reject queued activity reward bundles.
4. Acquire the same account-scoped advisory transaction lock as the current online commit, check for a committed idempotency receipt, then call the unchanged `public.commit_online_game_guild_pve_v1` **in that same PostgreSQL transaction**.
5. On a new committed command, append canonical rows to `public.craft_receipts`/`public.idle_claim_receipts`. If an evidence insert fails, the entire underlying game command transaction rolls back. On exact replay, no new evidence rows are inserted.
6. Return the ordinary game result. The function grants **no** Party Event EP, objective, loot, Gold, XP or Renown itself.

The function is restricted to service_role only, with `SECURITY DEFINER SET search_path=''` and no public/anon/authenticated EXECUTE. SQL **parsed and compiled successfully in a rolled-back live staging transaction**, with no persistent staging function. A disposable PGlite failure-injection test is included in CI but must complete before any promotion. No network route, feature flag or client RPC is mounted.

## Critical remaining launch work

- Review exact-head CI (V43 worker and PGlite selection, V44 packet alignment, V45 PGlite rollback) and reconcile main if newer code changes touch these contracts.
- After independent approval, install the hidden Party Events schema **only on staging**, wire a trusted server-only V45 commit path behind an explicit backend gate (never from client), and run real end-to-end action/receipt/EP replay scenarios. Preserve normal online commit if the feature is disabled.
- Verify multi-segment queued gathering timestamp provenance rather than minting receipt time from the final claim clock. Until then, the first release may earn normal EP only from eligible **non-queued** gather claims.
- Wire V43 to the confirmed newly committed canonical receipt IDs via a durable server-owned outbox/retry job, not a mobile action or client-supplied claim.
- Wire one-time V12/V13 objective receipts with a server-owned V10 locked-stage checksum, V15 special EP, V16 supplies, V17 ballots and stage transitions.
- Deliver an actual account-locked Day 8 settlement with exactly-once Gold/XP/items, canonical Party Renown destination and paired receipt/Inbox, with cross-worker fault injection, erasure and rollback tests.
- Finish Android/mobile UX, i18n, 2–4 flexible-role composition and nine-class/difficulty balance, performance and controlled pilot rollout.

**No persistent DB state, player currency or production gameplay was modified in this pass.**
