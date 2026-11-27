# Veldryn 2.0 Guild Expeditions V18 — engine-linked settlement and nonpaying reward proof

**November 22, 2026. Hidden 2.0 draft, stacked after V15 and V16/V17. NOT merged to main.** No production/staging migration, no new API/Edge route, no flags, no player data, no wallet/currency/XP/cosmetic grants, no inventory spend, no public GUI. The weekly Guild Hunt remains untouched.

## What was developed

- `guild-pve-settlement-v18.ts`: A **pure domain-level atomic port** operates on the V9 shared run with frozen account quotas, verified current character source, server-owned guild identity, seeded V17 real-engine fight, shared node HP, ordered guardian thresholds, shared Pressure, finite boon charges and an immutable nonce receipt in **one candidate transaction**. Both stale target and same-key replay are safe no-debit paths. Cross-guild cycle-account binding is enforced and 4+4 Assault Seals remain account-wide.
- `guild-pve-reward-review-v18.ts`: Reviews committed V18 evidence for **no reward / partial review / full review**, independent of character DPS role and last hit. Healing/shielding/cleansing contribution is bounded per action; no actual payout numbers. Deliberately returns `canClaim=false`, `rewardGranted=false`, `tokenAmount=null`, `guildXpAmount=null`, `cosmeticId=null`. It is NOT an entitlement, wallet quote or secure outbox.
- Tests: Synthetic characters from current game fixtures; exact nonce replay after campaign close, changed nonce-content rejection, one charged/one free stale race, injected rollback after engine calculation, cross-guild binding, four first-week/eight cumulative Seals, and finite charge observed-use accounting.

**Truthful limitation:** `InMemoryGuildPveV18Port` is **process-local and volatile**. The trusted actor/membership loader is a server-only *interface* mocked by tests. It does not authenticate a network request; its simulated single-process atomicity is not durable PostgreSQL. The V11 PG17 QA function still takes synthetic damage/account/time parameters and must NEVER become a production RPC.

## Required authoritative PostgreSQL migration design (future; not executed)

Plan private normalized storage separate from live `public.guild_pve_*` Weekly Hunt:
- `guild_runs`: immutable (cycle,guild,version,difficulty,reference,frozen_roster,period), mutable revision/Pressure, frozen mechanic catalogue ID.
- `guild_nodes`: node HP, phase, cleared state and phase thresholds, immutable node manifest.
- `cycle_account_bindings`: unique (cycle,account) to exactly one guild, even after guild switching or alt character changes.
- `account_budgets`: sealed 4+4 Seals and 3+3 Orders per global account/cycle, independent of selected character.
- `shared_charges`: per guild/cycle and boon ID with finite available/spent counts, frozen grant source and version; no client raw balances.
- `action_receipts`: immutable unique (cycle,account,nonce), canonical request digest, saved engine/GameState source hash + revision and full before/after stats.
- `reward_eligibility`: frozen closure snapshot and nonpaying candidate proof source; **not** automatic wallet/currency entitlements.
- `grant_outbox`: separate **future** exactly-once grant writer, source-constrained and unique account+cycle+reward-family. Zero rows/grants until reviewed economy and secure settlement.

Server-side flow: verified session → global (cycle,account) transaction lock → run row lock → read fresh membership, owned `online_game_states` state/revision and frozen roster in same transaction → lookup nonce first → validate active period/node/quota/charges → deterministic V17 combat from verified immutable loadout → debit Seal and only actual consumed shared charge → update HP, Pressure and phase → save immutable receipt → commit → only then return result. After commit acknowledgment loss, retry returns receipt. Use bounded `40001`/`40P01` retries for complete transactions. Stale targets cost nothing; never debit speculative user inventory.

Security: private non-exposed schema; RLS defense in depth; no direct `anon`/`authenticated` GRANT; `service_role` server-only after ownership and authorization checks; do not use editable `user_metadata` JWT for authority. No PUBLIC-executable privileged functions. Review policy against current Supabase API docs and verify on disposable PG17 before any actual migration.

## Still required for production

1. Implement a real PostgreSQL port that satisfies **one atomic database snapshot**, including current GameState revisions and global guild binding, not a TypeScript mutex.
2. Reconcile V17 phase-local effects with a real cross-phase attack interpreter. The 36 V13 cues are content metadata, not all combat effects. Current armoured regeneration and elite window changes are **proxies**.
3. Implement Guild ownership/tenure/freeze/late-join rules, objective votes/donations/Orders, NPC variations and delayed/reconnect play.
4. Calibrate 1/2/3/4/8/12/20 guild sizes, 50–90% attendance, all nine classes, appropriate equipment and companions, real win rates, scarce supplies and account-wide reward inflation. Balance coefficients are not approved.
5. Obtain owner review of actual compact UI and themes before any runtime screen changes; then separate staging DB, Android, release and go/no-go approval.

**Do not merge or deploy V18 until its CI is green and future security/economy review is complete.**

## November 27 — reward evidence and settlement integrity follow-up

- V18-only review requires committed receipt count to match frozen account Seal spend (0–8). Mixed legacy/V18 ledgers require explicit migration, not silent eligibility.
- Evidence digest now binds full receipt contents via canonical key ordering for JSONB round-trips; this is a change detector, **not** a cryptographic signature or proof of authentic database ownership. Run revision, required-node HP/clear consistency and stale zero-credit state are checked.
- Settlement rejects corrupted run Pressure/revision and mismatched HP/clear flags before computing combat; frozen roster lookup requires an own property.
- Added synthetic regression cases for receipt edits, canonical reordering, Seal reconciliation and rollback-free rejection. Exact-head CI is required; all existing release fences and future authenticated PostgreSQL, phase, objective, balance and UI gates remain in force.
