# Party Events v27 — immutable proof-chain reconciliation

**15 November 2026 · DRAFT, HIDDEN, NONPAYING.** Built on `party-events-v6-hazard-prototype`, draft PR #1045. This is not a released event or a redeemable reward.

## What changed

- `backend/src/server/party/weekly-party-settlement-evidence-v27.ts`: strict private verification of **all three v25 nonpaying records** against the v24 offer, roster, locked choice, v23 combat attestation, authoritative week, current active character and live gold projections.
- `backend/online/party-event-settlement-evidence-v27.ts`: a **single parameterized, read-only** query over private v11/v23/v24/v25 records and the current gameplay rows. The query is restricted by both `offer_id` and the **trusted server-derived** account ID; no user-facing route or public RPC exists.
- Regression suites `backend/src/server/party/__tests__/weekly-party-settlement-evidence-v27.ts` and `backend/online/tests/party-event-settlement-evidence-v27.ts`, wired into `pnpm test:party-weekly-v2` and the hidden Party Event CI path filters.
- If proof is consistent, the result still contains `claimable=false`, `entitled=false`, `claimed=false`, `economyApplied=false`, `inboxDelivered=false`, `payoutEnabled=false`. The v27 claim function always throws.

## Required evidence before even preparing a payout

1. Event/offer/account/week/party/character match with live account ownership; the **frozen** enrolled character must still be the active character.
2. Event is in its final stage; Day 8 settlement hour has arrived; week isn't settled.
3. v23 boss attestation and v24 prepared batch have matching candidate/replay hashes and reward band; canonical ruleset and vetted gathering audit match.
4. Every nonpaying record has its immutable, release-disabled flags intact. A full offer has exactly one locked, account-owned Warrior / Artisan / Companion selection. A participation offer has no choice.
5. All three independent v25 records have the same `offer_id`, account, frozen character, event week, reservation, reward kind/model and quote hash, and each reward independently matches the deterministic v2 model.
6. v25 preflight's candidate/replay hashes match the v23 authoritative attestation; the gold wallet, character projection and active online-save gold agree **at the moment of the read**.
7. Earlier v25 online revision and wallet snapshots may legitimately be stale following normal gameplay. This is reported as `historicalSnapshotsStale`, **not an automatic permanent block**. The future payment transaction must re-lock and validate the current state from scratch.

## Canonical game-state audit

Source review on this branch and read-only staging schema checks establish:

- **Companion Essence / Bondstones:** `state.account.companionEssence` and `state.account.bondstones`; canonical mobile reward helpers are `grantCompanionEssence` and `grantBondstones`.
- **Combat class XP:** `state.character.classSkills[]` with the newer class-combat curve; actual runtime uses `awardClassSkillXp` and its class training focus to split XP between class skills. Do **not** blindly add to `characters.xp` or a single selected class skill.
- **Profession XP:** `state.skills[]` with profession level derived from `levelFromXp`, not class combat level calculation; the real target skill requires verified server-owned selection.
- **Gold:** `state.character.gold`, `public.characters.gold`, `public.character_wallets.gold` are a single logical balance that ordinary gameplay commits project using its account transaction lock.
- **GEM_DUST:** a material in the ordinary inventory, with per-stack cap **99,999**, not the generic v25 intent's nine-digit bound. Actual item routing merges existing material stacks and may split or overflow. Future payment must either use a fully proven no-overflow path or reject atomically.
- **Party Renown:** no verified canonical account field or spendable relational wallet mapped. Do not invent a payout into guild token, expedition marks, or other currencies.
- **Native Inbox delivery:** no verified Party Events atomic mailbox destination or read model. A detached post-commit notification is insufficient for an exactly-once claim.

## Release blockers and next engineering steps

- An atomic, account-scoped transaction that shares `pg_advisory_xact_lock(hashtextextended('party-account:'||p_account_id,0))` with normal game saves, rechecks all proof and **recomputes against current locked game state**.
- A reviewed Party Renown model and verified atomic Inbox table/receipt. These must exist *before* any crediting path is switched on.
- XP routing must use the actual class/profession curves and level caps. In particular, the v26 generic `combatSkillTarget` concept is only a planner placeholder, not Veldryn's real two-class-skill award policy.
- Exact GOLD/GEM_DUST/inventory caps and source revisions, including full-inventory merges, with deterministic rollback on every failure.
- One unique immutable successful claim receipt per event/account; a replay returns it without adding any amount. The game save, relational projections, renown and Inbox receipt must commit **in one transaction**.
- Auth-bound HTTP server route, per-account rate limit, retries, security regression, SQL migration review, staging transaction tests and verified CI. No UI `Claim` button before all of these.
- Resolve Party Events role rules consistently with the persistent Party composition policy (1 Tank, 2 Damage, 1 Support for four players).

## Verification status

The new v27 tests cover missing or swapped records, forged amounts, inconsistent source hashes, wrong reward choice, switched active character, gold-projection drift, flags accidentally enabled, stale historical revisions and fail-closed claim attempts. The SQL adapter test checks exact owner-scoped bind ordering and that the query is read-only.

**These test files are committed, but fresh CI results have not yet been confirmed.** No staging or production migrations, data mutations, reward transfers, merging or app release performed by v27.

Keep draft PR #1045, Party Event visibility, and every grant flag disabled until verified transaction-safe settlement exists.
