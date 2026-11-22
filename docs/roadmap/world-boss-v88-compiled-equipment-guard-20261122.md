# World Boss V88 — verified Combat 2.0 stat compilation and exclusive item copies
**22 November 2026. Hidden stacked draft only. NOT live, no merge to main, no production/staging SQL, no rewards or event.**

## Safety gap
V87 requires a synthetically authenticated Equipment 2.0 trait receipt, but the V25 World Boss owned-account roster is still made from legacy V12 combatants. A valid equipment trait receipt by itself does **not** prove that the other 13 Combat 2.0 stat channels, equipment base, rarity/quality, sets, class and selected skills were applied correctly, or exactly once. V87 also checked item copies for duplicates within each actor but did not prevent the *same physical instance ID* from appearing on two of the account's characters during one raid.

## V88 changes
- V87's opt-in source now carries an exact SHA-256 `compiledCombatantDigest` that must match the full frozen V22 roster combatant used in V25. This is a fingerprint, not proof of an authorized compiler.
- The hidden bridge receives the authoritative roster's character ID, snapshot ID, V12 game-state source hash, source revision and computed combatant digest for each actor; all are frozen and exposed to the independent proof checker. Invalid or mismatched snapshots fail closed.
- Introduce mandatory `compiledPolicy:'combat-v2-compiled-gear-v88'` and `verifyCompiledBuild` callback separate from `verifyPersisted`. The former **must**, when a production-grade adapter exists, check the approved Combat 2.0 class/skills/gear-base/sets/13-affix source compiler and exact frozen stats digest. The latter checks exact-copy ownership, selected traits, slot and allowed affix percentage. Both callbacks must approve the *same* immutable actor scope, or the whole V87 test-only encounter is rejected.
- Across all 1–5 owned characters, every equipped item-instance ID must be unique. Reject reused copies, even if their separate per-character receipt fields look individually well formed.
- The previous three new percentage channels and five executable trait hooks remain unchanged. No new effect is accepted on an unverified baseline; no extra output score beyond the V22 account-weighted, Guard-separated proposal.
- Synthetic tests check rejected missing/wrong stat compiler proof, forged actor digest, duplicate equipped copy across actors and continued 45-case world boss/phase/account-size test routing.

## Honest release limitations
**The new callbacks in tests are synthetic and deliberately are NOT database validators.** V88 still does not import the verified equipment/classe/skills compiler from Combat PR #1559 or the 48-set EQ2 launch work #1576. The World Boss's current V12 roster **is not an approved Combat 2.0 compiled roster**; a real adapter must fail it until canonical source ownership and compilation can be shown. This gate makes future integration stricter, not complete.

Other open gates: shared canonical trait runtime (especially Restorative Bloom's 4 × 1-second ticks versus the 5-second authored-round approximation), 17 total planned affix concepts versus currently executable 3 additional channels, 28 candidate signature traits versus 5 implemented, world-boss-specific phase and difficulty balance with actual equipped builds, real DB Auth / erasure, PG17.6 two-session concurrency, reward custody and reviewed mobile visuals. Legacy un-equipped V25 behaviors remain unchanged when V87 equipment is omitted.

**Merge guidance:** child PR under V87. Keep release flag false and all integration changes on hidden branches until the canonical source compiler and device tests pass.
