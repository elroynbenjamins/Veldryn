# Skills & Abilities 2.0 — Equipment-to-Boss integration passes (22 Nov 2026)

**Status:** HIDDEN / DEVELOPMENT-ONLY; child of Skills & Abilities QA #1638, itself based on canonical private Combat/Skills #1377. DO NOT MERGE TO MAIN, deploy, mount new gameplay routes, change production flags or alter the approved UI design.

## Pass 1 — Server-compiled, class-native skill strategy selection
- Model six existing regional boss IDs with two *distinct* tactical routes (control, cleanse, sustain, pressure); never infer a boss from a client-requested description.
- Evaluate actual server-authored unlocked skill effects across all variants, for the character's actual class and specialization. The generic approach preserves the first two default techniques; the targeted and alternative approaches select two distinct skills via deterministic scoring of real effects.
- A class without cleanse or interrupt is never forced to acquire another class. It can use a different supported route, with missing counter ability explicitly shown as a coverage gap instead of inventing a mechanic.
- No cooldowns, ability coefficients, professions, rewards, capstones, resource balances, UI or 2.0 flags change.

## Pass 2 — 324 genuine Engine/Skills/Equipment/Enemy/Boss tactical encounter tests
- Extend the existing 108 actor/spec/boss signed exact-copy equipment test pattern to 18 real specializations × 6 pre-existing regional boss IDs × 3 ability approaches = **324 test encounters**.
- Each approach uses the same engine seed, class, combat level, 2.0 item owner/receipt, rarity, quality, Equipment V2 affix/trait source, authored enemy kit and exact compiled stat evidence. Reject any equipment compiler stage drift between approaches. All outcomes/interrupts/cleanses/absorbed damage/shields/ability casts are derived from observed combat events, not fabricated outcome fixtures.
- Record 108 *comparisons* (3 approach samples per spec/boss), report targeted-vs-generic and alternative-route warnings using the existing read-only review reducer. The numeric power field is an internally derived **synthetic stat index only**: this test does **not** demonstrate final policy-approved equal Combat Power. No minimum win-rate/DPS targets are applied.
- Keep existing fail-closed authorization probes for other-character receipt, out-of-range affix, unverified receipt ledger, incomplete V2 path and absent persisted boss kit.
- Deterministic duplicate run plus reverse-order comparison; include in the hidden GitHub Actions server validation job.

## Before Combat 2.0 may be called complete
1. Read back an exact-head green CI run, typecheck and automated encounter counters; resolve any failures on the hidden branch.
2. Validate final approved 10-slot equipment, set thresholds, innate percentages, 13+ legacy/new affix channels and CP weights against all 18 specs, including newest staged equipment recipes and tool-skill-XP isolation. Current synthetic tests have only one controlled gear receipt, not the final gear economy.
3. Reconcile the latest hidden Combat 2.0 status/interrupt timing changes with the six-boss kits; run distinct counter mechanics with viable nonmandatory alternatives, higher combat tiers and party/companion combinations.
4. Approve class balance coefficients after observed tests and real gameplay sessions; preserve legacy fights/dungeons until coordinated release.
5. After this shared contract is stable, finish Enemies/Bosses 2.0; then build World Bosses 2.0, Party Events 2.0 and Player Market 2.0 against the same authoritative item/combat receipt and custody model. Market must exclude every legacy equipment copy, including resale.

**No production release, UI redesign or main merge is authorized by this review.**
