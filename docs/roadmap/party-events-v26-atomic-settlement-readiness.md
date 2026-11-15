# Party Events v26 — atomic reward settlement readiness

**Status (15 November 2026): HIDDEN, DRAFT, NONPAYING.** Adds an executable pure destination planner and regression tests on `party-events-v6-hazard-prototype` (draft PR #1045). It does **not** create reward entitlements or apply payouts. Production and staging data are unchanged.

## What v26 adds

- `backend/src/server/party/weekly-party-settlement-policy-v26.ts` computes **one complete after-state** from a private, authoritative v25 Party Event quote; the source snapshot is never mutated.
- Reward values are checked against the pinned v2 formula, including selected `participation`, `warrior`, `artisan`, or `companion` cache.
- Validates the **frozen member account/character**, currently active character, nonnegative revision, and equality of gold in the three current projections: `public.character_wallets`, `public.characters`, and `public.online_game_states.state.character.gold`.
- Checks bigint overflow on every value; available inventory space **or** a verified mergeable GEM_DUST stack; conservative rejection of multiple unverified dust stacks; a verified target skill for warrior/artisan XP; a future Inbox destination; and companion/account renown balances.
- Returns `previewOnly=true`, `entitled=false`, `claimed=false`, `economyApplied=false`, `inboxDelivered=false`. The claim function throws unconditionally. The constant `PARTY_EVENT_SETTLEMENT_V26_RELEASED=false` is unchanged.
- `backend/src/server/party/__tests__/weekly-party-settlement-policy-v26.ts` exercises successful nonpaying destination previews and failure on forged reward values, character mismatch, stale/mismatched gold projections, invalid XP targets, inventory overflow, GEM_DUST layout uncertainty, Inbox unavailability, and bigint overflow. Wired to `test:party-weekly-v2`.

This new code is an **internal proof-of-shape and arithmetic preflight**, not a permission to credit anything. The input must be resolved by trusted code; its type alone does not authenticate a caller.

## Confirmed storage facts from staging schema review

- Gold: `public.character_wallets.gold` alongside `public.characters.gold` and the live `online_game_states.state.character.gold`. Updating the wallet alone is unsafe: normal online commits persist the live state back to the projections.
- The online commit path uses `pg_advisory_xact_lock(hashtextextended('party-account:'||p_account_id,0))` and the `online_game_states.revision` compare-and-swap model.
- Character skills: `public.character_skills(character_id,skill_id,level,xp)`. The current reward model has *unspecified target skills* for `warrior` Combat XP and `artisan` Skill XP: before payout, verify class/legal target and level-curve router against the active game-state source.
- `private.party_event_claim_intents_v25`, `private.party_event_claim_preflights_v25`, and `private.party_event_reward_claim_quotes_v25` are **three immutable, separate nonpaying records** on the draft branch, not currently deployed. They must be reconciled on account/offer/character, choice, reward model/hash, event and replay identity before enabling any actual claim.
- Companion Essence, Bondstones and Party Renown have no confirmed standalone spendable SQL wallet in the audited staging table catalog. Their canonical state paths, caps, and normal save/update behavior must be proven before transferring them.
- The existing native Inbox/mail-write transaction destination is not yet verified for the Party Event reward type.

## Required v27 atomic transaction (not implemented yet)

1. Receive the **server-authenticated account**, offer ID, approved XP target(s), and a server-generated idempotency request ID. Never accept a client-authored reward quantity, band, character ownership, completion score, inventory proof, or combat replay.
2. Acquire the normal `party-account:` transaction advisory lock, then lock the week/offer/choice, one-account-per-event unique payout receipt, `online_game_states` row and all affected relational projections. Lock order must be stable across normal save and Party Event claim paths.
3. Verify immutable v23 Day-8 replay / v24 offer / all v25 attestations, the locked choice and canonical roster; require the account's currently active character to match the frozen event character. Re-evaluate all v26 readiness checks against **fresh locked state**, not old v25 snapshots.
4. Transform the **canonical live online-game JSON** and relational wallet/character/skill projections in **one DB transaction**. Award all components together: gold, GEM_DUST, selected XP and levels, Companion Essence, Bondstones and Party Renown. Validate every cap, projected inventory stack and level-up beforehand; no partial currencies or IOUs.
5. Insert the **unique immutable paid receipt and Inbox delivery** inside that same transaction. Use a single receipt keyed by `event_starts_at,account_id` plus the offer ID and result hash. If any grant, projection, capacity check or Inbox insert fails, the entire transaction rolls back.
6. On replay, return the stored paid receipt without incrementing any balance or issuing additional Inbox items. Conflicting IDs/choices/frozen characters must fail closed.
7. Verify crash/retry, concurrent double-click, cross-account spoof, overlapping normal game-save, inventory full/stack merges, switched characters, deleted/disbanded parties, target-skill spoof, source attestation mismatch, reward formula mismatch, hard currency caps, and rollback after each deliberately injected failure.
8. Only after clean tests: reviewed SQL migrations, production-ready hidden server integration, full backend + mobile CI, staged acceptance, user-facing Inbox/choice UI, and explicit separate release gate promotion.

## Release guardrails

Party Events remain hidden and unmerged. No automatic boss/reward worker, nonpaying v25 preview, or this v26 planner may be presented as a claimed prize. The companion, Renown, XP routing and Inbox mapping are **blockers** for a real all-or-nothing transaction. Do not deploy, enable flags, or promise a live reward until all these paths pass a transaction-level regression suite.

**Side design check:** the historic four-player free-composition proposal differs from the later 1 Tank / 2 Damage / 1 Support enforcement in draft Party PR #1046. Resolve the final Party Events composition policy with the existing persistent Party code before release rather than silently making a second inconsistent rule.
