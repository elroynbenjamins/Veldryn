# Veldryn 2.0 — career/equipment/crafting integration gates
**22 November 2026 — HIDDEN, review-only. No production or staging writes.**

## Source of truth
- **Overall Character Level**: separate overall Character XP bank from verified gameplay work, including combat or standalone professions. Not an equipment/encounter power source.
- **Combat Level**: existing combat-only level/XP; continues to gate wearable combat gear, class skills, dungeons and enemy scaling. Never infer it from overall Character Level.
- **Profession Level**: per-skill XP; only the profession relevant to a recipe/node/tool may gate that operation. Combat Lv1 specialists may craft high-tier gear and obtain combat-only ingredients through future verified market/commission transfers. Buying equipment still does not waive its Combat wearing gate.
- Current numerical tier floors in hidden independent-careers preview: **1 / 12 / 24 / 36 / 48 / 60 / 72 / 84 / 96** (provisional).
- Hidden gathering-tool policy (#1615) uses real T1–T4 tool floors **1 / 10 / 22 / 35** and keeps existing owner/blueprint/copy gates. These floors disagree with the new preview by **0 / 2 / 2 / 1 levels** respectively; choose one versioned, migration-safe authority before combining branches. Do not remove already earned tool access or silently retier existing copies.
- Older Combat 2.0 profession policy also treated Character Level as Combat Level and proposed T9=90, inconsistent with the new three-track semantics. No automatic definition merging.

## Boundary order (each gate must independently pass)
1. **Canonical authoring and source definitions.** Freeze user-reviewed profession licenses and T1–T9 item/recipe definitions. Preserve the 169 pinned ordinary Forge IDs and the distinction from 204 proposed set members. The 48 T1–T4 set families and 746 proposed craft routes in #1598 remain review-only. All 14 newly proposed ingredients require real registered source grants; do not disable the existing server projection's EQ2_-stack safeguard prematurely.
2. **One authoritative completion envelope.** Use the original server-simulated command/queue, same character/account/request hash and commit revision, and the actual original segment ordinal across gathering and combat. Pending proofs from two nested projections must describe the identical queue; mismatch is a hard denial (guard in the independent-careers hidden branch, with expanded negative tests in this child review).
3. **Atomic XP and ownership.** Verify service-owned original completion and source receipt, character ownership, cutoff timestamp and account revision *inside* the same transaction that inserts the globally unique career receipt and increments the overall XP bank. A retry must return its prior result without item, Gold, profession XP or Character XP duplication. Unverified old response blobs are not proof of new rewards.
4. **Real inventory/market custody.** Differentiate unique equipment copies and stackable components by an authoritative registered item type, not an `EQ2_` prefix or client ID. One transaction reserves character inventory + account Bank + Gold + blueprint/recipe, then delivers an exact-owned output instance after completion. Future market/commission escrow transfers source-verified combat ingredients, with anti-alt/self-trade checks and no XP from buying, relisting or cancelled jobs.
5. **Combined combat regression.** Verify nine classes, 18 specs, 13 implemented advanced affix channels, approved traits, counter-builds and six regional boss profiles from *one* versioned compiled build, checking both deterministic replay and runtime ownership. Unissued set concepts must not grant set bonuses.
6. **Migration and product gates.** Read-only per-character migration dry-run; preserve saved combat/skill levels and previously unlocked account character slots; run disposable PG17 concurrent/retry tests plus staging readbacks; obtain actual UI/theme approval before any mobile navigation/runtime code or live flags.

## Non-negotiable QA scenarios
| Scenario | Expected outcome |
|---|---|
| Combat Lv1, Smithing sufficiently licensed, materials/blueprint verified | May craft appropriate tool or equipment; no combat training gate |
| Combat Lv1, Mining sufficiently licensed, owns correct copy | May equip a qualifying mining tool, not combat armor |
| Combat Lv1 specialist, rare monster material bought through verified escrow | May use legitimately transferred input, but no XP for the purchase |
| Smith with missing unrelated Fishing skill | Smithing recipe stays available if its own inputs and level are met |
| Two proofs disagree on queue length, target, elapsed time, reward XP or claim timestamp | Hard rejection; no Career XP issuance |
| Concurrent duplicate request or cross-character replay | Exactly one original claim; wrong owner has no credit |
| T4 Glassbound Dust has only an imagined battle drop | Release blocked until profession-accessible source or verified trade is authored |
| T5–T9 tool/set ID without approved authored catalogue | Not issuable, craftable, equippable or market-listable |
| User only accepts the data model, not the screen | Backend previews stay unmounted; no mobile UI change |

## Three progressive polish passes (22 November 2026)

**Pass 1 — combat time integrity.** Hidden ordinary-combat Career XP previews now require non-overlapping active-fight intervals, each wholly inside its own authenticated server claim window. Prevent crediting the same active seconds twice. Includes adversarial overlap, future-fight, timestamp overflow and adjacent-valid-fight tests. This does not infer boss/dungeon XP from legacy combat events.

**Pass 2 — craft source integrity.** The instant-craft Career XP projector now requires every crafting contribution within a one-recipe `craft` command to belong to that exact recipe. Mixed-recipe completions and malformed contribution rows are hard denials; unrelated non-crafting quest metadata is not credited and does not block a valid craft. The provisional three-hour per-command work cap and trade/commission no-XP restrictions remain.

**Pass 3 — versioned integration review + multi-proof database QA.**
- `backend/src/server/progression/v2/profession-tier-reconciliation-review.ts` audits every tier against the independent-careers proposal and old hidden tool/Skills policy. T1 agrees; **T2–T9 conflict**, with a maximum +9-level increase. The audit identifies characters in potential access-loss windows but returns **no craft/equip authorization**. This is not a migration decision; previously earned live and hidden tool access must be checked against verified entitlements and accepted tiers before launch.
- Dedicated test validates T1–T9 at old/new exact boundary levels, missing levels, invalid input, and the explicit non-authorizing/release-off invariant.
- Disposable PG17 fixture now verifies a mixed gathering+combat action receipt, two ordinal source proofs, two Character XP awards and one atomic state revision. A duplicate *second* proof must roll back the first proof, action receipt and revision; **this remains a simulated SQL fixture, NOT a production reward adapter**.

## Release decision remains blocked
- New **Overall Character Level** is independent from Combat Level; the older Skills tool policy still uses old thresholds and older Character=Combat semantics. Establish one reviewed, versioned authority before any cross-system merge.
- 14 proposed EQ2 materials are not registered in the authoritative live source pipeline; real Player Market/commission custody and reliable T4 profession-accessible materials are unfinished.
- The true authenticated online-game SQL adapter and source-verified payout remain unimplemented; tests model contracts and throwaway PG transactions only.
- Dedicated exact-head CI must be read back before claiming these three passes validated. The earlier #1615 hidden Skills six-job run 45030446177 passed; unrelated broader checks can differ per commit.
- #1619 was closed **without merging**, superseded by draft #1621. No change here implies owner acceptance of UX/themes, profession XP curves, tiers, item art or final balancing.

**No merge to main, SQL execution against staging/production, feature flag activation, market release or live XP write.**


## Continued pass — original-command-bound Career XP batch contract

The hidden `backend/src/server/progression/v2/online-career-batch-review.ts` builds **one deliberately noncommittable** batch of projected Overall Character XP for a single original online game command. The original, server-simulated result is an **independent required argument**; agreement between the gathering and combat projectors is no longer sufficient.

- Binding: exact account UUID, original character UUID, request ID/hash, revision, original source ordinal, SHA-256 per-source ID, source class, profession, elapsed/effort and difficulty. The batch derives deterministic proposed XP with the existing hidden curve and records a source fingerprint.
- Before accepting any pending proof, both source-specific projector arrays are checked against the ORIGINAL simulation. Combat must match actual kills and interval endpoints; crafting must match original recipe, quantity, contribution rows and before/after profession XP. The caller must load these originals from its trusted service simulation, never a mobile request. A missing positive-work projector is a hard stop rather than partial credit.
- Pending batch always returns `canCommit:false`, `releaseEnabled:false` and `requiresServiceOwnedAtomicTransaction:true`. It does **not** write new profession XP to a second ledger, or authorize any player XP.
- Dedicated tests cover mixed gathering/combat, solo claims, instant crafting, no-reward commands, QA, retry identity, cross-character attack, reordered source arrays that agree with each other but not the original simulation, changed combat kill counts and fight intervals, missing source projectors, changed craft quantity, absent/extra original segments.
- This module is a model of the future server/SQL boundary only; cryptographic hashes here bind bytes but are **not signatures** and do not establish that a client-provided result is genuine. Production must independently authenticate and load original source records under database locks.

### Future service-only transaction handoff (not implemented here)

1. Authenticate the session against the locked account/character. Use the exact authenticated command simulation result, not client-claimed rewards.
2. Lock public online_game_states with the expected revision, wallet, character/BANK inventories, and original action receipt row. Verify request hash before idempotent replay.
3. Build the hidden batch from a server-owned simulation result and prove matching original ordinal/source. Create the source records with DB-generated completion time.
4. Insert EVERY source record and globally unique award receipt in the same PostgreSQL transaction, enforce per-character activation cutoff, aggregate Overall XP once and commit original online game changes atomically. An error in the second proof rolls back the entire claim, Gold, items and XP.
5. Retries must read back the persisted committed award/source rows and compare owner, source fingerprint, revision, and total rather than recompute a new entitlement from legacy response JSON.
6. Do not implement this in public Edge or activate until verified against the actual production schema in a disposable PG/staging-safe review and approved economy. No staging/production SQL in this pass.

**Remain hidden and unmerged.** The earlier three polish passes and this continuation must be validated against the exact Git commit before any claims of passing tests. Neither the source receipt adapter nor real transactional crafting/market payouts is active.

## Further continuation — existing tool/blueprint entitlement safety

The new HIDDEN `backend/src/server/progression/v2/tool-entitlement-cutover-review.ts` reconciles the **twelve actually authored T1–T4 gathering tool identities** (from hidden #1615) against the newer independent career level floor proposal. It is read-only: it proposes **exactly what needs migration review**, never a global tier unlock, item mint, equip action or crafting authorization.

- In the old hidden tool policy, T2/T3/T4 used levels **10/22/35**; the newer independent-careers proposal uses **12/24/36**. T1 has no conflict. T5–T9 have no verified tool catalogue and therefore receive no grandfather proposal.
- **Existing physical copy:** only if the current gathering skill falls in the gap between the old and proposed floor *and* the specific physical item instance has a committed, account-/character-bound, pre-cutover source receipt matching the exact item ID and copy ID. No copy cloning or blanket tier upgrade; a Bank or market-escrow copy retains its actual custody.
- **Existing learned blueprint:** only if the character's current Smithing level falls in the same gap *and* its exact learned knowledge ID has a matching pre-cutover committed grant receipt. The test does not infer knowledge just because the player has materials or a tool.
- **Evidence gap:** missing source proof yields a reported migration-review gap, **not an issued entitlement**. A wrong account/alt, duplicate receipt/copy/knowledge ID, swapped tool identity, future state revision or post-cutover source is a hard error. Access previously earned in 1.x must be checked against actual live provenance, not guessed from the *older hidden 2.0 draft*.
- The 12-item catalogue is a review snapshot copied from hidden #1615 to avoid importing unfinished Combat 2.0 code. **Cross-branch catalogue parity is still a required gate** before a shared immutable authority is selected.
- The output explicitly keeps `canAuthorizeEquipOrCraft:false`, `canWriteEntitlements:false`, `releaseEnabled:false`, and `requiresOwnerApproval:true`. It is not an auth boundary, Supabase migration, runtime API, market feature or automatic grandfathering decision.
- Tests exercise T2/T3/T4 edge skill levels, legitimate vs missing receipts, exact item/copy/blueprint matching, zero-combat specialists, Bank/market escrow, cross-character/account copies, replay, cutover and revision violations, invalid T9 entries and release-off flags.

**Decision needed for 2.0 release:** select final profession tier thresholds and define whether *verified* old T1–T4 tool copies are exempt from new equip minimums and whether previously *learned* Smithing blueprints receive narrowly scoped recipe-level continuity. Do not grant full T2–T9 licenses just because an older draft once used lower level floors. No in-game UI, progression, items, permissions, SQL or rewards have been changed by this audit.


## Continue + polish — exact crafting material source and account custody handoff

**Review module:** `backend/src/server/progression/v2/crafting-material-custody-handoff-review.ts` and its own isolated regression suite. **NO REAL CRAFT, DEBIT, MARKET TRANSFER, RESOURCE REGISTER, ITEM/XP/Gold GRANT OR PUBLIC ROUTE.**

### New integration pass

- Bind a registered canonical Smithing/Tailoring recipe to independently validated profession progression, a verified original account/character, expected account revision, recipe quantity, per-character Gold, and exact input item types. **Combat Lv1 may train Smithing/Tailoring through top tiers** if that profession qualifies and ingredients were legitimately obtained. A finished combat gear piece still requires the separate Combat Level to **wear**, never to manufacture.
- Every finished-gear review recipe requires an explicit **combat-origin ingredient** alongside normal materials. A Market- or commission-acquired rare ingredient remains combat-origin only if a service-owned original loot receipt is linked to a **settled** transfer with consistent seller/buyer identities; buying, bidding, listing and trading are never profession/overall XP sources.
- Only authenticated, registered, source-authorized `stackable_material` inputs may enter the debit calculation. Distinguish real material stacks from unique equipment copies and gems by verified type, not a name/prefix. The separate Equipment 2.0 V5 draft still has **29 proposed, unregistered materials (14 raw + 15 processed)** and the underlying equipment projection rejects ALL `EQ2_` stack keys. This new bridge **does not relax that blanket block**. Optional Verdant Essence and nonexistent EQ2 sets likewise cannot be smuggled into inventory.
- A deterministic proposal consumes the current character's proven Inventory lots first, then proven account Bank lots; **Market escrow is never spendable**. Gold and materials are all-or-nothing requirements in a future authenticated account revision commit. Duplicate lot IDs, cloned source receipts, altered lot item identities, nonpositive quantities, missing combat-origin proof, stale revision, changed idempotency hash/recipe/quantity and inappropriate cross-account/alternate-character transfers fail closed. A completed request returns **read-back required**, never a second debit.
- Explicit result flags: `canCommit:false`, `canGrantItemsOrXp:false`, `mayMoveMarketEscrow:false`, `releaseEnabled:false`; reviewed recipes and server-typed preview arguments are NOT sufficient to prove real registration or player ownership without authenticated, locked DB reads.

### Second refinement and polish — shared Bank, source receipts and exact custody

- A source grant maps to **one exact material lot ID**, and that lot is backed by only one provenance record. A newly split or merged stack requires an independent trusted split/merge receipt later; never silently claim two different spendable lots from one completed source.
- Market transfers must be committed, link the original source receipt, have unique transfer receipts and **cannot be a same-account trade**. A buyer's Bank deposit is a separate transaction from the original source grant or market delivery.
- Every shared Bank lot requires an explicit, server-confirmed **Bank deposit receipt** matching the lot ID, owning account, deposited-by character and the original grant or settled trade recipient. The character must belong to the authenticated account roster. A legitimate same-account alternate character may deposit resources for a peaceful Smith, but a fake alt, other-account Bank lot or undeposited source cannot become spendable.
- A Bank-deposited lot cannot appear as ordinary Inventory merely by changing its location tag. A real withdrawal would need a separate, server-authenticated withdrawal proof before this review can support it. This is an intentional HOLD, not a decision to forbid withdrawals in Veldryn 2.0.
- Regression scenarios include: combat-Lv1 Smithing-only source craft, adjacent eligible/ineligible profession tiers, traded combat material, account-shared alt Bank, Market escrow lock, source-item swap, repeated source/lot, self-trade, invalid Bank deposit, fake/duplicate roster, stale revision, request collision, insufficient Gold, missing registered material, and 29 EQ2 draft-key release hold.

### Integration gate before any live release

A future owned SQL transaction must independently verify canonical item registration and source grant receipts, lock account/character wallet, all ingredient lots and Bank escrow rows, claim receipt, recipe revision, and character profession XP, then atomically debit resources, consume blueprint, issue an exact finished equipment copy, record and settle overall/skill XP, and return a stored idempotent response. Staging and production must remain untouched until owner-reviewed migrations and UI/theme approval. The source receipt / market / Bank models here are **test contracts**, not implemented live tables or an authentication mechanism.
