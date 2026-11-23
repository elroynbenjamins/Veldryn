# Equipment 2.0 Dungeon Gear — V6 Original Boss-Mint and Market Source Preflight

**23 November 2026 — HIDDEN, UNMOUNTED development.** This pass does not create equipment, change dungeon reward rates, alter charges or Marks, migrate PostgreSQL, modify the Market, affect a player or introduce a UI. DO NOT deploy, merge to main or activate before the coordinated 2.0 approval.

## Verified: what the live database actually records

Production and staging on PostgreSQL 17.6 expose `public.expedition_runs`, `public.coop_reward_entitlements` and `public.coop_node_results` with the join keys and fields documented in `dungeon-boss-original-mint-preflight-review-v6.json`.

- `claim_coop_reward(uuid,text)` is an actual privileged `SECURITY DEFINER` routine for Expedition Marks and reward charges; it persists `enhanced_reward` inside `coop_reward_entitlements.reward_json` and marks `claimed_at`. It **does not mint Equipment 2.0**.
- `expedition_runs.route_graph_json` contains `runId`, `expeditionId`, `bossNodeId` and `nodes[]`; boss nodes have real `nodeId`, `kind='boss'`, and canonical `contentId`. In a 120-run sample, every route's boss nodes shared one content ID (some legacy short routes have one, newer Endurance drafts have six boss nodes). Never assume `bossNodeId` is the victorious checkpoint; match the actual successful result's `node_id` to one of the frozen boss nodes.
- `coop_node_results` stores one row per `(run_id,node_id)` with a successful combat result `result_json.kind='combat'`, `reason='victory'`, nonempty `eventDigest` and committed timestamp. A completed dungeon run must have exactly one victorious boss node before the enhancement reward claim to qualify for the candidate source policy.
- Existing DB uniqueness: `coop_reward_entitlements` enforces `(run_id,recipient_account_id,entitlement_kind,reward_stage)` and `coop_node_results` enforces `(run_id,node_id)`. A NEW future UNIQUE `(entitlement_id)` original premium roll ledger is still essential and must not split by policy version, because a retry/roll-rate change must never reroll the same entitlement.
- The source-authored 50/50 boss identity is defined by `backend/src/server/expeditions/content/dungeon-boss-rotation.ts`: EXP_001 `BOSS_EXP_ROOT`/`BOSS_EXP_BELL`, EXP_003 `BOSS_EXP_SOLAR`/`BOSS_EXP_SPHINX`, EXP_005 `BOSS_EXP_BELLBEAST`/`BOSS_EXP_CANTOR`, EXP_007 `BOSS_EXP_FEN`/`BOSS_EXP_PRIME`. Do not trust display names as loot origins. EXP_005/007 remain unpublished and EXP_002/004/006/008 retired.

## Production read-only measurements

Time window UTC 26 October through start 24 November 2026. We counted only successfully claimed final participant entitlements from completed runs; then independently joined each run's graph to its committed successful boss result. All **317** completed final claimed results in the two existing surviving regions had exactly one confirmed boss victory.

| Dungeon | Successful final claimed | Enhanced = true, with matched boss | Standard = false, with matched boss | Enhanced distinct claimants |
| --- | ---: | ---: | ---: | ---: |
| Rootbound Vault (EXP_001) | 313 | **49** | 264 | 7 |
| Buried Observatory (EXP_003) | 4 | **2** | 2 | 1 |

The current Marks claim function allows many low-reward (non-enhanced) completions after charges are exhausted. To keep boss-only Market equipment rare and prevent 231-completion single-account concentration from dominating supply, **V6 proposes premium gear only on successful enhanced final boss rewards**. This is a **candidate design choice**, not an approved or enabled live drop rule.

| Hypothetical total drop chance *given enhanced boss clear* | Expected Rootbound premium pieces at 49 claims | Expected Observatory pieces at 2 claims |
| --- | ---: | ---: |
| 8% | 3.92 | 0.16 |
| 10% | 4.90 | 0.20 |
| 12% | 5.88 | 0.24 |
| 16% | 7.84 | 0.32 |
| 20% | 9.80 | 0.40 |

Individual named loot pieces remain much rarer because of frozen boss 50/50 and per-category pool selection. The old 8% scenario from V5 is **not an approved rate**. Even 20% total enhanced drop could leave Sunscar's Market nearly empty at the measured activity level. Full-set completion time and market demand must therefore be modeled using later real enhanced-clears and actual population.

## Technical work committed

**1. Unmounted source preflight:** `backend/online/eq2-dungeon-boss-source-preflight-v6.mjs` uses exact actual DB property names to validate status, completion phase and time, human participant final claimed enhanced reward, route identity, one frozen boss content variant, exactly one victorious boss node and timestamped combat digest. It refuses published/retired wrong-source claims. It always reports `mintAuthorized:false`, `marketAuthorized:false`, `releaseEnabled:false`, even when `eligibleInReview:true`. Client-supplied snapshots cannot become authority.

**2. Original boss Market check:** same module inspects generation identity, exact original boss/entitlement/instance and current inventory custody shape. It ALWAYS refuses authorization, even if the shape looks valid, because old Market V30 is only a negative legacy fence; actual database-trusted original EQ2 mint and positive Market escrow/settlement/cancel/resale adapter is still absent.

**3. PostgreSQL diagnostic:** `docs/equipment-2-0/dungeon-boss-v6-readonly-source-proof.sql` is a real parseable read-only `SELECT` over production-backed columns and the four currently published boss IDs. Source targets intentionally `NULL::uuid` until used as a privileged diagnostic. Production PostgreSQL `EXPLAIN (FORMAT JSON)` parsed successfully, and four read-only targeted aggregate tests returned: Rootbound enhanced **1**, Rootbound standard **0**, Observatory enhanced **1**, Observatory standard **0**. These are source proof checks with **no issuance**.

**4. Regression:** `tools/test-eq2-dungeon-boss-source-preflight-v6.mjs` exercises the eight source-authored boss IDs, allows only the four published ones for review, rejects retired/future, 26 attack variants (status, claim, routing, duplicate boss victories, missing digest, replay timing) and 12 Market forgery/stale-custody examples. It never connects to production. The existing isolated no-deploy workflow now runs V3/V4/V5 + V6.

## Required next integration (not completed)

1. Prepare a new *private, versioned* premium decision ledger with UNIQUE `(entitlement_id)` and privileged minted-physical-copy association. No new public DB RPC or GRANT. Must use the **same transactional decision** for a failed roll, a successful roll, and retry. Policy version metadata must never enable second rolls.
2. Within **one PostgreSQL transaction**, verify claimed enhanced final entitlement, frozen boss and one authenticated victorious node, selected exact item ID in correct boss's pool, account/character custody and charge ledger; commit one outcome and (on hit only) the genuine Equipment 2.0 physical instance. Do not award a second chance at every Endurance boss checkpoint or on client reconnect.
3. Before entering the Market, persist and verify immutable generation-2 mint source, original dungeon/boss/content node, entitlement and item-instance ID. Enforce ownership and state locks for listing, purchase, claimed delivery, cancellation, expiry, resale and subsequent resales. Never route new gear through V33 equipment receipt tables or weaken PR #1651's legacy blocker.
4. Reconcile the old Market V17 T4 level-52 acquisition requirement with new EQ2 Sunscar T4 wearable-level-42 proposal; T5+ has no old Market support. This is unresolved, not silently adjusted.
5. Obtain owner approval for drop eligibility, actual numerical rates, premium stats, all Style 4 icons and screen themes. Then implement full legitimate 2.0 issuance, staged PostgreSQL 17 concurrency and rollback tests, Skills/Combat/Enemies integrations and coordinated release approval.

**Files / status:** [v6 machine-readable source and blockers](./dungeon-boss-original-mint-preflight-review-v6.json); [SQL read-only verification](./dungeon-boss-v6-readonly-source-proof.sql). The item set/weapon catalogue remains in [V4 regional gear](./regional-dungeon-boss-tradeable-premium-gear-review-v4.json) and [V5 pools](./regional-dungeon-boss-loot-and-market-review-v5.json).
