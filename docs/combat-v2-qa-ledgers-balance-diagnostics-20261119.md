# Combat 2.0 — disposable reward ledger and diagnostic balance review
19 November 2026 | PRIVATE WIP | NO gameplay, player balances or production migrations changed

## Pass 1: Concrete account/character reward writer contract (disposable QA)

Added `solo-reward-disposable-qa-writers.ts`, explicitly opt-in, hidden, and
**NOT a production player economy adapter**. Existing staging metadata confirms
`public.character_wallets.gold` for character Gold, while Skill XP, companion
essence, material balances and player Inbox still require verified, authorized
transaction-local mappings. Guessing these mappings would risk unintended
currency mutations; none are wired here.

The QA implementation uses `private.combat_v2_reward_qa_sources_v1`,
`private.combat_v2_reward_qa_balances_v1`, and
`private.combat_v2_reward_qa_inbox_v1`. These tables are created only by the
disposable PostgreSQL CI script, never by a staging/production migration.

The same pinned transaction:
1. Inserts `grant_source_id` once; replay reads the immutable row, verifies
   account, character, resource and amount, and **does not credit again**.
2. If and only if source insertion succeeds, atomically increments the
   account/character resource balance (Gold, Skill XP, companion essence, material).
3. Read-verifies the updated balance and returns proof of the grant.
4. Creates a source-unique Inbox entry; retry returns the original, rejecting
   foreign source, account or altered receipt digest.
5. For any failure in a grant, Inbox or receipt insert, caller's `COMMIT` is
   forbidden until all proofs succeed; failure aborts the entire transaction.

`backend/tests/combat-v2-pg17-disposable-reward-ledger.sh` checks 16
independent PostgreSQL sessions, once-only source + balance, explicit rollback,
Inbox uniqueness and revoked anon/authenticated SQL access. A TypeScript test
checks all four resource types, replay, conflicting amounts, foreign accounts,
disabled-by-default creation and Inbox receipt tampering.

**Not proven:** actual player wallet/XP/material custody and full 2.0 reward
policy, staged two-connection ledger migration, live Inbox adapters. The SQL
test uses disposable QA-only tables and synthetic accounts.

## Pass 2: Actionable but non-authoritative class balance diagnostic

`balance-diagnostics.ts` converts the existing 540 full-pipeline synthetic
samples into deterministic, stable group reports. It captures role/tier/enemy
kind/rarity-quality profile medians and ranges of DPS, HPS, damage taken,
encounter duration, win share and zero-damage matches; compares all 270
paired low/high gear records. It marks:
- source gear base stats that decrease with better rarity/quality as
  **hard invalid data**;
- missing or duplicate quality pairs, invalid numbers, unrecognized authored
  kit coverage, impossible samples as **hard test failures**;
- skill-resource inactivity, zero damage, no simulated wins, DPS reversals
  and extreme within-role spreads as **review findings**, not arbitrary
  pre-release balance gates;
- Tier 1 generic enemy bridge as a **coverage gap**.

There are no invented live win-rate, role-DPS, skill-XP or reward-mint targets.
No balance changes to the actual nine classes, 18 specs, bosses or crafting are
made by this diagnostics pass; genuine balance corrections require approved
class/tier stat curves and evidence from a green CI run.

## Polish and inherited CI

- Repaired three strict compiler errors exposed by PR #1417:
  skill identities don't own `unlockLevel` (derive from `SKILLS_V2`);
  transaction test's `scope` parameter had self-referential type;
  optional locked snapshot row required explicit error narrowing.
- Registered all new tests in `.github/workflows/combat-v2-skills-validation.yml`.
- No routes added, no feature flags enabled, no staging/production SQL executed.
- Before merge into private release branch: green CI, source-owned real ledger
  adapters, reviewed staging migration, cross-character ownership, Android
  QA and finalized 2.0 balance policies.
