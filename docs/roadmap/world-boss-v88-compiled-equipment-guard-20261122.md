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

## Authoritative Combat 2.0 stat crosswalk — verified against hidden #1559/#1576

The canonical 13-affix compiler defines **fractional** values (`0.025 = 2.5%`), whereas the three V87 additional roll channels store **percentage points** (`2.5 = 2.5%`). Never combine the two without unit conversion. The V87 sidecar's 3 channels must never re-apply an original affix or a precompiled class multiplier.

| Canonical stat / effect | Existing V25 authored round status | Safe implementation direction |
| --- | --- | --- |
| `attack_pct`, `defense_pct`, `max_hp_pct`, `crit_rate_pp`, `crit_damage_pct`, `class_healing_pct` | V25 reads already-resolved `CombatStats` values | Only a proven Combat 2.0 compiler may supply these assembled values; no second multiplier |
| `haste_pp` | V25 provides one action per character per authored round; no real haste timing | Not fully functional; convert round scheduler to canonical action timing before enabling enhanced gear |
| `accuracy_pp`, `evasion_pp` | V25 uses its own hit procedure and does not apply extra accuracy/evasion percentage points | Use canonical `clamp(hitChance(...) + accuracyPp - evasionPp, 0, 1)` on verified authored strikes, without replacing fixed telegraph rules ad hoc |
| `penetration_pp` | V25 does not read the advanced effect | Canonical rule reduces target defense by verified penetration fraction prior to mitigation |
| `ward_pp` | V25 does not apply magical Ward | Requires verified boss cast damage type, with fire/ice/nature/shadow/arcane affected and physical/true exempt |
| `shield_strength_pct` | V25 does not use extra compiled shield strength | Apply once to verified original shield amount; keep consumed shields, not unused shields, as credited utility |
| `hex_potency_pct` | V25 does not have a trusted Hex affix bridge | Canonical rule increases shadow/arcane/nature DoT coeff/flat, with no recurrence or duplicate ticks |
| `basic_attack_damage_pct`, `ability_damage_pct`, `reflect_damage_pct` | V87 implements these as **hidden test-only** mechanics | Preserve original-event provenance, shared boss retaliation cap and Guard separation; reconcile with actual #1559 engine |
| Tenacity and additional EQ2 set mechanics | Unimplemented candidate concepts | Require a versioned, authored mechanics contract and separate regression/balance tests before use |

**Important:** This crosswalk is an audit, not proof that all original affixes work in World Boss raids. V88's proof gates correctly reserve space for the real compiler, but there is still no source-authorized adapter supplying its advanced effects to the V25 prototype. The right next engineering step is to consolidate V25 authored boss mechanics with the **canonical Combat 2.0 engine**, not create a permanent second set of competing damage formulas.
